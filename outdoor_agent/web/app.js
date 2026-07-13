const app = document.getElementById('app');

const MOBILE_SHELL =
  new URLSearchParams(location.search).get('mobile') === '1' ||
  typeof window.ReactNativeWebView !== 'undefined';

if (MOBILE_SHELL) {
  document.documentElement.classList.add('mobile');
}

const state = {
  catalog: null,
  inbox: null,
  route: parseRoute(),
  scriptCache: new Map(),
  jobCache: new Map(),
  cutReviewCache: new Map(),
  alignReviewCache: new Map(),
  coversCache: new Map(),
  film: null,
};

window.addEventListener('hashchange', () => {
  teardownFilm();
  state.route = parseRoute();
  void render();
});

function parseRoute() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const parts = raw.split('/').filter(Boolean);
  if (parts[0] === 'script' && parts[1]) {
    return { name: 'script', scriptId: decodeURIComponent(parts[1]) };
  }
  if (parts[0] === 'film' && parts[1]) {
    return { name: 'film', scriptId: decodeURIComponent(parts[1]) };
  }
  if (parts[0] === 'platforms' || parts[0] === 'credentials') {
    return { name: 'platforms' };
  }
  return { name: 'library' };
}

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function fmtDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function fmtDuration(ms) {
  if (!ms && ms !== 0) return '';
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

async function api(path, init) {
  const response = await fetch(path, init);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `${response.status} ${path}`);
  }
  const type = response.headers.get('content-type') || '';
  if (type.includes('application/json')) {
    return response.json();
  }
  return response;
}

function takeStatusLabel(count) {
  if (!count) return 'Not filmed';
  return count === 1 ? '1 take' : `${count} takes`;
}

function artifactUrl(scriptId, takeId, stage, runId, fileName) {
  return `/api/scripts/${encodeURIComponent(scriptId)}/takes/${encodeURIComponent(takeId)}/artifacts/${encodeURIComponent(stage)}/${encodeURIComponent(runId)}/${encodeURIComponent(fileName)}`;
}

function sourceUrl(scriptId, takeId) {
  return `/api/scripts/${encodeURIComponent(scriptId)}/takes/${encodeURIComponent(takeId)}/source`;
}

function resolveFocusedSlideCode(slides, index) {
  const slide = slides[index];
  if (!slide) return { label: 'Lean', code: '' };
  const panels = slide.leanCode || slide.turnCode
    ? { lean: (slide.leanCode || '').trim(), turn: (slide.turnCode || '').trim() }
    : parseNotes(slide.notes || '');
  let focus = slide.codeFocus === 'turn' || slide.codeFocus === 'lean'
    ? slide.codeFocus
    : inferFocus(slide, panels);
  let code = focus === 'lean' ? panels.lean : panels.turn;
  let cursor = index;
  while (/^as\s+before$/i.test(code.trim()) && cursor > 0) {
    cursor -= 1;
    const prev = slides[cursor];
    const prevPanels = prev.leanCode || prev.turnCode
      ? { lean: (prev.leanCode || '').trim(), turn: (prev.turnCode || '').trim() }
      : parseNotes(prev.notes || '');
    code = focus === 'lean' ? prevPanels.lean : prevPanels.turn;
  }
  if (/^as\s+before$/i.test(code.trim())) code = '';
  return { label: focus === 'lean' ? 'Lean' : 'Turn-Lang', code };
}

function parseNotes(notes) {
  const leanMatch = notes.match(/Lean:\s*([\s\S]*?)(?:\n\nTurn:|$)/i);
  const turnMatch = notes.match(/Turn:\s*([\s\S]*?)$/i);
  return {
    lean: leanMatch?.[1]?.trim() ?? '',
    turn: turnMatch?.[1]?.trim() ?? '',
  };
}

function inferFocus(slide, panels) {
  if (/^as\s+before$/i.test(panels.turn) && !/^as\s+before$/i.test(panels.lean)) return 'lean';
  if (/^as\s+before$/i.test(panels.lean) && !/^as\s+before$/i.test(panels.turn)) return 'turn';
  if ((slide.title || '').trim().toLowerCase().startsWith('turn:')) return 'turn';
  return 'lean';
}

function pickRecorderMime() {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  for (const type of candidates) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
}

async function loadCatalog() {
  state.catalog = await api('/api/catalog');
}

async function loadInboxStatus() {
  try {
    state.inbox = await api('/api/inbox/status');
  } catch {
    state.inbox = null;
  }
}

async function loadCutReview(jobId) {
  if (state.cutReviewCache.has(jobId)) return state.cutReviewCache.get(jobId);
  try {
    const review = await api(`/api/jobs/${encodeURIComponent(jobId)}/cut-review`);
    state.cutReviewCache.set(jobId, review);
    return review;
  } catch {
    return null;
  }
}

async function loadAlignReview(jobId) {
  if (state.alignReviewCache.has(jobId)) return state.alignReviewCache.get(jobId);
  try {
    const review = await api(`/api/jobs/${encodeURIComponent(jobId)}/align-review`);
    state.alignReviewCache.set(jobId, review);
    return review;
  } catch {
    return null;
  }
}

function renderInboxBanner() {
  const inbox = state.inbox;
  if (!inbox) {
    return '<div class="banner offline" data-inbox-banner>Inbox status unavailable — is the outdoor agent running?</div>';
  }
  const pending = (inbox.files || []).filter((f) => f.status === 'ready' || f.status === 'pending');
  const latest = (inbox.recentIngests || [])[0];
  const lines = [];
  lines.push(`Watching ${inbox.watchedFolders.length} folder(s)`);
  if (latest) {
    lines.push(
      `Last picked: take <b>${esc(latest.takeId)}</b> · video <b>${esc(latest.videoFileName || '—')}</b>`,
    );
    lines.push(`Inbox path: <code>${esc(latest.videoPath || latest.inboxDir)}</code>`);
    if (latest.takeDir) {
      lines.push(`Post-process folder: <code>${esc(latest.takeDir)}</code>`);
    }
  } else {
    lines.push('No ingest yet — export {takeId}.mp4 + {takeId}.json to TurnOutdoor/inbox');
  }
  if (pending.length) {
    lines.push(
      `${pending.length} file pair(s) waiting: ${pending
        .map((f) => `${f.takeId} (${f.status})`)
        .join(', ')}`,
    );
  }
  return `<div class="banner online" data-inbox-banner>${lines.join('<br/>')}</div>`;
}

async function loadScript(scriptId) {
  if (state.scriptCache.has(scriptId)) {
    return state.scriptCache.get(scriptId);
  }
  const script = await api(`/api/scripts/${encodeURIComponent(scriptId)}/outdoor-script`);
  state.scriptCache.set(scriptId, script);
  return script;
}

async function loadJob(jobId) {
  if (state.jobCache.has(jobId)) {
    return state.jobCache.get(jobId);
  }
  const detail = await api(`/api/jobs/${encodeURIComponent(jobId)}`);
  state.jobCache.set(jobId, detail);
  return detail;
}

async function loadCovers(jobId) {
  if (state.coversCache.has(jobId)) {
    return state.coversCache.get(jobId);
  }
  try {
    const covers = await api(`/api/jobs/${encodeURIComponent(jobId)}/covers`);
    state.coversCache.set(jobId, covers);
    return covers;
  } catch {
    const empty = { covers: [], platformCovers: {} };
    state.coversCache.set(jobId, empty);
    return empty;
  }
}

function header(title, actionsHtml = '') {
  return `
    <header class="header">
      <h1>${esc(title)}</h1>
      <div class="header-actions">${actionsHtml}</div>
    </header>
  `;
}

function renderLibrary() {
  const catalog = state.catalog;
  if (!catalog) {
    return header('Scripts') + '<div class="empty">Loading…</div>';
  }
  const series = catalog.series || [];
  const sections = series.map((entry) => {
    const episodes = (entry.episodes || [])
      .filter((ep) => ep.hasOutdoorScript)
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title));
    if (!episodes.length) return '';
    return `
      <section>
        <div class="series-header">
          <div class="series-title">${esc(entry.title)}</div>
          ${entry.description ? `<div class="series-sub">${esc(entry.description)}</div>` : ''}
        </div>
        ${episodes.map((ep) => `
          <article class="card" data-nav="script/${encodeURIComponent(ep.scriptId)}">
            <div class="card-top">
              <div class="card-title">${esc(ep.title)}</div>
              <span class="badge ${ep.takeCount > 0 ? 'filmed' : ''}">${esc(takeStatusLabel(ep.takeCount))}</span>
            </div>
            <div class="card-meta">
              ${ep.slideCount || 0} slides
              ${ep.takeCount ? ` · ${ep.takeCount} take${ep.takeCount === 1 ? '' : 's'}` : ''}
              · ${esc(ep.seriesId || entry.id)}
            </div>
          </article>
        `).join('')}
      </section>
    `;
  }).join('');

  return `
    ${header('Scripts', `
      <button class="btn" data-nav="platforms">Platforms</button>
      <button class="btn" data-action="refresh">Refresh</button>
      <button class="btn" data-action="scan-inbox">Scan iCloud inbox</button>
    `)}
    ${renderInboxBanner()}
    <div class="banner online">Reading scripts from Mac · video_ops/scripts/</div>
    <main class="main">
      ${sections || '<div class="empty">No outdoor scripts found under video_ops/scripts/</div>'}
    </main>
  `;
}

function platformStatusLabel(status) {
  const labels = {
    connected: 'connected',
    configured: 'configured',
    missing_credentials: 'missing credentials',
    manual: 'manual',
    stub: 'stub',
  };
  return labels[status] || status;
}

async function renderPlatformsPage() {
  let health;
  try {
    health = await api('/api/platforms');
  } catch (error) {
    return header('Platforms', `
      <button class="btn-back" data-nav="">Scripts</button>
    `) + `<div class="error">${esc(error.message || String(error))}</div>`;
  }
  const zernio = health.providers?.zernio || {};
  const sau = health.providers?.sau || {};
  const platforms = health.platforms || [];
  const progress = health.connectProgress || { total: 0, ready: 0, missing: [], manual: [], stubOnly: true };
  const zernioRows = platforms.filter((entry) => entry.provider === 'zernio');
  const sauRows = platforms.filter((entry) => entry.provider === 'social-auto-upload');
  const renderSteps = (steps) => `
    <ol class="platform-signup-steps">
      ${(steps || []).map((step) => `
        <li>
          <strong>${esc(step.title)}</strong>
          <div class="card-meta">${esc(step.detail)}</div>
          <div class="take-actions">
            ${step.url ? `<a class="btn" href="${esc(step.url)}" target="_blank" rel="noreferrer">Open</a>` : ''}
            ${step.command
              ? `<button class="btn" data-platform-action="copy-command" data-command="${esc(step.command)}">Copy command</button>`
              : ''}
          </div>
        </li>
      `).join('')}
    </ol>
  `;
  return `
    ${header('Platforms / credentials', `
      <button class="btn-back" data-nav="">Scripts</button>
      <button class="btn" data-platform-action="refresh">Refresh</button>
    `)}
    <main class="main">
      <div class="card-meta">
        Operator console — secrets stay in Mac env. English via <b>Zernio</b> · China via <b>SAU</b>.
        Checked ${esc(fmtDate(health.checkedAt))}
      </div>

      <div class="section-label">Connect all · ${esc(String(progress.ready))}/${esc(String(progress.total))} ready</div>
      <div class="platform-progress-card">
        <div class="card-meta">
          ${progress.stubOnly ? 'Publish modes are still <b>stub</b> — finish logins, then set live env and restart the agent.' : 'At least one provider is in <b>live</b> mode.'}
        </div>
        <div class="card-meta">
          Missing / not connected: <b>${esc((progress.missing || []).join(', ') || 'none')}</b>
          ${(progress.manual || []).length ? ` · Manual only: <b>${esc(progress.manual.join(', '))}</b>` : ''}
        </div>
        <div class="take-actions">
          <a class="btn btn-primary" href="${esc(zernio.signupUrl || 'https://zernio.com/signup')}" target="_blank" rel="noreferrer">1. Open Zernio</a>
          <a class="btn" href="${esc(zernio.apiKeysUrl || 'https://zernio.com/dashboard/api-keys')}" target="_blank" rel="noreferrer">2. Create API key</a>
          <a class="btn" href="${esc(zernio.connectGuideUrl || zernio.dashboardUrl || 'https://zernio.com/dashboard')}" target="_blank" rel="noreferrer">3. Connect EN accounts</a>
          <button class="btn" data-platform-action="sync-zernio">4. Sync Zernio accounts</button>
          <a class="btn" href="${esc((sau.loginLinks || []).find((l) => l.url)?.url || 'https://github.com/dreammis/social-auto-upload')}" target="_blank" rel="noreferrer">5. SAU install</a>
          <button class="btn" data-platform-action="copy-command" data-command="${esc((sau.loginLinks || []).find((l) => l.command)?.command || '')}">6. Copy all SAU logins</button>
        </div>
        ${zernio.suggestedAccountsExport ? `
          <div class="card-meta" style="margin-top:10px">Suggested from live Zernio accounts:</div>
          <pre class="platform-export-block">${esc(zernio.suggestedAccountsExport)}</pre>
          <button class="btn" data-platform-action="copy-command" data-command="${esc(zernio.suggestedAccountsExport)}">Copy ZERNIO_ACCOUNTS_JSON export</button>
        ` : `<div class="card-meta" style="margin-top:10px">No live Zernio accounts synced yet — set ZERNIO_API_KEY on the agent, connect channels in Zernio, then Sync.</div>`}
      </div>

      <div class="section-label">Providers</div>
      <div class="platform-provider-grid">
        <article class="platform-provider-card">
          <div class="card-title">Zernio (English)</div>
          <div class="card-meta">Mode: <b>${esc(zernio.mode || 'stub')}</b> · API key: <b>${zernio.hasApiKey ? 'set' : 'missing'}</b> · live accounts: <b>${esc(String((zernio.liveAccounts || []).length))}</b></div>
          <div class="take-actions">
            ${(zernio.loginLinks || []).map((link) => link.url
              ? `<a class="btn" href="${esc(link.url)}" target="_blank" rel="noreferrer">${esc(link.label)}</a>`
              : link.command
              ? `<button class="btn" data-platform-action="copy-command" data-command="${esc(link.command)}">${esc(link.label)}</button>`
              : '').join('')}
            <button class="btn" data-platform-action="sync-zernio">Sync accounts</button>
            <button class="btn" data-platform-action="test-provider" data-provider="zernio">Test connection</button>
          </div>
          ${renderSteps(zernio.signupSteps)}
          <ul class="platform-env-list">
            ${(zernio.envDocs || []).map((line) => `<li><code>${esc(line)}</code></li>`).join('')}
          </ul>
        </article>
        <article class="platform-provider-card">
          <div class="card-title">social-auto-upload (China)</div>
          <div class="card-meta">Mode: <b>${esc(sau.mode || 'stub')}</b></div>
          <div class="card-meta">${esc(sau.installHint || sau.dashboardHint || '')}</div>
          <div class="take-actions">
            ${(sau.loginLinks || []).map((link) => link.url
              ? `<a class="btn" href="${esc(link.url)}" target="_blank" rel="noreferrer">${esc(link.label)}</a>`
              : link.command
              ? `<button class="btn" data-platform-action="copy-command" data-command="${esc(link.command)}">${esc(link.label)}</button>`
              : '').join('')}
            <button class="btn" data-platform-action="test-provider" data-provider="sau">Test connection</button>
          </div>
          ${renderSteps(sau.signupSteps)}
          <ul class="platform-env-list">
            ${(sau.envDocs || []).map((line) => `<li><code>${esc(line)}</code></li>`).join('')}
          </ul>
        </article>
      </div>

      <div class="section-label">Zernio platforms</div>
      <div class="platform-status-grid">
        ${zernioRows.map((entry) => `
          <article class="platform-status-card">
            <div class="card-top">
              <div class="card-title">${esc(platformLabel(entry.platform))}</div>
              <span class="publish-badge publish-badge-${esc(String(entry.status).replace(/_/g, '-'))}">${esc(platformStatusLabel(entry.status))}</span>
            </div>
            <div class="card-meta">mode ${esc(entry.mode)}${entry.accountMasked ? ` · ${esc(entry.accountLabel || 'account')} ${esc(entry.accountMasked)}` : ''}</div>
            ${(entry.notes || []).map((note) => `<div class="card-meta">${esc(note)}</div>`).join('')}
            <div class="take-actions">
              ${entry.dashboardUrl ? `<a class="btn" href="${esc(entry.dashboardUrl)}" target="_blank" rel="noreferrer">Dashboard</a>` : ''}
              ${(entry.loginLinks || []).filter((link) => link.url && link.url !== entry.dashboardUrl).map((link) =>
                `<a class="btn" href="${esc(link.url)}" target="_blank" rel="noreferrer">${esc(link.label)}</a>`,
              ).join('')}
              <button class="btn" data-platform-action="test-platform" data-platform="${esc(entry.platform)}">Test</button>
            </div>
          </article>
        `).join('') || '<div class="card-meta">No Zernio platforms</div>'}
      </div>

      <div class="section-label">China / SAU platforms</div>
      <div class="platform-status-grid">
        ${sauRows.map((entry) => `
          <article class="platform-status-card">
            <div class="card-top">
              <div class="card-title">${esc(platformLabel(entry.platform))}</div>
              <span class="publish-badge publish-badge-${esc(String(entry.status).replace(/_/g, '-'))}">${esc(platformStatusLabel(entry.status))}</span>
            </div>
            <div class="card-meta">mode ${esc(entry.mode)}${entry.accountMasked ? ` · ${esc(entry.accountLabel || 'account')} ${esc(entry.accountMasked)}` : ''}</div>
            ${(entry.notes || []).map((note) => `<div class="card-meta">${esc(note)}</div>`).join('')}
            <div class="take-actions">
              ${(entry.loginLinks || []).filter((link) => link.url).map((link) =>
                `<a class="btn" href="${esc(link.url)}" target="_blank" rel="noreferrer">${esc(link.label)}</a>`,
              ).join('')}
              ${entry.loginCommand
                ? `<button class="btn" data-platform-action="copy-command" data-command="${esc(entry.loginCommand)}">Copy login</button>`
                : ''}
              <button class="btn" data-platform-action="test-platform" data-platform="${esc(entry.platform)}" ${entry.status === 'manual' ? 'disabled' : ''}>Test</button>
            </div>
          </article>
        `).join('') || '<div class="card-meta">No SAU platforms</div>'}
      </div>
    </main>
  `;
}

function catalogScript(scriptId) {
  return (state.catalog?.scripts || []).find((entry) => entry.scriptId === scriptId) || null;
}

function renderCutReview(jobId, review) {
  if (!review) return '';
  const videoId = `cut-video-${jobId}`;
  return `
    <div class="section-label">Cut · CapCut-style transcript</div>
    <div class="card-meta">One source clip · click a sentence to jump · crossed lines are removed (still visible) · grouped by slide</div>
    <div class="cut-studio" data-cut-studio="${esc(jobId)}">
      <div class="cut-studio-video">
        <video id="${esc(videoId)}" class="cut-main-video" controls preload="metadata" src="${esc(review.sourceVideoUrl)}"></video>
        <div class="card-meta" id="cut-time-${esc(jobId)}">0.00s</div>
        ${review.editedVideoUrl ? `<div class="card-meta">Edited preview after rebuild: <a href="${esc(review.editedVideoUrl)}" target="_blank" rel="noreferrer">open</a></div>` : ''}
      </div>
      <div class="cut-studio-transcript">
        ${(review.slides || []).map((slide) => `
          <div class="cut-slide-block">
            <div class="cut-slide-title">${esc(slide.slideTitle)}</div>
            <div class="cut-slide-meta">${slide.sourceStart.toFixed(1)}s → ${slide.sourceEnd.toFixed(1)}s · ${(slide.lines || []).length} lines</div>
            ${(slide.lines || []).map((line) => {
              const removed = !line.kept;
              const kindLabel = line.kind === 'silence' ? 'silent' : line.kind === 'keep' ? 'keep' : line.kind;
              const toggleAction = line.toggleMode === 'bad'
                ? (line.kept ? 'drop-restore' : 'restore')
                : (line.kept ? 'drop-good' : 'undrop-good');
              const toggleLabel = line.kept ? 'Cut' : 'Keep';
              return `
                <div
                  class="cut-line ${removed ? 'cut-line-removed' : 'cut-line-kept'}"
                  data-cut-seek="${esc(jobId)}"
                  data-start="${line.start}"
                  data-end="${line.end}"
                  data-line-id="${esc(line.id)}"
                >
                  <div class="cut-line-top">
                    <span class="cut-line-time">${line.start.toFixed(1)}s</span>
                    <span class="badge ${line.kept ? 'filmed' : ''}">${esc(kindLabel)}</span>
                    <span class="cut-line-reason">${esc(line.reason)}</span>
                    <button
                      type="button"
                      class="btn cut-line-toggle"
                      data-cut-action="${esc(toggleAction)}"
                      data-job="${esc(jobId)}"
                      data-start="${line.toggleStart}"
                      data-end="${line.toggleEnd}"
                    >${esc(toggleLabel)}</button>
                  </div>
                  <div class="cut-line-text">${esc(line.text)}</div>
                </div>
              `;
            }).join('')}
          </div>
        `).join('') || '<div class="empty">No transcript segments in analysis.json</div>'}
      </div>
    </div>
    <div class="take-actions">
      <button class="btn btn-primary" data-cut-action="rerun" data-job="${esc(jobId)}">Apply selection &amp; rebuild cut</button>
    </div>
  `;
}

function wireCutStudio() {
  document.querySelectorAll('[data-cut-studio]').forEach((studio) => {
    if (studio.dataset.wired === '1') return;
    studio.dataset.wired = '1';
    const jobId = studio.getAttribute('data-cut-studio');
    const video = document.getElementById(`cut-video-${jobId}`);
    const timeLabel = document.getElementById(`cut-time-${jobId}`);
    if (!video) return;

    const lines = [...studio.querySelectorAll('.cut-line')];

    const setActive = (activeId) => {
      lines.forEach((line) => {
        line.classList.toggle('cut-line-active', line.getAttribute('data-line-id') === activeId);
      });
    };

    studio.addEventListener('click', (event) => {
      const toggle = event.target.closest('[data-cut-action]');
      if (toggle) {
        event.stopPropagation();
        void handleCutAction(toggle).catch((error) => alert(error.message || String(error)));
        return;
      }
      const line = event.target.closest('[data-cut-seek]');
      if (!line) return;
      const start = Number(line.getAttribute('data-start') || 0);
      video.currentTime = Math.max(0, start);
      void video.play();
      setActive(line.getAttribute('data-line-id'));
    });

    video.addEventListener('timeupdate', () => {
      const t = video.currentTime;
      if (timeLabel) timeLabel.textContent = `${t.toFixed(2)}s`;
      let active = null;
      for (const line of lines) {
        const start = Number(line.getAttribute('data-start'));
        const end = Number(line.getAttribute('data-end'));
        if (t >= start && t < end) {
          active = line.getAttribute('data-line-id');
          break;
        }
      }
      if (active) setActive(active);
    });
  });
}

function remotionStudioEmbedUrl(preferredUrl, compositionPath = 'video-outdoor-landscape') {
  const fallback = `http://127.0.0.1:3000/${compositionPath}`;
  const raw = (preferredUrl || fallback).trim();
  try {
    const url = new URL(raw, window.location.origin);
    // Same hostname as the agent page — LAN IP iframes from localhost stay blank (PNA).
    const pageHost = window.location.hostname;
    if (pageHost === '127.0.0.1' || pageHost === 'localhost') {
      url.hostname = '127.0.0.1';
      url.port = '3000';
      url.protocol = 'http:';
    } else if (pageHost) {
      url.hostname = pageHost;
      if (!url.port || url.port === '8788') {
        url.port = '3000';
      }
    }
    if (!url.pathname || url.pathname === '/' || url.pathname === '/video-outdoor-landscape' || url.pathname === '/video-outdoor-portrait') {
      url.pathname = `/${compositionPath}`;
    }
    // Composition canvas only — editable narration overlay stays in standalone Remotion Studio.
    url.searchParams.set('outdoorEmbed', '1');
    return url.toString().replace(/\/+$/, '');
  } catch {
    return fallback;
  }
}

function remotionStudioOrigin(studioUrl) {
  try {
    return new URL(studioUrl).origin;
  } catch {
    return 'http://127.0.0.1:3000';
  }
}

function renderAlignReview(jobId, review, _compositePreviewUrl) {
  if (!review) return '';
  const landscapeUrl = remotionStudioEmbedUrl(
    review.remotionCompositionUrl || review.remotionStudioUrl,
    'video-outdoor-landscape',
  );
  const portraitUrl = remotionStudioEmbedUrl(
    review.remotionPortraitUrl || review.remotionStudioUrl,
    'video-outdoor-portrait',
  );
  const slides = review.slides || [];
  const first = slides[0];
  const slidesJson = JSON.stringify(slides).replace(/</g, '\\u003c');
  return `
    <div class="section-label">Align · Remotion editor</div>
    <div class="card-meta">
      One Studio window · drag the filmed <strong>clip mask</strong> + hint panels ·
      beat tags seek the timeline · layout <code>${esc(review.layoutPath)}</code>
    </div>
    <div class="take-actions" style="margin-bottom:10px">
      <a class="btn btn-primary" href="${esc(landscapeUrl)}" target="_blank" rel="noreferrer" data-align-popout="${esc(jobId)}">Pop out Studio</a>
      <button class="btn" data-align-action="sync-studio" data-job="${esc(jobId)}">Sync Studio layout → take</button>
      <button class="btn" data-align-action="regen-composite" data-job="${esc(jobId)}">Regenerate composite from Studio layout</button>
    </div>
    <div
      class="align-beat-tags"
      data-align-beats="${esc(jobId)}"
      data-studio-origin="${esc(remotionStudioOrigin(landscapeUrl))}"
      data-landscape-url="${esc(landscapeUrl)}"
      data-portrait-url="${esc(portraitUrl)}"
    >
      ${slides.map((slide) => {
        const beat = slide.beatIndex;
        const frame = Math.max(0, Math.round(slide.editedStart * 30));
        const label = slide.slideTitle || `Beat ${beat + 1}`;
        return `
          <button
            type="button"
            class="align-beat-tag${beat === 0 ? ' align-beat-tag-active' : ''}"
            data-align-seek
            data-job="${esc(jobId)}"
            data-beat="${beat}"
            data-frame="${frame}"
            data-start="${slide.editedStart}"
            title="${esc(label)} · ${slide.editedStart.toFixed(1)}s"
          >
            <span class="align-beat-tag-index">${beat + 1}</span>
            <span class="align-beat-tag-label">${esc(label)}</span>
            <span class="align-beat-tag-time">${slide.editedStart.toFixed(1)}s</span>
          </button>
        `;
      }).join('')}
    </div>
    <div class="card-meta align-seek-status" data-align-seek-status="${esc(jobId)}">
      Beat 1 · seek ~${(first?.editedStart ?? 0).toFixed(1)}s (frame ${Math.max(0, Math.round((first?.editedStart ?? 0) * 30))})
    </div>
    <div class="align-compare" data-align-compare="${esc(jobId)}">
      <div class="align-compare-pane">
        <div class="align-compare-title">Script</div>
        <div class="align-compare-body" data-align-script="${esc(jobId)}">${esc(first?.say || 'No script for this beat.')}</div>
      </div>
      <div class="align-compare-pane">
        <div class="align-compare-title">Said</div>
        <div class="align-compare-body align-said-list" data-align-said="${esc(jobId)}">
          ${(first?.saidLines || []).map((line) => `
            <button
              type="button"
              class="align-said-line"
              data-align-said-seek
              data-job="${esc(jobId)}"
              data-frame="${Math.max(0, Math.round(line.start * 30))}"
              data-start="${line.start}"
            >${esc(line.text)}</button>
          `).join('') || '<div class="card-meta">No spoken lines for this beat.</div>'}
        </div>
      </div>
    </div>
    <div class="align-format-tabs" data-align-format-tabs="${esc(jobId)}">
      <button type="button" class="align-format-tab align-format-tab-active" data-align-format="landscape" data-job="${esc(jobId)}">Landscape</button>
      <button type="button" class="align-format-tab" data-align-format="portrait" data-job="${esc(jobId)}">Portrait</button>
    </div>
    <div class="remotion-editor-frame align-remotion-single" data-job="${esc(jobId)}" data-align-format="landscape">
      <iframe
        class="remotion-studio-embed"
        id="remotion-studio-${esc(jobId)}"
        title="Remotion Studio outdoor"
        data-studio-src="${esc(landscapeUrl)}"
        data-landscape-src="${esc(landscapeUrl)}"
        data-portrait-src="${esc(portraitUrl)}"
        allow="autoplay; clipboard-write; fullscreen"
      ></iframe>
      <div class="remotion-embed-fallback card-meta">
        Loading Remotion Studio… Start <code>cd remotion && npm run studio:lan</code> if blank, then hard-refresh.
      </div>
    </div>
    <script type="application/json" id="align-slides-${esc(jobId)}">${slidesJson}</script>
  `;
}

function platformLabel(platform, group) {
  if (group === 'headline' && platform === 'EN') return 'Headline EN';
  if (group === 'headline' && platform === 'ZH') return 'Headline ZH';
  const labels = {
    youtube: 'YouTube',
    x: 'X',
    linkedin: 'LinkedIn',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    facebook: 'Facebook',
    bluesky: 'Bluesky',
    bilibili: '哔哩哔哩',
    douyin: '抖音',
    xiaohongshu: '小红书',
    weibo: '微博',
    wechat_channels: '视频号',
    kuaishou: '快手',
  };
  return labels[platform] || platform;
}

function latestPublishPost(publish, platform) {
  const posts = (publish?.posts || []).filter((entry) => entry.platform === platform);
  if (!posts.length) return null;
  const live = posts.find((entry) => entry.status === 'live');
  if (live) return live;
  return [...posts].sort((a, b) =>
    String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')),
  )[0];
}

function publishStatusLabel(post) {
  if (!post) return 'not published';
  if (post.status === 'live' && post.stub) return 'stub';
  return post.status || 'not published';
}

function renderPublishControls(jobId, platform, publish) {
  const post = latestPublishPost(publish, platform);
  const status = publishStatusLabel(post);
  const isLive = post?.status === 'live';
  return `
    <div class="publish-controls" data-publish-platform="${esc(platform)}">
      <span class="publish-badge publish-badge-${esc(status.replace(/\s+/g, '-'))}">${esc(status)}</span>
      ${isLive
        ? `
          ${post.url ? `<a class="btn" href="${esc(post.url)}" target="_blank" rel="noreferrer">Open post</a>` : ''}
          <button type="button" class="btn" data-publish-action="hide" data-job="${esc(jobId)}" data-platform="${esc(platform)}">Hide</button>
          <button type="button" class="btn btn-danger" data-publish-action="delete" data-job="${esc(jobId)}" data-platform="${esc(platform)}">Delete</button>
        `
        : `
          <button type="button" class="btn btn-primary" data-publish-action="publish" data-job="${esc(jobId)}" data-platform="${esc(platform)}">Publish</button>
          ${post?.url && (post.status === 'hidden' || post.status === 'deleted')
            ? `<a class="btn" href="${esc(post.url)}" target="_blank" rel="noreferrer">Last link</a>`
            : ''}
        `}
    </div>
  `;
}

function renderSocialFieldCard({ jobId, group, platform, title, body, titleOnly, covers, publish }) {
  const idBase = `social-${jobId}-${group}-${platform}`;
  const coverOptions = covers?.covers || [];
  const selectedCover = covers?.platformCovers?.[platform] || '';
  const coverSelect = titleOnly || !covers ? '' : `
    <label class="social-field-label" for="${esc(idBase)}-cover">Cover</label>
    <select
      id="${esc(idBase)}-cover"
      class="social-input"
      data-cover-platform="${esc(platform)}"
      data-job="${esc(jobId)}"
    >
      <option value="">None</option>
      ${coverOptions.map((cover) => `
        <option value="${esc(cover.id)}" ${cover.id === selectedCover ? 'selected' : ''}>
          ${esc(cover.label || cover.id)}
        </option>
      `).join('')}
    </select>
  `;
  return `
    <div class="social-setup-card" data-social-card data-group="${esc(group)}" data-platform="${esc(platform)}">
      <div class="platform">${esc(platformLabel(platform, group))}</div>
      <label class="social-field-label" for="${esc(idBase)}-title">Title</label>
      <input
        id="${esc(idBase)}-title"
        class="social-input"
        type="text"
        data-social-field="title"
        data-job="${esc(jobId)}"
        data-group="${esc(group)}"
        data-platform="${esc(platform)}"
        value="${esc(title || '')}"
      />
      ${titleOnly ? '' : `
        <label class="social-field-label" for="${esc(idBase)}-body">Body</label>
        <textarea
          id="${esc(idBase)}-body"
          class="social-textarea"
          rows="5"
          data-social-field="body"
          data-job="${esc(jobId)}"
          data-group="${esc(group)}"
          data-platform="${esc(platform)}"
        >${esc(body || '')}</textarea>
        <div class="card-meta social-char-count">${esc(String((body || '').length))} chars</div>
        ${coverSelect}
        ${renderPublishControls(jobId, platform, publish)}
      `}
    </div>
  `;
}

function renderCoverLibrary(jobId, covers) {
  const items = covers?.covers || [];
  return `
    <div class="social-group-label">Cover library</div>
    <div class="card-meta">Upload stills for this take · assign per platform or batch EN / 中文</div>
    <div class="take-actions" style="margin-bottom:10px">
      <label class="btn">
        Upload cover
        <input type="file" accept="image/png,image/jpeg,image/webp" hidden data-cover-upload="${esc(jobId)}" />
      </label>
      <button class="btn" data-cover-action="capture-portrait" data-job="${esc(jobId)}">
        Capture portrait still
      </button>
      <button class="btn" data-cover-action="capture-landscape" data-job="${esc(jobId)}">
        Capture landscape still
      </button>
      <button class="btn" data-cover-action="batch-english" data-job="${esc(jobId)}" ${items.length ? '' : 'disabled'}>
        Apply selected → all English
      </button>
      <button class="btn" data-cover-action="batch-china" data-job="${esc(jobId)}" ${items.length ? '' : 'disabled'}>
        Apply selected → all 中文
      </button>
    </div>
    <div class="cover-library" data-cover-library="${esc(jobId)}">
      ${items.map((cover) => `
        <div class="cover-tile${covers.platformCovers && Object.values(covers.platformCovers).includes(cover.id) ? '' : ''}" data-cover-id="${esc(cover.id)}">
          <button
            type="button"
            class="cover-tile-select"
            data-cover-action="select-library"
            data-job="${esc(jobId)}"
            data-cover-id="${esc(cover.id)}"
            title="${esc(cover.label)}"
          >
            <img src="${esc(cover.url)}" alt="${esc(cover.label)}" loading="lazy" />
          </button>
          <div class="cover-tile-meta">
            <input
              class="social-input cover-label-input"
              type="text"
              value="${esc(cover.label || cover.id)}"
              data-cover-label="${esc(cover.id)}"
              data-job="${esc(jobId)}"
            />
            <div class="card-meta">
              ${(cover.usedBy || []).length
                ? esc((cover.usedBy || []).join(', '))
                : 'unused'}
            </div>
            <div class="cover-tile-actions">
              <button type="button" class="btn" data-cover-action="rename" data-job="${esc(jobId)}" data-cover-id="${esc(cover.id)}">Rename</button>
              <button type="button" class="btn" data-cover-action="duplicate" data-job="${esc(jobId)}" data-cover-id="${esc(cover.id)}">Duplicate</button>
              <button type="button" class="btn btn-danger" data-cover-action="delete" data-job="${esc(jobId)}" data-cover-id="${esc(cover.id)}">Delete</button>
            </div>
          </div>
        </div>
      `).join('') || '<div class="card-meta">No covers yet — upload a PNG/JPG.</div>'}
    </div>
    <input type="hidden" data-cover-selected="${esc(jobId)}" value="${esc(items[0]?.id || '')}" />
  `;
}

function renderSocialSetup(jobId, social, status = 'review', covers = null, publish = null) {
  if (!social) {
    return `
      <div class="section-label">Social setup</div>
      <div class="card-meta">No social pack for this take yet.</div>
      ${jobId ? renderCoverLibrary(jobId, covers) : ''}
    `;
  }
  const english = social.english || {};
  const china = social.china || {};
  const englishPlatforms = Object.keys(english);
  const chinaPlatforms = Object.keys(china);
  return `
    <div class="section-label">Social setup · ${esc(status)}</div>
    <div class="card-meta">
      Edit AI copy lightly · saves to this take’s social run (not the script template)
      ${social.updatedAt ? ` · updated ${esc(fmtDate(social.updatedAt))}` : ''}
    </div>
    <div class="take-actions" style="margin-bottom:10px">
      <button class="btn btn-primary" data-social-action="save" data-job="${esc(jobId)}">Save social edits</button>
      <button class="btn" data-publish-action="publish-all" data-job="${esc(jobId)}">Publish all</button>
    </div>

    ${renderCoverLibrary(jobId, covers)}

    <div class="social-group-label">English</div>
    <div class="social-setup-grid" data-social-group="english" data-job="${esc(jobId)}">
      ${renderSocialFieldCard({
        jobId,
        group: 'headline',
        platform: 'EN',
        title: social.titleEnglish || social.title || '',
        body: '',
        titleOnly: true,
        covers,
        publish,
      })}
      ${englishPlatforms.map((platform) => renderSocialFieldCard({
        jobId,
        group: 'english',
        platform,
        title: english[platform]?.title || '',
        body: english[platform]?.body || '',
        titleOnly: false,
        covers,
        publish,
      })).join('') || '<div class="card-meta">No English platforms</div>'}
    </div>

    <div class="social-group-label">中文 / China</div>
    <div class="social-setup-grid" data-social-group="china" data-job="${esc(jobId)}">
      ${renderSocialFieldCard({
        jobId,
        group: 'headline',
        platform: 'ZH',
        title: social.titleChina || '',
        body: '',
        titleOnly: true,
        covers,
        publish,
      })}
      ${chinaPlatforms.map((platform) => renderSocialFieldCard({
        jobId,
        group: 'china',
        platform,
        title: china[platform]?.title || '',
        body: china[platform]?.body || '',
        titleOnly: false,
        covers,
        publish,
      })).join('') || '<div class="card-meta">No China platforms</div>'}
    </div>
  `;
}

function renderCompositeRunChips(jobId, job) {
  const runs = [...(job?.runs?.composite || [])].sort((a, b) =>
    String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
  );
  const selected = job?.selectedRuns?.composite || null;
  if (!runs.length) {
    return '<div class="card-meta">No composite runs yet — regenerate after Align.</div>';
  }
  return `
    <div class="run-chips">
      ${runs.map((run) => {
        const active = run.runId === selected;
        const shortId = String(run.runId || '').slice(-10);
        const when = run.createdAt ? fmtDate(run.createdAt) : '';
        return `
          <button
            type="button"
            class="run-chip${active ? ' run-chip-active' : ''}"
            data-align-action="select-composite"
            data-job="${esc(jobId)}"
            data-run-id="${esc(run.runId)}"
            title="${esc(run.runId)}${when ? ` · ${when}` : ''}"
          >${esc(shortId)} · ${esc(run.status)}${active ? ' · active' : ''}</button>
        `;
      }).join('')}
    </div>
  `;
}

function renderCompositeBlock(jobId, job, stage) {
  const status = stage?.status || job?.runs?.composite?.find(
    (entry) => entry.runId === job?.selectedRuns?.composite,
  )?.status || 'pending';
  const summary = (stage?.summary || []).join(' · ');
  const videos = [...(stage?.videos || [])];
  return `
    <div class="section-label">Composite · ${esc(status)}</div>
    <div class="take-actions" style="margin-bottom:10px">
      <button class="btn btn-primary" data-align-action="regen-composite" data-job="${esc(jobId)}">
        Regenerate composite from Studio layout
      </button>
    </div>
    ${renderCompositeRunChips(jobId, job)}
    ${summary ? `<div class="card-meta">${esc(summary)}</div>` : ''}
    <div class="videos">
      ${videos.map((video) => `
        <div class="video-card">
          <label>${esc(video.label)}</label>
          <video controls preload="metadata" src="${esc(video.url)}"></video>
        </div>
      `).join('') || '<div class="card-meta">No composite video yet</div>'}
    </div>
  `;
}

function renderTakeResults(scriptId, take, results, extras = {}) {
  const { cutReview, alignReview, jobId, job, covers, publish } = extras;
  const parts = [];
  const runs = take.selectedRuns || job?.selectedRuns || {};
  const compositePreviewUrl = runs.composite
    ? artifactUrl(scriptId, take.takeId, 'composite', runs.composite, `${scriptId}-outdoor-landscape.mp4`)
    : null;

  if (cutReview) {
    parts.push(renderCutReview(jobId, cutReview));
  }

  if (alignReview) {
    parts.push(renderAlignReview(jobId, alignReview, compositePreviewUrl));
  }

  if (!results?.stages) {
    const selected = runs.composite;
    const videos = [];
    if (take.hasSourceVideo) {
      videos.push({ label: 'Source', url: sourceUrl(scriptId, take.takeId) });
    }
    if (selected) {
      videos.push({
        label: 'Portrait',
        url: artifactUrl(scriptId, take.takeId, 'composite', selected, `${scriptId}-outdoor-portrait.mp4`),
      });
      videos.push({
        label: 'Landscape',
        url: artifactUrl(scriptId, take.takeId, 'composite', selected, `${scriptId}-outdoor-landscape.mp4`),
      });
    }
    if (jobId) {
      parts.push(renderCompositeBlock(jobId, job, {
        status: selected ? 'selected' : 'pending',
        summary: [],
        videos: videos.filter((video) => video.label !== 'Source'),
      }));
      if (take.hasSourceVideo) {
        parts.push(`
          <div class="section-label">Source</div>
          <div class="videos">
            <div class="video-card">
              <label>Source</label>
              <video controls preload="metadata" src="${esc(sourceUrl(scriptId, take.takeId))}"></video>
            </div>
          </div>
        `);
      }
    } else {
      parts.push(`
        <div class="videos">
          ${videos.map((video) => `
            <div class="video-card">
              <label>${esc(video.label)}</label>
              <video controls preload="metadata" src="${esc(video.url)}"></video>
            </div>
          `).join('') || '<div class="card-meta">No videos yet</div>'}
        </div>
      `);
    }
    return parts.join('');
  }

  for (const stage of results.stages) {
    if (stage.stage === 'cut' || stage.stage === 'align') {
      // detailed review sections above
      continue;
    }
    if (stage.stage === 'social') {
      parts.push(renderSocialSetup(jobId, stage.social, stage.status, covers, publish));
      continue;
    }
    if (stage.stage === 'composite') {
      parts.push(renderCompositeBlock(jobId, job, stage));
      continue;
    }
    const videos = [...(stage.videos || [])];
    parts.push(`
      <div class="section-label">${esc(stage.stage)} · ${esc(stage.status)}</div>
      <div class="card-meta">${esc((stage.summary || []).join(' · '))}</div>
      <div class="videos">
        ${videos.map((video) => `
          <div class="video-card">
            <label>${esc(video.label)}</label>
            <video controls preload="metadata" src="${esc(video.url)}"></video>
          </div>
        `).join('') || '<div class="card-meta">No video yet</div>'}
      </div>
    `);
  }
  return parts.join('');
}

async function renderScriptDetail(scriptId) {
  const meta = catalogScript(scriptId);
  let script;
  try {
    script = await loadScript(scriptId);
  } catch (error) {
    return header('Script') + `<div class="error">${esc(error.message)}</div>`;
  }

  const takes = meta?.takes || [];
  const takeBlocks = [];
  for (const take of takes) {
    let results = null;
    let cutReview = null;
    let alignReview = null;
    let jobRecord = null;
    let covers = null;
    let publish = null;
    const jobId = `job-${take.takeId}`;
    try {
      const detail = await loadJob(jobId);
      results = detail.results;
      jobRecord = detail.job || null;
      publish = detail.publish || null;
      cutReview = await loadCutReview(jobId);
      alignReview = await loadAlignReview(jobId);
      covers = await loadCovers(jobId);
    } catch {
      // pipeline may not exist yet
    }
    const ingest = (state.inbox?.recentIngests || []).find((entry) => entry.takeId === take.takeId);
    takeBlocks.push(`
      <article class="take-card">
        <div class="card-top">
          <div>
            <div class="card-title">${esc(take.takeId)}</div>
            <div class="card-meta">
              video file: <b>${esc(ingest?.videoFileName || `${take.takeId}.mp4`)}</b>
              · ${esc(fmtDate(take.recordedAt))}
              ${take.durationMs ? ` · ${esc(fmtDuration(take.durationMs))}` : ''}
              · ${esc(take.pipelineStatus || 'unknown')}
            </div>
            ${ingest ? `<div class="card-meta">Mac picked from: <code>${esc(ingest.videoPath || ingest.inboxDir)}</code></div>` : ''}
            ${ingest?.takeDir ? `<div class="card-meta">Post-process folder: <code>${esc(ingest.takeDir)}</code></div>` : ''}
          </div>
          <span class="badge filmed">${esc(take.pipelineStatus || 'take')}</span>
        </div>
        ${renderTakeResults(scriptId, take, results, { cutReview, alignReview, jobId, job: jobRecord, covers, publish })}
      </article>
    `);
  }

  return `
    ${header(script.title, `
      <button class="btn-back" data-nav="">Scripts</button>
      <button class="btn" data-nav="platforms">Platforms</button>
      <button class="btn btn-primary" data-nav="film/${encodeURIComponent(scriptId)}">Film</button>
    `)}
    <main class="main">
      <div class="card-meta" style="margin: 8px 0 4px">
        ${script.slides.length} slides
        · ${takeStatusLabel(takes.length)}
        ${meta?.seriesId ? ` · ${esc(meta.seriesId)}` : ''}
        ${script.countdownSeconds ? ` · countdown ${script.countdownSeconds}s` : ''}
      </div>

      <div class="section-label">Script</div>
      ${script.slides.map((slide, index) => `
        <article class="slide-card">
          <div class="slide-index">${index + 1}</div>
          <div class="slide-title">${esc(slide.title || `Slide ${index + 1}`)}</div>
          <div class="slide-body">${esc(slide.body)}</div>
          ${slide.notes || slide.leanCode || slide.turnCode
            ? `<div class="slide-notes">${esc(slide.leanCode || slide.turnCode || slide.notes)}</div>`
            : ''}
        </article>
      `).join('')}

      <div class="section-label">Takes</div>
      ${takeBlocks.join('') || '<div class="empty">No takes yet — tap Film to record.</div>'}
    </main>
  `;
}

function renderFilmShell(script) {
  return `
    <div class="film-root" id="film-root">
      <video class="film-video" id="film-preview" playsinline muted autoplay></video>
      <div class="rec-badge" id="rec-badge" hidden>REC 0:00</div>
      <div class="film-overlay">
        <div class="prompt-card">
          <div class="prompt-progress" id="prompt-progress">Slide 1 / ${script.slides.length}</div>
          <div class="prompt-words" id="prompt-words"></div>
          <div class="prompt-code" id="prompt-code" hidden>
            <div class="prompt-code-label" id="prompt-code-label">Lean</div>
            <pre id="prompt-code-body"></pre>
          </div>
        </div>
        <div class="film-controls">
          <button class="btn" id="btn-prev">Prev</button>
          <button class="btn" id="btn-next">Next</button>
          <button class="btn btn-danger" id="btn-record">Record</button>
          <button class="btn" id="btn-flip">Flip</button>
          <button class="btn" id="btn-ng" disabled>NG</button>
          <button class="btn" id="btn-close">Close</button>
        </div>
      </div>
      <div class="countdown" id="countdown" hidden></div>
      <div class="modal" id="film-modal" hidden>
        <div class="modal-card">
          <h2>Take ready</h2>
          <p id="modal-summary"></p>
          <div class="modal-actions">
            <button class="btn btn-primary" id="btn-upload">Upload to Mac pipeline</button>
            <button class="btn" id="btn-retake">Retake</button>
            <button class="btn" id="btn-done">Done</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function teardownFilm() {
  const film = state.film;
  if (!film) return;
  try {
    film.recorder?.stop();
  } catch {}
  film.stream?.getTracks().forEach((track) => track.stop());
  if (film.timer) clearInterval(film.timer);
  state.film = null;
}

async function startFilm(scriptId) {
  const script = await loadScript(scriptId);
  app.innerHTML = renderFilmShell(script);

  const preview = document.getElementById('film-preview');
  let useFront = true;

  async function openCamera() {
    const old = state.film?.stream;
    old?.getTracks().forEach((track) => track.stop());
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: {
        facingMode: useFront ? 'user' : 'environment',
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    });
    preview.srcObject = stream;
    preview.style.transform = useFront ? 'scaleX(-1)' : 'none';
    if (state.film) state.film.stream = stream;
    return stream;
  }

  const stream = await openCamera();
  state.film = {
    script,
    scriptId,
    stream,
    slideIndex: 0,
    recording: false,
    startedAt: 0,
    slideEvents: [],
    markers: [],
    chunks: [],
    recorder: null,
    mimeType: pickRecorderMime(),
    blob: null,
    takeId: '',
    durationMs: 0,
    timer: null,
  };

  // Ensure post-take modal stays closed until recording finishes.
  const filmModal = document.getElementById('film-modal');
  if (filmModal) filmModal.hidden = true;

  updatePrompt();
  wireFilmControls();

  async function flip() {
    useFront = !useFront;
    await openCamera();
  }

  function updatePrompt() {
    const film = state.film;
    const slide = film.script.slides[film.slideIndex];
    document.getElementById('prompt-progress').textContent =
      `Slide ${film.slideIndex + 1} / ${film.script.slides.length}`;
    document.getElementById('prompt-words').textContent = slide?.body || '';
    const focused = resolveFocusedSlideCode(film.script.slides, film.slideIndex);
    const codeWrap = document.getElementById('prompt-code');
    if (focused.code) {
      codeWrap.hidden = false;
      document.getElementById('prompt-code-label').textContent = focused.label;
      document.getElementById('prompt-code-body').textContent = focused.code;
    } else {
      codeWrap.hidden = true;
    }
  }

  function atMs() {
    return Date.now() - state.film.startedAt;
  }

  function markSlide(index) {
    const slide = state.film.script.slides[index];
    if (!slide) return;
    state.film.slideEvents.push({
      slideId: slide.id,
      index,
      atMs: state.film.recording ? atMs() : 0,
    });
  }

  function showCountdown(seconds) {
    return new Promise((resolve) => {
      const el = document.getElementById('countdown');
      let left = seconds;
      el.hidden = false;
      el.textContent = String(left);
      const tick = setInterval(() => {
        left -= 1;
        if (left <= 0) {
          clearInterval(tick);
          el.hidden = true;
          resolve();
          return;
        }
        el.textContent = String(left);
      }, 1000);
    });
  }

  function updateRecBadge() {
    const badge = document.getElementById('rec-badge');
    if (!state.film.recording) {
      badge.hidden = true;
      return;
    }
    badge.hidden = false;
    badge.textContent = `REC ${fmtDuration(atMs())} · ${state.film.slideEvents.length} marks`;
  }

  async function startRecording() {
    const film = state.film;
    if (film.recording) return;
    const countdown = film.script.countdownSeconds ?? 3;
    if (countdown > 0) await showCountdown(countdown);

    film.chunks = [];
    film.slideEvents = [];
    film.markers = [];
    film.startedAt = Date.now();
    film.recording = true;
    film.takeId = `take-${Date.now().toString(36)}`;
    markSlide(film.slideIndex);

    const options = film.mimeType ? { mimeType: film.mimeType } : undefined;
    const recorder = new MediaRecorder(film.stream, options);
    film.recorder = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data?.size) film.chunks.push(event.data);
    };
    recorder.onstop = () => {
      film.durationMs = atMs();
      film.blob = new Blob(film.chunks, { type: film.mimeType || 'video/webm' });
      film.recording = false;
      clearInterval(film.timer);
      film.timer = null;
      updateRecBadge();
      document.getElementById('btn-record').textContent = 'Record';
      document.getElementById('btn-ng').disabled = true;
      document.getElementById('modal-summary').textContent =
        `${fmtDuration(film.durationMs)} · ${film.slideEvents.length} slide marks · ${film.markers.length} NG`;
      document.getElementById('film-modal').hidden = false;
    };
    recorder.start(1000);
    document.getElementById('btn-record').textContent = 'Stop';
    document.getElementById('btn-ng').disabled = false;
    film.timer = setInterval(updateRecBadge, 250);
    updateRecBadge();
  }

  function stopRecording() {
    const film = state.film;
    if (!film.recording || !film.recorder) return;
    film.recorder.stop();
  }

  function wireFilmControls() {
    document.getElementById('btn-close').onclick = () => {
      teardownFilm();
      location.hash = `#/script/${encodeURIComponent(scriptId)}`;
    };
    document.getElementById('btn-flip').onclick = () => void flip();
    document.getElementById('btn-prev').onclick = () => {
      if (state.film.slideIndex <= 0) return;
      state.film.slideIndex -= 1;
      if (state.film.recording) markSlide(state.film.slideIndex);
      updatePrompt();
    };
    document.getElementById('btn-next').onclick = async () => {
      const film = state.film;
      const next = film.slideIndex + 1;
      if (next >= film.script.slides.length) return;
      const wait = film.script.slides[next]?.countdownSeconds || 0;
      if (wait > 0) await showCountdown(wait);
      film.slideIndex = next;
      if (film.recording) markSlide(film.slideIndex);
      updatePrompt();
    };
    document.getElementById('btn-record').onclick = () => {
      if (state.film.recording) stopRecording();
      else void startRecording();
    };
    document.getElementById('btn-ng').onclick = () => {
      if (!state.film.recording) return;
      state.film.markers.push({
        id: `ng-${state.film.markers.length + 1}`,
        kind: 'ng',
        label: 'NG',
        atMs: atMs(),
      });
      updateRecBadge();
    };
    document.getElementById('btn-retake').onclick = () => {
      document.getElementById('film-modal').hidden = true;
      state.film.blob = null;
      state.film.chunks = [];
    };
    document.getElementById('btn-done').onclick = () => {
      teardownFilm();
      state.jobCache.clear();
      location.hash = `#/script/${encodeURIComponent(scriptId)}`;
    };
    document.getElementById('btn-upload').onclick = () => void uploadTake();
  }

  async function uploadTake() {
    const film = state.film;
    if (!film.blob) return;
    const btn = document.getElementById('btn-upload');
    btn.disabled = true;
    btn.textContent = 'Uploading…';
    const manifest = {
      schemaVersion: 1,
      scriptId: film.script.id,
      scriptTitle: film.script.title,
      takeId: film.takeId,
      recordedAt: new Date().toISOString(),
      videoUri: `${film.takeId}.webm`,
      durationMs: film.durationMs,
      slideEvents: film.slideEvents,
      markers: film.markers,
    };
    const ext = (film.mimeType || '').includes('mp4') ? 'mp4' : 'webm';
    const form = new FormData();
    form.append('take', new Blob([JSON.stringify(manifest)], { type: 'application/json' }), `${film.takeId}.json`);
    form.append('video', film.blob, `${film.takeId}.${ext}`);
    try {
      const result = await api('/api/upload', { method: 'POST', body: form });
      btn.textContent = `Queued ${result.jobId || ''}`.trim();
      state.jobCache.clear();
      state.catalog = null;
      setTimeout(() => {
        teardownFilm();
        location.hash = `#/script/${encodeURIComponent(scriptId)}`;
      }, 800);
    } catch (error) {
      btn.disabled = false;
      btn.textContent = 'Upload to Mac pipeline';
      alert(error.message || String(error));
    }
  }
}

async function render() {
  try {
    if (!state.catalog && state.route.name !== 'film' && state.route.name !== 'platforms') {
      app.innerHTML = header('Scripts') + '<div class="empty">Loading scripts…</div>';
      await Promise.all([loadCatalog(), loadInboxStatus()]);
    } else if (state.route.name === 'library' || state.route.name === 'script') {
      await loadInboxStatus();
    }

    if (state.route.name === 'library') {
      app.innerHTML = renderLibrary();
    } else if (state.route.name === 'script') {
      app.innerHTML = await renderScriptDetail(state.route.scriptId);
    } else if (state.route.name === 'platforms') {
      app.innerHTML = await renderPlatformsPage();
    } else if (state.route.name === 'film') {
      try {
        await startFilm(state.route.scriptId);
      } catch (error) {
        app.innerHTML = header('Film') + `
          <div class="error">
            Camera permission failed: ${esc(error.message)}
            <div style="margin-top:12px">
              <button class="btn" data-nav="script/${encodeURIComponent(state.route.scriptId)}">Back</button>
            </div>
          </div>`;
      }
      return;
    }

    app.onclick = (event) => {
      const nav = event.target.closest('[data-nav]');
      if (nav) {
        const target = nav.getAttribute('data-nav') || '';
        if (target.startsWith('film/') && window.ReactNativeWebView) {
          const scriptId = decodeURIComponent(target.slice('film/'.length));
          window.ReactNativeWebView.postMessage(
            JSON.stringify({ type: 'open-film', scriptId }),
          );
          return;
        }
        location.hash = target ? `#/${target}` : '#/';
        return;
      }
      const action = event.target.closest('[data-action]');
      if (action?.getAttribute('data-action') === 'refresh') {
        state.catalog = null;
        state.jobCache.clear();
        state.cutReviewCache.clear();
        state.alignReviewCache.clear();
        state.coversCache.clear();
        state.inbox = null;
        void render();
        return;
      }
      if (action?.getAttribute('data-action') === 'scan-inbox') {
        void api('/api/inbox/scan', { method: 'POST' })
          .then(() => {
            state.inbox = null;
            state.catalog = null;
            return render();
          })
          .catch((error) => alert(error.message || String(error)));
        return;
      }
      const cutBtn = event.target.closest('[data-cut-action]');
      if (cutBtn) {
        void handleCutAction(cutBtn).catch((error) => alert(error.message || String(error)));
        return;
      }
      const alignBtn = event.target.closest('[data-align-action]');
      if (alignBtn) {
        void handleAlignAction(alignBtn).catch((error) => alert(error.message || String(error)));
        return;
      }
      const socialBtn = event.target.closest('[data-social-action]');
      if (socialBtn) {
        void handleSocialAction(socialBtn).catch((error) => alert(error.message || String(error)));
        return;
      }
      const coverBtn = event.target.closest('[data-cover-action]');
      if (coverBtn) {
        void handleCoverAction(coverBtn).catch((error) => alert(error.message || String(error)));
        return;
      }
      const publishBtn = event.target.closest('[data-publish-action]');
      if (publishBtn) {
        void handlePublishAction(publishBtn).catch((error) => alert(error.message || String(error)));
        return;
      }
      const platformBtn = event.target.closest('[data-platform-action]');
      if (platformBtn) {
        void handlePlatformAction(platformBtn).catch((error) => alert(error.message || String(error)));
      }
    };
    wireLayoutDrag();
    wireCutStudio();
    wireSocialSetup();
    wireCoverLibrary();
  } catch (error) {
    app.innerHTML = header('Scripts') + `<div class="error">${esc(error.message)}</div>`;
  }
}

function patchCutStudioFromReview(jobId, review) {
  const studio = document.querySelector(`[data-cut-studio="${jobId}"]`);
  if (!studio || !review) return false;

  const transcriptScroll = studio.querySelector('.cut-studio-transcript')?.scrollTop ?? 0;
  const video = document.getElementById(`cut-video-${jobId}`);
  const videoTime = video?.currentTime ?? 0;
  const wasPaused = video ? video.paused : true;
  const activeId = studio.querySelector('.cut-line-active')?.getAttribute('data-line-id');

  const lineById = new Map();
  for (const slide of review.slides || []) {
    for (const line of slide.lines || []) {
      lineById.set(line.id, line);
    }
  }

  studio.querySelectorAll('.cut-line').forEach((el) => {
    const line = lineById.get(el.getAttribute('data-line-id'));
    if (!line) return;
    const removed = !line.kept;
    el.classList.toggle('cut-line-removed', removed);
    el.classList.toggle('cut-line-kept', !removed);
    el.classList.toggle('cut-line-active', el.getAttribute('data-line-id') === activeId);

    const badge = el.querySelector('.badge');
    if (badge) {
      const kindLabel = line.kind === 'silence' ? 'silent' : line.kind === 'keep' ? 'keep' : line.kind;
      badge.textContent = kindLabel;
      badge.classList.toggle('filmed', Boolean(line.kept));
    }
    const reason = el.querySelector('.cut-line-reason');
    if (reason) reason.textContent = line.reason;

    const toggle = el.querySelector('[data-cut-action]');
    if (toggle) {
      const toggleAction = line.toggleMode === 'bad'
        ? (line.kept ? 'drop-restore' : 'restore')
        : (line.kept ? 'drop-good' : 'undrop-good');
      toggle.setAttribute('data-cut-action', toggleAction);
      toggle.setAttribute('data-start', String(line.toggleStart));
      toggle.setAttribute('data-end', String(line.toggleEnd));
      toggle.textContent = line.kept ? 'Cut' : 'Keep';
    }
  });

  const transcript = studio.querySelector('.cut-studio-transcript');
  if (transcript) transcript.scrollTop = transcriptScroll;
  if (video) {
    video.currentTime = videoTime;
    if (!wasPaused) void video.play();
  }
  return true;
}

async function handleCutAction(button) {
  const jobId = button.getAttribute('data-job');
  const action = button.getAttribute('data-cut-action');
  const start = Number(button.getAttribute('data-start'));
  const end = Number(button.getAttribute('data-end'));
  const review = await loadCutReview(jobId);
  if (!review) throw new Error('No cut review');
  const selection = {
    schemaVersion: 1,
    restoreBad: [...(review.selection?.restoreBad || [])],
    dropGood: [...(review.selection?.dropGood || [])],
    updatedAt: new Date().toISOString(),
  };
  const keyMatch = (interval) =>
    Math.abs(interval.start - start) < 0.05 && Math.abs(interval.end - end) < 0.05;

  if (action === 'restore') {
    if (!selection.restoreBad.some(keyMatch)) {
      selection.restoreBad.push({ start, end });
    }
  } else if (action === 'drop-restore') {
    selection.restoreBad = selection.restoreBad.filter((interval) => !keyMatch(interval));
  } else if (action === 'drop-good') {
    if (!selection.dropGood.some(keyMatch)) {
      selection.dropGood.push({ start, end });
    }
  } else if (action === 'undrop-good') {
    selection.dropGood = selection.dropGood.filter((interval) => !keyMatch(interval));
  } else if (action === 'rerun') {
    await api(`/api/jobs/${encodeURIComponent(jobId)}/cut-selection`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selection),
    });
    button.disabled = true;
    button.textContent = 'Rebuilding cut…';
    try {
      await api(`/api/jobs/${encodeURIComponent(jobId)}/cut-apply-selection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      alert('Cut rebuilt from your keep/cut selection (no re-transcribe).');
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error));
    }
    state.cutReviewCache.clear();
    state.jobCache.clear();
    void render();
    return;
  }

  const result = await api(`/api/jobs/${encodeURIComponent(jobId)}/cut-selection`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(selection),
  });
  const nextReview = result.review || null;
  if (nextReview) {
    state.cutReviewCache.set(jobId, nextReview);
    if (patchCutStudioFromReview(jobId, nextReview)) {
      return;
    }
  } else {
    state.cutReviewCache.delete(jobId);
  }

  const pageY = window.scrollY;
  const transcript = document.querySelector(`[data-cut-studio="${jobId}"] .cut-studio-transcript`);
  const transcriptScroll = transcript?.scrollTop ?? 0;
  await render();
  window.scrollTo(0, pageY);
  const nextTranscript = document.querySelector(`[data-cut-studio="${jobId}"] .cut-studio-transcript`);
  if (nextTranscript) nextTranscript.scrollTop = transcriptScroll;
}

function readBeatLayoutFromDom(jobId, beatIndex, fallbackPip, fallbackHint) {
  const id = `${jobId}-${beatIndex}`;
  return {
    pip: {
      ...fallbackPip,
      shape: document.getElementById(`pip-shape-${id}`)?.value || fallbackPip.shape || 'rectangle',
      x: Number(document.getElementById(`pip-x-${id}`)?.value ?? fallbackPip.x ?? 0.02),
      y: Number(document.getElementById(`pip-y-${id}`)?.value ?? fallbackPip.y ?? 0.55),
      w: Number(document.getElementById(`pip-w-${id}`)?.value ?? fallbackPip.w ?? 0.28),
      h: Number(document.getElementById(`pip-h-${id}`)?.value ?? fallbackPip.h ?? 0.38),
    },
    hintPanel: {
      ...(fallbackHint || {}),
      x: Number(document.getElementById(`hint-x-${id}`)?.value ?? fallbackHint?.x ?? 0.55),
      y: Number(document.getElementById(`hint-y-${id}`)?.value ?? fallbackHint?.y ?? 0.12),
      w: Number(document.getElementById(`hint-w-${id}`)?.value ?? fallbackHint?.w ?? 0.4),
      h: Number(document.getElementById(`hint-h-${id}`)?.value ?? fallbackHint?.h ?? 0.28),
    },
  };
}

async function handleAlignAction(button) {
  const jobId = button.getAttribute('data-job');
  const action = button.getAttribute('data-align-action');
  if (action === 'sync-studio') {
    button.disabled = true;
    button.textContent = 'Syncing…';
    try {
      await api(`/api/jobs/${encodeURIComponent(jobId)}/align-sync-studio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      state.alignReviewCache.delete(jobId);
      alert('Pulled Remotion Studio outdoor layout (clip + hints) into this take. Re-run composite to burn it in.');
      void render();
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error));
      button.disabled = false;
      button.textContent = 'Sync Studio layout → take';
    }
    return;
  }
  if (action === 'select-composite') {
    const runId = button.getAttribute('data-run-id');
    if (!jobId || !runId) return;
    button.disabled = true;
    try {
      await api(`/api/jobs/${encodeURIComponent(jobId)}/selection`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedRuns: { composite: runId } }),
      });
      state.jobCache.delete(jobId);
      state.catalog = null;
      void render();
    } catch (error) {
      button.disabled = false;
      alert(error instanceof Error ? error.message : String(error));
    }
    return;
  }
  if (action === 'regen-composite') {
    if (!jobId) return;
    const label = button.textContent;
    document.querySelectorAll('[data-align-action="regen-composite"]').forEach((el) => {
      if (el.getAttribute('data-job') !== jobId) return;
      el.disabled = true;
      el.textContent = 'Regenerating…';
    });
    try {
      state.jobCache.delete(jobId);
      const before = await loadJob(jobId);
      const previousIds = (before.job?.runs?.composite || []).map((entry) => entry.runId);
      await api(`/api/jobs/${encodeURIComponent(jobId)}/align-sync-studio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      await api(`/api/jobs/${encodeURIComponent(jobId)}/stages/composite/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rerun: true }),
      });
      const fresh = await waitForCompositeRerun(jobId, previousIds);
      state.jobCache.delete(jobId);
      state.alignReviewCache.delete(jobId);
      state.catalog = null;
      alert(`Composite ready: ${fresh.runId}`);
      void render();
    } catch (error) {
      document.querySelectorAll('[data-align-action="regen-composite"]').forEach((el) => {
        if (el.getAttribute('data-job') !== jobId) return;
        el.disabled = false;
        el.textContent = label || 'Regenerate composite from Studio layout';
      });
      alert(error instanceof Error ? error.message : String(error));
    }
    return;
  }
  if (action !== 'save-layout') return;
  const review = await loadAlignReview(jobId);
  if (!review) throw new Error('No align review');
  const beats = {};
  for (const slide of review.slides || []) {
    const beatLayout = readBeatLayoutFromDom(
      jobId,
      slide.beatIndex,
      slide.layout?.pip || review.layout.pip,
      slide.layout?.hintPanel || review.layout.hintPanel,
    );
    beats[String(slide.beatIndex)] = beatLayout;
  }
  const first = beats['0'] || Object.values(beats)[0] || {
    pip: review.layout.pip,
    hintPanel: review.layout.hintPanel,
  };
  const layout = {
    ...review.layout,
    pip: first.pip,
    hintPanel: first.hintPanel,
    beats,
  };
  await api(`/api/jobs/${encodeURIComponent(jobId)}/align-layout`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(layout),
  });
  state.alignReviewCache.delete(jobId);
  alert('Per-beat clip + hint saved. Re-run composite to burn layouts into the Remotion render.');
  void render();
}

function sleepMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForCompositeRerun(jobId, previousRunIds) {
  const previous = new Set(previousRunIds || []);
  for (let attempt = 0; attempt < 180; attempt += 1) {
    await sleepMs(2000);
    state.jobCache.delete(jobId);
    const detail = await loadJob(jobId);
    const runs = detail.job?.runs?.composite || [];
    const fresh = runs.find((entry) => !previous.has(entry.runId));
    if (!fresh) continue;
    if (fresh.status === 'succeeded') return fresh;
    if (fresh.status === 'failed') {
      throw new Error(fresh.error || `Composite failed (${fresh.runId})`);
    }
  }
  throw new Error('Composite regenerate timed out — check agent logs and refresh.');
}

function collectSocialPatch(jobId) {
  const patch = {
    english: {},
    china: {},
  };
  document.querySelectorAll('[data-social-field]').forEach((el) => {
    if (el.getAttribute('data-job') !== jobId) return;
    const group = el.getAttribute('data-group');
    const platform = el.getAttribute('data-platform');
    const field = el.getAttribute('data-social-field');
    const value = el.value ?? '';
    if (group === 'headline') {
      if (platform === 'EN' && field === 'title') {
        patch.titleEnglish = value;
        patch.title = value;
      }
      if (platform === 'ZH' && field === 'title') {
        patch.titleChina = value;
      }
      return;
    }
    if (group !== 'english' && group !== 'china') return;
    if (!patch[group][platform]) {
      patch[group][platform] = {};
    }
    patch[group][platform][field] = value;
  });
  return patch;
}

async function handleSocialAction(button) {
  const jobId = button.getAttribute('data-job');
  const action = button.getAttribute('data-social-action');
  if (action !== 'save' || !jobId) return;
  const label = button.textContent;
  button.disabled = true;
  button.textContent = 'Saving…';
  try {
    await api(`/api/jobs/${encodeURIComponent(jobId)}/social`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patch: collectSocialPatch(jobId) }),
    });
    state.jobCache.delete(jobId);
    button.textContent = 'Saved';
    setTimeout(() => {
      button.disabled = false;
      button.textContent = label || 'Save social edits';
    }, 800);
    void render();
  } catch (error) {
    button.disabled = false;
    button.textContent = label || 'Save social edits';
    throw error;
  }
}

async function handlePlatformAction(button) {
  const action = button.getAttribute('data-platform-action');
  if (action === 'refresh') {
    void render();
    return;
  }
  if (action === 'copy-command') {
    const command = button.getAttribute('data-command') || '';
    if (!command) return;
    try {
      await navigator.clipboard.writeText(command);
      const label = button.textContent;
      button.textContent = 'Copied';
      setTimeout(() => {
        button.textContent = label || 'Copy login';
      }, 900);
    } catch {
      prompt('Copy this login command:', command);
    }
    return;
  }
  if (action === 'sync-zernio') {
    const label = button.textContent;
    button.disabled = true;
    button.textContent = 'Syncing…';
    try {
      const result = await api('/api/platforms/zernio/sync-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const exportCommand = result.exportCommand || '';
      if (exportCommand) {
        try {
          await navigator.clipboard.writeText(exportCommand);
        } catch {
          // ignore
        }
        alert(`Synced ${Object.keys(result.suggestedAccountsJson || {}).length} channel(s).\n\nCopied export to clipboard:\n\n${exportCommand}\n\nPaste into your Mac shell, then restart the outdoor agent.`);
      } else {
        alert('Sync returned no accounts.');
      }
      void render();
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error));
    } finally {
      button.disabled = false;
      button.textContent = label || 'Sync accounts';
    }
    return;
  }
  const label = button.textContent;
  button.disabled = true;
  button.textContent = 'Testing…';
  try {
    let target = button.getAttribute('data-provider') || button.getAttribute('data-platform');
    if (!target) throw new Error('Missing platform/provider');
    const result = await api(`/api/platforms/${encodeURIComponent(target)}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    alert(`${result.ok ? 'OK' : 'Failed'}: ${result.message || ''}`);
  } finally {
    button.disabled = false;
    button.textContent = label || 'Test';
  }
}

async function handlePublishAction(button) {
  const jobId = button.getAttribute('data-job');
  const action = button.getAttribute('data-publish-action');
  const platform = button.getAttribute('data-platform');
  if (!jobId || !action) return;
  const label = button.textContent;
  button.disabled = true;
  try {
    if (action === 'publish-all') {
      button.textContent = 'Publishing…';
      const summary = await api(`/api/jobs/${encodeURIComponent(jobId)}/publish-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      state.jobCache.delete(jobId);
      const lines = [
        `Published: ${(summary.published || []).map((entry) => entry.platform).join(', ') || 'none'}`,
        `Skipped live: ${(summary.skippedLive || []).join(', ') || 'none'}`,
        `Skipped no title: ${(summary.skippedNoTitle || []).join(', ') || 'none'}`,
        `Failed: ${(summary.failed || []).map((entry) => `${entry.platform} (${entry.error})`).join('; ') || 'none'}`,
      ];
      alert(lines.join('\n'));
      void render();
      return;
    }
    if (!platform) return;
    if (action === 'publish') {
      button.textContent = 'Publishing…';
      await api(`/api/jobs/${encodeURIComponent(jobId)}/publish/${encodeURIComponent(platform)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
    } else if (action === 'hide') {
      button.textContent = 'Hiding…';
      await api(`/api/jobs/${encodeURIComponent(jobId)}/publish/${encodeURIComponent(platform)}/hide`, {
        method: 'POST',
      });
    } else if (action === 'delete') {
      if (!confirm(`Delete ${platform} post?`)) {
        button.disabled = false;
        return;
      }
      button.textContent = 'Deleting…';
      await api(`/api/jobs/${encodeURIComponent(jobId)}/publish/${encodeURIComponent(platform)}`, {
        method: 'DELETE',
      });
    } else {
      button.disabled = false;
      return;
    }
    state.jobCache.delete(jobId);
    void render();
  } catch (error) {
    button.disabled = false;
    button.textContent = label || action;
    throw error;
  }
}

function wireSocialSetup() {
  document.querySelectorAll('textarea[data-social-field="body"]').forEach((el) => {
    if (el.dataset.wired === '1') return;
    el.dataset.wired = '1';
    const count = el.parentElement?.querySelector('.social-char-count');
    const update = () => {
      if (count) count.textContent = `${el.value.length} chars`;
    };
    el.addEventListener('input', update);
    update();
  });
}

function selectedLibraryCoverId(jobId) {
  const hidden = document.querySelector(`[data-cover-selected="${jobId}"]`);
  return hidden?.value || '';
}

function setSelectedLibraryCover(jobId, coverId) {
  const hidden = document.querySelector(`[data-cover-selected="${jobId}"]`);
  if (hidden) hidden.value = coverId || '';
  document.querySelectorAll(`[data-cover-library="${jobId}"] .cover-tile`).forEach((tile) => {
    tile.classList.toggle('cover-tile-active', tile.getAttribute('data-cover-id') === coverId);
  });
}

function platformsInSocialGroup(jobId, group) {
  const platforms = [];
  document.querySelectorAll(`[data-social-group="${group}"][data-job="${jobId}"] [data-cover-platform]`).forEach((el) => {
    const platform = el.getAttribute('data-cover-platform');
    if (platform) platforms.push(platform);
  });
  return platforms;
}

async function refreshCoversAndRender(jobId, covers) {
  state.coversCache.set(jobId, covers);
  void render();
}

async function handleCoverAction(button) {
  const jobId = button.getAttribute('data-job');
  const action = button.getAttribute('data-cover-action');
  const coverId = button.getAttribute('data-cover-id');
  if (!jobId) return;

  if (action === 'select-library') {
    setSelectedLibraryCover(jobId, coverId);
    return;
  }

  if (action === 'rename') {
    const input = document.querySelector(`[data-cover-label="${coverId}"][data-job="${jobId}"]`);
    const label = input?.value?.trim();
    if (!label) throw new Error('Cover label is required');
    const covers = await api(`/api/jobs/${encodeURIComponent(jobId)}/covers/${encodeURIComponent(coverId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label }),
    });
    await refreshCoversAndRender(jobId, covers);
    return;
  }

  if (action === 'duplicate') {
    const covers = await api(`/api/jobs/${encodeURIComponent(jobId)}/covers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'duplicate', coverId }),
    });
    await refreshCoversAndRender(jobId, covers);
    return;
  }

  if (action === 'capture-portrait' || action === 'capture-landscape') {
    const format = action === 'capture-landscape' ? 'landscape' : 'portrait';
    const label = button.textContent;
    button.disabled = true;
    button.textContent = 'Capturing…';
    try {
      const covers = await api(`/api/jobs/${encodeURIComponent(jobId)}/covers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'capture-composite',
          format,
          atSeconds: 1,
          label: `${format} still`,
        }),
      });
      await refreshCoversAndRender(jobId, covers);
    } finally {
      button.disabled = false;
      button.textContent = label || `Capture ${format} still`;
    }
    return;
  }

  if (action === 'delete') {
    if (!confirm('Delete this cover?')) return;
    const covers = await api(`/api/jobs/${encodeURIComponent(jobId)}/covers/${encodeURIComponent(coverId)}`, {
      method: 'DELETE',
    });
    await refreshCoversAndRender(jobId, covers);
    return;
  }

  if (action === 'batch-english' || action === 'batch-china') {
    const selected = selectedLibraryCoverId(jobId);
    if (!selected) throw new Error('Select a cover in the library first');
    const group = action === 'batch-english' ? 'english' : 'china';
    const platforms = platformsInSocialGroup(jobId, group);
    if (!platforms.length) throw new Error(`No ${group} platforms to assign`);
    const covers = await api(`/api/jobs/${encodeURIComponent(jobId)}/covers/platform-map`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch: { group, coverId: selected, platforms },
      }),
    });
    await refreshCoversAndRender(jobId, covers);
  }
}

function wireCoverLibrary() {
  document.querySelectorAll('[data-cover-upload]').forEach((input) => {
    if (input.dataset.wired === '1') return;
    input.dataset.wired = '1';
    input.addEventListener('change', () => {
      const jobId = input.getAttribute('data-cover-upload');
      const file = input.files?.[0];
      if (!jobId || !file) return;
      void (async () => {
        const form = new FormData();
        form.append('cover', file, file.name);
        form.append('label', file.name);
        form.append('source', 'browser');
        const covers = await api(`/api/jobs/${encodeURIComponent(jobId)}/covers`, {
          method: 'POST',
          body: form,
        });
        input.value = '';
        await refreshCoversAndRender(jobId, covers);
      })().catch((error) => alert(error.message || String(error)));
    });
  });

  document.querySelectorAll('select[data-cover-platform]').forEach((select) => {
    if (select.dataset.wired === '1') return;
    select.dataset.wired = '1';
    select.addEventListener('change', () => {
      const jobId = select.getAttribute('data-job');
      const platform = select.getAttribute('data-cover-platform');
      if (!jobId || !platform) return;
      void (async () => {
        const covers = await api(`/api/jobs/${encodeURIComponent(jobId)}/covers/platform-map`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platformCovers: { [platform]: select.value || null },
          }),
        });
        await refreshCoversAndRender(jobId, covers);
      })().catch((error) => alert(error.message || String(error)));
    });
  });

  document.querySelectorAll('[data-cover-library]').forEach((library) => {
    const jobId = library.getAttribute('data-cover-library');
    const selected = selectedLibraryCoverId(jobId);
    if (selected) setSelectedLibraryCover(jobId, selected);
  });
}

function wireLayoutDrag() {
  wireRemotionStudioEmbeds();
}

function readAlignSlides(jobId) {
  const el = document.getElementById(`align-slides-${jobId}`);
  if (!el) return [];
  try {
    return JSON.parse(el.textContent || '[]');
  } catch {
    return [];
  }
}

function activeAlignFormat(jobId) {
  const tab = document.querySelector(`.align-format-tab-active[data-job="${jobId}"]`);
  return tab?.getAttribute('data-align-format') === 'portrait' ? 'portrait' : 'landscape';
}

function activeAlignCompositionId(jobId) {
  return activeAlignFormat(jobId) === 'portrait'
    ? 'video-outdoor-portrait'
    : 'video-outdoor-landscape';
}

function patchAlignComparePanes(jobId, slide) {
  const scriptEl = document.querySelector(`[data-align-script="${jobId}"]`);
  const saidEl = document.querySelector(`[data-align-said="${jobId}"]`);
  if (scriptEl) {
    scriptEl.textContent = slide?.say || 'No script for this beat.';
  }
  if (saidEl) {
    const lines = slide?.saidLines || [];
    saidEl.innerHTML = lines.length
      ? lines.map((line) => `
          <button
            type="button"
            class="align-said-line"
            data-align-said-seek
            data-job="${esc(jobId)}"
            data-frame="${Math.max(0, Math.round(Number(line.start || 0) * 30))}"
            data-start="${Number(line.start || 0)}"
          >${esc(line.text || '')}</button>
        `).join('')
      : '<div class="card-meta">No spoken lines for this beat.</div>';
  }
}

function wireRemotionStudioEmbeds() {
  document.querySelectorAll('iframe.remotion-studio-embed[data-studio-src]').forEach((iframe) => {
    if (iframe.dataset.activated === '1') return;
    const raw = iframe.getAttribute('data-studio-src');
    if (!raw) return;
    iframe.dataset.activated = '1';
    iframe.src = remotionStudioEmbedUrl(raw, raw.includes('portrait') ? 'video-outdoor-portrait' : 'video-outdoor-landscape');
    iframe.addEventListener('load', () => {
      iframe.closest('.remotion-editor-frame')?.classList.add('remotion-embed-ready');
      const jobId = iframe.closest('[data-job]')?.getAttribute('data-job')
        || iframe.id?.replace(/^remotion-studio-/, '');
      const active = document.querySelector(`.align-beat-tag-active[data-job="${jobId}"]`);
      if (active) {
        seekRemotionAlignBeat(active);
      }
    }, { once: true });
  });

  document.querySelectorAll('.align-beat-tags').forEach((host) => {
    if (host.dataset.wired === '1') return;
    host.dataset.wired = '1';
    host.addEventListener('click', (event) => {
      const tag = event.target.closest('[data-align-seek]');
      if (!tag) return;
      const jobId = tag.getAttribute('data-job');
      host.querySelectorAll('.align-beat-tag').forEach((el) => {
        el.classList.toggle('align-beat-tag-active', el === tag);
      });
      const beat = Number(tag.getAttribute('data-beat') || 0);
      const slide = readAlignSlides(jobId).find((item) => item.beatIndex === beat);
      patchAlignComparePanes(jobId, slide);
      seekRemotionAlignBeat(tag);
    });
  });

  document.querySelectorAll('.align-compare').forEach((host) => {
    if (host.dataset.wired === '1') return;
    host.dataset.wired = '1';
    host.addEventListener('click', (event) => {
      const line = event.target.closest('[data-align-said-seek]');
      if (!line) return;
      host.querySelectorAll('.align-said-line').forEach((el) => {
        el.classList.toggle('align-said-line-active', el === line);
      });
      seekRemotionAlignBeat(line);
    });
  });

  document.querySelectorAll('.align-format-tabs').forEach((host) => {
    if (host.dataset.wired === '1') return;
    host.dataset.wired = '1';
    host.addEventListener('click', (event) => {
      const tab = event.target.closest('[data-align-format]');
      if (!tab) return;
      const jobId = tab.getAttribute('data-job');
      const format = tab.getAttribute('data-align-format') === 'portrait' ? 'portrait' : 'landscape';
      host.querySelectorAll('.align-format-tab').forEach((el) => {
        el.classList.toggle('align-format-tab-active', el === tab);
      });
      const iframe = document.getElementById(`remotion-studio-${jobId}`);
      const frame = document.querySelector(`.remotion-editor-frame[data-job="${jobId}"]`);
      const tagsHost = document.querySelector(`[data-align-beats="${jobId}"]`);
      const nextSrc = format === 'portrait'
        ? (iframe?.getAttribute('data-portrait-src') || tagsHost?.getAttribute('data-portrait-url'))
        : (iframe?.getAttribute('data-landscape-src') || tagsHost?.getAttribute('data-landscape-url'));
      if (!iframe || !nextSrc) return;
      frame?.setAttribute('data-align-format', format);
      frame?.classList.toggle('align-remotion-portrait', format === 'portrait');
      frame?.classList.remove('remotion-embed-ready');
      iframe.dataset.activated = '1';
      iframe.src = remotionStudioEmbedUrl(nextSrc, format === 'portrait' ? 'video-outdoor-portrait' : 'video-outdoor-landscape');
      const popout = document.querySelector(`[data-align-popout="${jobId}"]`);
      if (popout) popout.setAttribute('href', iframe.src);
      iframe.addEventListener('load', () => {
        frame?.classList.add('remotion-embed-ready');
        const active = document.querySelector(`.align-beat-tag-active[data-job="${jobId}"]`);
        if (active) seekRemotionAlignBeat(active);
      }, { once: true });
    });
  });
}

function seekRemotionAlignBeat(tag) {
  const jobId = tag.getAttribute('data-job');
  const frame = Number(tag.getAttribute('data-frame') || 0);
  const start = Number(tag.getAttribute('data-start') || 0);
  const beat = tag.getAttribute('data-beat');
  const label = tag.querySelector?.('.align-beat-tag-label')?.textContent
    || (beat != null ? `Beat ${Number(beat) + 1}` : 'Line');
  const status = document.querySelector(`[data-align-seek-status="${jobId}"]`);
  if (status) {
    status.textContent = `${label} · seek ~${start.toFixed(1)}s (frame ${frame}) · ${activeAlignFormat(jobId)}`;
  }

  const iframe = document.getElementById(`remotion-studio-${jobId}`);
  const tagsHost = document.querySelector(`[data-align-beats="${jobId}"]`);
  const origin = tagsHost?.getAttribute('data-studio-origin') || remotionStudioOrigin(iframe?.src);
  if (!iframe?.contentWindow) return;

  iframe.contentWindow.postMessage(
    {
      type: 'turn-outdoor-align-seek',
      frame,
      compositionId: activeAlignCompositionId(jobId),
    },
    origin,
  );
}

setInterval(() => {
  if (state.route.name === 'library' || state.route.name === 'script') {
    void loadInboxStatus().then(() => {
      const host = document.querySelector('[data-inbox-banner]');
      if (host) {
        host.outerHTML = renderInboxBanner();
      } else if (state.route.name === 'library') {
        void render();
      }
    });
  }
}, 5000);

void render();

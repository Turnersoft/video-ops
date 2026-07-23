/** Browser dashboard for outdoor pipeline jobs — served at GET / and GET /status. */

export function pipelineStatusPageHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Outdoor pipeline</title>
  <style>
    :root {
      --bg: #0b1220;
      --panel: #121a2b;
      --line: #243049;
      --text: #e8eefc;
      --muted: #93a0b8;
      --ok: #34d399;
      --run: #60a5fa;
      --fail: #f87171;
      --warn: #fbbf24;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font: 14px/1.45 ui-sans-serif, system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
    }
    header {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: baseline;
      justify-content: space-between;
      padding: 20px 24px 12px;
      border-bottom: 1px solid var(--line);
      position: sticky;
      top: 0;
      background: rgba(11, 18, 32, 0.94);
      backdrop-filter: blur(8px);
      z-index: 5;
    }
    h1 { margin: 0; font-size: 20px; font-weight: 650; }
    .meta { color: var(--muted); font-size: 13px; }
    main { padding: 16px 24px 48px; max-width: 1180px; margin: 0 auto; }
    .empty { margin-top: 40px; color: var(--muted); text-align: center; }
    .job {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 18px;
      margin-bottom: 18px;
    }
    .job-top {
      display: flex;
      flex-wrap: wrap;
      gap: 10px 16px;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 14px;
    }
    .title { font-size: 18px; font-weight: 650; }
    .ids { color: var(--muted); font-size: 12px; margin-top: 4px; word-break: break-all; }
    .badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      background: #1e293b;
      color: var(--muted);
    }
    .badge.running, .badge.queued { color: var(--run); background: #172554; }
    .badge.review, .badge.ingested { color: var(--warn); background: #422006; }
    .badge.published, .badge.succeeded { color: var(--ok); background: #064e3b; }
    .badge.failed { color: var(--fail); background: #450a0a; }
    .stage-block {
      border-top: 1px solid var(--line);
      padding-top: 16px;
      margin-top: 16px;
    }
    .stage-head {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 12px;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .stage-title {
      font-size: 13px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--muted);
      font-weight: 650;
    }
    .summary { color: var(--muted); font-size: 12px; }
    .videos {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 12px;
    }
    .video-card {
      background: #0d1524;
      border: 1px solid var(--line);
      border-radius: 10px;
      overflow: hidden;
    }
    .video-card label {
      display: block;
      padding: 8px 10px;
      font-size: 12px;
      color: var(--muted);
      border-bottom: 1px solid var(--line);
    }
    video {
      display: block;
      width: 100%;
      max-height: 420px;
      background: #000;
    }
    .social-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 10px;
    }
    .social-card {
      background: #0d1524;
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 12px;
    }
    .social-card .platform {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--muted);
      margin-bottom: 6px;
    }
    .social-card .headline {
      font-size: 15px;
      font-weight: 650;
      line-height: 1.35;
      white-space: pre-wrap;
    }
    .social-card .body {
      margin-top: 8px;
      color: var(--muted);
      font-size: 12px;
      white-space: pre-wrap;
      max-height: 120px;
      overflow: auto;
    }
    .missing { color: var(--muted); font-size: 13px; padding: 8px 0; }
    .error { color: var(--fail); margin-top: 10px; font-size: 13px; }
    a { color: var(--run); }
    button {
      background: #1e293b;
      color: var(--text);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 6px 12px;
      cursor: pointer;
    }
    button:hover { border-color: #3b82f6; }
    .job-nav { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
    .job-nav a {
      text-decoration: none;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 6px 10px;
      color: var(--text);
      background: #0d1524;
      font-size: 12px;
    }
    .job-nav a.active { border-color: #3b82f6; color: var(--run); }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Outdoor pipeline results</h1>
      <div class="meta" id="subtitle">Loading…</div>
    </div>
    <div>
      <button type="button" id="refresh">Refresh now</button>
    </div>
  </header>
  <main id="root"><div class="empty">Loading jobs…</div></main>
  <script>
    const STAGE_LABELS = {
      cut: '1 · Cut',
      align: '2 · Align',
      composite: '3 · Composite',
      social: '4 · Social titles',
    };
    const root = document.getElementById('root');
    const subtitle = document.getElementById('subtitle');
    let selectedJobId = new URLSearchParams(location.search).get('job');
    let lastSignature = '';

    function esc(value) {
      return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
    }

    function fmtTime(iso) {
      if (!iso) return '—';
      try { return new Date(iso).toLocaleString(); } catch { return iso; }
    }

    function renderVideos(videos) {
      if (!videos || !videos.length) {
        return '<div class="missing">No video artifact yet</div>';
      }
      return '<div class="videos">' + videos.map((video) => \`
        <div class="video-card">
          <label>\${esc(video.label)} · <a href="\${esc(video.url)}" target="_blank" rel="noreferrer">open</a></label>
          <video controls preload="metadata" src="\${esc(video.url)}"></video>
        </div>
      \`).join('') + '</div>';
    }

    function renderSocial(titles) {
      if (!titles || !titles.length) {
        return '<div class="missing">No social titles yet</div>';
      }
      return '<div class="social-grid">' + titles.map((item) => \`
        <div class="social-card">
          <div class="platform">\${esc(item.group)} / \${esc(item.platform)}</div>
          <div class="headline">\${esc(item.title)}</div>
          \${item.body ? '<div class="body">' + esc(item.body) + '</div>' : ''}
        </div>
      \`).join('') + '</div>';
    }

    function renderStage(stage) {
      const body = stage.stage === 'social'
        ? renderSocial(stage.socialTitles)
        : renderVideos(stage.videos);
      return \`
        <section class="stage-block">
          <div class="stage-head">
            <div class="stage-title">\${esc(STAGE_LABELS[stage.stage] || stage.stage)}</div>
            <span class="badge \${esc(stage.status)}">\${esc(stage.status)}</span>
          </div>
          <div class="summary">\${esc((stage.summary || []).join(' · ') || (stage.runId || 'not started'))}</div>
          \${body}
        </section>
      \`;
    }

    function renderJob(payload) {
      const job = payload.job || {};
      const results = payload.results || { stages: [] };
      return \`
        <article class="job" id="\${esc(job.jobId)}">
          <div class="job-top">
            <div>
              <div class="title">\${esc(job.scriptTitle || job.scriptId)}</div>
              <div class="ids">
                \${esc(job.jobId)} · take \${esc(job.takeId)} · updated \${esc(fmtTime(job.updatedAt))}
              </div>
            </div>
            <span class="badge \${esc(job.status)}">\${esc(job.status)}</span>
          </div>
          \${(results.stages || []).map(renderStage).join('')}
        </article>
      \`;
    }

    function preservePlayingVideos(nextHtml) {
      const playing = {};
      root.querySelectorAll('video').forEach((video) => {
        if (!video.paused) {
          playing[video.currentSrc || video.src] = {
            time: video.currentTime,
            paused: video.paused,
          };
        }
      });
      root.innerHTML = nextHtml;
      root.querySelectorAll('video').forEach((video) => {
        const key = video.currentSrc || video.getAttribute('src');
        const state = playing[key];
        if (!state) return;
        const restore = () => {
          try {
            video.currentTime = state.time;
            void video.play();
          } catch {}
        };
        if (video.readyState >= 1) restore();
        else video.addEventListener('loadedmetadata', restore, { once: true });
      });
    }

    async function load() {
      try {
        const listRes = await fetch('/api/jobs');
        if (!listRes.ok) throw new Error('GET /api/jobs → ' + listRes.status);
        const listPayload = await listRes.json();
        const jobs = Array.isArray(listPayload.jobs) ? listPayload.jobs : [];
        subtitle.textContent = jobs.length + ' job' + (jobs.length === 1 ? '' : 's')
          + ' · auto-refresh 4s · ' + new Date().toLocaleTimeString();

        if (!jobs.length) {
          root.innerHTML = '<div class="empty">No pipeline jobs yet. Upload a take from the iPhone app.</div>';
          return;
        }

        jobs.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
        if (!selectedJobId) selectedJobId = jobs[0].jobId;

        const nav = '<div class="job-nav">' + jobs.map((job) => \`
          <a class="\${job.jobId === selectedJobId ? 'active' : ''}"
             href="?job=\${encodeURIComponent(job.jobId)}">
            \${esc(job.scriptTitle || job.scriptId)}
          </a>
        \`).join('') + '</div>';

        const detailRes = await fetch('/api/jobs/' + encodeURIComponent(selectedJobId));
        if (!detailRes.ok) throw new Error('GET /api/jobs/' + selectedJobId + ' → ' + detailRes.status);
        const detail = await detailRes.json();
        const signature = JSON.stringify({
          updatedAt: detail.job && detail.job.updatedAt,
          selectedRuns: detail.job && detail.job.selectedRuns,
          results: detail.results,
        });
        const nextHtml = nav + renderJob(detail);
        if (signature !== lastSignature) {
          preservePlayingVideos(nextHtml);
          lastSignature = signature;
        }
      } catch (error) {
        subtitle.textContent = 'Failed to load';
        root.innerHTML = '<div class="error">' + esc(error.message || error) + '</div>';
      }
    }

    document.getElementById('refresh').addEventListener('click', () => {
      lastSignature = '';
      void load();
    });
    void load();
    setInterval(() => void load(), 4000);
  </script>
</body>
</html>`;
}

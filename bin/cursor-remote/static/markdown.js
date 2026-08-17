export function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function slugify(text) {
  return text.toLowerCase().replace(/[^\w]+/g, "-").replace(/^-|-$/g, "");
}

function parseTableBlock(block) {
  const rows = block.trim().split("\n").filter((r) => r.trim());
  if (rows.length < 2) return null;
  if (!rows.every((r) => r.trim().startsWith("|") && r.trim().endsWith("|"))) return null;
  if (!/^\|[\s:|-]+\|$/.test(rows[1].trim())) return null;

  const parseRow = (row) =>
    row.trim().slice(1, -1).split("|").map((c) => escapeHtml(c.trim()));
  const header = parseRow(rows[0]);
  const bodyRows = rows.slice(2).map(parseRow);

  let html = '<table class="md-table"><thead><tr>';
  for (const cell of header) html += `<th>${cell}</th>`;
  html += "</tr></thead><tbody>";
  for (const row of bodyRows) {
    html += "<tr>";
    for (const cell of row) html += `<td>${cell}</td>`;
    html += "</tr>";
  }
  html += "</tbody></table>";
  return html;
}

export function renderMarkdown(text) {
  if (!text) return "";

  const maxLen = 120000;
  const src = text.length > maxLen ? text.slice(0, maxLen) + "\n\n…" : text;

  const codeBlocks = [];
  let work = src.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push({ lang: lang || "", code });
    return `\x00CODE${idx}\x00`;
  });

  const tables = [];
  work = work.replace(/(?:^\|.+\|\n?)+/gm, (block) => {
    const html = parseTableBlock(block);
    if (!html) return block;
    const idx = tables.length;
    tables.push(html);
    return `\x00TABLE${idx}\x00`;
  });

  work = escapeHtml(work);

  work = work.replace(/`([^`\n]+)`/g, "<code class=\"inline-code\">$1</code>");
  work = work.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  work = work.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
  work = work.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, url) => {
    const safe = url.startsWith("http://") || url.startsWith("https://") ? url : "#";
    return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });

  const lines = work.split("\n");
  const out = [];
  let inUl = false;
  let inOl = false;
  let inBlockquote = false;
  let paragraph = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    out.push(`<p>${paragraph.join("<br />")}</p>`);
    paragraph = [];
  };

  const closeLists = () => {
    if (inUl) {
      out.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      out.push("</ol>");
      inOl = false;
    }
  };

  const closeBlockquote = () => {
    if (inBlockquote) {
      out.push("</blockquote>");
      inBlockquote = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const codeMatch = line.match(/^\x00CODE(\d+)\x00$/);
    if (codeMatch) {
      flushParagraph();
      closeLists();
      closeBlockquote();
      const block = codeBlocks[Number(codeMatch[1])];
      const langClass = block.lang ? ` language-${block.lang}` : "";
      out.push(
        `<pre class="code-block"><code class="block-code${langClass}">${escapeHtml(block.code)}</code></pre>`,
      );
      continue;
    }

    const tableMatch = line.match(/^\x00TABLE(\d+)\x00$/);
    if (tableMatch) {
      flushParagraph();
      closeLists();
      closeBlockquote();
      out.push(tables[Number(tableMatch[1])]);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      closeLists();
      closeBlockquote();
      continue;
    }

    const h3 = line.match(/^###\s+(.+)$/);
    const h2 = line.match(/^##\s+(.+)$/);
    const h1 = line.match(/^#\s+(.+)$/);
    if (h1 || h2 || h3) {
      flushParagraph();
      closeLists();
      closeBlockquote();
      const level = h1 ? 1 : h2 ? 2 : 3;
      const content = (h1 || h2 || h3)[1];
      out.push(`<h${level} id="${slugify(content)}">${content}</h${level}>`);
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      flushParagraph();
      closeLists();
      closeBlockquote();
      out.push("<hr />");
      continue;
    }

    const bq = line.match(/^>\s?(.*)$/);
    if (bq) {
      flushParagraph();
      closeLists();
      if (!inBlockquote) {
        out.push("<blockquote>");
        inBlockquote = true;
      }
      out.push(`<p>${bq[1]}</p>`);
      continue;
    }
    closeBlockquote();

    const ul = line.match(/^[-*]\s+(.+)$/);
    if (ul) {
      flushParagraph();
      if (inOl) {
        out.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        out.push("<ul>");
        inUl = true;
      }
      out.push(`<li>${ul[1]}</li>`);
      continue;
    }

    const ol = line.match(/^\d+\.\s+(.+)$/);
    if (ol) {
      flushParagraph();
      if (inUl) {
        out.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        out.push("<ol>");
        inOl = true;
      }
      out.push(`<li>${ol[1]}</li>`);
      continue;
    }

    closeLists();
    paragraph.push(line);
  }

  flushParagraph();
  closeLists();
  closeBlockquote();

  return out.join("\n");
}

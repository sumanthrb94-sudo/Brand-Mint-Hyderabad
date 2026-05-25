/**
 * Documents — markdown viewer for the /brand-mint-admin/ knowledge pack.
 *
 * Two-column shell: grouped TOC on the left, rendered markdown on the right.
 * Selection lives in module state (no hash routing) so the rest of the
 * router doesn't have to know about per-doc deep links — except the optional
 * `?id=` hash query that seeds the initial selection.
 */

import { h, renderTopbar, toast, mount } from "/admin/components.js";

const DOCS = [
  { id: "exec",      file: "00-EXECUTIVE-SUMMARY.md",    title: "Executive summary",     group: "Overview" },
  { id: "company",   file: "01-COMPANY-OVERVIEW.md",     title: "Company overview",      group: "Overview" },
  { id: "brand",     file: "02-BRAND-STRATEGY.md",       title: "Brand strategy",        group: "Overview" },
  { id: "services",  file: "03-SERVICE-CATALOG.md",      title: "Service catalog",       group: "Go-to-market" },
  { id: "sales",     file: "04-SALES-PLAYBOOK.md",       title: "Sales playbook",        group: "Go-to-market" },
  { id: "ops",       file: "05-OPERATIONS-MANUAL.md",    title: "Operations manual",     group: "Delivery" },
  { id: "finance",   file: "06-FINANCIAL-MODEL.md",      title: "Financial model",       group: "Delivery" },
  { id: "launch",    file: "07-LAUNCH-SPRINT.md",        title: "48-hour launch sprint", group: "Build & ship" },
  { id: "ai-stack",  file: "08-AI-TOOLSTACK.md",         title: "AI toolstack",          group: "Build & ship" },
  { id: "content",   file: "09-CONTENT-CALENDAR.md",     title: "Content calendar plan", group: "Build & ship" },
  { id: "legal",     file: "10-LEGAL-CHECKLIST.md",      title: "Legal checklist",       group: "Compliance" },
  { id: "hiring",    file: "11-HIRING-ROADMAP.md",       title: "Hiring roadmap",        group: "People" },
  { id: "metrics",   file: "12-METRICS-AND-KPIS.md",     title: "Metrics & KPIs",        group: "Compliance" },
];

const GROUP_ORDER = ["Overview", "Go-to-market", "Delivery", "Build & ship", "Compliance", "People"];

export async function render(ctx) {
  const state = {
    activeId: pickInitialId(),
  };

  const tocEl = h("nav", { class: "docs-toc" });
  const contentEl = h("article", { class: "docs-content" });

  const root = h("div", { class: "docs-shell" }, [tocEl, contentEl]);

  const renderHeader = () => {
    const current = currentDoc(state.activeId);
    renderTopbar({
      breadcrumb: "BRAND",
      title: "Documents",
      actions: [
        h("button", {
          class: "btn btn-ghost",
          text: "Open repo folder",
          onclick: () => window.open("/brand-mint-admin/", "_blank"),
        }),
        h("a", {
          class: "btn btn-primary",
          href: "/brand-mint-admin/" + current.file,
          download: current.file,
          text: "Download .md",
        }),
      ],
    });
  };

  const renderToc = () => {
    mount(tocEl, h("div", {}, buildTocChildren(state.activeId, (id) => select(id))));
  };

  const renderContent = async () => {
    const current = currentDoc(state.activeId);
    mount(contentEl, h("div", { class: "muted", text: "Loading…" }));
    try {
      const res = await fetch("/brand-mint-admin/" + current.file);
      if (res.status === 404) {
        mount(
          contentEl,
          h("div", { class: "empty" }, [
            h("div", { class: "empty-title", text: current.title }),
            h("div", {
              class: "muted",
              text:
                "Not deployed. Internal docs are excluded from the public CDN for security — read them in the private git repo at brand-mint-admin/" +
                current.file +
                ". Migration to gated Supabase Storage is on the roadmap.",
            }),
          ])
        );
        return;
      }
      if (!res.ok) throw new Error("HTTP " + res.status);
      const md = await res.text();
      const html = renderMarkdown(md);
      const wrap = document.createElement("div");
      wrap.innerHTML = html;
      mount(contentEl, wrap);
      contentEl.scrollTo?.({ top: 0 });
    } catch (err) {
      mount(
        contentEl,
        h("div", { class: "empty" }, [
          h("div", { class: "empty-title", text: "Couldn't load this doc" }),
          h("div", { class: "muted", text: String(err && err.message ? err.message : err) }),
        ])
      );
      toast("Failed to load doc.");
    }
  };

  const select = (id) => {
    if (state.activeId === id) return;
    state.activeId = id;
    try {
      const u = new URL(window.location.href);
      u.hash = "#/documents?id=" + id;
      history.replaceState(null, "", u.toString());
    } catch {}
    renderHeader();
    renderToc();
    renderContent();
  };

  renderHeader();
  renderToc();
  renderContent();

  return root;
}

/* ---------- TOC ---------- */

function pickInitialId() {
  try {
    const hash = window.location.hash || "";
    const q = hash.split("?")[1] || "";
    const params = new URLSearchParams(q);
    const id = params.get("id");
    if (id && DOCS.some((d) => d.id === id)) return id;
  } catch {}
  return DOCS[0].id;
}

function currentDoc(id) {
  return DOCS.find((d) => d.id === id) || DOCS[0];
}

function buildTocChildren(activeId, onSelect) {
  const out = [];
  for (const group of GROUP_ORDER) {
    const items = DOCS.filter((d) => d.group === group);
    if (!items.length) continue;
    out.push(h("h4", { text: group }));
    for (const it of items) {
      out.push(
        h("a", {
          class: "toc-link" + (it.id === activeId ? " active" : ""),
          href: "javascript:void(0)",
          text: it.title,
          onclick: (e) => {
            e.preventDefault();
            onSelect(it.id);
          },
        })
      );
    }
  }
  return out;
}

/* ===================================================================
 * Minimal markdown renderer
 * ===================================================================
 * Pipeline:
 *   1. Escape all HTML special chars on the raw text first (XSS-safe).
 *   2. Pull code fences out and stash placeholders (so their bodies
 *      never run through inline rules).
 *   3. Walk lines, grouping into block-level structures: headings,
 *      blockquotes, lists, tables, hr, paragraphs.
 *   4. Apply inline rules to non-fence text.
 *   5. Restore code-fence placeholders.
 * =================================================================== */

function renderMarkdown(src) {
  // Normalise newlines so the line-walker has a predictable input.
  const text = String(src || "").replace(/\r\n?/g, "\n");

  // Escape HTML up-front. Every later substitution emits its own tags
  // against this pre-escaped text, so user-supplied "<script>" stays inert.
  const escaped = escapeHtml(text);

  // Pull fenced code blocks out before any other processing — their content
  // must be preserved verbatim and NOT touched by inline rules.
  const fences = [];
  const withoutFences = escaped.replace(/```([^\n`]*)\n([\s\S]*?)```/g, (_m, lang, body) => {
    const langClass = lang ? ` class="lang-${lang.trim().replace(/[^a-z0-9_-]/gi, "")}"` : "";
    fences.push(`<pre><code${langClass}>${body.replace(/\n$/, "")}</code></pre>`);
    return ` FENCE${fences.length - 1} `;
  });

  // Block parser: walk line-by-line and emit HTML blocks.
  const lines = withoutFences.split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip blank lines between blocks.
    if (/^\s*$/.test(line)) { i++; continue; }

    // Fence placeholder — emit as-is.
    const fenceMatch = /^ FENCE(\d+) $/.exec(line.trim());
    if (fenceMatch) {
      blocks.push(fences[Number(fenceMatch[1])]);
      i++;
      continue;
    }

    // Horizontal rule: a line that's just `---`.
    if (/^---\s*$/.test(line)) {
      blocks.push("<hr/>");
      i++;
      continue;
    }

    // ATX headings 1-3.
    const hMatch = /^(#{1,3})\s+(.*)$/.exec(line);
    if (hMatch) {
      const level = hMatch[1].length;
      blocks.push(`<h${level}>${applyInline(hMatch[2])}</h${level}>`);
      i++;
      continue;
    }

    // GFM pipe table: header row followed by a |---|---| separator row.
    if (line.includes("|") && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1]) && lines[i + 1].includes("|")) {
      const tableLines = [];
      while (i < lines.length && lines[i].includes("|") && !/^\s*$/.test(lines[i])) {
        tableLines.push(lines[i]);
        i++;
      }
      blocks.push(buildTable(tableLines));
      continue;
    }

    // Blockquote: collect consecutive `> ` lines (already escaped to `&gt;`).
    if (/^&gt;\s?/.test(line) || /^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && (/^&gt;\s?/.test(lines[i]) || /^>\s?/.test(lines[i]))) {
        buf.push(lines[i].replace(/^&gt;\s?/, "").replace(/^>\s?/, ""));
        i++;
      }
      blocks.push(`<blockquote>${applyInline(buf.join(" "))}</blockquote>`);
      continue;
    }

    // Unordered list: consecutive lines starting with `- ` or `* `.
    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push(`<ul>${items.map((t) => `<li>${applyInline(t)}</li>`).join("")}</ul>`);
      continue;
    }

    // Ordered list: consecutive lines starting with `1. `, `2. `, etc.
    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push(`<ol>${items.map((t) => `<li>${applyInline(t)}</li>`).join("")}</ol>`);
      continue;
    }

    // Paragraph: gather until a blank line or a structural line.
    const para = [];
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^#{1,3}\s+/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^&gt;\s?/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^---\s*$/.test(lines[i]) &&
      !/^ FENCE\d+ $/.test(lines[i].trim())
    ) {
      para.push(lines[i]);
      i++;
    }
    if (para.length) blocks.push(`<p>${applyInline(para.join(" "))}</p>`);
  }

  return blocks.join("\n");
}

function buildTable(rows) {
  // First row = header, second = separator (discarded), rest = body.
  const split = (r) =>
    r
      .replace(/^\s*\|/, "")
      .replace(/\|\s*$/, "")
      .split("|")
      .map((c) => c.trim());

  const head = split(rows[0]);
  const body = rows.slice(2).map(split);
  const thead = `<thead><tr>${head.map((c) => `<th>${applyInline(c)}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${body
    .map((r) => `<tr>${r.map((c) => `<td>${applyInline(c)}</td>`).join("")}</tr>`)
    .join("")}</tbody>`;
  return `<table>${thead}${tbody}</table>`;
}

function applyInline(s) {
  let out = s;

  // Inline code first — its body shouldn't see any other inline rules.
  // Stash spans in a placeholder map and restore at the end.
  const codes = [];
  out = out.replace(/`([^`]+)`/g, (_m, body) => {
    codes.push(`<code>${body}</code>`);
    return ` CODE${codes.length - 1} `;
  });

  // Links: [text](url) — only http(s), mailto, anchors, and relative paths.
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, url) => {
    const safe = /^(https?:|mailto:|#|\/|\.\.?\/)/i.test(url) ? url : "#";
    const attr = safe.startsWith("http") ? ' target="_blank" rel="noopener"' : "";
    return `<a href="${safe}"${attr}>${label}</a>`;
  });

  // Bold before italic so `**x**` is consumed before single-asterisk runs.
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Italic: single `*...*` (won't eat bold thanks to ordering) and `_..._`.
  // Boundary guards keep us from matching mid-word underscores.
  out = out.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>");
  out = out.replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>");

  // Restore stashed inline-code spans.
  out = out.replace(/ CODE(\d+) /g, (_m, idx) => codes[Number(idx)]);

  return out;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Brand kit — read-only viewer for the /brand-kit/ assets.
 *
 * Four sections: Logo, Colour palette, Typography, Templates.
 * Click a swatch to copy its hex; click Download ↓ on any tile to save the SVG.
 */

import { h, renderTopbar, toast } from "/admin/components.js";

const LOGO_FILES = [
  { file: "brand-mint-primary.svg", dark: false },
  { file: "brand-mint-primary-dark.svg", dark: false },
  { file: "brand-mint-wordmark.svg", dark: false },
  { file: "brand-mint-monogram.svg", dark: false },
  { file: "brand-mint-monogram-mono.svg", dark: false },
  { file: "brand-mint-monogram-cream.svg", dark: false },
  { file: "brand-mint-favicon.svg", dark: false },
];

const COLORS = [
  { name: "Mint 1", hex: "#D6F5E6" },
  { name: "Mint 2", hex: "#7CF6C8" },
  { name: "Mint 3 · Primary", hex: "#10B981" },
  { name: "Mint 4", hex: "#047857" },
  { name: "Ink", hex: "#0A0E0C" },
  { name: "Paper", hex: "#F5F1EA" },
  { name: "Gold", hex: "#C9A14A" },
  { name: "BM Ink (dark interlude)", hex: "#0B1F1A" },
  { name: "BM Ink 2", hex: "#14352D" },
  { name: "BM Ink Deep", hex: "#06140F" },
];

const TEMPLATES = [
  { file: "social-1080.svg", label: "Social post 1080×1080", kind: "image" },
  { file: "og-template.svg", label: "OG card 1200×630", kind: "image" },
  { file: "email-signature.html", label: "Email signature", kind: "code" },
];

export async function render(ctx) {
  renderTopbar({
    breadcrumb: "BRAND",
    title: "Brand kit",
    actions: [
      h("button", {
        class: "btn btn-ghost",
        text: "Open guidelines",
        onclick: () => window.open("/brand-kit/BRAND-GUIDELINES.md", "_blank"),
      }),
      h("button", {
        class: "btn btn-primary",
        text: "Download all",
        onclick: () => window.open("/brand-kit/", "_blank"),
      }),
    ],
  });

  return h("div", {}, [
    renderLogoSection(),
    renderPaletteSection(ctx),
    renderTypographySection(),
    renderTemplatesSection(),
  ]);
}

/* ------------------------------------------------------------------ */
/* Section 1 — Logo                                                    */
/* ------------------------------------------------------------------ */

function renderLogoSection() {
  return h("div", { class: "panel" }, [
    h("div", { class: "panel-head" }, [
      h("div", {}, [
        h("h3", { text: "Logo" }),
        h("div", { class: "subt", text: "SVG masters · scale infinitely" }),
      ]),
    ]),
    h(
      "div",
      { class: "logo-grid" },
      LOGO_FILES.map((entry) => logoTile(entry.file, "/brand-kit/logo/", entry.dark))
    ),
  ]);
}

function logoTile(file, basePath, dark) {
  const href = basePath + file;
  return h("div", { class: "logo-tile" }, [
    h("div", { class: "preview" + (dark ? " dark" : "") }, [
      h("img", { src: href, alt: file }),
    ]),
    h("div", { class: "label" }, [
      h("span", { class: "mono", style: { fontSize: "11px" }, text: file }),
      h("a", { href, download: file, text: "Download ↓" }),
    ]),
  ]);
}

/* ------------------------------------------------------------------ */
/* Section 2 — Colour palette                                          */
/* ------------------------------------------------------------------ */

function renderPaletteSection(ctx) {
  return h("div", { class: "panel" }, [
    h("div", { class: "panel-head" }, [
      h("div", {}, [
        h("h3", { text: "Colour palette" }),
        h("div", { class: "subt", text: "Click a swatch to copy its hex" }),
      ]),
    ]),
    h(
      "div",
      { class: "swatch-grid" },
      COLORS.map((c) => swatch(c, ctx))
    ),
  ]);
}

function swatch(c, ctx) {
  const notify = (msg) => (ctx && ctx.toast ? ctx.toast(msg) : toast(msg));
  return h(
    "div",
    {
      class: "swatch",
      onclick: async () => {
        try {
          await navigator.clipboard.writeText(c.hex);
          notify("Copied " + c.hex);
        } catch (e) {
          notify("Copy failed");
        }
      },
    },
    [
      h("div", { class: "swatch-chip", style: { backgroundColor: c.hex } }),
      h("div", { class: "swatch-meta" }, [
        h("div", { class: "name", text: c.name.toUpperCase() }),
        h("div", { class: "hex", text: c.hex }),
      ]),
    ]
  );
}

/* ------------------------------------------------------------------ */
/* Section 3 — Typography                                              */
/* ------------------------------------------------------------------ */

function renderTypographySection() {
  const sep = () =>
    h("hr", {
      style: { border: 0, borderTop: "1px solid var(--line)", margin: "16px 0" },
    });

  const rowLabel = (text) =>
    h("div", {
      class: "mono",
      style: {
        fontSize: "10.5px",
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: "var(--faint)",
        marginBottom: "10px",
      },
      text,
    });

  const display = h("div", {}, [
    rowLabel("Display · Plus Jakarta Sans 600"),
    h("div", {
      style: {
        fontFamily: "var(--display)",
        fontWeight: 600,
        fontSize: "48px",
        lineHeight: 1.05,
        letterSpacing: "-0.03em",
        color: "var(--ink)",
      },
      html: "We mint <em>brands</em> that compound.",
    }),
  ]);

  const editorial = h("div", {}, [
    rowLabel("Editorial · Plus Jakarta Sans 500 italic"),
    h("blockquote", {
      style: {
        fontFamily: "var(--display)",
        fontWeight: 500,
        fontStyle: "italic",
        fontSize: "28px",
        lineHeight: 1.3,
        margin: 0,
        color: "var(--ink)",
        letterSpacing: "-0.01em",
      },
      text: "They shipped in six weeks what our last agency promised in six months.",
    }),
  ]);

  const body = h("div", {}, [
    rowLabel("Body · Inter 400"),
    h("p", {
      style: {
        fontFamily: "var(--sans)",
        fontWeight: 400,
        fontSize: "16px",
        lineHeight: 1.6,
        margin: 0,
        color: "var(--ink)",
        maxWidth: "62ch",
      },
      text:
        "Brand Mint partners with founders who treat brand as compounding equity, not vanity polish. Every engagement starts with a Mint sprint and ends with a system the team can run without us.",
    }),
  ]);

  const numerals = h("div", {}, [
    rowLabel("Numerals · JetBrains Mono 500"),
    h("div", {
      style: {
        fontFamily: "var(--mono)",
        fontWeight: 500,
        fontSize: "22px",
        letterSpacing: "0.06em",
        color: "var(--mint-3)",
      },
      text: "+₹42.6 Cr · 28.4k sessions · Q3 2026",
    }),
  ]);

  return h("div", { class: "panel" }, [
    h("div", { class: "panel-head" }, [
      h("div", {}, [
        h("h3", { text: "Typography" }),
        h("div", { class: "subt", text: "Plus Jakarta Sans · Inter · JetBrains Mono" }),
      ]),
    ]),
    h("div", {}, [display, sep(), editorial, sep(), body, sep(), numerals]),
    h("div", {
      class: "muted",
      style: { fontSize: "12px", marginTop: "20px", lineHeight: 1.6 },
      text:
        "Use one italic emphasis per headline. Numerals always in JetBrains Mono. Body never below 14px.",
    }),
  ]);
}

/* ------------------------------------------------------------------ */
/* Section 4 — Templates                                               */
/* ------------------------------------------------------------------ */

function renderTemplatesSection() {
  return h("div", { class: "panel" }, [
    h("div", { class: "panel-head" }, [
      h("div", {}, [
        h("h3", { text: "Templates" }),
        h("div", { class: "subt", text: "Drop-in canvases for social, OG, and email" }),
      ]),
    ]),
    h(
      "div",
      { class: "logo-grid" },
      TEMPLATES.map((t) => templateTile(t))
    ),
  ]);
}

function templateTile(t) {
  const href = "/brand-kit/templates/" + t.file;
  let preview;
  if (t.kind === "image") {
    preview = h("div", { class: "preview" }, [
      h("img", { src: href, alt: t.file }),
    ]);
  } else {
    preview = h(
      "div",
      {
        class: "preview",
        style: { display: "grid", placeItems: "center", background: "var(--surface-2)" },
      },
      [h("code", { text: t.file })]
    );
  }
  return h("div", { class: "logo-tile" }, [
    preview,
    h("div", { class: "label" }, [
      h("span", { text: t.label }),
      h("a", { href, download: t.file, text: "Download ↓" }),
    ]),
  ]);
}

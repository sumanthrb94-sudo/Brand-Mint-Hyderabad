// Motion layer — the mint-motion reel's vocabulary, ported to the page.
// Recipes after ibelick/motion-primitives (MIT): TextEffect fade-in-blur,
// TextShimmer, TextScramble, SlidingNumber, BorderTrail, GlowEffect,
// Spotlight. No dependencies. Styles live in shared/motion.css.
//
// Additive only: nothing here changes copy, layout or a link. It does not
// run at all under prefers-reduced-motion, inside the admin heat-map iframe
// (?bm_nt=1), or without IntersectionObserver — and html.mm, which every
// rule in motion.css hangs off, is only set once we know it will.

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const framed = new URLSearchParams(location.search).has("bm_nt");
if (!reduce && !framed && "IntersectionObserver" in window) start();

function start() {
  document.documentElement.classList.add("mm");

  // Fire once when an element is well into view.
  const once = (els, fn, margin = "0px 0px -12% 0px") => {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { io.unobserve(e.target); fn(e.target); }
    }, { rootMargin: margin, threshold: 0.1 });
    els.forEach((el) => io.observe(el));
  };

  // ---- TextEffect: split headings into words, keep the <em> intact -------
  // Words are wrapped in spans; the spaces between them stay as text nodes,
  // so the heading reads and wraps exactly as before.
  function split(h) {
    let i = 0;
    const walk = (node) => {
      for (const n of [...node.childNodes]) {
        if (n.nodeType === 3) {
          const parts = n.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          for (const p of parts) {
            if (!p) continue;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); continue; }
            const w = document.createElement("span");
            w.className = "mm-w";
            w.textContent = p;
            w.style.setProperty("--d", Math.min(i++, 14) * 55);
            frag.appendChild(w);
          }
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      }
    };
    walk(h);
    h.classList.add("mm-split");
  }
  const heads = [...document.querySelectorAll("main h1, main h2")];
  heads.forEach(split);
  // The hero headline is above the fold: play it on load, after the kicker.
  const hero = document.querySelector(".hero h1");
  requestAnimationFrame(() => setTimeout(() => hero && hero.classList.add("mm-on"), 180));
  once(heads.filter((h) => h !== hero), (h) => h.classList.add("mm-on"));

  // ---- TextScramble: kickers resolve out of noise ------------------------
  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  function scramble(el, dur = 750) {
    const text = el.textContent;
    if (!text.trim() || el.children.length) return;
    el.setAttribute("aria-label", text);
    el.classList.add("mm-scr");
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const keep = Math.floor(p * text.length);
      let out = "";
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        out += i < keep || /[\s·—&+,.]/.test(c) ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(tick);
      else { el.textContent = text; el.removeAttribute("aria-label"); }
    };
    requestAnimationFrame(tick);
  }
  const kickers = [...document.querySelectorAll("main .kicker")];
  const heroKicker = document.querySelector(".hero .kicker");
  if (heroKicker) scramble(heroKicker, 900);
  once(kickers.filter((k) => k !== heroKicker), (k) => scramble(k));

  // ---- SlidingNumber: the leading digits of a stat roll into place ------
  function slide(el) {
    const m = el.textContent.match(/^(\d+)(.*)$/s);
    if (!m) return;
    const [, digits, rest] = m;
    // The reel's ten digits are drawn by CSS (::before), so the element's
    // real text — what search engines and copy-paste see — stays "8+ yrs".
    el.textContent = "";
    const real = document.createElement("span");
    real.className = "mm-sr";
    real.textContent = digits;
    el.appendChild(real);
    const reels = [...digits].map((d) => {
      const dg = document.createElement("span");
      dg.className = "mm-dg";
      dg.setAttribute("aria-hidden", "true");
      const col = document.createElement("span");
      dg.appendChild(col);
      el.appendChild(dg);
      return [col, +d];
    });
    const tail = document.createElement("span");
    tail.className = "mm-tail";
    tail.setAttribute("aria-hidden", "true");
    tail.textContent = rest;
    el.appendChild(tail);
    once([el], () => requestAnimationFrame(() => reels.forEach(([col, d], i) => {
      col.style.transitionDelay = i * 80 + "ms";
      col.style.transform = `translateY(${-d * 1.15}em)`;
    })), "0px");
  }
  // The proof panel is filled by the page's own module script; wait for it.
  const stats = document.getElementById("proof-stats");
  const doStats = () => stats.querySelectorAll(".num").forEach(slide);
  if (stats) {
    if (stats.querySelector(".num")) doStats();
    else new MutationObserver((_, mo) => { if (stats.querySelector(".num")) { mo.disconnect(); queueMicrotask(doStats); } })
      .observe(stats, { childList: true });
  }

  // ---- BorderTrail: one lap of light when a key card lands --------------
  // .tier/.service cards on /pricing are rendered by a module script that
  // runs before this one (both are deferred, in document order).
  const trailOnce = (sel) => {
    const els = [...document.querySelectorAll(sel)];
    els.forEach((el) => el.classList.add("mm-trail"));
    once(els, (el) => setTimeout(() => el.classList.add("mm-run"), 350));
  };
  trailOnce(".hero-proof-panel, .tier--featured, .service--featured");
  // Cards rendered later by module scripts: tag them as they appear.
  const tagCards = () => document.querySelectorAll(".work, .service, .tier")
    .forEach((el) => el.classList.add("mm-trail", "mm-trail-hover"));
  tagCards();
  new MutationObserver(tagCards).observe(document.querySelector("main"), { childList: true, subtree: true });

  // ---- GlowEffect shine: cross each primary button once as it lands -----
  once([...document.querySelectorAll(".btn-primary.btn-lg")], (b) => {
    setTimeout(() => b.classList.add("mm-shine"), 500);
    b.addEventListener("animationend", (e) => { if (e.animationName === "mmShine") b.classList.remove("mm-shine"); });
  });

  // ---- Spotlight: soft light under the pointer, desktop only ------------
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    for (const el of document.querySelectorAll(".hero, .section--dark, .cta")) {
      el.classList.add("mm-spot");
      let raf = 0, x = 0, y = 0;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        x = e.clientX - r.left; y = e.clientY - r.top;
        if (!raf) raf = requestAnimationFrame(() => {
          raf = 0;
          el.style.setProperty("--mx", x + "px");
          el.style.setProperty("--my", y + "px");
          el.style.setProperty("--mo", 1);
        });
      }, { passive: true });
      el.addEventListener("pointerleave", () => el.style.setProperty("--mo", 0));
    }
  }
}

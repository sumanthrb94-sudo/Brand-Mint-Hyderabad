/**
 * Mint v2 motion — the public pages' motion layer, ported from
 * ibelick/motion-primitives (MIT) into plain DOM: TextEffect (word-by-word
 * fade-in-blur), SlidingNumber (rolling price digits), Spotlight (a light that
 * follows the cursor across a card). Additive only: every effect is decoration
 * on markup that already reads correctly without it, nothing here changes
 * text a visitor or a crawler sees once it settles, and all of it is off under
 * prefers-reduced-motion. Load it AFTER the page's own module script so the
 * rendered cards and prices already exist.
 */
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

/* ---- TextEffect: split the hero headline into words, keep <em> intact ---- */
function splitWords(el) {
  let i = 0;
  const walk = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 3) {
        const parts = child.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        for (const part of parts) {
          if (!part) continue;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); continue; }
          const w = document.createElement("span");
          w.className = "bm-w";
          w.style.setProperty("--w", i++);
          w.textContent = part;
          frag.appendChild(w);
        }
        child.replaceWith(frag);
      } else if (child.nodeType === 1) {
        walk(child);
      }
    }
  };
  walk(el);
  el.classList.add("bm-split");
}
if (!reduce) {
  for (const h of document.querySelectorAll(".hero h1, .bm-404 h1")) {
    h.removeAttribute("data-enter");
    splitWords(h);
  }
}

/* ---- SlidingNumber: prices roll up to their value when they scroll in ---- */
const PRICE = /^(\D*?)([\d,]+)(\D*)$/;
function rollTo(el) {
  const text = el.textContent.trim();
  const m = text.match(PRICE);
  if (!m) return;
  const target = Number(m[2].replace(/,/g, ""));
  if (!target || target < 100) return;
  const [, pre, , post] = m;
  const fmt = (n) => pre + Math.round(n).toLocaleString("en-IN") + post;
  // Reserve the final width so the card never reflows while it counts.
  el.style.minWidth = el.getBoundingClientRect().width + "px";
  el.style.display = el.style.display || "inline-block";
  const t0 = performance.now(), dur = 1100;
  const tick = (now) => {
    const p = Math.min(1, (now - t0) / dur);
    const eased = 1 - Math.pow(1 - p, 4);
    el.textContent = fmt(target * eased);
    if (p < 1) requestAnimationFrame(tick);
    else { el.textContent = text; el.style.minWidth = ""; }
  };
  el.setAttribute("aria-label", text);
  requestAnimationFrame(tick);
}
const prices = [...document.querySelectorAll(
  ".rung-price .num, .offer-price .num, .service-price .num, .tier-price .num:first-of-type, .care-price .num, .hero-price strong, .hero-proof .num"
)].filter((el) => PRICE.test(el.textContent.trim()));
if (!reduce && prices.length && "IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { io.unobserve(e.target); setTimeout(() => rollTo(e.target), 250); }
  }, { threshold: 0.6 });
  prices.forEach((el) => io.observe(el));
}

/* ---- Spotlight: a soft mint light under the cursor on every card ---- */
if (finePointer && !reduce) {
  const cards = document.querySelectorAll(
    ".rung, .offer-lines li, .fears li, .work, .service, .tier, .feature, .care-plan, .steps li"
  );
  for (const c of cards) {
    c.classList.add("bm-spot");
    const g = document.createElement("span");
    g.className = "bm-spot-glow";
    g.setAttribute("aria-hidden", "true");
    c.prepend(g);
    c.addEventListener("pointermove", (e) => {
      const r = c.getBoundingClientRect();
      c.style.setProperty("--mx", e.clientX - r.left + "px");
      c.style.setProperty("--my", e.clientY - r.top + "px");
    });
  }
}

/**
 * Motion for /home-v2. anime.js v4, vendored at assets/vendor/.
 *
 * THE RULE THAT OUTRANKS EVERY ANIMATION HERE
 * -------------------------------------------
 * The page must be complete and readable if this file never loads.
 *
 * The usual way to build scroll reveals is `opacity: 0` in the stylesheet and
 * JS to bring things back. That is a blank marketing page the day the script
 * 404s, is blocked by an extension, or throws on a browser you did not test.
 * So nothing is hidden in CSS. This file hides elements itself, at runtime,
 * immediately before it animates them — which means a failure to load leaves
 * everything visible rather than everything gone.
 *
 * `hide()` is called inside the same task that starts the observer, so there
 * is no frame where content is hidden with nothing scheduled to reveal it.
 *
 * WHAT IS ANIMATED, AND WHY ONLY THIS
 * -----------------------------------
 * Transform and opacity only. Both are composited — they do not cause layout
 * or paint, so they cannot shift anything below them. Animating width, height,
 * top or margin would reflow the document mid-scroll, which is how a page ends
 * up jumping under a reader's thumb.
 *
 * Durations sit in the 200-600ms band. Below ~150ms a transition reads as a
 * jump; above ~600ms the page starts feeling slow rather than smooth.
 *
 * REDUCED MOTION
 * --------------
 * Checked once at entry and never overridden. If the visitor has asked their
 * operating system for less motion, this file does nothing at all — it does
 * not "reduce" the animation, it declines to run. Vestibular disorders are not
 * a preference to be half-honoured. The media query is also watched live, so
 * flipping the setting takes effect without a reload.
 */

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)");

/* Nothing below runs until anime.js has actually loaded and the visitor has
   not asked for less motion. Both are hard gates, not soft ones. */
if (!REDUCED.matches) {
  import("/assets/vendor/anime.esm.min.js")
    .then((anime) => start(anime))
    .catch(() => {
      /* Vendored file missing or blocked. The page is already complete and
         nothing has been hidden yet, so there is genuinely nothing to undo.
         Silent on purpose: a console error here would be noise about a
         decoration, on a page that is working. */
    });
}

function start({ animate, stagger, onScroll, createTimeline, utils }) {
  const q = (sel) => [...document.querySelectorAll(sel)];

  /* Hidden here, in JS, never in the stylesheet. See the note at the top. */
  const hide = (els, y = 16) =>
    utils.set(els, { opacity: 0, translateY: y });

  /* ── the hero, on load ──────────────────────────────────────
     One timeline so the parts arrive in a deliberate order rather than all
     at once. The badge, then the headline, then the copy, then the buttons —
     roughly the order a person reads them in. */

  const heroBits = [
    ".hero .badge",
    ".hero .display",
    ".hero p.lede",
    ".hero-cta",
    ".trust",
  ]
    .map((s) => document.querySelector(s))
    .filter(Boolean);

  const card = document.querySelector(".hcard");

  if (heroBits.length) {
    hide(heroBits, 18);
    const tl = createTimeline({ defaults: { ease: "out(3)", duration: 620 } });
    heroBits.forEach((el, i) => {
      tl.add(el, { opacity: [0, 1], translateY: [18, 0] }, i === 0 ? 0 : "-=470");
    });
    if (card) {
      hide([card], 24);
      // Starts with the headline rather than after everything, so the right
      // side of the fold is not empty while the left fills in.
      tl.add(card, { opacity: [0, 1], translateY: [24, 0], duration: 760 }, 180);
    }
  }

  // The rows inside the hero card, counted in after it has arrived.
  const cardRows = q(".hcard-row");
  if (cardRows.length) {
    hide(cardRows, 8);
    animate(cardRows, {
      opacity: [0, 1],
      translateY: [8, 0],
      delay: stagger(55, { start: 620 }),
      duration: 420,
      ease: "out(2)",
    });
  }

  /* ── everything else, on scroll ─────────────────────────────
     anime's own scroll observer rather than a hand-rolled
     IntersectionObserver: it shares one scroll listener across every target
     instead of adding one per element, and it already handles an element that
     is above the fold on load.

     enter: "bottom-=80 top" — begin when the element's top is 80px above the
     viewport bottom, so it is already on its way in when it starts moving
     rather than animating in the corner of the eye. */

  const reveal = (sel, opts = {}) => {
    const els = q(sel);
    if (!els.length) return;
    hide(els, opts.y ?? 20);
    animate(els, {
      opacity: [0, 1],
      translateY: [opts.y ?? 20, 0],
      duration: opts.duration ?? 560,
      delay: opts.stagger === false ? 0 : stagger(opts.step ?? 70),
      ease: "out(3)",
      autoplay: onScroll({ enter: "bottom-=80 top", once: true }),
    });
  };

  reveal(".sec-head", { y: 18, stagger: false });
  reveal("#services .card", { step: 55 });
  reveal("#care .plan", { step: 80 });
  reveal(".work-card", { step: 90, y: 24 });
  reveal(".step", { step: 70, y: 14 });
  reveal("#voices .quote", { step: 80 });
  reveal("#studio .person", { step: 90 });
  reveal(".faq details", { step: 40, y: 10 });
  reveal(".cta-band", { y: 26, stagger: false, duration: 640 });

  /* ── the trust numbers count up ─────────────────────────────
     Only the ones that are plainly numeric. "3–5" and "50/50" are ranges and
     ratios, not quantities — counting those would be animation for its own
     sake, and would briefly display a number the studio does not claim. */

  q(".trust-k").forEach((el) => {
    const raw = el.childNodes[0]?.textContent?.trim() ?? "";
    if (!/^\d+$/.test(raw)) return;
    const target = Number(raw);
    const obj = { n: 0 };
    animate(obj, {
      n: target,
      duration: 900,
      ease: "out(4)",
      autoplay: onScroll({ enter: "bottom-=40 top", once: true }),
      onUpdate: () => {
        el.childNodes[0].textContent = String(Math.round(obj.n));
      },
      onComplete: () => {
        el.childNodes[0].textContent = raw; // exactly what the markup said
      },
    });
  });

  /* ── the header hairline ────────────────────────────────────
     The class toggle already exists inline; this only softens the moment it
     flips so the border does not snap on. */
  const hdr = document.getElementById("hdr");
  if (hdr) hdr.style.transition = "border-color 280ms cubic-bezier(.22,.61,.36,1)";

  /* If the visitor turns reduced-motion ON mid-session, stop everything and
     leave the page in its finished state rather than mid-fade. */
  REDUCED.addEventListener?.("change", (e) => {
    if (!e.matches) return;
    utils.set("[style*='opacity']", { opacity: 1, translateY: 0 });
  });
}

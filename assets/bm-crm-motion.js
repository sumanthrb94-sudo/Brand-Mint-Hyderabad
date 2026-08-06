/**
 * Motion for /studio. anime.js v4, the copy already vendored at
 * assets/vendor/anime.esm.min.js for /home-v2 — no second dependency.
 *
 * THE RULE THAT OUTRANKS EVERY ANIMATION HERE
 * -------------------------------------------
 * The CRM must be completely usable if this file never loads.
 *
 * Nothing is hidden in bm-crm.css. There is no `opacity: 0` in a stylesheet
 * waiting for JavaScript to undo it, because that is a blank admin screen the
 * day this 404s or an extension blocks it. Every function below sets its own
 * starting state at runtime, in the same task that starts the animation, and
 * every one is a no-op that returns cleanly if handed nothing.
 *
 * studio.html imports this defensively and falls back to a no-op object, so a
 * failed import costs the movement and nothing else. tests/admin-ui.mjs drives
 * the page with this file blocked and asserts the CRM still works.
 *
 * WHY TOP-LEVEL AWAIT
 * -------------------
 * If anime.js itself is unreachable, this module's own import rejects — which
 * is what we want. The caller's `.catch()` keeps the no-op object rather than
 * this file exporting functions that would each fail individually later.
 *
 * WHAT IS ANIMATED
 * ----------------
 * Transform and opacity only. Both are composited: they cause neither layout
 * nor paint, so they cannot shift a row under a cursor that is already moving
 * toward it. Progress bars animate scaleX, never width, for the same reason.
 *
 * Durations sit between 180ms and 460ms. An admin tool is used all day, every
 * day — motion that reads as elegant on the first open reads as latency on the
 * fortieth. This is deliberately faster than the marketing site.
 *
 * REDUCED MOTION is handled by the CALLER, which declines to import this file
 * at all. That is stronger than checking here: someone who asked their OS for
 * less motion does not download 40 KB of animation engine.
 */

const { animate, stagger, utils } = await import("/assets/vendor/anime.esm.min.js");

const EASE = "out(3)";

/** Coerce anything into a real array of elements. Every entry point is
 *  defensive because these are called from render paths that may legitimately
 *  have produced nothing at all. */
function els(target) {
  if (!target) return [];
  if (typeof target === "string") return [...document.querySelectorAll(target)];
  if (target instanceof Element) return [target];
  return [...target].filter((n) => n instanceof Element);
}

/* ── a view swap ──────────────────────────────────────────────────
   The whole workspace lifts in as one object. Deliberately NOT a stagger of
   its children: switching section is a navigation, and a navigation that
   takes 600ms to assemble itself feels slower than one that arrives. */

export function view(target) {
  const [el] = els(target);
  if (!el) return;
  utils.set(el, { opacity: 0, translateY: 8 });
  animate(el, { opacity: [0, 1], translateY: [8, 0], duration: 260, ease: EASE });
}

/* ── rows and cards ───────────────────────────────────────────────
   A stagger, capped. Past about a dozen the tail of a stagger is just a wait:
   the last row of a 60-row list would arrive a full second late, so the step
   shrinks as the list grows and stops entirely beyond the cap. */

export function rows(target, { step = 26, y = 10 } = {}) {
  const list = els(target);
  if (!list.length) return;
  const visible = list.slice(0, 18);
  const rest = list.slice(18);
  // Anything past the cap is left completely alone — never hidden, so it is
  // readable the instant it is in the DOM.
  if (rest.length) utils.set(rest, { opacity: 1, translateY: 0 });
  utils.set(visible, { opacity: 0, translateY: y });
  animate(visible, {
    opacity: [0, 1],
    translateY: [y, 0],
    duration: 300,
    ease: EASE,
    delay: stagger(Math.max(8, step - visible.length)),
  });
}

/* ── the record drawer ────────────────────────────────────────────
   Slides from the right because that is the direction it came from — the row
   you clicked is still on screen behind it. The scrim fades rather than
   appearing, so the page does not blink. */

export function drawerIn(panel, scrim) {
  const [p] = els(panel);
  const [s] = els(scrim);
  if (s) {
    utils.set(s, { opacity: 0 });
    animate(s, { opacity: [0, 1], duration: 180, ease: "linear" });
  }
  if (!p) return;
  utils.set(p, { opacity: 0, translateX: 26 });
  animate(p, { opacity: [0, 1], translateX: [26, 0], duration: 300, ease: EASE });
}

/** Resolves when the drawer is off screen, so the caller can then remove it
 *  from the DOM. Always resolves — a rejected close would strand the scrim
 *  over the page with nothing able to dismiss it. */
export function drawerOut(panel, scrim) {
  const [p] = els(panel);
  const [s] = els(scrim);
  if (!p && !s) return Promise.resolve();
  return new Promise((resolve) => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    // A hard backstop: if anime never fires onComplete for any reason, the
    // drawer still gets removed.
    setTimeout(finish, 400);
    if (s) animate(s, { opacity: 0, duration: 160, ease: "linear" });
    if (p) animate(p, { opacity: 0, translateX: 26, duration: 200, ease: "in(2)", onComplete: finish });
    else finish();
  });
}

/* ── modals and the command palette ──────────────────────────────
   Scale from 0.98, not from 0.8. A big scale reads as a toy; a small one
   reads as the panel settling into place. */

export function popIn(panel, scrim) {
  const [p] = els(panel);
  const [s] = els(scrim);
  if (s) {
    utils.set(s, { opacity: 0 });
    animate(s, { opacity: [0, 1], duration: 150, ease: "linear" });
  }
  if (!p) return;
  utils.set(p, { opacity: 0, translateY: -8, scale: 0.985 });
  animate(p, { opacity: [0, 1], translateY: [-8, 0], scale: [0.985, 1], duration: 220, ease: EASE });
}

/* ── a progress bar ───────────────────────────────────────────────
   scaleX, never width. Width is a layout property: animating it on a bar
   inside a list forces the browser to re-lay-out every sibling on every
   frame. The caller has already set the real width, so if this never runs the
   bar is simply correct and static. */

export function bar(target) {
  const list = els(target);
  if (!list.length) return;
  utils.set(list, { transformOrigin: "0% 50%", scaleX: 0 });
  animate(list, { scaleX: [0, 1], duration: 460, ease: "out(4)" });
}

/* ── a number counting up ─────────────────────────────────────────
   Only where the number is a headline. Counting every figure on a dense CRM
   screen would mean nothing on the page is readable for half a second.

   The final frame is the caller's exact string, not a re-format of the
   animated float — so the value that lands is the value that was passed in,
   rupee for rupee, and never a rounding of it. */

export function count(target, to, format) {
  const [el] = els(target);
  if (!el) return;
  const final = format ? format(to) : String(to);
  if (!Number.isFinite(to) || to === 0) { el.textContent = final; return; }
  const obj = { n: 0 };
  animate(obj, {
    n: to,
    duration: 620,
    ease: "out(4)",
    onUpdate: () => { el.textContent = format ? format(obj.n) : String(Math.round(obj.n)); },
    onComplete: () => { el.textContent = final; },
  });
}

/* ── nav feedback ─────────────────────────────────────────────────
   A 120ms nudge on the item that was just clicked. Small enough to register
   as responsiveness rather than as an effect. */

export function tap(target) {
  const [el] = els(target);
  if (!el) return;
  animate(el, { scale: [0.97, 1], duration: 160, ease: "out(3)" });
}

/**
 * Brand Mint — Motion Layer
 *
 * Production-grade scroll-driven motion graphics. Loaded after the core
 * site script, fully optional, dies gracefully if the CDN libs are
 * blocked, and disables itself when the user prefers reduced motion.
 *
 * Dependencies (loaded via <script> tags in index.html before this file):
 *   - Lenis  (smooth scroll, touch-aware)
 *   - GSAP + ScrollTrigger  (timeline scrubs, pinning, stagger)
 *
 * Scenes:
 *   1. Hero    — dashboard cards 3D-tilt with scroll, headline split-line reveal
 *   2. Services — kicker fade, headline split, cards stagger with 3D rotate-in
 *   3. Work    — featured case parallax + meta-stagger
 *   4. Process — numbered steps timeline scrub
 *   5. Studio  — large headline split-line reveal
 *   6. Contact — form fields elastic pop-in stagger
 *
 * Brand language: editorial, restrained, never bouncy. All easings are
 * cubic / quart. Durations are 0.6-1.2s. The site should feel like it
 * has weight, not like a Lottie demo.
 */

(() => {
  const reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Hard-fail safely: if the libs didn't load (CSP block, offline, ad blocker)
  // or the user prefers reduced motion, do nothing. The site's baseline
  // reveal-on-scroll in script.js still works.
  const HAS_GSAP = typeof window.gsap !== "undefined";
  const HAS_ST =
    HAS_GSAP && typeof window.ScrollTrigger !== "undefined";
  const HAS_LENIS = typeof window.Lenis !== "undefined";

  if (reduceMotion || !HAS_GSAP || !HAS_ST) {
    if (!HAS_GSAP || !HAS_ST) {
      console.info("[motion] GSAP/ScrollTrigger unavailable — falling back to baseline reveals.");
    }
    return;
  }

  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: "power3.out", duration: 0.9 });

  /* ---------- Smooth scroll (Lenis) ---------- */
  let lenis = null;
  if (HAS_LENIS) {
    lenis = new window.Lenis({
      duration: 1.0,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false, // native iOS touch is smoother than synthetic
    });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------- Helpers ---------- */
  function splitHeadline(el) {
    // Split a heading into spans per word, preserving <em>/<br>.
    if (!el || el.dataset.split === "done") return [];
    const html = el.innerHTML;
    const tokens = html.split(/(<[^>]+>|\s+)/);
    const out = [];
    const spans = [];
    tokens.forEach((tok) => {
      if (!tok) return;
      if (/^\s+$/.test(tok)) {
        out.push(tok);
      } else if (/^<[^>]+>$/.test(tok)) {
        out.push(tok);
      } else {
        out.push(`<span class="motion-word">${tok}</span>`);
      }
    });
    el.innerHTML = out.join("");
    el.dataset.split = "done";
    el.querySelectorAll(".motion-word").forEach((s) => spans.push(s));
    return spans;
  }

  function once(selector, fn) {
    const el = document.querySelector(selector);
    if (el) fn(el);
  }

  function each(selector, fn) {
    document.querySelectorAll(selector).forEach(fn);
  }

  /* ---------- 1. Hero ---------- */
  // NOTE: don't word-split the hero title — it contains a .grad span with
  // background-clip:text that breaks when a child gets display:inline-block.
  // Animate the whole title as one block for reliability.
  once(".hero-title", (el) => {
    gsap.fromTo(
      el,
      { y: 36, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.0, delay: 0.1, ease: "power4.out" }
    );
  });

  once(".hero-sub", (el) => {
    gsap.fromTo(
      el,
      { y: 24, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, delay: 0.55, ease: "power3.out" }
    );
  });

  once(".hero-cta", (el) => {
    gsap.fromTo(
      el,
      { y: 18, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, delay: 0.7 }
    );
  });

  // Hero dashboard card: 3D tilt scrubbed against scroll, plus float-in.
  once(".hero-card", (card) => {
    gsap.set(card, {
      transformPerspective: 1400,
      transformOrigin: "50% 50%",
    });
    gsap.fromTo(
      card,
      { y: 60, opacity: 0, rotateX: 8, rotateY: -6 },
      { y: 0, opacity: 1, rotateX: 0, rotateY: 0, duration: 1.2, delay: 0.3, ease: "power3.out" }
    );
    ScrollTrigger.create({
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: 0.6,
      onUpdate: (self) => {
        gsap.to(card, {
          rotateX: -self.progress * 14,
          y: self.progress * -40,
          duration: 0.3,
          overwrite: "auto",
        });
      },
    });
  });

  // Subtle parallax on each tile inside the dashboard card.
  each(".card-tile", (tile, i) => {
    gsap.to(tile, {
      y: -8 * (i + 1),
      ease: "none",
      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "bottom top",
        scrub: 0.8,
      },
    });
  });

  /* ---------- 2. Services ---------- */
  once("#services h2", (h2) => {
    const words = splitHeadline(h2);
    if (!words.length) return;
    gsap.set(words, { y: 32, opacity: 0 });
    gsap.to(words, {
      y: 0,
      opacity: 1,
      stagger: 0.04,
      duration: 0.8,
      scrollTrigger: { trigger: h2, start: "top 85%", once: true },
    });
  });

  each(".service", (card, i) => {
    gsap.set(card, { transformPerspective: 1000 });
    gsap.fromTo(
      card,
      { y: 60, opacity: 0, rotateX: 10 },
      {
        y: 0,
        opacity: 1,
        rotateX: 0,
        duration: 0.9,
        delay: (i % 3) * 0.08,
        ease: "power3.out",
        scrollTrigger: { trigger: card, start: "top 88%", once: true },
      }
    );
  });

  /* ---------- 3. Work ---------- */
  once("#work h2", (h2) => {
    const words = splitHeadline(h2);
    if (!words.length) return;
    gsap.set(words, { y: 32, opacity: 0 });
    gsap.to(words, {
      y: 0,
      opacity: 1,
      stagger: 0.04,
      duration: 0.8,
      scrollTrigger: { trigger: h2, start: "top 85%", once: true },
    });
  });

  each(".case", (card, i) => {
    gsap.fromTo(
      card,
      { y: 80, opacity: 0, scale: 0.97 },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 1.1,
        delay: i * 0.08,
        ease: "power3.out",
        scrollTrigger: { trigger: card, start: "top 88%", once: true },
      }
    );
  });

  // Featured case meta values: stagger pop with subtle scale.
  each(".case--featured .metrics dd, .case-body--featured .metrics dd", (dd, i) => {
    gsap.fromTo(
      dd,
      { y: 24, opacity: 0, scale: 0.95 },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.7,
        delay: i * 0.08,
        ease: "back.out(1.4)",
        scrollTrigger: { trigger: dd, start: "top 90%", once: true },
      }
    );
  });

  /* ---------- 4. Process ---------- */
  once("#process h2", (h2) => {
    const words = splitHeadline(h2);
    if (!words.length) return;
    gsap.set(words, { y: 32, opacity: 0 });
    gsap.to(words, {
      y: 0,
      opacity: 1,
      stagger: 0.04,
      duration: 0.8,
      scrollTrigger: { trigger: h2, start: "top 85%", once: true },
    });
  });

  each(".process li", (li, i) => {
    gsap.fromTo(
      li,
      { x: -40, opacity: 0 },
      {
        x: 0,
        opacity: 1,
        duration: 0.8,
        delay: i * 0.1,
        ease: "power3.out",
        scrollTrigger: { trigger: li, start: "top 88%", once: true },
      }
    );
  });

  /* ---------- 5. Studio / About ---------- */
  once("#about h2", (h2) => {
    const words = splitHeadline(h2);
    if (!words.length) return;
    gsap.set(words, { y: 32, opacity: 0 });
    gsap.to(words, {
      y: 0,
      opacity: 1,
      stagger: 0.04,
      duration: 0.8,
      scrollTrigger: { trigger: h2, start: "top 85%", once: true },
    });
  });

  /* ---------- 6. Contact ---------- */
  once("#contact h2, .contact h2", (h2) => {
    const words = splitHeadline(h2);
    if (!words.length) return;
    gsap.set(words, { y: 32, opacity: 0 });
    gsap.to(words, {
      y: 0,
      opacity: 1,
      stagger: 0.04,
      duration: 0.8,
      scrollTrigger: { trigger: h2, start: "top 85%", once: true },
    });
  });

  each(".contact-form .field", (field, i) => {
    gsap.fromTo(
      field,
      { y: 24, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.7,
        delay: i * 0.05,
        ease: "power3.out",
        scrollTrigger: { trigger: field, start: "top 92%", once: true },
      }
    );
  });

  /* ---------- 3D Card Tilt on Hover (desktop pointer only) ---------- */
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  if (finePointer) {
    const tiltCards = document.querySelectorAll(
      ".service, .case, .bm-card, .hero-card"
    );
    tiltCards.forEach((card) => {
      card.style.transformStyle = "preserve-3d";
      card.style.willChange = "transform";
      let rect = null;
      card.addEventListener(
        "mouseenter",
        () => {
          rect = card.getBoundingClientRect();
        },
        { passive: true }
      );
      card.addEventListener(
        "mousemove",
        (e) => {
          if (!rect) rect = card.getBoundingClientRect();
          const px = (e.clientX - rect.left) / rect.width - 0.5;
          const py = (e.clientY - rect.top) / rect.height - 0.5;
          gsap.to(card, {
            rotateY: px * 6,
            rotateX: -py * 6,
            transformPerspective: 1200,
            duration: 0.4,
            ease: "power2.out",
            overwrite: "auto",
          });
        },
        { passive: true }
      );
      card.addEventListener(
        "mouseleave",
        () => {
          rect = null;
          gsap.to(card, {
            rotateY: 0,
            rotateX: 0,
            duration: 0.6,
            ease: "power3.out",
            overwrite: "auto",
          });
        },
        { passive: true }
      );
    });
  }

  /* ---------- Anchor links: hand off to Lenis if available ---------- */
  if (lenis) {
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (!id || id === "#") return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -80, duration: 1.2 });
      });
    });
  }

  /* ---------- Make sure ScrollTrigger recalcs once everything's mounted ---------- */
  window.addEventListener("load", () => ScrollTrigger.refresh());
})();

(() => {
  const nav = document.getElementById("nav");
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  const yearEl = document.getElementById("year");
  const form = document.getElementById("contact-form");

  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Sticky nav border on scroll
  const onScroll = () => {
    if (window.scrollY > 8) nav.classList.add("is-scrolled");
    else nav.classList.remove("is-scrolled");
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Mobile menu
  toggle?.addEventListener("click", () => {
    const open = links.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });

  links?.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      links.classList.remove("is-open");
      toggle?.setAttribute("aria-expanded", "false");
    });
  });

  // Reveal-on-scroll
  const revealTargets = document.querySelectorAll(
    ".section-head, .service, .case, .quote, .process li, .split-text, .split-card, .cta, .hero-card, .hero-inner, .faq details"
  );
  revealTargets.forEach((el) => el.classList.add("reveal"));

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 }
    );
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add("is-visible"));
  }

  // Subtle parallax on hero card (skipped for reduced motion / touch)
  const card = document.querySelector(".hero-card");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isFinePointer = matchMedia("(pointer: fine)").matches;
  if (card && !reduceMotion && isFinePointer) {
    const hero = document.querySelector(".hero");
    let raf = 0;
    hero.addEventListener("mousemove", (e) => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        card.style.transform = `rotate(${1.5 - x * 3}deg) translate3d(${x * 8}px, ${y * 8}px, 0)`;
      });
    });
    hero.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  }

  // Contact form — POSTs to Supabase `leads`, falls back to mailto on error.
  const SUPABASE_URL = "https://ycdfgtljxqrhyobnwwbz.supabase.co";
  const SUPABASE_ANON_KEY =
    "sb_publishable_ddoQWG7ZWqNwTRJFBdfbHA_HoX48n1l";

  async function sendLeadToSupabase(payload) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Supabase ${res.status}: ${text}`);
    }
  }

  if (form) {
    const status = form.querySelector(".form-status");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      status.classList.remove("is-error");

      const data = new FormData(form);
      const name = (data.get("name") || "").toString().trim();
      const email = (data.get("email") || "").toString().trim();
      const type = (data.get("type") || "").toString().trim();

      if (!name || !email || !type) {
        status.classList.add("is-error");
        status.textContent = "Add a name, email, and what you need.";
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        status.classList.add("is-error");
        status.textContent = "That email looks off — mind double-checking?";
        return;
      }

      const button = form.querySelector("button[type=submit]");
      const labelEl = button.querySelector(".btn-label");
      const original = labelEl.textContent;
      button.disabled = true;
      labelEl.textContent = "Sending…";

      const authUser = window.bmAuth?.getUser?.();
      const phone = (data.get("phone") || "").toString().trim();
      const message = (data.get("message") || "").toString().trim();

      const payload = {
        name,
        email,
        phone: phone || null,
        project_type: type,
        message: message || null,
        status: "new",
        score: authUser ? 65 : 50,
        source: authUser ? "Signed-in inquiry" : "Site contact form",
        user_id: authUser?.id || null,
      };

      // Best-effort: still capture the lead in the CRM (non-blocking).
      sendLeadToSupabase(payload).catch((err) =>
        console.error("[contact] Supabase insert failed", err)
      );

      // Primary action: open WhatsApp to the studio with the inquiry prefilled.
      const waText = encodeURIComponent(
        [
          "New project inquiry — Brand Mint",
          `Name: ${name}`,
          `Email: ${email}`,
          `Phone: ${phone || "—"}`,
          `Type: ${type || "—"}`,
          "",
          message || "(no notes)",
        ].join("\n")
      );
      window.open(`https://wa.me/917799934943?text=${waText}`, "_blank");

      button.disabled = false;
      labelEl.textContent = original;
      status.textContent =
        "Opening WhatsApp — hit send and we'll reply within one business day.";
      form.reset();
    });
  }

  /* ---------- Premium motion layer ---------- */

  // 1 · Staggered scroll-reveal — cascade siblings within a group
  if (!reduceMotion) {
    document
      .querySelectorAll(".services, .quotes, .faq, .hero-meta")
      .forEach((group) => {
        [...group.querySelectorAll(".reveal")].forEach((el, i) => {
          el.style.transitionDelay = Math.min(i, 8) * 70 + "ms";
        });
      });
  }

  // 2 · Hero entrance — children rise in, staggered, on first paint
  if (!reduceMotion) {
    const heroItems = [...document.querySelectorAll(".hero-inner > *")];
    heroItems.forEach((el, i) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(18px)";
      el.style.transition =
        "opacity .7s ease, transform .7s cubic-bezier(.2,.8,.2,1)";
      el.style.transitionDelay = i * 90 + "ms";
    });
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        heroItems.forEach((el) => {
          el.style.opacity = "";
          el.style.transform = "";
        });
      })
    );
  }

  // 3 · Count-up stat numbers when the hero meta scrolls into view
  if (!reduceMotion && "IntersectionObserver" in window) {
    document.querySelectorAll(".hero-meta strong").forEach((strong) => {
      const node = [...strong.childNodes].find(
        (n) => n.nodeType === 3 && /\d/.test(n.nodeValue)
      );
      if (!node) return;
      const m = node.nodeValue.match(/^(\D*)(\d+(?:\.\d+)?)(\D*)$/);
      if (!m) return;
      const [, pre, numStr, post] = m;
      const target = parseFloat(numStr);
      const decimals = (numStr.split(".")[1] || "").length;
      const fmt = (v) =>
        pre +
        (decimals
          ? v.toFixed(decimals)
          : Math.round(v).toLocaleString("en-IN")) +
        post;

      const io = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            obs.disconnect();
            const dur = 1100;
            const start = performance.now();
            const tick = (now) => {
              const p = Math.min(1, (now - start) / dur);
              const eased = 1 - Math.pow(1 - p, 3);
              node.nodeValue = fmt(target * eased);
              if (p < 1) requestAnimationFrame(tick);
              else node.nodeValue = fmt(target);
            };
            requestAnimationFrame(tick);
          });
        },
        { threshold: 0.4 }
      );
      io.observe(strong);
    });
  }

  // 4 · Magnetic primary buttons (fine pointer, motion allowed)
  if (!reduceMotion && isFinePointer) {
    document.querySelectorAll(".btn--primary").forEach((btn) => {
      const pull = 14;
      btn.addEventListener("mousemove", (e) => {
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) / r.width;
        const y = (e.clientY - r.top - r.height / 2) / r.height;
        btn.style.transform = `translate(${x * pull}px, ${y * pull}px)`;
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.transform = "";
      });
    });
  }

  // 5 · Scroll progress bar
  {
    const bar = document.createElement("div");
    bar.className = "scroll-progress";
    document.body.appendChild(bar);
    let ticking = false;
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      bar.style.transform = `scaleX(${Math.min(1, Math.max(0, p))})`;
      ticking = false;
    };
    update();
    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    window.addEventListener("resize", update, { passive: true });
  }

  // 6 · Custom cursor ring (accents the native cursor; fine pointer + motion on)
  if (!reduceMotion && isFinePointer) {
    const ring = document.createElement("div");
    ring.className = "bm-cursor";
    document.body.appendChild(ring);
    let mx = window.innerWidth / 2,
      my = window.innerHeight / 2,
      cx = mx,
      cy = my;
    window.addEventListener(
      "mousemove",
      (e) => {
        mx = e.clientX;
        my = e.clientY;
      },
      { passive: true }
    );
    const loop = () => {
      cx += (mx - cx) * 0.18;
      cy += (my - cy) * 0.18;
      ring.style.left = cx + "px";
      ring.style.top = cy + "px";
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    const grow = () => ring.classList.add("is-active");
    const shrink = () => ring.classList.remove("is-active");
    document
      .querySelectorAll("a, button, .bm-card, .service, [data-auth-action]")
      .forEach((el) => {
        el.addEventListener("mouseenter", grow);
        el.addEventListener("mouseleave", shrink);
      });
  }

  // 7 · 3D logo rotation synced to scroll velocity.
  //     Marquees are NOT scroll-linked — they run at a steady CSS pace.
  if (!reduceMotion) {
    const stage = document.querySelector(".logo3d-stage");
    if (stage) {
      let lastY = window.scrollY;
      let vel = 0; // recent scroll delta (px)
      let logoRot = 0;

      window.addEventListener(
        "scroll",
        () => {
          const y = window.scrollY;
          vel += y - lastY;
          vel = Math.max(-120, Math.min(120, vel)); // cap momentum build-up
          lastY = y;
        },
        { passive: true }
      );

      const loop = () => {
        const boost = Math.max(-60, Math.min(60, vel));
        vel *= 0.9; // decay toward idle
        if (Math.abs(vel) < 0.01) vel = 0;
        logoRot += boost * 0.02; // low scroll-sync — subtle rotation
        stage.style.transform = `rotateY(${logoRot.toFixed(2)}deg)`;
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
  }
})();

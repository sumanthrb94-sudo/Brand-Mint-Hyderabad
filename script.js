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
      const payload = {
        name,
        company: (data.get("company") || "").toString().trim() || null,
        email,
        phone: (data.get("phone") || "").toString().trim() || null,
        project_type: type,
        budget: (data.get("budget") || "").toString().trim() || null,
        message: (data.get("message") || "").toString().trim() || null,
        status: "new",
        score: authUser ? 65 : 50,
        source: authUser ? "Signed-in inquiry" : "Site contact form",
        user_id: authUser?.id || null,
      };

      // Fire-and-forget Gmail notification via Formsubmit. Runs in parallel
      // with the Supabase write so every inquiry lands in the inbox even if
      // the DB write fails. Requires one-time verification on first submission
      // (Formsubmit emails brandmint.studios.in@gmail.com a confirm link).
      const gmailNotify = fetch(
        "https://formsubmit.co/ajax/brandmint.studios.in@gmail.com",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            _subject: `New project inquiry — ${type}`,
            _template: "table",
            _captcha: "false",
            Name: name,
            Email: email,
            Company: payload.company || "—",
            Phone: payload.phone || "—",
            Type: payload.project_type,
            Budget: payload.budget || "—",
            Message: payload.message || "—",
          }),
        }
      ).catch((err) => console.error("[contact] Gmail notify failed", err));

      try {
        await sendLeadToSupabase(payload);
        await gmailNotify;
        button.disabled = false;
        labelEl.textContent = original;
        status.textContent =
          "Thanks — we'll be in touch within one business day.";
        form.reset();
      } catch (err) {
        console.error("[contact] Supabase insert failed, falling back to mailto", err);
        button.disabled = false;
        labelEl.textContent = original;
        status.textContent =
          "Opening your mail app — send us the message and we'll reply within one business day.";
        form.reset();
        const subject = encodeURIComponent(
          `New project inquiry — ${type || "Brand Mint"}`
        );
        const body = encodeURIComponent(
          [
            `Name: ${name}`,
            `Email: ${email}`,
            `Company: ${payload.company || "—"}`,
            `Type: ${payload.project_type || "—"}`,
            `Budget: ${payload.budget || "—"}`,
            "",
            payload.message || "",
          ].join("\n")
        );
        window.location.href = `mailto:brandmint.studios.in@gmail.com?subject=${subject}&body=${body}`;
      }
    });
  }
})();

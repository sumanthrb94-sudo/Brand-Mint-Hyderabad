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

  // Contact form — client-side validation + faux submit
  if (form) {
    const status = form.querySelector(".form-status");
    form.addEventListener("submit", (e) => {
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
      const original = button.querySelector(".btn-label").textContent;
      button.disabled = true;
      button.querySelector(".btn-label").textContent = "Sending…";

      // No backend yet — simulate the round-trip and fall back to a mailto.
      setTimeout(() => {
        button.disabled = false;
        button.querySelector(".btn-label").textContent = original;
        status.textContent =
          "Thanks — we'll be in touch within one business day.";
        form.reset();

        const subject = encodeURIComponent(
          `New project inquiry — ${data.get("type") || "Brand Mint"}`
        );
        const body = encodeURIComponent(
          [
            `Name: ${name}`,
            `Email: ${email}`,
            `Company: ${data.get("company") || "—"}`,
            `Type: ${data.get("type") || "—"}`,
            `Budget: ${data.get("budget") || "—"}`,
            "",
            data.get("message") || "",
          ].join("\n")
        );
        window.location.href = `mailto:hello@brandmint.studio?subject=${subject}&body=${body}`;
      }, 700);
    });
  }
})();

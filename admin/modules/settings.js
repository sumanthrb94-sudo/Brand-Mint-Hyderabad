/**
 * Settings — studio profile, pricing floors, bank, security, data.
 *
 * Layout: sticky left rail of in-page anchors, scroll-tracked via
 * IntersectionObserver. Right column is a stack of settings-card sections.
 */

import {
  h,
  field,
  formToObject,
  toast,
  confirm,
  renderTopbar,
  inr,
} from "/admin/components.js";
import { db } from "/admin/db.js";
import { auth } from "/admin/auth.js";

const SECTIONS = [
  { id: "profile", label: "Studio profile" },
  { id: "pricing", label: "Pricing" },
  { id: "bank", label: "Bank details" },
  { id: "security", label: "Security" },
  { id: "data", label: "Data" },
];

export async function render(ctx) {
  renderTopbar({
    breadcrumb: "SYSTEM",
    title: "Settings",
    actions: [
      h("button", {
        class: "btn btn-ghost",
        text: "Log out",
        onclick: () =>
          confirm({
            title: "Log out?",
            message: "You'll need the passcode to get back in.",
            onConfirm: () => ctx.logout && ctx.logout(),
          }),
      }),
    ],
  });

  const settings = db.settings.get() || {};

  const root = h("div", { class: "settings-grid" }, [
    renderSide(),
    h("div", {}, [
      renderProfile(settings),
      renderPricing(settings),
      renderBank(settings),
      await renderSecurity(),
      renderData(),
    ]),
  ]);

  queueMicrotask(() => attachScrollSpy(root));

  return root;
}

/* ---------- Left rail ---------- */

function renderSide() {
  return h(
    "nav",
    { class: "settings-side" },
    SECTIONS.map((s, i) =>
      h("a", {
        href: "#" + s.id,
        class: "settings-nav-link" + (i === 0 ? " active" : ""),
        "data-target": s.id,
        text: s.label,
        onclick: (e) => {
          e.preventDefault();
          const target = document.getElementById(s.id);
          if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
          setActive(s.id);
        },
      })
    )
  );
}

function setActive(id) {
  document.querySelectorAll(".settings-nav-link").forEach((a) => {
    a.classList.toggle("active", a.dataset.target === id);
  });
}

function attachScrollSpy(root) {
  const targets = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean);
  if (!targets.length) return;
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible[0]) setActive(visible[0].target.id);
    },
    {
      rootMargin: "-20% 0px -60% 0px",
      threshold: [0, 0.25, 0.5, 0.75, 1],
    }
  );
  targets.forEach((t) => observer.observe(t));
}

/* ---------- Studio profile ---------- */

function renderProfile(settings) {
  const form = h("form", { class: "vstack", style: { gap: "12px" } }, [
    field({ label: "Studio name", name: "studioName", value: settings.studioName || "" }),
    field({ label: "Legal name", name: "legalName", value: settings.legalName || "" }),
    field({ label: "GSTIN", name: "gstin", value: settings.gstin || "" }),
    field({ label: "PAN", name: "pan", value: settings.pan || "" }),
    field({ label: "Address", name: "address", value: settings.address || "" }),
    field({ label: "Email", name: "email", type: "email", value: settings.email || "" }),
    field({ label: "Phone", name: "phone", value: settings.phone || "" }),
    field({ label: "Website", name: "website", value: settings.website || "" }),
    h(
      "div",
      { class: "hstack", style: { justifyContent: "flex-end", marginTop: "8px" } },
      [
        h("button", {
          type: "submit",
          class: "btn btn-primary",
          text: "Save profile",
        }),
      ]
    ),
  ]);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const values = formToObject(form);
    db.settings.set(values);
    toast("Profile saved.");
  });

  return h("section", { id: "profile", class: "settings-card" }, [
    h("h4", { text: "Studio profile" }),
    h("div", { class: "desc", text: "Used on invoices and contracts." }),
    form,
  ]);
}

/* ---------- Pricing ---------- */

const PRICING_FIELDS = [
  { key: "site", label: "Custom website (₹)" },
  { key: "tool", label: "Custom tool (₹)" },
  { key: "brand", label: "Brand system (₹)" },
  { key: "retainer", label: "Retainer / mo (₹)" },
  { key: "seo", label: "SEO retainer / mo (₹)" },
  { key: "ai", label: "AI integration (₹)" },
];

function renderPricing(settings) {
  const pricing = settings.pricing || {};

  const preview = h("div", { class: "muted", style: { fontSize: "12.5px", marginTop: "8px" } });
  const updatePreview = (values) => {
    const parts = PRICING_FIELDS.map((f) => inr(Number(values[f.key]) || 0));
    preview.textContent = "Current floors: " + parts.join(" · ");
  };

  const inputs = PRICING_FIELDS.map((f) => {
    const has = pricing[f.key] != null && pricing[f.key] !== "";
    const input = h("input", {
      name: f.key,
      type: "number",
      min: "0",
      step: "1000",
      placeholder: " ",
      value: has ? String(pricing[f.key]) : "",
    });
    const wrap = h("label", { class: "field" + (has ? " has-value" : "") }, [
      input,
      h("span", { text: f.label }),
    ]);
    input.addEventListener("input", () => {
      wrap.classList.toggle("has-value", !!input.value);
      updatePreview(snapshot());
    });
    return wrap;
  });

  const form = h("form", { class: "vstack", style: { gap: "12px" } }, [
    h("div", { class: "two-col" }, [
      h("div", { class: "vstack", style: { gap: "12px" } }, inputs.slice(0, 3)),
      h("div", { class: "vstack", style: { gap: "12px" } }, inputs.slice(3)),
    ]),
    preview,
    h(
      "div",
      { class: "hstack", style: { justifyContent: "flex-end", marginTop: "8px" } },
      [
        h("button", {
          type: "submit",
          class: "btn btn-primary",
          text: "Save pricing",
        }),
      ]
    ),
  ]);

  function snapshot() {
    const values = formToObject(form);
    const out = {};
    for (const f of PRICING_FIELDS) out[f.key] = Number(values[f.key]) || 0;
    return out;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const next = snapshot();
    db.settings.set({ pricing: next });
    updatePreview(next);
    toast("Pricing saved.");
  });

  updatePreview(pricing);

  return h("section", { id: "pricing", class: "settings-card" }, [
    h("h4", { text: "Pricing floors" }),
    h("div", {
      class: "desc",
      text:
        "Shown on the public site. Change cascades nowhere automatically — update index.html separately if these change.",
    }),
    form,
  ]);
}

/* ---------- Bank ---------- */

function renderBank(settings) {
  const bank = settings.bank || {};

  const form = h("form", { class: "vstack", style: { gap: "12px" } }, [
    field({ label: "Bank name", name: "name", value: bank.name || "" }),
    field({ label: "Account number", name: "account", value: bank.account || "" }),
    field({ label: "IFSC", name: "ifsc", value: bank.ifsc || "" }),
    h(
      "div",
      { class: "hstack", style: { justifyContent: "flex-end", marginTop: "8px" } },
      [
        h("button", {
          type: "submit",
          class: "btn btn-primary",
          text: "Save bank details",
        }),
      ]
    ),
  ]);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const values = formToObject(form);
    db.settings.set({ bank: values });
    toast("Bank details saved.");
  });

  return h("section", { id: "bank", class: "settings-card" }, [
    h("h4", { text: "Bank details" }),
    h("div", { class: "desc", text: "Appears on invoice PDFs." }),
    form,
  ]);
}

/* ---------- Security ---------- */

async function renderSecurity() {
  const user = auth.getUser();
  const status = h("div", {
    class: "muted",
    style: { fontSize: "12.5px", marginTop: "10px" },
    text: user ? `Signed in as ${user.email}.` : "Not signed in.",
  });

  const form = h("form", { class: "vstack", style: { gap: "12px" } }, [
    field({ label: "New password (min 8 chars)", name: "next", type: "password" }),
    field({ label: "Confirm new password", name: "confirm", type: "password" }),
    h(
      "div",
      { class: "hstack", style: { justifyContent: "flex-end", marginTop: "8px" } },
      [
        h("button", {
          type: "submit",
          class: "btn btn-primary",
          text: "Update password",
        }),
      ]
    ),
  ]);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const { next, confirm: confirmPass } = formToObject(form);

    if (next !== confirmPass) {
      toast("Passwords don't match.");
      return;
    }
    if (!next || next.length < 8) {
      toast("Password must be at least 8 characters.");
      return;
    }

    try {
      const { getClient } = await import("/admin/supabase.js");
      const sb = await getClient();
      const { error } = await sb.auth.updateUser({ password: next });
      if (error) throw error;
      form.reset();
      toast("Password updated.");
    } catch (err) {
      toast(err?.message || "Couldn't update password.");
    }
  });

  return h("section", { id: "security", class: "settings-card" }, [
    h("h4", { text: "Account password" }),
    h("div", {
      class: "desc",
      text:
        "Change the password for the admin account you're signed in with. Stored as a bcrypt hash in Supabase Auth.",
    }),
    form,
    status,
  ]);
}

/* ---------- Data ---------- */

function renderData() {
  const fileInput = h("input", {
    type: "file",
    accept: ".json,application/json",
    style: { display: "none" },
    onchange: (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      handleImport(file);
    },
  });

  const exportBtn = h("button", {
    type: "button",
    class: "btn btn-primary",
    text: "Export all",
    onclick: () => doExport(),
  });

  const importBtn = h("button", {
    type: "button",
    class: "btn btn-ghost",
    text: "Import",
    onclick: () => fileInput.click(),
  });

  const wipeBtn = h("button", {
    type: "button",
    class: "btn btn-danger",
    text: "Wipe all admin data",
    onclick: () =>
      confirm({
        title: "Wipe all admin data?",
        danger: true,
        message:
          "This deletes all leads, projects, clients, invoices, content, and settings from this device. The brand site is unaffected. There is no undo.",
        onConfirm: () => {
          db.wipe();
          location.reload();
        },
      }),
  });

  return h("section", { id: "data", class: "settings-card" }, [
    h("h4", { text: "Data" }),
    h("div", {
      class: "desc",
      text: "Export everything to JSON for backup, or import a previous dump.",
    }),
    h(
      "div",
      { class: "hstack flex-wrap gap-2" },
      [exportBtn, importBtn, wipeBtn, fileInput]
    ),
  ]);
}

function doExport() {
  const dump = db.exportAll();
  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `brand-mint-admin-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast("Exported.");
}

function handleImport(file) {
  if (!file) return;
  confirm({
    title: "Import will overwrite",
    danger: true,
    message:
      "Importing replaces all current admin data on this device with the contents of the JSON file. There is no undo.",
    onConfirm: () => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result || ""));
          db.importAll(parsed);
          toast("Imported. Reloading…");
          setTimeout(() => location.reload(), 600);
        } catch (err) {
          toast("Import failed: " + (err.message || "invalid JSON"));
        }
      };
      reader.onerror = () => toast("Could not read file.");
      reader.readAsText(file);
    },
  });
}

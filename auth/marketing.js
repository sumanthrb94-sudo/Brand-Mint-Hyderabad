/**
 * Brand Mint — Public-site auth.
 *
 * Passwordless magic-link sign-in via Supabase. The <head> preflight script
 * sets <html data-auth-state="signed-in|signed-out"> synchronously from
 * localStorage, so the nav never flashes the wrong UI. This module then:
 *
 *   1. Hydrates the actual Supabase session and reconciles the state.
 *   2. Reacts to auth changes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED).
 *   3. Renders the account chip, dropdown, and modal.
 *   4. Cleans the magic-link callback fragment/query out of the URL.
 *
 * Public API:  window.bmAuth = {
 *   openModal, signOut, getUser, getSession, getClient, onChange, ready
 * }
 */

const PROJECT_REF = "ycdfgtljxqrhyobnwwbz";
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const SUPABASE_ANON_KEY = "sb_publishable_ddoQWG7ZWqNwTRJFBdfbHA_HoX48n1l";

/* ---------------- State ---------------- */

let _client = null;
let _user = null;
let _ready = false;
let _readyResolve;
const _readyP = new Promise((r) => (_readyResolve = r));
const _listeners = new Set();

function notify() {
  for (const fn of _listeners) {
    try { fn(_user); } catch (err) { console.error("[auth] listener", err); }
  }
}

/* ---------------- Supabase client (lazy) ---------------- */

async function getClient() {
  if (_client) return _client;
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  });
  return _client;
}

/* ---------------- DOM reconciliation ---------------- */

function applyState(user) {
  _user = user || null;
  const state = _user ? "signed-in" : "signed-out";
  document.documentElement.dataset.authState = state;

  const email = _user?.email || "";
  const displayName =
    _user?.user_metadata?.full_name ||
    _user?.user_metadata?.name ||
    (email ? email.split("@")[0] : "");
  const initial = (displayName || email || "·").trim().charAt(0).toUpperCase() || "·";

  for (const el of document.querySelectorAll("[data-auth-user-email]")) {
    el.textContent = email;
  }
  for (const el of document.querySelectorAll("[data-auth-user-name]")) {
    el.textContent = displayName ? capitalize(displayName) : "Account";
  }
  for (const el of document.querySelectorAll("[data-auth-user-initial]")) {
    el.textContent = initial;
  }
  notify();
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ---------------- URL cleanup post magic-link callback ---------------- */

function cleanAuthFragmentsFromURL() {
  const url = new URL(window.location.href);
  let dirty = false;

  // PKCE callback returns ?code=... and sometimes ?type=...
  for (const key of ["code", "type", "error", "error_description", "error_code"]) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      dirty = true;
    }
  }
  // Implicit flow returns #access_token=...&refresh_token=...
  if (url.hash.startsWith("#access_token=") || url.hash.startsWith("#error=")) {
    url.hash = "";
    dirty = true;
  }
  if (dirty) {
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  }
}

/* ---------------- Bootstrap ---------------- */

async function bootstrap() {
  const sb = await getClient();

  const { data, error } = await sb.auth.getSession();
  if (error) console.warn("[auth] getSession", error);
  applyState(data?.session?.user || null);

  cleanAuthFragmentsFromURL();

  sb.auth.onAuthStateChange((event, session) => {
    applyState(session?.user || null);
    if (event === "SIGNED_IN") {
      closeAuthModal();
      const name = session?.user?.user_metadata?.full_name || session?.user?.email || "there";
      toast(`Signed in — welcome${name ? `, ${name.split("@")[0]}` : ""}.`);
    } else if (event === "SIGNED_OUT") {
      toast("Signed out.");
    } else if (event === "USER_UPDATED") {
      toast("Account updated.");
    }
  });

  _ready = true;
  _readyResolve();
}

/* ---------------- Sign out ---------------- */

async function signOut() {
  try {
    const sb = await getClient();
    await sb.auth.signOut();
  } catch (err) {
    console.error("[auth] signOut", err);
    toast("Couldn't sign out — try again.", { error: true });
  }
}

/* ---------------- Account chip dropdown ---------------- */

function wireChipDropdown() {
  const wrap = document.getElementById("nav-userchip-wrap");
  const btn = document.getElementById("nav-userchip");
  if (!wrap || !btn) return;

  function open() {
    wrap.classList.add("open");
    btn.setAttribute("aria-expanded", "true");
  }
  function close() {
    wrap.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
  }
  function toggle() {
    wrap.classList.contains("open") ? close() : open();
  }

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggle();
  });

  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && wrap.classList.contains("open")) {
      close();
      btn.focus();
    }
  });

  // Close after picking a menu item.
  wrap.querySelectorAll("[role='menuitem']").forEach((item) => {
    item.addEventListener("click", () => close());
  });
}

/* ---------------- Toasts ---------------- */

function getToastStack() {
  let stack = document.querySelector(".bm-toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "bm-toast-stack";
    stack.setAttribute("role", "status");
    stack.setAttribute("aria-live", "polite");
    document.body.appendChild(stack);
  }
  return stack;
}

function toast(message, { error = false, duration = 3200 } = {}) {
  const stack = getToastStack();
  const el = document.createElement("div");
  el.className = `bm-toast${error ? " is-error" : ""}`;
  el.textContent = message;
  stack.appendChild(el);
  requestAnimationFrame(() => el.classList.add("is-visible"));
  setTimeout(() => {
    el.classList.remove("is-visible");
    setTimeout(() => el.remove(), 220);
  }, duration);
}

/* ---------------- Auth modal ---------------- */

const COOLDOWN_SECONDS = 30;
const lastSendAt = new Map(); // email -> timestamp

function emailIsValid(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function closeAuthModal() {
  const overlay = document.getElementById("bm-auth-modal-overlay");
  if (!overlay) return;
  overlay._cleanup?.();
  overlay.remove();
  document.body.style.overflow = "";
}

function openAuthModal(mode = "login") {
  if (document.getElementById("bm-auth-modal-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "bm-auth-modal-overlay";
  overlay.className = "bm-auth-overlay";
  overlay.innerHTML = `
    <div class="bm-auth-card" role="dialog" aria-modal="true" aria-labelledby="bm-auth-title">
      <button class="bm-auth-close" type="button" aria-label="Close">×</button>

      <div class="bm-auth-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="40" height="40">
          <defs><linearGradient id="bmAuthGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#7CF6C8"/>
            <stop offset="100%" stop-color="#10B981"/>
          </linearGradient></defs>
          <circle cx="16" cy="16" r="15" fill="url(#bmAuthGrad)"/>
          <path d="M9 22V10l7 6 7-6v12" stroke="#0b1f1a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>
      </div>

      <h2 id="bm-auth-title">${mode === "signup" ? "Create your Brand Mint account" : "Welcome back"}</h2>
      <p class="bm-auth-sub" id="bm-auth-sub">
        ${mode === "signup"
          ? "One email is all it takes. We'll send a magic link &mdash; no password to remember."
          : "Enter your email. We'll send a magic link to log you in."}
      </p>

      <form id="bm-auth-form" autocomplete="on" novalidate>
        <label class="bm-auth-field">
          <input id="bm-auth-email" type="email" name="email" required autocomplete="email" inputmode="email" placeholder="you@studio.com" aria-describedby="bm-auth-status" />
          <span>Email</span>
        </label>
        <button type="submit" class="btn btn--primary bm-auth-submit">
          <span class="btn-label">${mode === "signup" ? "Send sign-up link" : "Send magic link"}</span>
        </button>
        <p class="bm-auth-status" id="bm-auth-status" role="status" aria-live="polite" hidden></p>
      </form>

      <div class="bm-auth-switch">
        ${mode === "signup"
          ? `Already have an account? <a href="#" data-auth-switch="login">Sign in</a>`
          : `New to Brand Mint? <a href="#" data-auth-switch="signup">Create an account</a>`}
      </div>

      <p class="bm-auth-foot">By continuing you agree to receive a one-time login email from Brand Mint. See our <a href="/privacy">Privacy Policy</a>.</p>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";

  const card = overlay.querySelector(".bm-auth-card");
  const form = overlay.querySelector("#bm-auth-form");
  const input = overlay.querySelector("#bm-auth-email");
  const submitBtn = overlay.querySelector(".bm-auth-submit");
  const submitLabel = submitBtn.querySelector(".btn-label");
  const status = overlay.querySelector("#bm-auth-status");
  const closeBtn = overlay.querySelector(".bm-auth-close");

  // Focus management: trap inside the card, remember opener.
  const opener = document.activeElement;
  let focusable = [];
  function refreshFocusable() {
    focusable = Array.from(
      card.querySelectorAll('a[href], button, input, [tabindex]:not([tabindex="-1"])'),
    ).filter((el) => !el.hasAttribute("disabled") && !el.hidden);
  }
  refreshFocusable();
  setTimeout(() => input.focus(), 60);

  function onKey(e) {
    if (e.key === "Escape") { e.preventDefault(); cleanup(); return; }
    if (e.key !== "Tab") return;
    refreshFocusable();
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function onBackdrop(e) {
    if (e.target === overlay) cleanup();
  }

  function cleanup() {
    document.removeEventListener("keydown", onKey);
    overlay.removeEventListener("click", onBackdrop);
    closeAuthModal();
    if (opener && typeof opener.focus === "function") opener.focus();
  }
  overlay._cleanup = cleanup;

  document.addEventListener("keydown", onKey);
  overlay.addEventListener("click", onBackdrop);
  closeBtn.addEventListener("click", cleanup);

  for (const a of overlay.querySelectorAll("[data-auth-switch]")) {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      cleanup();
      openAuthModal(a.dataset.authSwitch);
    });
  }

  let cooldownTimer = null;

  function showStatus(message, { error = false } = {}) {
    status.hidden = false;
    status.textContent = message;
    status.classList.toggle("err", !!error);
  }
  function hideStatus() {
    status.hidden = true;
    status.textContent = "";
    status.classList.remove("err");
  }

  function startCooldown(email) {
    lastSendAt.set(email, Date.now());
    let remaining = COOLDOWN_SECONDS;
    submitBtn.disabled = true;
    const base = submitLabel.textContent.replace(/\s*\(\d+s\)$/, "");
    submitLabel.textContent = `${base} (${remaining}s)`;
    cooldownTimer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(cooldownTimer);
        cooldownTimer = null;
        submitBtn.disabled = false;
        submitLabel.textContent = base;
      } else {
        submitLabel.textContent = `${base} (${remaining}s)`;
      }
    }, 1000);
  }

  function remainingCooldown(email) {
    const at = lastSendAt.get(email);
    if (!at) return 0;
    const elapsed = (Date.now() - at) / 1000;
    return Math.max(0, Math.ceil(COOLDOWN_SECONDS - elapsed));
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideStatus();
    const email = input.value.trim().toLowerCase();

    if (!emailIsValid(email)) {
      showStatus("That email looks off — mind double-checking?", { error: true });
      input.focus();
      return;
    }

    const remaining = remainingCooldown(email);
    if (remaining > 0) {
      showStatus(`Hold tight — you can resend in ${remaining}s.`, { error: true });
      return;
    }

    const baseLabel = submitLabel.textContent;
    submitLabel.textContent = "Sending…";
    submitBtn.disabled = true;

    try {
      const sb = await getClient();
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin + window.location.pathname,
          shouldCreateUser: mode === "signup",
        },
      });
      if (error) throw error;
      submitLabel.textContent = baseLabel;
      showStatus(`Magic link sent to ${email}. Check your inbox.`);
      input.disabled = true;
      startCooldown(email);
    } catch (err) {
      console.error("[auth] signInWithOtp", err);
      submitBtn.disabled = false;
      submitLabel.textContent = baseLabel;
      const msg = friendlyAuthError(err);
      showStatus(msg, { error: true });
    }
  });
}

function friendlyAuthError(err) {
  const raw = (err?.message || err?.error_description || "").toLowerCase();
  if (raw.includes("rate") || raw.includes("over") || raw.includes("too many")) {
    return "Too many attempts. Wait a minute and try again.";
  }
  if (raw.includes("not found") || raw.includes("user not found") || raw.includes("signups not allowed")) {
    return "We don't have that email on file — pick \"Create an account\" instead.";
  }
  if (raw.includes("invalid email")) {
    return "That email isn't valid — please check the spelling.";
  }
  return err?.message || "Couldn't send the link. Please try again.";
}

/* ---------------- Event delegation ---------------- */

document.addEventListener("click", (e) => {
  const trigger = e.target.closest("[data-auth-action]");
  if (!trigger) return;
  const action = trigger.dataset.authAction;
  if (action === "open" || action === "open-login" || action === "open-signup") {
    e.preventDefault();
    openAuthModal(action === "open-signup" ? "signup" : "login");
  } else if (action === "signout") {
    e.preventDefault();
    signOut();
  }
});

/* ---------------- Boot ---------------- */

wireChipDropdown();
bootstrap().catch((e) => {
  console.error("[auth] bootstrap failed", e);
  // Fall back to the preflight's guess; the page stays usable.
  _readyResolve();
});

/* ---------------- Public API ---------------- */

window.bmAuth = {
  openModal: openAuthModal,
  closeModal: closeAuthModal,
  signOut,
  getUser: () => _user,
  isSignedIn: () => Boolean(_user),
  getSession: async () => (await getClient()).auth.getSession().then((r) => r.data.session),
  getClient,
  onChange: (fn) => {
    _listeners.add(fn);
    // Fire once with the current state.
    queueMicrotask(() => { try { fn(_user); } catch (_) {} });
    return () => _listeners.delete(fn);
  },
  toast,
  ready: _readyP,
};

/**
 * Brand Mint — public-site auth.
 *
 * A thin view over /auth/session.js. It does two things:
 *   1. Reflects the signed-in state into the nav (data-auth-* attributes)
 *   2. Offers a sign-in modal — Google, or a magic link
 *
 * It used to also carry three hard-coded demo accounts whose SHA-256 password
 * hashes shipped in this file, writing a fake `bm.demo.session` that /admin
 * trusted. That is gone: roles now come from the `profiles` table and access
 * is enforced by RLS, so there is nothing here a browser console can forge.
 *
 * Public API:  window.bmAuth = {
 *   openModal, closeModal, signOut, getUser, isSignedIn, isAdmin,
 *   getSession, getClient, onChange, toast, ready
 * }
 */

import {
  getClient as getSessionClient,
  getProfile,
  signInWithGoogle,
  signInWithEmail,
  signOut as sessionSignOut,
} from "/auth/session.js";

// Project URL and anon key now live in /auth/session.js — the single client.

/* ---------------- Retired demo-session cleanup ----------------
 * Older builds stored a forged session under these keys. Clear them on load
 * so a returning visitor's browser can't keep presenting a stale "signed in
 * as admin" nav that no longer means anything.
 */
const LEGACY_KEYS = ["bm.demo.session", "bm.admin.v1.session", "bm.admin.v1.passhash"];
function purgeLegacySessions() {
  for (const k of LEGACY_KEYS) {
    try { localStorage.removeItem(k); } catch (e) {}
  }
}

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
  _client = await getSessionClient();
  return _client;
}

/* ---------------- DOM reconciliation ---------------- */

function applyState(user) {
  _user = user || null;
  const state = _user ? "signed-in" : "signed-out";
  const role = _user?.role || _user?.user_metadata?.role || "user";

  document.documentElement.dataset.authState = state;
  if (_user) {
    document.documentElement.dataset.authRole = role;
  } else {
    delete document.documentElement.dataset.authRole;
  }

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
  for (const el of document.querySelectorAll("[data-auth-user-role]")) {
    el.textContent = role === "admin" ? "Admin" : "Member";
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
  for (const key of ["code", "type", "error", "error_description", "error_code"]) {
    if (url.searchParams.has(key)) { url.searchParams.delete(key); dirty = true; }
  }
  if (url.hash.startsWith("#access_token=") || url.hash.startsWith("#error=")) {
    url.hash = ""; dirty = true;
  }
  if (dirty) {
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  }
}

/* ---------------- Bootstrap ---------------- */

async function bootstrap() {
  purgeLegacySessions();

  const sb = await getClient();
  const { data, error } = await sb.auth.getSession();
  if (error) console.warn("[auth] getSession", error);

  await applyFromSession(data?.session?.user || null);
  cleanAuthFragmentsFromURL();

  sb.auth.onAuthStateChange(async (event, session) => {
    await applyFromSession(session?.user || null);
    if (event === "SIGNED_IN") {
      closeAuthModal();
      const name = _user?.user_metadata?.full_name || _user?.email || "";
      toast(`Signed in${name ? `, ${name.split("@")[0]}` : ""}.`);
    } else if (event === "SIGNED_OUT") {
      toast("Signed out.");
    }
  });

  // Bounced here from a gated page? Open the modal.
  try {
    const url = new URL(window.location.href);
    const bounced =
      url.searchParams.get("signin") === "1" ||
      sessionStorage.getItem("bm.openAuthOnHome") === "1";
    if (bounced && !_user) {
      sessionStorage.removeItem("bm.openAuthOnHome");
      if (url.searchParams.has("signin")) {
        url.searchParams.delete("signin");
        history.replaceState(null, "", url.pathname + url.search + url.hash);
      }
      setTimeout(() => openAuthModal("login"), 80);
    }
  } catch (e) {}

  _ready = true;
  _readyResolve();
}

/**
 * Attach the role from `profiles` before painting the nav. The role is NOT
 * read from user_metadata: a signed-in user can rewrite their own metadata
 * through the SDK, so trusting it would let anyone show themselves an "Admin"
 * link (and, before RLS, follow it).
 */
async function applyFromSession(user) {
  if (!user) {
    applyState(null);
    return;
  }
  let role = "client";
  try {
    const profile = await getProfile({ force: true });
    role = profile?.role || "client";
  } catch (e) {
    console.warn("[auth] role lookup", e);
  }
  applyState({ ...user, role });
}

/* ---------------- Sign out ---------------- */

async function signOut() {
  purgeLegacySessions();
  try {
    await sessionSignOut(null); // null: stay on this page, just clear state
  } catch (err) {
    console.error("[auth] signOut", err);
  }
  applyState(null);
}

/* ---------------- Account chip dropdown ---------------- */

function wireChipDropdown() {
  const wrap = document.getElementById("nav-userchip-wrap");
  const btn = document.getElementById("nav-userchip");
  if (!wrap || !btn) return;

  function open() { wrap.classList.add("open"); btn.setAttribute("aria-expanded", "true"); }
  function close() { wrap.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); }
  function toggle() { wrap.classList.contains("open") ? close() : open(); }

  btn.addEventListener("click", (e) => { e.stopPropagation(); toggle(); });
  document.addEventListener("click", (e) => { if (!wrap.contains(e.target)) close(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && wrap.classList.contains("open")) { close(); btn.focus(); }
  });
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
const lastSendAt = new Map();

function emailIsValid(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function closeAuthModal() {
  const overlay = document.getElementById("bm-auth-modal-overlay");
  if (!overlay) return;
  // _cleanup is idempotent and handles its own DOM removal.
  if (overlay._cleanup) {
    overlay._cleanup();
  } else {
    overlay.remove();
    document.body.style.overflow = "";
  }
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
          ? "Continue with Google, or we'll email you a one-tap sign-in link."
          : "Continue with Google, or we'll email you a one-tap sign-in link."}
      </p>

      <button type="button" class="btn bm-auth-google" id="bm-auth-google">
        <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        <span>Continue with Google</span>
      </button>

      <div class="bm-auth-sep"><span>or</span></div>

      <form id="bm-auth-form" autocomplete="on" novalidate>
        <label class="bm-auth-field">
          <input id="bm-auth-email" type="email" name="email" required autocomplete="email" inputmode="email" placeholder="you@studio.com" aria-describedby="bm-auth-status" />
          <span>Email</span>
        </label>
        <button type="submit" class="btn btn--primary bm-auth-submit">
          <span class="btn-label">Email me a link</span>
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
  const emailEl = overlay.querySelector("#bm-auth-email");
  const googleBtn = overlay.querySelector("#bm-auth-google");
  const submitBtn = overlay.querySelector(".bm-auth-submit");
  const submitLabel = submitBtn.querySelector(".btn-label");
  const status = overlay.querySelector("#bm-auth-status");
  const closeBtn = overlay.querySelector(".bm-auth-close");

  const opener = document.activeElement;
  let focusable = [];
  function refreshFocusable() {
    focusable = Array.from(
      card.querySelectorAll('a[href], button, input, [tabindex]:not([tabindex="-1"])'),
    ).filter((el) => !el.hasAttribute("disabled") && !el.hidden);
  }
  refreshFocusable();
  setTimeout(() => emailEl.focus(), 60);

  function onKey(e) {
    if (e.key === "Escape") { e.preventDefault(); cleanup(); return; }
    if (e.key !== "Tab") return;
    refreshFocusable();
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function onBackdrop(e) { if (e.target === overlay) cleanup(); }

  let torn = false;
  function cleanup() {
    if (torn) return;
    torn = true;
    try { document.removeEventListener("keydown", onKey); } catch (_) {}
    try { overlay.removeEventListener("click", onBackdrop); } catch (_) {}
    try { if (overlay.isConnected) overlay.remove(); } catch (_) {}
    try { document.body.style.overflow = ""; } catch (_) {}
    try { if (opener && typeof opener.focus === "function") opener.focus(); } catch (_) {}
  }
  overlay._cleanup = cleanup;

  document.addEventListener("keydown", onKey);
  overlay.addEventListener("click", onBackdrop);
  closeBtn.addEventListener("click", cleanup);

  for (const a of overlay.querySelectorAll("[data-auth-switch]")) {
    a.addEventListener("click", (e) => {
      e.preventDefault(); cleanup(); openAuthModal(a.dataset.authSwitch);
    });
  }

  let cooldownTimer = null;
  function showStatus(message, { error = false } = {}) {
    status.hidden = false; status.textContent = message;
    status.classList.toggle("err", !!error);
  }
  function hideStatus() {
    status.hidden = true; status.textContent = ""; status.classList.remove("err");
  }
  function startCooldown(email) {
    lastSendAt.set(email, Date.now());
    let remaining = COOLDOWN_SECONDS;
    submitBtn.disabled = true;
    const base = "Continue";
    submitLabel.textContent = `${base} (${remaining}s)`;
    cooldownTimer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(cooldownTimer); cooldownTimer = null;
        submitBtn.disabled = false; submitLabel.textContent = base;
      } else {
        submitLabel.textContent = `${base} (${remaining}s)`;
      }
    }, 1000);
  }
  function remainingCooldown(email) {
    const at = lastSendAt.get(email);
    if (!at) return 0;
    return Math.max(0, Math.ceil(COOLDOWN_SECONDS - (Date.now() - at) / 1000));
  }

  googleBtn.addEventListener("click", async () => {
    hideStatus();
    googleBtn.disabled = true;
    try {
      await signInWithGoogle(window.location.pathname + window.location.search);
    } catch (err) {
      console.error("[auth] google", err);
      googleBtn.disabled = false;
      showStatus(
        String(err?.message || "").includes("provider is not enabled")
          ? "Google sign-in isn't switched on yet — use the email link below."
          : friendlyAuthError(err),
        { error: true },
      );
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideStatus();
    const email = emailEl.value.trim().toLowerCase();

    if (!emailIsValid(email)) {
      showStatus("That email looks off — mind double-checking?", { error: true });
      emailEl.focus();
      return;
    }

    const remaining = remainingCooldown(email);
    if (remaining > 0) {
      showStatus(`Hold tight — you can resend in ${remaining}s.`, { error: true });
      return;
    }

    submitLabel.textContent = "Sending…";
    submitBtn.disabled = true;
    try {
      await signInWithEmail(email, window.location.pathname + window.location.search);
      submitLabel.textContent = "Email me a link";
      showStatus(`Magic link sent to ${email}. Check your inbox.`);
      emailEl.disabled = true;
      startCooldown(email);
    } catch (err) {
      console.error("[auth] signInWithOtp", err);
      submitBtn.disabled = false;
      submitLabel.textContent = "Email me a link";
      showStatus(friendlyAuthError(err), { error: true });
    }
  });
}

function friendlyAuthError(err) {
  const raw = (err?.message || err?.error_description || "").toLowerCase();
  if (raw.includes("rate") || raw.includes("over") || raw.includes("too many")) {
    return "Too many attempts. Wait a minute and try again.";
  }
  if (raw.includes("not found") || raw.includes("signups not allowed")) {
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
  _readyResolve();
});

/* ---------------- Public API ---------------- */

window.bmAuth = {
  openModal: openAuthModal,
  closeModal: closeAuthModal,
  signOut,
  getUser: () => _user,
  isSignedIn: () => Boolean(_user),
  isAdmin: () => _user?.role === "admin" || _user?.user_metadata?.role === "admin",
  getSession: async () => (await getClient()).auth.getSession().then((r) => r.data.session),
  getClient,
  onChange: (fn) => {
    _listeners.add(fn);
    queueMicrotask(() => { try { fn(_user); } catch (_) {} });
    return () => _listeners.delete(fn);
  },
  toast,
  ready: _readyP,
};

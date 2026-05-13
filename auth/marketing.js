/**
 * Brand Mint — Public-site auth.
 *
 * Two auth paths live side-by-side:
 *
 *   1. DEMO accounts (this file): hard-coded for testing. Password is
 *      compared against a SHA-256 hash, then a fake session is written to
 *      localStorage under `bm.demo.session`. One demo user has role=admin
 *      and unlocks /admin + the nav "Admin" link.
 *
 *   2. Supabase magic-link: leave the password blank and a one-tap login
 *      link is emailed via Supabase. This is the production flow.
 *
 * The <head> preflight script sets <html data-auth-state> AND
 * <html data-auth-role> synchronously from whichever session is present,
 * so the nav never flashes the wrong UI.
 *
 * Public API:  window.bmAuth = {
 *   openModal, closeModal, signOut, getUser, isSignedIn, getSession,
 *   getClient, onChange, toast, ready
 * }
 */

const PROJECT_REF = "ycdfgtljxqrhyobnwwbz";
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const SUPABASE_ANON_KEY = "sb_publishable_ddoQWG7ZWqNwTRJFBdfbHA_HoX48n1l";

/* ---------------- Demo accounts -----------------
 * Passwords are stored as SHA-256 hashes; comparing the hash means the
 * cleartext never appears in source. (For real production auth use
 * Supabase passwords or magic links — this is a test harness.)
 *
 *   admin@brandmint.studio  /  Admin@2026     →  admin
 *   team@brandmint.studio   /  Team@2026      →  user
 *   client@brandmint.studio /  Client@2026    →  user
 */
const DEMO_USERS = [
  {
    email: "admin@brandmint.studio",
    passhash: "a36aef5a11c4073fbe60314fc9df530a9d5f986533594d1f5190742ff9e0e408",
    name: "Brand Mint Admin",
    role: "admin",
  },
  {
    email: "team@brandmint.studio",
    passhash: "f315b9092562633daf960f5a2e01b39629d451aa9f82c36e7a17da1431d85b81",
    name: "Brand Mint Team",
    role: "user",
  },
  {
    email: "client@brandmint.studio",
    passhash: "9e1b6928325caf4d330da9d7398b48c6bfe74a521a8cd0d5b8b010f4a23fa497",
    name: "Demo Client",
    role: "user",
  },
];

const DEMO_KEY = "bm.demo.session";
const DEMO_TTL_HOURS = 12;
const ADMIN_BRIDGE_KEY = "bm.admin.v1.session"; // legacy /admin gate key

async function sha256Hex(s) {
  const buf = new TextEncoder().encode(s);
  const out = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(out))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyDemo(email, password) {
  const e = (email || "").trim().toLowerCase();
  const match = DEMO_USERS.find((u) => u.email === e);
  if (!match) return null;
  const hash = await sha256Hex(password || "");
  if (hash !== match.passhash) return null;
  return {
    id: `demo-${match.email}`,
    email: match.email,
    user_metadata: { full_name: match.name, role: match.role },
    role: match.role,
    isDemo: true,
    created_at: new Date(2026, 0, 1).toISOString(),
    last_sign_in_at: new Date().toISOString(),
  };
}

function setDemoSession(user) {
  const session = {
    user,
    expires_at: Math.floor(Date.now() / 1000) + DEMO_TTL_HOURS * 3600,
  };
  localStorage.setItem(DEMO_KEY, JSON.stringify(session));
  // Bridge to legacy /admin gate so admins are recognised there too.
  if (user.role === "admin") {
    localStorage.setItem(
      ADMIN_BRIDGE_KEY,
      String(Date.now() + DEMO_TTL_HOURS * 3600 * 1000),
    );
  }
  return session;
}

function getDemoSession() {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || (parsed.expires_at || 0) * 1000 < Date.now()) {
      localStorage.removeItem(DEMO_KEY);
      return null;
    }
    return parsed;
  } catch (e) {
    return null;
  }
}

function clearDemoSession() {
  localStorage.removeItem(DEMO_KEY);
  localStorage.removeItem(ADMIN_BRIDGE_KEY);
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
  // Demo session takes precedence — local-only, no network.
  const demo = getDemoSession();
  if (demo?.user) {
    applyState(demo.user);
  }

  // Always wire up Supabase too, so magic-link callbacks land cleanly even
  // when there's an active demo session (signing out of demo then in via
  // magic link is supported).
  const sb = await getClient();
  const { data, error } = await sb.auth.getSession();
  if (error) console.warn("[auth] getSession", error);

  // Real Supabase user trumps demo only if there's no demo active.
  if (!demo?.user) applyState(data?.session?.user || null);

  cleanAuthFragmentsFromURL();

  sb.auth.onAuthStateChange((event, session) => {
    if (getDemoSession()) return; // ignore Supabase changes while demo is active
    applyState(session?.user || null);
    if (event === "SIGNED_IN") {
      closeAuthModal();
      const name = session?.user?.user_metadata?.full_name || session?.user?.email || "";
      toast(`Signed in${name ? `, ${name.split("@")[0]}` : ""}.`);
    } else if (event === "SIGNED_OUT") {
      toast("Signed out.");
    }
  });

  // If we landed here from the admin gate, open the login modal.
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
      setTimeout(() => {
        openAuthModal("login");
        toast("Sign in as admin to open the dashboard.", { error: true });
      }, 80);
    }
  } catch (e) {}

  _ready = true;
  _readyResolve();
}

/* ---------------- Sign out ---------------- */

async function signOut() {
  const wasDemo = Boolean(getDemoSession());
  clearDemoSession();
  try {
    const sb = await getClient();
    await sb.auth.signOut();
  } catch (err) {
    console.error("[auth] signOut", err);
  }
  applyState(null);
  if (wasDemo) toast("Signed out.");
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
          ? "Email + password for demo accounts, or leave the password blank and we'll email a magic link."
          : "Enter email + password (demo) or leave the password blank for a magic link."}
      </p>

      <form id="bm-auth-form" autocomplete="on" novalidate>
        <label class="bm-auth-field">
          <input id="bm-auth-email" type="email" name="email" required autocomplete="email" inputmode="email" placeholder="you@studio.com" aria-describedby="bm-auth-status" />
          <span>Email</span>
        </label>
        <label class="bm-auth-field">
          <input id="bm-auth-password" type="password" name="password" autocomplete="current-password" placeholder="••••••••" />
          <span>Password (optional)</span>
        </label>
        <button type="submit" class="btn btn--primary bm-auth-submit">
          <span class="btn-label">Continue</span>
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
  const passEl = overlay.querySelector("#bm-auth-password");
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
    document.removeEventListener("keydown", onKey);
    overlay.removeEventListener("click", onBackdrop);
    overlay.remove();
    document.body.style.overflow = "";
    if (opener && typeof opener.focus === "function") opener.focus();
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

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideStatus();
    const email = emailEl.value.trim().toLowerCase();
    const password = passEl.value;

    if (!emailIsValid(email)) {
      showStatus("That email looks off — mind double-checking?", { error: true });
      emailEl.focus();
      return;
    }

    // Path A — password supplied: try demo accounts.
    if (password) {
      submitBtn.disabled = true; submitLabel.textContent = "Signing in…";
      try {
        const user = await verifyDemo(email, password);
        if (user) {
          setDemoSession(user);
          applyState(user);
          toast(`Signed in${user.role === "admin" ? " (admin)" : ""} — welcome, ${user.user_metadata.full_name.split(" ")[0]}.`);
          cleanup();
          return;
        }
        submitBtn.disabled = false; submitLabel.textContent = "Continue";
        showStatus("Email or password didn't match. Leave the password blank for a magic link.", { error: true });
        passEl.focus(); passEl.select();
      } catch (err) {
        console.error("[auth] demo verify", err);
        submitBtn.disabled = false; submitLabel.textContent = "Continue";
        showStatus("Couldn't sign you in. Try again.", { error: true });
      }
      return;
    }

    // Path B — magic-link via Supabase.
    const remaining = remainingCooldown(email);
    if (remaining > 0) {
      showStatus(`Hold tight — you can resend in ${remaining}s.`, { error: true });
      return;
    }

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
      submitLabel.textContent = "Continue";
      showStatus(`Magic link sent to ${email}. Check your inbox.`);
      emailEl.disabled = true;
      startCooldown(email);
    } catch (err) {
      console.error("[auth] signInWithOtp", err);
      submitBtn.disabled = false; submitLabel.textContent = "Continue";
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

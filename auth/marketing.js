/**
 * Brand Mint — Public-site auth.
 *
 * Magic-link sign-in via Supabase. No passwords. First-time email creates a
 * user; subsequent emails log in. State is mirrored to the nav and any other
 * elements with [data-auth-state="signed-in" | "signed-out"].
 *
 * Exposes:  window.bmAuth = { openModal, signOut, getUser, getSession, ready }
 */

const SUPABASE_URL = "https://ycdfgtljxqrhyobnwwbz.supabase.co";
const SUPABASE_ANON_KEY =
  "sb_publishable_ddoQWG7ZWqNwTRJFBdfbHA_HoX48n1l";

let _client = null;
let _user = null;
let _readyResolve;
const _readyP = new Promise((r) => (_readyResolve = r));

async function getClient() {
  if (_client) return _client;
  const { createClient } = await import(
    "https://esm.sh/@supabase/supabase-js@2"
  );
  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return _client;
}

function dispatchState() {
  document.body.dataset.authState = _user ? "signed-in" : "signed-out";
  for (const el of document.querySelectorAll("[data-auth-show]")) {
    const want = el.getAttribute("data-auth-show");
    el.hidden = want !== document.body.dataset.authState;
  }
  for (const el of document.querySelectorAll("[data-auth-user-email]")) {
    el.textContent = _user?.email || "";
  }
  for (const el of document.querySelectorAll("[data-auth-user-initial]")) {
    el.textContent = initialFor(_user?.email || _user?.user_metadata?.name);
  }
  for (const el of document.querySelectorAll("[data-auth-user-name]")) {
    const name = _user?.user_metadata?.name;
    el.textContent = name || _user?.email?.split("@")[0] || "";
  }
}
function initialFor(s) {
  return (s || "?").trim().charAt(0).toUpperCase() || "?";
}

async function bootstrap() {
  const sb = await getClient();
  const { data } = await sb.auth.getSession();
  _user = data.session?.user || null;
  dispatchState();

  sb.auth.onAuthStateChange((_event, session) => {
    _user = session?.user || null;
    dispatchState();
  });

  // Wire any element with [data-auth-action]
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-auth-action]");
    if (!trigger) return;
    const action = trigger.dataset.authAction;
    if (action === "open" || action === "open-login" || action === "open-signup") {
      e.preventDefault();
      openModal(action === "open-signup" ? "signup" : "login");
    } else if (action === "signout") {
      e.preventDefault();
      signOut();
    }
  });

  _readyResolve();
}

async function signOut() {
  const sb = await getClient();
  await sb.auth.signOut();
}

function openModal(mode = "login") {
  if (document.getElementById("bm-auth-modal-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "bm-auth-modal-overlay";
  overlay.className = "bm-auth-overlay";
  overlay.innerHTML = `
    <div class="bm-auth-card" role="dialog" aria-modal="true" aria-labelledby="bm-auth-title">
      <button class="bm-auth-close" aria-label="Close">×</button>

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
      <p class="bm-auth-sub">
        ${mode === "signup"
          ? "One email is all it takes. We'll send a magic link &mdash; no password to remember."
          : "Enter your email. We'll send a magic link to log you in."}
      </p>

      <form id="bm-auth-form" autocomplete="off">
        <label class="bm-auth-field">
          <input id="bm-auth-email" type="email" required autocomplete="email" placeholder="you@studio.com" />
          <span>Email</span>
        </label>
        <button type="submit" class="btn btn--primary bm-auth-submit">
          <span class="btn-label">Send magic link</span>
        </button>
        <p class="bm-auth-status" id="bm-auth-status" hidden></p>
      </form>

      <div class="bm-auth-switch">
        ${mode === "signup"
          ? `Already have an account? <a href="#" data-auth-switch="login">Sign in</a>`
          : `New to Brand Mint? <a href="#" data-auth-switch="signup">Create an account</a>`}
      </div>

      <p class="bm-auth-foot">By continuing you agree to receive a one-time login email from Brand Mint.</p>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";

  function close() {
    overlay.remove();
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onEsc);
  }
  function onEsc(e) {
    if (e.key === "Escape") close();
  }
  document.addEventListener("keydown", onEsc);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector(".bm-auth-close").addEventListener("click", close);

  for (const a of overlay.querySelectorAll("[data-auth-switch]")) {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      close();
      openModal(a.dataset.authSwitch);
    });
  }

  const form = overlay.querySelector("#bm-auth-form");
  const input = overlay.querySelector("#bm-auth-email");
  const submit = overlay.querySelector(".bm-auth-submit .btn-label");
  const status = overlay.querySelector("#bm-auth-status");
  setTimeout(() => input.focus(), 50);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.hidden = true;
    status.classList.remove("err");
    const email = input.value.trim();
    if (!email) return;

    submit.textContent = "Sending…";
    form.querySelector("button").disabled = true;

    try {
      const sb = await getClient();
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      submit.textContent = "Send magic link";
      form.querySelector("button").disabled = false;
      status.hidden = false;
      status.textContent = `Check ${email} for a one-tap login link.`;
      input.value = "";
    } catch (err) {
      submit.textContent = "Try again";
      form.querySelector("button").disabled = false;
      status.hidden = false;
      status.classList.add("err");
      status.textContent =
        err?.message ||
        "Couldn't send the link. Double-check the email and try again.";
    }
  });
}

window.bmAuth = {
  openModal,
  signOut,
  getUser: () => _user,
  getSession: async () => {
    const sb = await getClient();
    const { data } = await sb.auth.getSession();
    return data.session;
  },
  getClient,
  ready: _readyP,
};

bootstrap().catch((e) => {
  console.error("[auth] bootstrap failed", e);
  _readyResolve();
});

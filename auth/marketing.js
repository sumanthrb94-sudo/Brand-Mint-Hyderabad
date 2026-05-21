/**
 * Brand Mint — Public-site auth.
 *
 * Email + password sign-in via Supabase. Three flows in one modal:
 *   login   →  signInWithPassword
 *   signup  →  signUp  (creates user; signs in directly if email-confirm is off)
 *   forgot  →  resetPasswordForEmail
 *
 * State is mirrored to the nav and any [data-auth-show="signed-in|signed-out"]
 * elements.  Exposes:  window.bmAuth = { openModal, signOut, getUser,
 * getSession, getClient, ready }
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
  const displayName =
    _user?.user_metadata?.name ||
    _user?.user_metadata?.full_name ||
    _user?.email?.split("@")[0] ||
    "";
  for (const el of document.querySelectorAll("[data-auth-user-initial]")) {
    el.textContent = initialFor(displayName || _user?.email);
  }
  for (const el of document.querySelectorAll("[data-auth-user-name]")) {
    el.textContent = displayName || "Account";
  }
}
function initialFor(s) {
  const ch = (s || "").trim().charAt(0).toUpperCase();
  return ch || "·";
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

const COPY = {
  login: {
    title: "Welcome back",
    sub: "Enter your email and password to sign in.",
    cta: "Sign in",
    switchText: `New to Brand Mint?`,
    switchLink: { mode: "signup", label: "Create an account" },
  },
  signup: {
    title: "Create your Brand Mint account",
    sub: "Pick a password you'll remember &mdash; minimum 8 characters.",
    cta: "Create account",
    switchText: `Already have an account?`,
    switchLink: { mode: "login", label: "Sign in" },
  },
  forgot: {
    title: "Reset your password",
    sub: "Enter your email. We'll send a one-time link to set a new password.",
    cta: "Send reset link",
    switchText: `Remembered it?`,
    switchLink: { mode: "login", label: "Back to sign in" },
  },
};

function openModal(mode = "login") {
  if (document.getElementById("bm-auth-modal-overlay")) return;

  const copy = COPY[mode] || COPY.login;
  const showPassword = mode !== "forgot";
  const showName = mode === "signup";

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

      <h2 id="bm-auth-title">${copy.title}</h2>
      <p class="bm-auth-sub">${copy.sub}</p>

      <form id="bm-auth-form" autocomplete="on">
        ${showName ? `
        <label class="bm-auth-field">
          <input id="bm-auth-name" type="text" autocomplete="name" placeholder="Your name" />
          <span>Name <em style="opacity:.55">(optional)</em></span>
        </label>` : ""}

        <label class="bm-auth-field">
          <input id="bm-auth-email" type="email" required autocomplete="email" placeholder="you@studio.com" />
          <span>Email</span>
        </label>

        ${showPassword ? `
        <label class="bm-auth-field">
          <input id="bm-auth-password" type="password" required
                 minlength="${mode === "signup" ? 8 : 1}"
                 autocomplete="${mode === "signup" ? "new-password" : "current-password"}"
                 placeholder="${mode === "signup" ? "At least 8 characters" : "Your password"}" />
          <span>Password</span>
          <button type="button" class="bm-auth-eye" aria-label="Toggle password visibility" tabindex="-1">Show</button>
        </label>` : ""}

        ${mode === "login" ? `
        <div class="bm-auth-row">
          <a href="#" class="bm-auth-forgot" data-auth-switch="forgot">Forgot password?</a>
        </div>` : ""}

        <button type="submit" class="btn btn--primary bm-auth-submit">
          <span class="btn-label">${copy.cta}</span>
        </button>
        <p class="bm-auth-status" id="bm-auth-status" hidden></p>
      </form>

      <div class="bm-auth-switch">
        ${copy.switchText}
        <a href="#" data-auth-switch="${copy.switchLink.mode}">${copy.switchLink.label}</a>
      </div>

      <p class="bm-auth-foot">By continuing you agree to Brand Mint's terms.</p>
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

  const eye = overlay.querySelector(".bm-auth-eye");
  if (eye) {
    const pwInput = overlay.querySelector("#bm-auth-password");
    eye.addEventListener("click", () => {
      const masked = pwInput.type === "password";
      pwInput.type = masked ? "text" : "password";
      eye.textContent = masked ? "Hide" : "Show";
    });
  }

  const form = overlay.querySelector("#bm-auth-form");
  const emailInput = overlay.querySelector("#bm-auth-email");
  const pwInput = overlay.querySelector("#bm-auth-password");
  const nameInput = overlay.querySelector("#bm-auth-name");
  const submit = overlay.querySelector(".bm-auth-submit .btn-label");
  const submitBtn = overlay.querySelector(".bm-auth-submit");
  const status = overlay.querySelector("#bm-auth-status");

  setTimeout(() => (showName ? nameInput : emailInput).focus(), 50);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.hidden = true;
    status.classList.remove("err", "ok");

    const email = emailInput.value.trim();
    const password = pwInput?.value || "";
    const name = nameInput?.value.trim() || "";
    if (!email) return;

    submit.textContent = "Working…";
    submitBtn.disabled = true;

    try {
      const sb = await getClient();

      if (mode === "login") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        close();
        return;
      }

      if (mode === "signup") {
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: {
            data: name ? { name } : undefined,
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (data.session) {
          close();
          return;
        }
        status.hidden = false;
        status.classList.add("ok");
        status.textContent = `Almost there. Check ${email} to confirm your account, then sign in.`;
        submit.textContent = copy.cta;
        submitBtn.disabled = false;
        return;
      }

      if (mode === "forgot") {
        const { error } = await sb.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/?reset=1",
        });
        if (error) throw error;
        status.hidden = false;
        status.classList.add("ok");
        status.textContent = `Reset link sent to ${email}. Check your inbox.`;
        submit.textContent = copy.cta;
        submitBtn.disabled = false;
        return;
      }
    } catch (err) {
      submit.textContent = "Try again";
      submitBtn.disabled = false;
      status.hidden = false;
      status.classList.add("err");
      status.textContent = friendlyError(err, mode);
    }
  });
}

function friendlyError(err, mode) {
  const m = (err?.message || "").toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials")) {
    return "That email and password don't match. Try again or reset your password.";
  }
  if (m.includes("email not confirmed")) {
    return "Confirm your email first — check the link we sent when you signed up.";
  }
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "An account with that email already exists. Try signing in.";
  }
  if (m.includes("password") && m.includes("short")) {
    return "Password is too short — use at least 8 characters.";
  }
  if (m.includes("rate limit")) {
    return "Too many attempts. Wait a minute and try again.";
  }
  return (
    err?.message ||
    (mode === "login"
      ? "Couldn't sign you in. Check your email and password."
      : mode === "signup"
        ? "Couldn't create your account. Try again."
        : "Couldn't send the reset link. Try again.")
  );
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

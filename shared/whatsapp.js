/**
 * The WhatsApp mark, everywhere WhatsApp is the action.
 *
 * - A floating button (bottom-right) on every page that loads this module,
 *   in the brand's mint gradient with a soft glow and a shine sweep — the
 *   one always-reachable way to talk to us that isn't a form.
 * - The WhatsApp glyph prepended to every existing WhatsApp link that reads
 *   as a button or a footer link, so the action is recognisable at a glance.
 *
 * No phone number is ever printed: the link opens WhatsApp directly. The
 * number lives only in shared/resources.js (WHATSAPP). Additive and
 * decorative: links work without this file; motion is off under
 * prefers-reduced-motion (in CSS). Opt a page out of the floating button
 * with <html data-no-wa-fab>.
 */
import { WHATSAPP } from "/shared/resources.js?v=v12";

const GLYPH = `<svg class="wa-glyph" viewBox="0 0 32 32" width="18" height="18" aria-hidden="true" focusable="false"><path fill="currentColor" d="M16.04 3C8.86 3 3.04 8.8 3.04 15.96c0 2.3.6 4.53 1.75 6.5L3 29l6.72-1.76a12.97 12.97 0 0 0 6.31 1.62h.01c7.18 0 13-5.8 13-12.96C29.04 8.8 23.22 3 16.04 3Zm0 23.68h-.01a10.8 10.8 0 0 1-5.5-1.5l-.39-.23-3.99 1.04 1.06-3.88-.26-.4a10.7 10.7 0 0 1-1.66-5.75c0-5.95 4.85-10.8 10.8-10.8 5.96 0 10.8 4.85 10.8 10.8 0 5.95-4.84 10.72-10.85 10.72Zm5.93-8.03c-.33-.16-1.93-.95-2.23-1.06-.3-.11-.52-.16-.73.17-.22.32-.84 1.05-1.03 1.27-.19.22-.38.24-.7.08-.33-.16-1.38-.51-2.62-1.62-.97-.86-1.62-1.93-1.81-2.25-.19-.33-.02-.5.14-.66.15-.15.33-.38.49-.57.16-.19.22-.33.33-.54.1-.22.05-.41-.03-.57-.08-.16-.73-1.76-1-2.41-.27-.63-.54-.55-.73-.56h-.62c-.22 0-.57.08-.87.41-.3.32-1.14 1.11-1.14 2.71 0 1.6 1.17 3.15 1.33 3.36.16.22 2.3 3.5 5.57 4.91.78.34 1.39.54 1.86.69.78.25 1.49.21 2.05.13.63-.09 1.93-.79 2.2-1.55.27-.76.27-1.42.19-1.55-.08-.14-.3-.22-.62-.38Z"/></svg>`;

// 1. Icon on every WhatsApp button / footer link that doesn't carry it yet.
//    The portal renders after sign-in, so later additions are decorated too.
function decorate(root = document) {
  for (const a of root.querySelectorAll('a[href*="wa.me/"]')) {
    if (a.querySelector(".wa-glyph") || a.classList.contains("wa-fab")) continue;
    if (!a.matches(".btn, .p-btn, .footer-wa, .rung-alt, .tier-alt a")) continue;
    a.classList.add("has-wa");
    a.insertAdjacentHTML("afterbegin", GLYPH);
  }
}
decorate();
let queued = false;
new MutationObserver(() => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; decorate(); });
}).observe(document.body, { childList: true, subtree: true });

// 2. The floating button.
if (!document.documentElement.hasAttribute("data-no-wa-fab") && !document.querySelector(".wa-fab")) {
  const a = document.createElement("a");
  a.className = "wa-fab";
  a.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hi Brand Mint — I'd like to talk about a project.")}`;
  a.rel = "noopener";
  a.target = "_blank";
  a.setAttribute("aria-label", "Chat with Brand Mint on WhatsApp");
  a.innerHTML = `<span class="wa-fab-ring" aria-hidden="true"></span>${GLYPH.replace('width="18" height="18"', 'width="30" height="30"')}<span class="wa-fab-label">WhatsApp us</span>`;
  document.body.appendChild(a);
  a.addEventListener("click", () => { try { window.bmTrack?.("whatsapp_fab"); } catch {} });
}

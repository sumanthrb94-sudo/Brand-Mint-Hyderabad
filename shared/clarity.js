/**
 * Microsoft Clarity — session replay and heat maps.
 *
 * This is a THIRD PARTY on the public pages: it ships behaviour to Microsoft.
 * It is gated exactly like shared/analytics.js — off under Do Not Track or
 * Global Privacy Control, off whenever the page is framed, and off inside the
 * admin's own heat-map iframe (?bm_nt=1), so opening Admin → Heat map does not
 * record a fake session against the studio's own uid.
 *
 * Project id comes from clarity.microsoft.com → Settings → Overview.
 */

const PROJECT_ID = "yf5p3s2ntw";

function enabled() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (window.self !== window.top) return false;
    if (params.has("bm_nt")) return false;
    if (params.has("bm_track")) return true;
    if (navigator.doNotTrack === "1" || navigator.globalPrivacyControl) return false;
    if (/bot|crawl|spider|headless/i.test(navigator.userAgent)) return false;
    return true;
  } catch {
    return false;
  }
}

export function initClarity() {
  if (!PROJECT_ID || !enabled() || window.clarity) return;

  // Microsoft's own snippet, queue and all. The stub buffers calls made before
  // the tag has loaded and the real library replays them, which is what makes
  // identifyUser() safe to call the moment the profile resolves.
  window.clarity = function () {
    (window.clarity.q = window.clarity.q || []).push(arguments);
  };
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://www.clarity.ms/tag/" + PROJECT_ID;
  const first = document.getElementsByTagName("script")[0];
  if (first && first.parentNode) first.parentNode.insertBefore(script, first);
  else document.head.appendChild(script);
}

/**
 * Tie the session to the signed-in user, so a replay can be found by uid.
 * A no-op when Clarity is switched off — never a reason for a page to break.
 */
export function identifyUser(userId) {
  if (!userId || typeof window.clarity !== "function") return;
  try {
    window.clarity("identify", userId);
  } catch (e) {
    console.warn("[clarity] identify", e);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initClarity);
} else {
  initClarity();
}

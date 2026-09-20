/**
 * Writes STORE.theme onto :root before first paint and fills the chrome.
 * Imported at the top of every page so a store is themed in one place and a
 * rebrand never touches CSS.
 */
import { STORE } from "../store.config.js";
import * as cart from "./cart.js";

const t = STORE.theme, r = document.documentElement.style;
r.setProperty("--ink", t.ink);       r.setProperty("--paper", t.paper);
r.setProperty("--surface", t.surface); r.setProperty("--accent", t.accent);
r.setProperty("--accent-deep", t.accentDeep);
r.setProperty("--display", t.display); r.setProperty("--text", t.text);

document.title = document.title.replace("{store}", STORE.name);

export function chrome() {
  for (const el of document.querySelectorAll("[data-store-name]")) el.textContent = STORE.name;
  for (const el of document.querySelectorAll("[data-store-tagline]")) el.textContent = STORE.tagline;
  const paint = () => {
    const n = cart.count();
    for (const el of document.querySelectorAll("[data-cart-count]")) {
      el.textContent = String(n);
      el.hidden = n === 0;
    }
  };
  paint();
  cart.onChange(paint);
}

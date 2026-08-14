export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Preserve the current safe in-app location, then use the dedicated Firebase
// sign-in screen. Provider launch happens only from the explicit user action.
export const startLogin = (returnTo?: string) => {
  if (typeof window === "undefined") return;
  const currentPath = `${window.location.pathname}${window.location.search}`;
  const target = returnTo ?? currentPath;
  window.location.assign(`/sign-in?returnTo=${encodeURIComponent(target)}`);
};

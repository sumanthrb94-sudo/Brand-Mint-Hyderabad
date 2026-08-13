import Lenis from "lenis";
import { useEffect } from "react";

/** Public marketing pages may use smooth scrolling; operations pages retain native scrolling. */
export function PublicMotion() {
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (query.matches) return;
    const lenis = new Lenis({ autoRaf: true, smoothWheel: true, lerp: 0.09 });
    return () => lenis.destroy();
  }, []);
  return null;
}

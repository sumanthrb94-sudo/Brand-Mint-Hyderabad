/**
 * Microsoft Clarity integration — session recording, heatmaps, replays
 * Complements the custom analytics in shared/analytics.js
 * Get your project ID from https://clarity.microsoft.com/
 */

export function initClarity() {
  const projectId = "n9fqz36rvb"; // Replace with your actual Clarity project ID from dashboard
  if (!projectId || projectId === "YOUR_CLARITY_PROJECT_ID") {
    console.warn("[Clarity] Project ID not configured. Set it in shared/clarity.js");
    return;
  }

  // Load Clarity script
  const script = document.createElement("script");
  script.async = true;
  script.type = "text/javascript";
  script.src = `https://www.clarity.ms/tag/${projectId}?ref=bwt`;
  script.onload = () => {
    console.log("[Clarity] Initialized");
    // Clarity object is now available globally as window.clarity
  };
  document.head.appendChild(script);
}

// Initialize on page load if not inside iframe (heatmap uses ?bm_nt=1 to disable tracking)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initClarity);
} else {
  initClarity();
}

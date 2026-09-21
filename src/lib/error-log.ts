/** Client error logger — MySQL persistence TBD; no-op for migration scaffold. */
let installed = false;

export function installErrorLogger() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("error", (e) => {
    console.error("[ow]", e.message);
  });
  window.addEventListener("unhandledrejection", (e) => {
    console.error("[ow]", String(e.reason));
  });
}

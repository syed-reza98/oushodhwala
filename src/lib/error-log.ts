/** Client error logger — posts to MySQL via /api/public/error-logs (best-effort). */
let installed = false;

function report(payload: {
  message: string;
  source?: string;
  path?: string;
  stack?: string;
  severity?: string;
}) {
  console.error("[ow]", payload.message);
  try {
    const body = JSON.stringify({
      message: payload.message,
      source: payload.source ?? "client",
      path: payload.path ?? (typeof window !== "undefined" ? window.location.pathname : ""),
      stack: payload.stack,
      severity: payload.severity ?? "error",
    });
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/public/error-logs", blob);
      return;
    }
    void fetch("/api/public/error-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

export function installErrorLogger() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("error", (e) => {
    report({
      message: e.message || "window.error",
      source: "window.error",
      stack: e.error instanceof Error ? e.error.stack : undefined,
    });
  });
  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    report({
      message: reason instanceof Error ? reason.message : String(reason),
      source: "unhandledrejection",
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });
}

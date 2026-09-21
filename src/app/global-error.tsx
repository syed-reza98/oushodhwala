"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="bn">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Something went wrong</h2>
        <p style={{ fontSize: 13, color: "#666", marginTop: 8 }}>
          {error.digest ? `Ref: ${error.digest}` : error.message}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            marginTop: 16,
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid #ccc",
            background: "#0b6e4f",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}

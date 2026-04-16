"use client";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "sans-serif", background: "#020617", color: "#e2e8f0" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px" }}>
          <section style={{ width: "100%", maxWidth: "560px", border: "1px solid #334155", borderRadius: "14px", padding: "20px", background: "#0f172a" }}>
            <h1 style={{ marginTop: 0, marginBottom: "8px", fontSize: "24px" }}>Something went wrong</h1>
            <p style={{ marginTop: 0, marginBottom: "16px", color: "#94a3b8" }}>
              An unexpected error occurred while rendering this page.
            </p>
            {error?.digest ? (
              <p style={{ marginTop: 0, marginBottom: "16px", fontSize: "12px", color: "#64748b" }}>
                Error ID: {error.digest}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => reset()}
              style={{
                border: "1px solid #f59e0b",
                background: "#f59e0b",
                color: "#0f172a",
                borderRadius: "10px",
                padding: "10px 14px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}

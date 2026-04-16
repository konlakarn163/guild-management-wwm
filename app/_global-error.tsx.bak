"use client";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

export default function GlobalError({ error, unstable_retry }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px" }}>
          <section style={{ width: "100%", maxWidth: "560px", border: "1px solid #334155", borderRadius: "14px", padding: "20px" }}>
            <h1 style={{ marginTop: 0, marginBottom: "8px", fontSize: "24px" }}>Something went wrong</h1>
            <p style={{ marginTop: 0, marginBottom: "16px" }}>An unexpected error occurred while rendering this page.</p>
            {error?.digest ? (
              <p style={{ marginTop: 0, marginBottom: "16px", fontSize: "12px" }}>Error ID: {error.digest}</p>
            ) : null}
            <button type="button" onClick={() => unstable_retry()}>
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}

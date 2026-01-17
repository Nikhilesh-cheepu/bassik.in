"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error for debugging
    console.error("Global error:", error);
    
    // Try to send error to console for debugging
    if (typeof window !== "undefined") {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        console.error("iOS Error:", {
          message: error.message,
          stack: error.stack,
          digest: error.digest,
        });
      }
    }
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            backgroundColor: "#050509",
            color: "#ffffff",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem", textAlign: "center" }}>
            Something went wrong
          </h2>
          <p style={{ marginBottom: "1.5rem", textAlign: "center", opacity: 0.8 }}>
            {error.message || "An unexpected error occurred"}
          </p>
          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              onClick={reset}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#fbbf24",
                color: "#000000",
                border: "none",
                borderRadius: "0.5rem",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: "600",
              }}
            >
              Try again
            </button>
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.href = "/?safe=1";
                }
              }}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                color: "#ffffff",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "0.5rem",
                cursor: "pointer",
                fontSize: "1rem",
              }}
            >
              Safe Mode
            </button>
          </div>
          {error.digest && (
            <p style={{ marginTop: "2rem", fontSize: "0.75rem", opacity: 0.5 }}>
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}


"use client";

export default function IOSErrorOverlay() {
  return (
    <div id="ios-error-overlay">
      <h2 style={{ marginBottom: "1rem", fontSize: "1.25rem" }}>Error Detected</h2>
      <p id="ios-error-msg" style={{ marginBottom: "1.5rem", opacity: 0.8, textAlign: "center" }}></p>
      <button
        onClick={() => {
          if (typeof window !== "undefined") {
            window.location.href = window.location.pathname + "?safe=1";
          }
        }}
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
        Open in Safe Mode
      </button>
    </div>
  );
}


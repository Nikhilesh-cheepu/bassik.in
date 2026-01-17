"use client";

import { useEffect } from "react";

export default function ErrorBoundaryScript() {
  useEffect(() => {
    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    // Error handler
    const handleError = (event: ErrorEvent) => {
      console.error("JavaScript Error:", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        isIOS,
      });
      
      // Show error overlay only on iOS in development or if error persists
      if (isIOS && typeof window !== "undefined") {
        const errorOverlay = document.getElementById("ios-error-overlay");
        if (errorOverlay) {
          errorOverlay.style.display = "flex";
          const errorMsg = errorOverlay.querySelector("#ios-error-msg");
          if (errorMsg) {
            errorMsg.textContent = `Error: ${event.message || "Unknown error"}`;
          }
        }
      }
    };

    // Unhandled promise rejection handler
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled Promise Rejection:", {
        reason: event.reason,
        isIOS,
      });
      
      if (isIOS && typeof window !== "undefined") {
        const errorOverlay = document.getElementById("ios-error-overlay");
        if (errorOverlay) {
          errorOverlay.style.display = "flex";
          const errorMsg = errorOverlay.querySelector("#ios-error-msg");
          if (errorMsg) {
            errorMsg.textContent = `Promise Error: ${String(event.reason) || "Unknown error"}`;
          }
        }
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}


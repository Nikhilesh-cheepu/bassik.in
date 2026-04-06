import { type RefObject, useEffect, useRef } from "react";

type Snapshot = { wasPlaying: boolean; wasMuted: boolean };

/**
 * When the user switches tab/window or backgrounds the app (document hidden),
 * pause the video so audio stops. When they return, resume playback only if it
 * was playing before — restoring the previous muted/unmuted state.
 */
export function usePauseVideoOnDocumentHidden(
  videoRef: RefObject<HTMLVideoElement | null>,
  syncMutedToReact?: (muted: boolean) => void
) {
  const snapshotRef = useRef<Snapshot | null>(null);

  useEffect(() => {
    const onVisibility = () => {
      const el = videoRef.current;
      if (!el) return;

      if (document.visibilityState === "hidden") {
        snapshotRef.current = {
          wasPlaying: !el.paused,
          wasMuted: el.muted,
        };
        el.pause();
        return;
      }

      const snap = snapshotRef.current;
      snapshotRef.current = null;
      if (!snap?.wasPlaying) return;

      el.muted = snap.wasMuted;
      syncMutedToReact?.(snap.wasMuted);
      void el.play().catch(() => {});
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [videoRef, syncMutedToReact]);
}

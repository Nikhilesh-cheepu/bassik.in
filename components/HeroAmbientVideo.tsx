"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { usePauseVideoOnDocumentHidden } from "@/lib/use-pause-video-on-document-hidden";

type HeroAmbientVideoProps = {
  src: string;
  className?: string;
  /** Hero uses auto so the first frames buffer immediately; optional backgrounds can use metadata. */
  preload?: "none" | "metadata" | "auto";
};

/**
 * Full-bleed looping background video with mute toggle.
 * Tab/window blur pauses audio; returning resumes prior play + mute state.
 */
export default function HeroAmbientVideo({
  src,
  className = "",
  preload = "auto",
}: HeroAmbientVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  const syncMuted = useCallback((m: boolean) => {
    setMuted(m);
  }, []);

  usePauseVideoOnDocumentHidden(videoRef, syncMuted);

  useEffect(() => {
    const v = videoRef.current;
    if (v) v.muted = muted;
  }, [muted]);

  const toggleMute = useCallback(() => {
    setMuted((m) => !m);
  }, []);

  return (
    <div className="relative h-full w-full">
      <video
        ref={videoRef}
        className={`pointer-events-none absolute inset-0 h-full w-full object-cover ${className}`}
        src={src}
        autoPlay
        loop
        playsInline
        muted={muted}
        preload={preload}
        // @ts-expect-error React DOM typings omit fetchPriority on video; browsers support it.
        fetchPriority="high"
      />
      <button
        type="button"
        onClick={toggleMute}
        className="pointer-events-auto absolute bottom-3 right-3 z-[25] flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/55 text-white backdrop-blur-md transition-colors hover:bg-black/70"
        aria-label={muted ? "Unmute video" : "Mute video"}
      >
        {muted ? (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        )}
      </button>
    </div>
  );
}

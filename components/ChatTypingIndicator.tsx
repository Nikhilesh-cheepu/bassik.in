"use client";

type ChatTypingIndicatorProps = {
  label?: string;
  align?: "left" | "right";
  accentColor?: string;
};

export default function ChatTypingIndicator({
  label = "Typing…",
  align = "left",
  accentColor = "#f97316",
}: ChatTypingIndicatorProps) {
  const isRight = align === "right";
  return (
    <div className={`flex ${isRight ? "justify-end" : "justify-start"}`}>
      <div
        className={`rounded-[18px] border border-white/[0.08] px-3.5 py-2.5 shadow-lg backdrop-blur-md ${
          isRight ? "rounded-br-md" : "rounded-bl-md"
        }`}
        style={{
          background: "linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
          boxShadow: `0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)`,
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 animate-bounce rounded-full"
                style={{
                  animationDelay: `${i * 0.15}s`,
                  animationDuration: "0.9s",
                  backgroundColor: accentColor,
                  opacity: 0.85,
                }}
              />
            ))}
          </div>
          <span className="text-[11px] font-medium tracking-wide text-white/50">{label}</span>
        </div>
      </div>
    </div>
  );
}

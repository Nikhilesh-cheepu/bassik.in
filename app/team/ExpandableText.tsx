"use client";

import { useState } from "react";

function isLongText(text: string): boolean {
  return text.length > 100 || text.split("\n").length > 2;
}

export default function ExpandableText({
  text,
  className = "mt-1.5 text-sm text-white/50",
}: {
  text: string;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const long = isLongText(text);

  return (
    <div>
      <p className={`whitespace-pre-wrap ${className} ${expanded || !long ? "" : "line-clamp-2"}`}>
        {text}
      </p>
      {long ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs font-medium text-cyan-400/85 active:text-cyan-300"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}

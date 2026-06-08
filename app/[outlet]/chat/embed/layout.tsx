import "./embed.css";

/** Embed iframe: fixed height chain so the message list scrolls inside the panel. */
export default function ChatEmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#040408]">{children}</div>
  );
}

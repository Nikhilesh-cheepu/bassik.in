/** Embed iframe: fixed viewport height so the message list can scroll inside the panel. */
export default function ChatEmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[100dvh] min-h-0 overflow-hidden bg-[#040408]">{children}</div>
  );
}

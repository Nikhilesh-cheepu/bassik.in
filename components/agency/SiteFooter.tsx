import Link from "next/link";

/** Tiny public footer — brand + privacy only. */
export function SiteFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`border-t border-[#E6E1E8]/80 px-4 py-2.5 sm:px-8 ${className}`}>
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 text-[11px] text-[#8B8494]">
        <span className="font-medium text-[#6B6570]">Bassik</span>
        <Link
          href="/privacy"
          className="hover:text-[#12131A] hover:underline underline-offset-2"
        >
          Privacy Policy
        </Link>
      </div>
    </footer>
  );
}

import Link from "next/link";

/** Tiny public footer — always visible strip: Bassik · Privacy Policy */
export function SiteFooter({ className = "" }: { className?: string }) {
  return (
    <footer
      className={`border-t border-[#E6E1E8] bg-[#F7F5F8] px-4 py-2 sm:px-8 ${className}`}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 text-[11px] leading-none text-[#6B6570]">
        <span className="font-semibold text-[#12131A]">Bassik</span>
        <Link
          href="/privacy"
          className="font-medium text-[#6B6570] underline underline-offset-2 hover:text-[#12131A]"
        >
          Privacy Policy
        </Link>
      </div>
    </footer>
  );
}

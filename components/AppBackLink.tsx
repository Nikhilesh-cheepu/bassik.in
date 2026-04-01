import Link from "next/link";

type AppBackLinkProps = {
  href: string;
  label: string;
  className?: string;
};

export default function AppBackLink({ href, label, className = "" }: AppBackLinkProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 text-sm font-medium text-stone-400 hover:text-stone-100 transition-colors touch-manipulation ${className}`}
      style={{ touchAction: "manipulation" }}
    >
      <svg className="w-4 h-4 shrink-0" width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      {label}
    </Link>
  );
}

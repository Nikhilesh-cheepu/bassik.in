"use client";

import type { ComponentType } from "react";

type IconProps = { className?: string };

export function InstagramIcon({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FEDA75" />
          <stop offset="35%" stopColor="#FA7E1E" />
          <stop offset="65%" stopColor="#D62976" />
          <stop offset="100%" stopColor="#962FBF" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig-grad)" />
      <circle cx="12" cy="12" r="4.5" fill="none" stroke="white" strokeWidth="1.8" />
      <circle cx="17.4" cy="6.6" r="1.2" fill="white" />
    </svg>
  );
}

export function MetaIcon({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#0081FB"
        d="M13.2 5.5c-1.4 0-2.5 1.1-3.4 2.9-.9-1.8-2-2.9-3.4-2.9C4.2 5.5 2 9.1 2 13.1c0 2.2 1.1 3.7 2.7 3.7 1.2 0 2.1-.7 3.6-3.2.1-.2.3-.4.5-.4s.4.2.5.4c1.5 2.5 2.4 3.2 3.6 3.2 1.6 0 2.7-1.5 2.7-3.7 0-4-2.2-7.6-5.6-7.6Z"
      />
    </svg>
  );
}

export function GoogleIcon({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.7a5.2 5.2 0 0 1-2.3 3.4v2.8h3.7c2.2-2 3.5-5 3.5-8Z" />
      <path fill="#34A853" d="M12 22c3.1 0 5.7-1 7.6-2.8l-3.7-2.8c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.7v2.9A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M5.6 13.8A6 6 0 0 1 5.2 12c0-.6.1-1.2.4-1.8V7.3H1.7a10 10 0 0 0 0 9.4l3.9-2.9Z" />
      <path fill="#EA4335" d="M12 5.6c1.7 0 2.8.7 3.4 1.3l2.5-2.5A9.8 9.8 0 0 0 12 2 10 10 0 0 0 1.7 7.3l3.9 2.9C6.5 7.6 9 5.6 12 5.6Z" />
    </svg>
  );
}

export function WebsiteIcon({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="#22D3EE" strokeWidth="1.6" />
      <ellipse cx="12" cy="12" rx="4" ry="9" stroke="#A855F7" strokeWidth="1.4" />
      <path d="M3 12h18M5 7.5h14M5 16.5h14" stroke="#B8FF3C" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function SwiggyIcon({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#FC8019"
        d="M12.034 24c-.376-.411-2.075-2.584-3.95-5.513-.547-.916-.901-1.63-.833-1.814.178-.48 3.355-.743 4.333-.308.298.132.29.307.29.409 0 .44-.022 1.619-.022 1.619a.441.441 0 1 0 .883-.002l-.005-2.939c0-.255-.278-.319-.331-.329-.511-.002-1.548-.006-2.661-.006-2.457 0-3.006.101-3.423-.172-.904-.591-2.383-4.577-2.417-6.819C3.849 4.964 5.723 2.225 8.362.868A8.13 8.13 0 0 1 12.026 0c4.177 0 7.617 3.153 8.075 7.209l.001.011c.084.981-5.321 1.189-6.39.904-.164-.044-.206-.212-.206-.284L13.5 4.996a.442.442 0 0 0-.884.002l.009 3.866a.33.33 0 0 0 .268.32l3.354-.001c1.79 0 2.542.207 3.042.588.333.254.461.739.349 1.37C18.633 16.755 12.273 23.71 12.034 24z"
      />
    </svg>
  );
}

export function ZomatoIcon({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#E23744"
        d="M19.615 9.45l-1.258.473-.167.71-.446.021-.115.978h.408l-.211 1.51c-.131.939.036 1.381.865 1.381.488 0 .91-.175 1.135-.297l.145-.9c-.167.083-.436.19-.618.19-.247 0-.276-.13-.225-.488l.189-1.396h.843c.03-.206.131-.877.16-1h-.865zm-3.779 1.002c-.115.002-.236.01-.361.026a3.592 3.592 0 0 0-1.347.432l.26.789c.269-.15.615-.28.978-.326.538-.066.757.1.79.375.014.109.004.199-.005.289l-.014.056a3.46 3.46 0 0 0-1.097-.036c-.518.063-.943.273-1.204.6a1.324 1.324 0 0 0-.225 1.034c.127.583.553.84 1.199.76.45-.055.812-.27 1.076-.63a2.665 2.665 0 0 1-.03.304 1.74 1.74 0 0 1-.072.29l1.244.001a3.657 3.657 0 0 1-.001-.365c.036-.459.118-1.143.247-2.051a2.397 2.397 0 0 0-.002-.59c-.08-.644-.628-.969-1.436-.958zm6.536.063c-1.194 0-2.107 1.067-2.107 2.342 0 .959.552 1.693 1.628 1.693 1.2 0 2.107-1.067 2.107-2.35 0-.95-.538-1.685-1.628-1.685zm-11.777.041c-.538 0-1.12.465-1.52 1.236.102-.504.08-1.076.051-1.198a8.964 8.964 0 0 1-1.287.122 6.9 6.9 0 0 1-.073 1.243l-.167 1.145c-.066.45-.138.969-.211 1.297h1.353c.007-.199.058-.511.094-.786l.116-.786c.095-.511.502-1.114.815-1.114.182 0 .175.176.124.504l-.131.885c-.066.45-.138.969-.211 1.297h1.367c.008-.199.051-.512.088-.786l.116-.786c.094-.512.502-1.114.814-1.114.182 0 .175.168.146.396l-.327 2.29H13l.438-2.609c.095-.649.044-1.236-.676-1.236-.523 0-1.09.443-1.49 1.182.087-.61.036-1.182-.677-1.182zm-4.88.008c-1.177 0-2.08 1.053-2.08 2.312 0 .946.546 1.67 1.608 1.67 1.185 0 2.08-1.052 2.08-2.319 0-.938-.531-1.663-1.607-1.663zm-5.126.091c-.05.39-.102.778-.175 1.13.328-.008.619-.016 1.411-.016l-1.81 1.96-.015.703c.444-.03.997-.039 1.63-.039.566 0 1.134.008 1.497.039.065-.458.13-.763.21-1.137-.275.015-.755.023-1.512.023l1.81-1.969.023-.694c-.437.023-.83.03-1.52.03-.749 0-.975-.007-1.549-.03zm4.988.927c.255 0 .408.228.408.701 0 .687-.276 1.251-.626 1.251-.261 0-.414-.236-.414-.702 0-.694.283-1.25.632-1.25zm16.629 0c.254 0 .407.228.407.701 0 .687-.276 1.251-.625 1.251-.262 0-.415-.236-.415-.702 0-.694.284-1.25.633-1.25zM15.51 12.64c.206-.003.403.024.55.058l-.013.118c-.075.44-.39.881-.848.938-.31.037-.578-.148-.608-.39a.538.538 0 0 1 .114-.41c.117-.159.336-.268.599-.3.069-.009.138-.013.206-.014Z"
      />
    </svg>
  );
}

export function EazyDinerIcon({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="6" fill="#8B1A1A" />
      <path fill="#F5C518" d="M12 6.5l1.4 2.8 3.1.5-2.2 2.2.5 3.1L12 13.8 9.2 15.1l.5-3.1-2.2-2.2 3.1-.5L12 6.5Z" />
    </svg>
  );
}

const PLATFORM_MAP: Record<string, ComponentType<IconProps>> = {
  Instagram: InstagramIcon,
  Meta: MetaIcon,
  Google: GoogleIcon,
  Website: WebsiteIcon,
  Swiggy: SwiggyIcon,
  Zomato: ZomatoIcon,
  EazyDiner: EazyDinerIcon,
};

const PLATFORM_BORDER: Record<string, string> = {
  Instagram: "#E1306C",
  Meta: "#0081FB",
  Google: "#4285F4",
  Website: "#22D3EE",
  Swiggy: "#FC8019",
  Zomato: "#E23744",
  EazyDiner: "#F5C518",
};

export function PlatformIcon({ name, className }: { name: string; className?: string }) {
  const Icon = PLATFORM_MAP[name];
  if (!Icon) return null;
  return <Icon className={className} />;
}

export type PlatformTile = {
  icons: string[];
  label: string;
  amount?: string;
};

export const AD_PLATFORM_TILES: PlatformTile[] = [
  { icons: ["Instagram", "Meta"], label: "Instagram / Meta", amount: "₹1,00,000" },
  { icons: ["Google", "Website"], label: "Google + Website", amount: "₹50,000" },
  { icons: ["Swiggy", "Zomato"], label: "Swiggy + Zomato", amount: "₹1,00,000" },
];

export function PlatformTileCard({ tile }: { tile: PlatformTile }) {
  return (
    <div className="proposal-glass flex items-center gap-3 rounded-2xl p-3.5 lg:p-4">
      <div className="flex shrink-0 -space-x-2">
        {tile.icons.map((icon) => (
          <div
            key={icon}
            className="proposal-skill flex h-11 w-11 items-center justify-center lg:h-12 lg:w-12"
            style={{ borderColor: PLATFORM_BORDER[icon] ?? "#a855f7", color: PLATFORM_BORDER[icon] }}
          >
            <PlatformIcon name={icon} className="h-6 w-6" />
          </div>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-bold text-white lg:text-[14px]">{tile.label}</p>
        {tile.amount ? (
          <p className="proposal-lime mt-0.5 font-[family-name:var(--font-agency-display)] text-[16px] font-bold lg:text-[18px]">
            {tile.amount}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function DigitalPlatformGrid({ platforms }: { platforms: string[] }) {
  const withMeta = platforms.includes("Instagram")
    ? ["Instagram", "Meta", ...platforms.filter((p) => p !== "Instagram")]
    : platforms;

  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7 lg:gap-4">
      {withMeta.map((platform) => (
        <li key={platform} className="flex flex-col items-center gap-2 text-center">
          <div
            className="proposal-skill flex h-16 w-16 items-center justify-center lg:h-[4.5rem] lg:w-[4.5rem]"
            style={{
              borderColor: PLATFORM_BORDER[platform] ?? "#a855f7",
              color: PLATFORM_BORDER[platform] ?? "#a855f7",
            }}
          >
            <PlatformIcon name={platform} className="h-8 w-8 lg:h-9 lg:w-9" />
          </div>
          <span className="text-[11px] font-bold text-white/85 lg:text-[12px]">{platform}</span>
        </li>
      ))}
    </ul>
  );
}

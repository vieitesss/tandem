"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Secondary actions row for contextual links.
 * Rendered under the main header on specific pages.
 * On mobile, actions wrap so every item stays visible.
 */
export default function SecondaryActions({ children }) {
  return (
    <div className="grid w-full grid-cols-2 gap-2 rounded-2xl border border-obsidian-600 bg-obsidian-900 p-1 sm:flex sm:flex-nowrap sm:overflow-x-auto sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:pb-1">
      {children}
    </div>
  );
}

/**
 * Individual secondary action link.
 * Shows icon + label across breakpoints.
 */
export function SecondaryLink({ href, icon, label }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 min-w-0 w-full items-center justify-center gap-1.5 rounded-xl border px-2 py-1.5 text-[11px] font-semibold transition-colors duration-200 sm:w-auto sm:shrink-0 sm:gap-2 sm:rounded-full sm:px-3 sm:py-2 sm:text-sm ${
        isActive
          ? "border-cream-500/45 bg-cream-500/15 text-cream-100"
          : "border-transparent bg-transparent text-cream-300 sm:border-obsidian-600/80 sm:bg-white"
      }`}
      aria-current={isActive ? "page" : undefined}
    >
      {icon && <span className={isActive ? "text-cream-100" : "text-cream-500"}>{icon}</span>}
      <span className="truncate">{label}</span>
    </Link>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Secondary actions row for contextual links.
 * Rendered under the main header on specific pages.
 * Labels are hidden on small screens if they don't fit.
 */
export default function SecondaryActions({ children }) {
  return (
    <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
      {children}
    </div>
  );
}

/**
 * Individual secondary action link.
 * Shows icon + label on desktop, icon only on mobile.
 */
export function SecondaryLink({ href, icon, label }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors duration-200 ${
        isActive
          ? "border-cream-500/45 bg-cream-500/15 text-cream-100"
          : "border-obsidian-600/80 bg-white text-cream-300 hover:border-cream-500/30 hover:bg-obsidian-900 hover:text-cream-100"
      }`}
      aria-current={isActive ? "page" : undefined}
    >
      {icon && <span className={isActive ? "text-cream-100" : "text-cream-500"}>{icon}</span>}
      <span>{label}</span>
    </Link>
  );
}

"use client";

import Link from "next/link";

/**
 * Secondary actions row for contextual links.
 * Rendered under the main header on specific pages.
 * Labels are hidden on small screens if they don't fit.
 */
export default function SecondaryActions({ children }) {
  return (
    <div className="flex flex-nowrap items-center gap-2 overflow-hidden">
      {children}
    </div>
  );
}

/**
 * Individual secondary action link.
 * Shows icon + label on desktop, icon only on mobile.
 */
export function SecondaryLink({ href, icon, label }) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-obsidian-600/80 bg-white px-3 py-2 text-sm font-medium text-cream-300 transition-all duration-200 hover:border-cream-500/30 hover:bg-obsidian-900 hover:text-cream-100"
    >
      {icon && <span className="text-cream-500">{icon}</span>}
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

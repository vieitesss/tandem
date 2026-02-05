"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/transactions",
    label: "Transactions",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M5 4.75a.75.75 0 00-.75.75v9.5a.75.75 0 00.75.75h10a.75.75 0 00.75-.75V5.5a.75.75 0 00-.75-.75H5zm1.75 2h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 010-1.5zm0 3h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 010-1.5zm0 3h4a.75.75 0 010 1.5h-4a.75.75 0 010-1.5z" />
      </svg>
    ),
  },
  {
    href: "/",
    label: "Add",
    isPrimary: true,
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 4.5a.75.75 0 01.75.75v3h3a.75.75 0 010 1.5h-3v3a.75.75 0 01-1.5 0v-3h-3a.75.75 0 010-1.5h3v-3A.75.75 0 0110 4.5z" />
      </svg>
    ),
  },
  {
    href: "/profiles",
    label: "Person",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 10a3 3 0 100-6 3 3 0 000 6z" />
        <path d="M4.5 16a5.5 5.5 0 0111 0v.5h-11V16z" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:hidden">
      <div className="mx-auto flex max-w-xs items-center justify-between rounded-3xl border border-cream-500/15 bg-obsidian-800/60 px-6 py-2.5 shadow-elevated">
        {navItems.map((item) => {
          const active = isActive(item.href);

          if (item.isPrimary) {
            return (
              <Link
                key={item.href}
                className={`flex h-12 w-12 items-center justify-center rounded-2xl text-obsidian-950 shadow-glow-md transition-all duration-300 ${
                  active
                    ? "bg-cream-400 shadow-cream-500/40"
                    : "bg-cream-500 shadow-cream-500/30 hover:bg-cream-400 hover:scale-105"
                }`}
                href={item.href}
                aria-label={item.label}
                title={item.label}
                aria-current={active ? "page" : undefined}
              >
                {item.icon}
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              className={`relative flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-300 ${
                active
                  ? "bg-obsidian-700 text-cream-300 shadow-inner shadow-obsidian-950/40"
                  : "text-cream-100/60 hover:text-cream-100 hover:bg-obsidian-700/40"
              }`}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              aria-current={active ? "page" : undefined}
            >
              {item.icon}
              {active ? (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-cream-400 shadow-glow-sm" />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

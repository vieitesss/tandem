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
    label: "Add transaction",
    isPrimary: true,
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 4.5a.75.75 0 01.75.75v3h3a.75.75 0 010 1.5h-3v3a.75.75 0 01-1.5 0v-3h-3a.75.75 0 010-1.5h3v-3A.75.75 0 0110 4.5z" />
      </svg>
    ),
  },
  {
    href: "/profiles",
    label: "Profiles",
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
      <div className="mx-auto flex max-w-sm items-center justify-between rounded-3xl border border-slate-800/80 bg-slate-900/95 px-5 py-2 shadow-xl shadow-slate-950/80 backdrop-blur">
        {navItems.map((item) => {
          const active = isActive(item.href);

          if (item.isPrimary) {
            return (
              <Link
                key={item.href}
                className={`flex h-12 w-12 items-center justify-center rounded-2xl text-slate-900 shadow-md transition ${
                  active
                    ? "bg-emerald-400 shadow-emerald-500/40"
                    : "bg-emerald-500 shadow-emerald-500/30 hover:bg-emerald-400"
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
              className={`relative flex h-10 w-10 items-center justify-center rounded-2xl transition ${
                active
                  ? "bg-slate-800 text-emerald-300 shadow-inner shadow-slate-950/40"
                  : "text-slate-400 hover:text-slate-100"
              }`}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              aria-current={active ? "page" : undefined}
            >
              {item.icon}
              {active ? (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-emerald-400" />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

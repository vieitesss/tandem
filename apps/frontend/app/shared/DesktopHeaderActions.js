"use client";

import Link from "next/link";

const navItems = [
  {
    id: "home",
    href: "/",
    label: "Add",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M10 4.5a.75.75 0 01.75.75v3h3a.75.75 0 010 1.5h-3v3a.75.75 0 01-1.5 0v-3h-3a.75.75 0 010-1.5h3v-3A.75.75 0 0110 4.5z" />
      </svg>
    ),
  },
  {
    id: "transactions",
    href: "/transactions",
    label: "Transactions",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M5 4.75a.75.75 0 00-.75.75v9.5a.75.75 0 00.75.75h10a.75.75 0 00.75-.75V5.5a.75.75 0 00-.75-.75H5zm1.75 2h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 010-1.5zm0 3h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 010-1.5zm0 3h4a.75.75 0 010 1.5h-4a.75.75 0 010-1.5z" />
      </svg>
    ),
  },
  {
    id: "profiles",
    href: "/profiles",
    label: "Profiles",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M10 10a3 3 0 100-6 3 3 0 000 6z" />
        <path d="M4.5 16a5.5 5.5 0 0111 0v.5h-11V16z" />
      </svg>
    ),
  },
];

export default function DesktopHeaderActions({ currentPage }) {
  const isActive = (id) => currentPage === id;

  return (
    <nav className="hidden items-center gap-2 rounded-full border border-obsidian-600/80 bg-white p-1.5 md:flex">
      {navItems.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200 ${
            isActive(item.id)
              ? "bg-cream-500 text-white shadow-glow-sm"
              : "text-cream-300 hover:bg-obsidian-900 hover:text-cream-100"
          }`}
        >
          {item.icon}
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

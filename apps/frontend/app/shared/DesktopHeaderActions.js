"use client";

import IconLinkButton from "./IconLinkButton";

/**
 * Shared desktop header actions component.
 * Renders the 3 primary navigation icons in a fixed layout.
 * Hidden on mobile (md breakpoint), visible on desktop.
 * Highlights the current page.
 *
 * @param {string} currentPage - The current page: 'home', 'transactions', 'profiles'
 */
export default function DesktopHeaderActions({ currentPage }) {
  const isActive = (page) => currentPage === page;

  return (
    <div className="hidden items-center gap-2 text-cream-300 md:flex">
      <IconLinkButton
        href="/transactions"
        label="View transactions"
        className={isActive("transactions") ? "bg-cream-500/20 text-cream-100" : ""}
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M5 4.75a.75.75 0 00-.75.75v9.5a.75.75 0 00.75.75h10a.75.75 0 00.75-.75V5.5a.75.75 0 00-.75-.75H5zm1.75 2h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 010-1.5zm0 3h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 010-1.5zm0 3h4a.75.75 0 010 1.5h-4a.75.75 0 010-1.5z" />
        </svg>
      </IconLinkButton>
      <IconLinkButton
        href="/"
        label="Add transaction"
        className={isActive("home") ? "bg-cream-500/20 text-cream-100" : ""}
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M10 4.5a.75.75 0 01.75.75v3h3a.75.75 0 010 1.5h-3v3a.75.75 0 01-1.5 0v-3h-3a.75.75 0 010-1.5h3v-3A.75.75 0 0110 4.5z" />
        </svg>
      </IconLinkButton>
      <IconLinkButton
        href="/profiles"
        label="Manage profiles"
        className={isActive("profiles") ? "bg-cream-500/20 text-cream-100" : ""}
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M10 10a3 3 0 100-6 3 3 0 000 6z" />
          <path d="M4.5 16a5.5 5.5 0 0111 0v.5h-11V16z" />
        </svg>
      </IconLinkButton>
    </div>
  );
}

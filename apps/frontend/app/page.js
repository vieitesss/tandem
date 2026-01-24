"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import ProfileSetup from "./profiles/ProfileSetup";
import IconLinkButton from "./shared/IconLinkButton";
import TransactionForm from "./transactions/TransactionForm";

export default function Home() {
  const [profiles, setProfiles] = useState([]);
  const [status, setStatus] = useState("loading");

  const apiBaseUrl = "/api";

  const loadProfiles = useCallback(() => {
    setStatus("loading");
    fetch(`${apiBaseUrl}/profiles`)
      .then((response) => response.json())
      .then((data) => {
        setProfiles(Array.isArray(data) ? data : []);
        setStatus("idle");
      })
      .catch(() => {
        setProfiles([]);
        setStatus("error");
      });
  }, [apiBaseUrl]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  if (status === "loading") {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 pt-8 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-8 md:pt-12">
        <header className="space-y-3 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cream-500/20 to-cream-600/10 border border-cream-500/20 shadow-glow-sm md:h-12 md:w-12">
              <img src="/icon.png" alt="Tandem" className="h-7 w-7 md:h-8 md:w-8" />
            </div>
            <h1 className="text-3xl font-display font-semibold tracking-tight text-cream-50 md:text-4xl">
              Add Transaction
            </h1>
          </div>
          <p className="text-sm text-cream-100/60 font-medium tracking-wide">
            Loading profiles...
          </p>
        </header>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 pt-8 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-8 md:pt-12">
        <header className="space-y-3 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cream-500/20 to-cream-600/10 border border-cream-500/20 shadow-glow-sm md:h-12 md:w-12">
              <img src="/icon.png" alt="Tandem" className="h-7 w-7 md:h-8 md:w-8" />
            </div>
            <h1 className="text-3xl font-display font-semibold tracking-tight text-cream-50 md:text-4xl">
              Add Transaction
            </h1>
          </div>
          <p className="text-sm text-coral-300 font-medium">
            Unable to load profiles. Refresh the page to try again.
          </p>
        </header>
      </main>
    );
  }

  if (profiles.length === 0) {
    return <ProfileSetup onComplete={loadProfiles} />;
  }

  if (profiles.length !== 2) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 pt-8 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-8 md:pt-12">
        <header className="space-y-3 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cream-500/20 to-cream-600/10 border border-cream-500/20 shadow-glow-sm md:h-12 md:w-12">
              <img src="/icon.png" alt="Tandem" className="h-7 w-7 md:h-8 md:w-8" />
            </div>
            <h1 className="text-3xl font-display font-semibold tracking-tight text-cream-50 md:text-4xl">
              Profile setup needed
            </h1>
          </div>
          <p className="text-sm text-cream-100/60 font-medium tracking-wide">
            Tandem supports exactly two profiles before you can add transactions.
          </p>
        </header>
        <section className="rounded-2xl border border-coral-500/30 bg-coral-500/10 p-5 text-sm text-coral-100 shadow-card">
          {profiles.length > 2 ? (
            <p>
              This workspace has {profiles.length} profiles. Remove extras in the
              database, then refresh the page.
            </p>
          ) : (
            <p>
              Only one profile exists. Add the second profile to continue.
            </p>
          )}
        </section>
        <Link
          className="inline-flex w-fit items-center rounded-lg bg-cream-500 px-4 py-2.5 text-sm font-display font-semibold text-obsidian-950 shadow-glow-md transition-all duration-300 hover:bg-cream-400"
          href="/profiles"
        >
          Manage profiles
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 pt-8 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-8 md:pt-12">
      <header className="space-y-4 animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="title-icon flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cream-500/20 to-cream-600/10 border border-cream-500/20 shadow-glow-sm md:h-12 md:w-12">
              <img
                src="/icon.png"
                alt="Tandem"
                className="title-icon-media"
              />
            </div>
            <h1 className="text-3xl font-display font-semibold tracking-tight text-cream-50 md:text-4xl">
              Add Transaction
            </h1>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <IconLinkButton href="/timeline" label="View timeline">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" />
              </svg>
            </IconLinkButton>
            <IconLinkButton href="/transactions" label="View transactions">
              <svg
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M5 4.75a.75.75 0 00-.75.75v9.5a.75.75 0 00.75.75h10a.75.75 0 00.75-.75V5.5a.75.75 0 00-.75-.75H5zm1.75 2h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 010-1.5zm0 3h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 010-1.5zm0 3h4a.75.75 0 010 1.5h-4a.75.75 0 010-1.5z" />
              </svg>
            </IconLinkButton>
            <IconLinkButton href="/categories" label="Manage categories">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </IconLinkButton>
            <IconLinkButton href="/profiles" label="Manage profiles">
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
        </div>
        <p className="text-sm text-cream-100/60 font-medium tracking-wide">
          Record expenses, income, and settlements with ease
        </p>
      </header>
      <TransactionForm />
    </main>
  );
}

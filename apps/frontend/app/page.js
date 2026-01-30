"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import ProfileSetup from "./profiles/ProfileSetup";
import DesktopHeaderActions from "./shared/DesktopHeaderActions";
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
              Add
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
              Add
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
              Add
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
              Add
            </h1>
          </div>
          <DesktopHeaderActions currentPage="home" />
        </div>
        <p className="text-sm text-cream-100/60 font-medium tracking-wide">
          Record expenses, income, and settlements with ease
        </p>
      </header>
      <TransactionForm />
    </main>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import ProfileSetup from "./profiles/ProfileSetup";
import { apiGet } from "./shared/api";
import { InlineMessage, PageHeader, PageShell, SectionCard } from "./shared/PageLayout";
import TransactionForm from "./transactions/TransactionForm";

export default function Home() {
  const [profiles, setProfiles] = useState([]);
  const [status, setStatus] = useState("loading");

  const loadProfiles = useCallback(() => {
    setStatus("loading");
    apiGet("/profiles")
      .then((data) => {
        setProfiles(Array.isArray(data) ? data : []);
        setStatus("idle");
      })
      .catch(() => {
        setProfiles([]);
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const renderState = (description, tone = "muted") => (
    <PageShell maxWidth="max-w-3xl">
      <PageHeader
        title="Add"
        description="Record expenses, income, and settlements with ease."
        currentPage="home"
        eyebrow="Workspace"
      />
      <InlineMessage tone={tone}>{description}</InlineMessage>
    </PageShell>
  );

  if (status === "loading") {
    return renderState("Loading partners...");
  }

  if (status === "error") {
    return renderState("Unable to load partners. Refresh the page to try again.", "error");
  }

  if (profiles.length === 0) {
    return <ProfileSetup onComplete={loadProfiles} />;
  }

  if (profiles.length !== 2) {
    return (
      <PageShell maxWidth="max-w-3xl">
        <PageHeader
          title="Add"
          description="Tandem needs exactly two partners before you can add transactions."
          currentPage="home"
          eyebrow="Workspace"
        />
        <SectionCard className="border-coral-300/60 bg-coral-50 p-5 text-sm text-coral-100">
          {profiles.length > 2 ? (
            <p>
              This workspace has {profiles.length} partners. Remove extras in the
              database, then refresh the page.
            </p>
          ) : (
            <p>
              Add the second partner to continue.
            </p>
          )}
        </SectionCard>
        <Link
          className="inline-flex w-fit items-center rounded-xl bg-cream-500 px-4 py-2.5 text-sm font-display font-semibold text-white shadow-glow-md transition-all duration-300 hover:bg-cream-400"
          href="/profiles"
        >
          Manage partners
        </Link>
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth="max-w-3xl">
      <PageHeader
        title="Add"
        description="Record expenses, income, and settlements with ease."
        currentPage="home"
        eyebrow="Workspace"
      />
      <TransactionForm />
    </PageShell>
  );
}

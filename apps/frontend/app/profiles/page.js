"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const emptyProfile = { displayName: "", splitPercent: "50" };

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState([]);
  const [form, setForm] = useState(emptyProfile);
  const [status, setStatus] = useState(null);
  const [savingId, setSavingId] = useState(null);

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

  const loadProfiles = () => {
    fetch(`${apiBaseUrl}/profiles`)
      .then((response) => response.json())
      .then((data) => {
        setProfiles(
          Array.isArray(data)
            ? data.map((profile) => ({
                id: profile.id,
                display_name: profile.display_name || "",
                splitPercent: String(
                  Math.round(Number(profile.default_split || 0) * 1000) / 10
                ),
              }))
            : []
        );
      })
      .catch(() => setProfiles([]));
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const updateProfile = (id, field, value) => {
    setProfiles((current) =>
      current.map((profile) =>
        profile.id === id ? { ...profile, [field]: value } : profile
      )
    );
  };

  const normalizeNumberInput = (value) => {
    if (!value) {
      return "";
    }

    const sanitized = value.replace(/[^0-9.]/g, "");
    const [whole, ...decimals] = sanitized.split(".");

    return decimals.length > 0 ? `${whole}.${decimals.join("")}` : whole;
  };

  const parsePercent = (value) => {
    const normalized = Number(value);
    if (Number.isNaN(normalized) || normalized <= 0 || normalized >= 100) {
      return null;
    }
    return normalized / 100;
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setStatus(null);

    const defaultSplit = parsePercent(form.splitPercent);

    if (!form.displayName.trim() || defaultSplit === null) {
      setStatus({ tone: "error", message: "Add a name and valid split." });
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/profiles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: form.displayName.trim(),
          default_split: defaultSplit,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || "Failed to create profile");
      }

      setForm(emptyProfile);
      loadProfiles();
      setStatus({ tone: "success", message: "Profile created." });
    } catch (error) {
      setStatus({ tone: "error", message: error.message });
    }
  };

  const handleSave = async (profile) => {
    setStatus(null);
    setSavingId(profile.id);

    const defaultSplit = parsePercent(profile.splitPercent);

    if (!profile.display_name.trim() || defaultSplit === null) {
      setStatus({ tone: "error", message: "Enter name and split 0-100." });
      setSavingId(null);
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/profiles/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: profile.display_name.trim(),
          default_split: defaultSplit,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || "Failed to update profile");
      }

      setStatus({ tone: "success", message: "Profile updated." });
      loadProfiles();
    } catch (error) {
      setStatus({ tone: "error", message: error.message });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-6">
      <header className="space-y-2">
        <Link className="hidden text-xs text-slate-400 md:inline-flex" href="/">
          ← Back to transactions
        </Link>
        <h1 className="text-2xl font-semibold">Profiles</h1>
        <p className="text-sm text-slate-400">
          Manage default split percentages for each partner.
        </p>
      </header>

      <form
        className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4"
        onSubmit={handleCreate}
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_120px_120px]">
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            placeholder="Name"
            value={form.displayName}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                displayName: event.target.value,
              }))
            }
          />
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            placeholder="Split %"
            type="number"
            step="0.1"
            value={form.splitPercent}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                splitPercent: normalizeNumberInput(event.target.value),
              }))
            }
          />
          <button
            className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-900"
            type="submit"
          >
            Add
          </button>
        </div>
      </form>

      <section className="space-y-2">
        <h2 className="text-sm text-slate-300">Existing profiles</h2>
        {profiles.length === 0 ? (
          <p className="text-sm text-slate-500">No profiles yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-[minmax(0,1fr)_80px_44px] gap-2 px-3 text-xs text-slate-400">
              <span>Name</span>
              <span>Split %</span>
              <span className="text-right">Save</span>
            </div>
            <div className="divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-900/40">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="grid grid-cols-[minmax(0,1fr)_80px_44px] items-center gap-2 px-3 py-3"
                >
                  <input
                    className="w-full min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                    value={profile.display_name}
                    aria-label="Profile name"
                    onChange={(event) =>
                      updateProfile(profile.id, "display_name", event.target.value)
                    }
                  />
                  <input
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-right text-sm text-slate-200"
                    type="number"
                    step="0.1"
                    value={profile.splitPercent}
                    aria-label="Default split percent"
                    onChange={(event) =>
                      updateProfile(
                        profile.id,
                        "splitPercent",
                        normalizeNumberInput(event.target.value)
                      )
                    }
                  />
                  <button
                    className="flex h-8 w-8 items-center justify-center justify-self-end rounded-lg bg-slate-800 text-slate-200"
                    type="button"
                    onClick={() => handleSave(profile)}
                    disabled={savingId === profile.id}
                    aria-label="Save profile"
                    title="Save profile"
                  >
                    {savingId === profile.id ? (
                      "…"
                    ) : (
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M16 4a2 2 0 00-2-2H6a2 2 0 00-2 2v12a1 1 0 001.447.894L10 14.118l4.553 2.776A1 1 0 0016 16V4z" />
                      </svg>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {status ? (
        <p
          className={`text-sm ${
            status.tone === "success" ? "text-emerald-300" : "text-rose-300"
          }`}
        >
          {status.message}
        </p>
      ) : null}
    </main>
  );
}

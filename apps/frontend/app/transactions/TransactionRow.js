"use client";

import { useEffect, useMemo, useState } from "react";

import SelectField from "../shared/SelectField";
import { formatCurrency, formatDayOfMonth } from "../shared/format";
import { normalizeNumberInput } from "../shared/inputs";

const amountClassFor = (type) => {
  if (type === "INCOME") {
    return "text-emerald-300";
  }

  if (type === "EXPENSE") {
    return "text-rose-300";
  }

  return "text-slate-50";
};

export default function TransactionRow({
  transaction,
  profiles,
  categoryOptions,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(() => ({
    date: transaction.date || "",
    payerId: transaction.payer_id || "",
    category: transaction.category || "",
    amount:
      transaction.amount === undefined || transaction.amount === null
        ? ""
        : String(transaction.amount),
    note: transaction.note || "",
  }));

  const amountClass = amountClassFor(transaction.type);
  const dayLabel = formatDayOfMonth(transaction.date);
  const payerLabel = useMemo(() => {
    const profileMatch = profiles.find((profile) => profile.id === transaction.payer_id);
    return (
      profileMatch?.display_name ||
      transaction.payer_name ||
      transaction.payer_id ||
      "—"
    );
  }, [profiles, transaction.payer_id, transaction.payer_name]);
  const categoryLabel = transaction.category || "—";
  const noteLabel = transaction.note ? transaction.note.trim() : "";
  const notePlaceholder = "—";

  useEffect(() => {
    if (isModalOpen) {
      return;
    }

    setDraft({
      date: transaction.date || "",
      payerId: transaction.payer_id || "",
      category: transaction.category || "",
      amount:
        transaction.amount === undefined || transaction.amount === null
          ? ""
          : String(transaction.amount),
      note: transaction.note || "",
    });
  }, [transaction, isModalOpen]);

  const amountNumber = Number(draft.amount);
  const isAmountMissing =
    !draft.amount || Number.isNaN(amountNumber) || amountNumber <= 0;
  const isDateMissing = !draft.date;
  const isPayerMissing = !draft.payerId;
  const isCategoryRequired = transaction.type !== "INCOME";
  const isCategoryMissing = isCategoryRequired && !draft.category;
  const canSave =
    !isAmountMissing && !isDateMissing && !isPayerMissing && !isCategoryMissing;

  const handleToggle = () => {
    setIsExpanded((current) => !current);
  };

  const handleOpenModal = () => {
    setError("");
    setIsDeleteConfirm(false);
    setDraft({
      date: transaction.date || "",
      payerId: transaction.payer_id || "",
      category: transaction.category || "",
      amount:
        transaction.amount === undefined || transaction.amount === null
          ? ""
          : String(transaction.amount),
      note: transaction.note || "",
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setError("");
    setIsDeleteConfirm(false);
    setIsModalOpen(false);
  };

  const handleSave = async () => {
    if (!canSave) {
      setError(
        isCategoryRequired
          ? "Fill out day, paid by, category, and amount."
          : "Fill out day, paid by, and amount."
      );
      return;
    }

    try {
      setError("");
      await onSave(transaction.id, {
        date: draft.date,
        payer_id: draft.payerId,
        category: draft.category,
        amount: Number(draft.amount),
        note: draft.note ? draft.note.trim() : null,
      });
      handleCloseModal();
    } catch (saveError) {
      setError(saveError.message || "Failed to update transaction.");
    }
  };

  const handleDelete = async () => {
    if (!isDeleteConfirm) {
      setIsDeleteConfirm(true);
      return;
    }

    try {
      setError("");
      await onDelete(transaction.id);
      handleCloseModal();
    } catch (deleteError) {
      setError(deleteError.message || "Failed to delete transaction.");
    }
  };

  const rowContent = (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 text-sm md:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto_72px]">
      <span className="text-slate-200 tabular-nums">{dayLabel}</span>
      <span className="truncate text-slate-200">{payerLabel}</span>
      <span className="truncate text-slate-200">{categoryLabel}</span>
      <span className="hidden truncate text-slate-400 md:block">
        {noteLabel || notePlaceholder}
      </span>
      <span className={`text-right ${amountClass}`}>
        {formatCurrency(transaction.amount)}
      </span>
      <div className="hidden justify-end md:flex">
        <button
          type="button"
          className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-200"
          onClick={handleOpenModal}
        >
          Edit
        </button>
      </div>
    </div>
  );

  const noteContent = (
    <p className={noteLabel ? "text-slate-200" : "text-slate-500"}>
      {noteLabel || notePlaceholder}
    </p>
  );

  const handleRowKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleToggle();
    }
  };

  return (
    <div className="px-3 py-3">
      <div
        role="button"
        tabIndex={0}
        className="w-full text-left"
        onClick={handleToggle}
        onKeyDown={handleRowKeyDown}
        aria-expanded={isExpanded}
      >
        {rowContent}
      </div>
      {isExpanded ? (
        <div className="mt-2 flex items-start justify-between gap-3 text-xs md:hidden">
          <div className="min-w-0 flex-1">{noteContent}</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-200"
              onClick={handleOpenModal}
            >
              Edit
            </button>
          </div>
        </div>
      ) : null}
      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-800 bg-slate-900/95 p-5 text-slate-100">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Edit transaction</h3>
              <p className="text-xs text-slate-400">Type: {transaction.type}</p>
            </div>
            <div className="grid gap-3 text-sm">
              <label className="space-y-1 text-xs text-slate-400">
                Date
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                  type="date"
                  value={draft.date}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="space-y-1 text-xs text-slate-400">
                Paid by
                <SelectField
                  className="w-full appearance-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 pr-9 text-sm text-slate-200"
                  value={draft.payerId}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      payerId: event.target.value,
                    }))
                  }
                >
                  <option value="">Select payer</option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.display_name || profile.id}
                    </option>
                  ))}
                </SelectField>
              </label>
              <label className="space-y-1 text-xs text-slate-400">
                Category
                <SelectField
                  className="w-full appearance-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 pr-9 text-sm text-slate-200"
                  value={draft.category}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                  disabled={!isCategoryRequired}
                >
                  <option value="">
                    {isCategoryRequired ? "Select category" : "Not required"}
                  </option>
                  {categoryOptions.map((option) => (
                    <option key={option.label} value={option.label}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </label>
              <label className="space-y-1 text-xs text-slate-400">
                Amount
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-left text-sm text-slate-200"
                  placeholder="0.00"
                  inputMode="decimal"
                  value={draft.amount}
                  onChange={(event) => {
                    const normalized = normalizeNumberInput(event.target.value);
                    setDraft((current) => ({ ...current, amount: normalized }));
                  }}
                />
              </label>
              <label className="space-y-1 text-xs text-slate-400">
                Note
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                  placeholder="No note"
                  value={draft.note}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            {error ? <p className="text-xs text-rose-300">{error}</p> : null}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                className={`rounded-lg px-3 py-2 text-xs font-semibold text-slate-100 ${
                  isDeleteConfirm
                    ? "bg-rose-500"
                    : "bg-rose-500/80 hover:bg-rose-500"
                }`}
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting
                  ? "Deleting"
                  : isDeleteConfirm
                    ? "Confirm delete"
                    : "Delete"}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-slate-800 px-3 py-2 text-xs text-slate-200"
                  onClick={handleCloseModal}
                  disabled={isSaving || isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900"
                  onClick={handleSave}
                  disabled={isSaving || isDeleting}
                >
                  {isSaving ? "Saving" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


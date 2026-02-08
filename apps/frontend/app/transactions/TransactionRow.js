"use client";

import { useEffect, useMemo, useState } from "react";

import AppModal from "../shared/AppModal";
import {
  DangerButton,
  FieldLabel,
  PrimaryButton,
  SecondaryButton,
  TextInput,
  fieldInputClassName,
} from "../shared/FormPrimitives";
import SelectField from "../shared/SelectField";
import { getCategoryIconPath } from "../shared/categoryIcons";
import { buildDefaultCustomSplits } from "../shared/domain/splits";
import { formatCurrency, formatDayOfMonth } from "../shared/format";
import { normalizeNumberInput } from "../shared/inputs";
import { useToast } from "../shared/ToastProvider";

function CategoryIcon({ icon, label, className = "h-4 w-4 text-cream-300" }) {
  const path = getCategoryIconPath(icon, label);

  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const amountClassFor = (type) => {
  if (type === "INCOME") {
    return "text-sage-400";
  }

  if (type === "EXPENSE") {
    return "text-coral-400";
  }

  return "text-cream-50";
};

export default function TransactionRow({
  transaction,
  profiles,
  categoryOptions,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
  activePayerId,
}) {
  const defaultCustomSplits = useMemo(
    () => buildDefaultCustomSplits(profiles),
    [profiles]
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);
  const [error, setError] = useState("");
  const [customSplits, setCustomSplits] = useState(defaultCustomSplits);
  const [hasCustomSplitsTouched, setHasCustomSplitsTouched] = useState(false);
  const [draft, setDraft] = useState(() => ({
    date: transaction.date || "",
    payerId: transaction.payer_id || "",
    category: transaction.category || "",
    amount:
      transaction.amount === undefined || transaction.amount === null
        ? ""
        : String(transaction.amount),
    note: transaction.note || "",
    splitMode: transaction.split_mode || "none",
    beneficiaryId:
      transaction.type === "LIQUIDATION" && transaction.beneficiary_id
        ? String(transaction.beneficiary_id)
        : "",
    owedToId:
      transaction.split_mode === "owed" && transaction.beneficiary_id
        ? String(transaction.beneficiary_id)
        : "",
  }));

  const isSettlementReceived =
    transaction.type === "LIQUIDATION" &&
    activePayerId &&
    Number(activePayerId) === transaction.beneficiary_id;
  const displayType = isSettlementReceived ? "INCOME" : transaction.type;
  const amountClass = amountClassFor(displayType);
  const amountPrefix =
    displayType === "EXPENSE" ? "-" : displayType === "INCOME" ? "+" : "";
  const { showToast } = useToast();
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
  const beneficiaryLabel = useMemo(() => {
    if (!transaction.beneficiary_id) return "—";
    const profileMatch = profiles.find((profile) => profile.id === transaction.beneficiary_id);
    return profileMatch?.display_name || transaction.beneficiary_id || "—";
  }, [profiles, transaction.beneficiary_id]);
  const displayedPayerLabel = isSettlementReceived ? beneficiaryLabel : payerLabel;
  const categoryLabel = transaction.category || "—";
  const categoryIcon = useMemo(() => {
    if (!transaction.category) {
      return "";
    }

    const match = categoryOptions.find((option) => option.label === transaction.category);
    return match?.icon || "";
  }, [categoryOptions, transaction.category]);
  const splitLabel = useMemo(() => {
    if (transaction.type !== "EXPENSE") {
      return "—";
    }

    if (transaction.split_mode === "owed") {
      return "Owed";
    }

    if (transaction.split_mode === "custom") {
      return "Custom";
    }

    if (transaction.split_mode === "none") {
      return "Personal";
    }

    return "—";
  }, [transaction.split_mode, transaction.type]);
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
      splitMode: transaction.split_mode || "none",
      beneficiaryId:
        transaction.type === "LIQUIDATION" && transaction.beneficiary_id
          ? String(transaction.beneficiary_id)
          : "",
      owedToId:
        transaction.split_mode === "owed" && transaction.beneficiary_id
          ? String(transaction.beneficiary_id)
          : "",
    });
    setCustomSplits(defaultCustomSplits);
    setHasCustomSplitsTouched(false);
  }, [defaultCustomSplits, transaction, isModalOpen]);

  useEffect(() => {
    if (
      transaction.type !== "EXPENSE" ||
      draft.splitMode !== "owed" ||
      !draft.owedToId ||
      draft.owedToId !== draft.payerId
    ) {
      return;
    }

    setDraft((current) => ({ ...current, owedToId: "" }));
  }, [transaction.type, draft.splitMode, draft.owedToId, draft.payerId]);

  useEffect(() => {
    if (
      transaction.type !== "LIQUIDATION" ||
      !draft.beneficiaryId ||
      draft.beneficiaryId !== draft.payerId
    ) {
      return;
    }

    setDraft((current) => ({ ...current, beneficiaryId: "" }));
  }, [transaction.type, draft.beneficiaryId, draft.payerId]);

  useEffect(() => {
    if (transaction.type !== "EXPENSE" || draft.splitMode !== "custom") {
      return;
    }

    if (customSplits.length > 0) {
      return;
    }

    setCustomSplits(defaultCustomSplits);
  }, [customSplits.length, defaultCustomSplits, draft.splitMode, transaction.type]);

  const amountNumber = Number(draft.amount);
  const isAmountMissing =
    !draft.amount || Number.isNaN(amountNumber) || amountNumber <= 0;
  const isDateMissing = !draft.date;
  const isPayerMissing = !draft.payerId;
  const isCategoryRequired = transaction.type === "EXPENSE";
  const isCategoryMissing = isCategoryRequired && !draft.category;
  const isBeneficiaryMissing =
    transaction.type === "LIQUIDATION" &&
    (!draft.beneficiaryId || draft.beneficiaryId === draft.payerId);
  const isOwedMissing =
    transaction.type === "EXPENSE" &&
    draft.splitMode === "owed" &&
    (!draft.owedToId || draft.owedToId === draft.payerId);
  const customTotalPercent = customSplits.reduce(
    (sum, split) => sum + Number(split.percent || 0),
    0
  );
  const hasInvalidCustomSplit =
    customSplits.length === 0 ||
    customSplits.some((split) => {
      return !split.user_id || Number(split.percent || 0) <= 0;
    });
  const hasCustomTotalError = Math.abs(customTotalPercent - 100) > 0.01;
  const isCustomSplitInvalid =
    transaction.type === "EXPENSE" &&
    draft.splitMode === "custom" &&
    (hasInvalidCustomSplit || hasCustomTotalError);
  const canSave =
    !isAmountMissing &&
    !isDateMissing &&
    !isPayerMissing &&
    !isCategoryMissing &&
    !isBeneficiaryMissing &&
    !isOwedMissing &&
    !isCustomSplitInvalid;

  const modalIds = {
    date: `transaction-edit-date-${transaction.id}`,
    payer: `transaction-edit-payer-${transaction.id}`,
    category: `transaction-edit-category-${transaction.id}`,
    beneficiary: `transaction-edit-beneficiary-${transaction.id}`,
    splitMode: `transaction-edit-split-${transaction.id}`,
    owedTo: `transaction-edit-owed-${transaction.id}`,
    amount: `transaction-edit-amount-${transaction.id}`,
    note: `transaction-edit-note-${transaction.id}`,
  };

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
      splitMode: transaction.split_mode || "none",
      beneficiaryId:
        transaction.type === "LIQUIDATION" && transaction.beneficiary_id
          ? String(transaction.beneficiary_id)
          : "",
      owedToId:
        transaction.split_mode === "owed" && transaction.beneficiary_id
          ? String(transaction.beneficiary_id)
          : "",
    });
    setCustomSplits(defaultCustomSplits);
    setHasCustomSplitsTouched(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setError("");
    setIsDeleteConfirm(false);
    setIsModalOpen(false);
  };

  const handleSave = async () => {
    if (!canSave) {
      if (isOwedMissing) {
        setError("Select who owes you for this expense.");
        return;
      }

      if (isCustomSplitInvalid) {
        setError("Custom splits need valid users and must total 100%.");
        return;
      }

      if (isBeneficiaryMissing) {
        setError("Select who receives this settlement.");
        return;
      }

      setError(
        isCategoryRequired
          ? "Fill out day, paid by, category, and amount."
          : "Fill out day, paid by, and amount."
      );
      return;
    }

    try {
      setError("");
      const isSwitchingToCustom =
        transaction.type === "EXPENSE" &&
        draft.splitMode === "custom" &&
        transaction.split_mode !== "custom";
      const shouldSendCustomSplits =
        transaction.type === "EXPENSE" &&
        draft.splitMode === "custom" &&
        (isSwitchingToCustom || hasCustomSplitsTouched);
      const payload = {
        date: draft.date,
        payer_id: draft.payerId ? Number(draft.payerId) : null,
        category: transaction.type === "EXPENSE" ? draft.category : null,
        amount: Number(draft.amount),
        note: draft.note ? draft.note.trim() : null,
        split_mode: transaction.type === "EXPENSE" ? draft.splitMode : undefined,
        beneficiary_id:
          transaction.type === "LIQUIDATION"
            ? Number(draft.beneficiaryId)
            :
          transaction.type === "EXPENSE" && draft.splitMode === "owed"
            ? Number(draft.owedToId)
            : transaction.type === "EXPENSE" && draft.splitMode === "none"
              ? null
              : undefined,
      };

      if (shouldSendCustomSplits) {
        payload.splits_percent = customSplits.map((split) => ({
          user_id: Number(split.user_id),
          percent: Number(split.percent || 0),
        }));
      }

      await onSave(transaction.id, {
        ...payload,
      });
      showToast("Transaction updated.");
      handleCloseModal();
    } catch (saveError) {
      showToast(saveError.message || "Failed to update transaction.", {
        tone: "error",
      });
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
      showToast("Transaction deleted.");
      handleCloseModal();
    } catch (deleteError) {
      showToast(deleteError.message || "Failed to delete transaction.", {
        tone: "error",
      });
    }
  };

  const updateCustomSplitPercent = (userId, value) => {
    setCustomSplits((current) =>
      current.map((split) =>
        split.user_id === userId
          ? {
              ...split,
              percent: normalizeNumberInput(value),
            }
          : split
      )
    );
    setHasCustomSplitsTouched(true);
  };

  const rowContent = (
    <div className="grid grid-cols-12 items-center gap-1.5 text-[13px] md:grid-cols-[70px_130px_140px_1fr_100px_96px_84px] md:gap-2 md:text-sm">
      <span className="col-span-2 text-cream-100 tabular-nums font-mono md:col-auto">{dayLabel}</span>
      <span className="col-span-3 truncate text-cream-100 font-medium md:col-auto">{displayedPayerLabel}</span>
      <span className="col-span-4 truncate text-cream-100/80 md:hidden">
        <span className="inline-flex items-center gap-1.5">
          <CategoryIcon icon={categoryIcon} label={categoryLabel} className="h-3.5 w-3.5 text-cream-300" />
          <span className="truncate">{categoryLabel}</span>
        </span>
      </span>
      <span className="hidden truncate text-cream-100 md:block">
        <span className="inline-flex items-center gap-1.5">
          <CategoryIcon icon={categoryIcon} label={categoryLabel} />
          <span className="truncate">{categoryLabel}</span>
        </span>
      </span>
      <span className="hidden truncate text-cream-100/60 md:block">
        {noteLabel || notePlaceholder}
      </span>
      <span className="hidden truncate text-cream-100/60 md:block">{splitLabel}</span>
      <span
        className={`col-span-3 text-right font-mono tabular-nums font-semibold whitespace-nowrap md:col-auto ${amountClass}`}
      >
        {`${amountPrefix}${formatCurrency(transaction.amount)}`}
      </span>
      <div className="hidden justify-end md:flex">
        <button
          type="button"
                className="rounded-xl border border-obsidian-600 bg-obsidian-800 px-3 py-1.5 text-xs font-medium text-cream-200 transition-colors duration-150 hover:border-cream-500/35 hover:text-cream-100"
                onClick={handleOpenModal}
              >
                Edit
        </button>
      </div>
    </div>
  );

  const expandedContent = (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-cream-100/50 text-xs font-medium">Split:</span>
        <span className="text-cream-100">{splitLabel}</span>
      </div>
      <div className="flex items-start gap-2">
        <span className="shrink-0 text-cream-100/50 text-xs font-medium">Note:</span>
        <span className="min-w-0 break-words text-cream-100">{noteLabel || notePlaceholder}</span>
      </div>
    </div>
  );

  const handleRowKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleToggle();
    }
  };

  return (
    <div className="px-2.5 py-2 transition-colors duration-150 hover:bg-obsidian-900/70 md:px-3">
      <div
        role="button"
        tabIndex={0}
        className="w-full text-left cursor-pointer"
        onClick={handleToggle}
        onKeyDown={handleRowKeyDown}
        aria-expanded={isExpanded}
      >
        {rowContent}
      </div>
      {isExpanded ? (
        <div className="mt-2 flex items-start justify-between gap-3 text-xs md:hidden">
          <div className="min-w-0 flex-1">{expandedContent}</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-xl border border-obsidian-600 bg-obsidian-800 px-3 py-1.5 text-xs font-medium text-cream-200 transition-colors duration-150 hover:border-cream-500/35 hover:text-cream-100"
              onClick={handleOpenModal}
            >
              Edit
            </button>
          </div>
        </div>
      ) : null}
      {isModalOpen ? (
        <AppModal
          open={isModalOpen}
          onClose={handleCloseModal}
          title="Edit Transaction"
          subtitle={`Type: ${transaction.type === "LIQUIDATION" ? (isSettlementReceived ? "Settlement (received)" : "Settlement (paid)") : transaction.type}`}
          maxWidth="max-w-lg"
        >
          <div className="grid gap-3 text-sm">
            <div className="space-y-2">
              <FieldLabel htmlFor={modalIds.date}>Date</FieldLabel>
              <TextInput
                id={modalIds.date}
                type="date"
                value={draft.date}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor={modalIds.payer}>Paid by</FieldLabel>
              <SelectField
                id={modalIds.payer}
                className={`${fieldInputClassName(false)} appearance-none pr-9`}
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
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor={modalIds.category}>Category</FieldLabel>
              <SelectField
                id={modalIds.category}
                className={`${fieldInputClassName(false)} appearance-none pr-9`}
                value={draft.category}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
                disabled={!isCategoryRequired}
              >
                <option value="">{isCategoryRequired ? "Select category" : "Not required"}</option>
                {categoryOptions.map((option) => (
                  <option key={option.label} value={option.label}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
            </div>

            {transaction.type === "LIQUIDATION" ? (
              <div className="space-y-2">
                <FieldLabel htmlFor={modalIds.beneficiary}>Sent to</FieldLabel>
                <SelectField
                  id={modalIds.beneficiary}
                  className={`${fieldInputClassName(false)} appearance-none pr-9`}
                  value={draft.beneficiaryId}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      beneficiaryId: event.target.value,
                    }))
                  }
                >
                  <option value="">Select beneficiary</option>
                  {profiles
                    .filter((profile) => String(profile.id) !== String(draft.payerId))
                    .map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.display_name || profile.id}
                      </option>
                    ))}
                </SelectField>
              </div>
            ) : null}

            {transaction.type === "EXPENSE" ? (
              <div className="space-y-2">
                <FieldLabel htmlFor={modalIds.splitMode}>Split mode</FieldLabel>
                <SelectField
                  id={modalIds.splitMode}
                  className={`${fieldInputClassName(false)} appearance-none pr-9`}
                  value={draft.splitMode}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      splitMode: event.target.value,
                      owedToId: event.target.value === "owed" ? current.owedToId : "",
                    }))
                  }
                >
                  <option value="none">Personal</option>
                  <option value="owed">Owed</option>
                  <option value="custom">Custom</option>
                </SelectField>
              </div>
            ) : null}

            {transaction.type === "EXPENSE" && draft.splitMode === "owed" ? (
              <div className="space-y-2">
                <FieldLabel htmlFor={modalIds.owedTo}>Owed by</FieldLabel>
                <SelectField
                  id={modalIds.owedTo}
                  className={`${fieldInputClassName(false)} appearance-none pr-9`}
                  value={draft.owedToId}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      owedToId: event.target.value,
                    }))
                  }
                >
                  <option value="">Select partner</option>
                  {profiles
                    .filter((profile) => String(profile.id) !== String(draft.payerId))
                    .map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.display_name || profile.id}
                      </option>
                    ))}
                </SelectField>
              </div>
            ) : null}

            {transaction.type === "EXPENSE" && draft.splitMode === "custom" ? (
              <div className="space-y-2 rounded-xl border border-obsidian-600 bg-obsidian-900/60 p-3">
                <p className="text-xs font-medium text-cream-300">
                  Define each partner's share. Total must be 100%.
                </p>
                <div className="space-y-2">
                  {customSplits.map((split) => {
                    const profileLabel =
                      profiles.find((profile) => String(profile.id) === split.user_id)
                        ?.display_name || split.user_id;
                    return (
                      <div
                        key={split.user_id}
                        className="grid grid-cols-[minmax(0,1fr)_90px] items-center gap-2"
                      >
                        <span className="truncate text-xs font-medium text-cream-200">
                          {profileLabel}
                        </span>
                        <TextInput
                          className="px-2 py-1.5 text-right text-xs font-mono tabular-nums"
                          type="number"
                          step="0.1"
                          value={split.percent}
                          onChange={(event) =>
                            updateCustomSplitPercent(split.user_id, event.target.value)
                          }
                          aria-label={`Split percent for ${profileLabel}`}
                        />
                      </div>
                    );
                  })}
                </div>
                <p
                  className={`text-xs font-medium ${
                    hasCustomTotalError ? "text-coral-300" : "text-sage-300"
                  }`}
                >
                  Total: {customTotalPercent.toFixed(1)}%
                </p>
              </div>
            ) : null}

            <div className="space-y-2">
              <FieldLabel htmlFor={modalIds.amount}>Amount</FieldLabel>
              <TextInput
                id={modalIds.amount}
                className="text-left font-mono tabular-nums"
                placeholder="0.00"
                inputMode="decimal"
                value={draft.amount}
                onChange={(event) => {
                  const normalized = normalizeNumberInput(event.target.value);
                  setDraft((current) => ({ ...current, amount: normalized }));
                }}
              />
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor={modalIds.note}>Note</FieldLabel>
              <TextInput
                id={modalIds.note}
                className="placeholder:text-cream-300/60"
                placeholder="No note"
                value={draft.note}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          {error ? <p className="mt-4 text-xs text-coral-300 font-medium">{error}</p> : null}
          {isDeleteConfirm ? (
            <p aria-live="polite" className="mt-2 text-xs text-coral-300 font-medium">
              Click delete again to confirm.
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-obsidian-600 pt-3">
            <DangerButton
              type="button"
              className={isDeleteConfirm ? "bg-coral-500" : ""}
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting
                ? "Deleting..."
                : isDeleteConfirm
                  ? "Confirm Delete"
                  : "Delete"}
            </DangerButton>
            <div className="flex items-center gap-2">
              <SecondaryButton
                type="button"
                onClick={handleCloseModal}
                disabled={isSaving || isDeleting}
              >
                Cancel
              </SecondaryButton>
              <PrimaryButton
                type="button"
                className="px-4 py-2 text-xs"
                onClick={handleSave}
                disabled={isSaving || isDeleting}
              >
                {isSaving ? "Saving..." : "Save"}
              </PrimaryButton>
            </div>
          </div>
        </AppModal>
      ) : null}
    </div>
  );
}

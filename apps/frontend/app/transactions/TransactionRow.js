"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";

import SelectField from "../shared/SelectField";
import { formatCurrency, formatDayOfMonth } from "../shared/format";
import { normalizeNumberInput } from "../shared/inputs";
import { useToast } from "../shared/ToastProvider";

const amountClassFor = (type) => {
  if (type === "INCOME") {
    return "text-sage-400";
  }

  if (type === "EXPENSE") {
    return "text-coral-400";
  }

  return "text-cream-50";
};

const ModalPortal = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  return mounted ? createPortal(children, document.body) : null;
};

const buildDefaultCustomSplits = (profiles) => {
  const validProfiles = Array.isArray(profiles)
    ? profiles.filter((profile) => profile?.id)
    : [];

  if (validProfiles.length === 0) {
    return [];
  }

  const splits = validProfiles.map((profile) => ({
    user_id: String(profile.id),
    percent: String(Math.round(Number(profile.default_split || 0) * 1000) / 10),
  }));

  const total = splits.reduce((sum, split) => sum + Number(split.percent || 0), 0);

  if (Math.abs(total - 100) <= 0.01 && !splits.some((split) => Number(split.percent) <= 0)) {
    return splits;
  }

  const equalShare = Math.round((100 / validProfiles.length) * 10) / 10;
  return validProfiles.map((profile) => ({
    user_id: String(profile.id),
    percent: String(equalShare),
  }));
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

  const amountClass = amountClassFor(transaction.type);
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
  const categoryLabel = transaction.category || "—";
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
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

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
        setError("Select who receives this liquidation.");
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
    <div className="grid grid-cols-[52px_110px_1fr_86px] items-center gap-2 text-sm md:grid-cols-[70px_130px_140px_1fr_100px_96px_84px]">
      <span className="text-cream-100 tabular-nums font-mono">{dayLabel}</span>
      <span className="truncate text-cream-100 font-medium">{payerLabel}</span>
      <span className="truncate text-cream-100/60 md:hidden">
        {noteLabel || notePlaceholder}
      </span>
      <span className="hidden truncate text-cream-100 md:block">{categoryLabel}</span>
      <span className="hidden truncate text-cream-100/60 md:block">
        {noteLabel || notePlaceholder}
      </span>
      <span className="hidden truncate text-cream-100/60 md:block">{splitLabel}</span>
      <span className={`text-right font-mono tabular-nums font-semibold ${amountClass}`}>
        {formatCurrency(transaction.amount)}
      </span>
      <div className="hidden justify-end md:flex">
        <button
          type="button"
          className="rounded-lg border border-obsidian-600 bg-obsidian-800 px-3 py-1.5 text-xs font-medium text-cream-200 transition-colors duration-150 hover:border-cream-500/35 hover:text-cream-100"
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
        <span className="text-cream-100/50 text-xs font-medium">Category:</span>
        <span className="text-cream-100">{categoryLabel}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-cream-100/50 text-xs font-medium">Split:</span>
        <span className="text-cream-100">{splitLabel}</span>
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
    <div className="px-4 py-4 transition-colors duration-150 hover:bg-obsidian-900/70">
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
               className="rounded-lg border border-obsidian-600 bg-obsidian-800 px-3 py-1.5 text-xs font-medium text-cream-200 transition-colors duration-150 hover:border-cream-500/35 hover:text-cream-100"
              onClick={handleOpenModal}
            >
              Edit
            </button>
          </div>
        </div>
      ) : null}
      {isModalOpen ? (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-cream-50/50 p-4 animate-fade-in">
            <div className="animate-scale-in w-full max-w-lg space-y-4 rounded-3xl border border-obsidian-600/90 bg-obsidian-800 p-6 text-cream-50">
              <div className="space-y-1">
                <h3 className="text-xl font-display font-semibold tracking-tight">Edit Transaction</h3>
                <p className="text-xs text-cream-100/60 font-medium">Type: {transaction.type}</p>
              </div>
               <div className="grid gap-3 text-sm">
                 <label className="space-y-2 text-xs font-medium text-cream-200 tracking-wide">
                   Date
                   <input
                       className="w-full rounded-lg border border-obsidian-600 bg-obsidian-800 px-3 py-2 text-sm text-cream-100 transition-colors duration-150 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/20"
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
                 <label className="space-y-2 text-xs font-medium text-cream-200 tracking-wide">
                   Paid by
                   <SelectField
                       className="w-full appearance-none rounded-lg border border-obsidian-600 bg-obsidian-800 px-3 py-2 pr-9 text-sm text-cream-100 transition-colors duration-150 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/20"
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
                 <label className="space-y-2 text-xs font-medium text-cream-200 tracking-wide">
                   Category
                   <SelectField
                       className="w-full appearance-none rounded-lg border border-obsidian-600 bg-obsidian-800 px-3 py-2 pr-9 text-sm text-cream-100 transition-colors duration-150 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/20"
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
                  {transaction.type === "LIQUIDATION" ? (
                    <label className="space-y-2 text-xs font-medium text-cream-200 tracking-wide">
                      Sent to
                      <SelectField
                          className="w-full appearance-none rounded-lg border border-obsidian-600 bg-obsidian-800 px-3 py-2 pr-9 text-sm text-cream-100 transition-colors duration-150 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/20"
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
                    </label>
                  ) : null}
                  {transaction.type === "EXPENSE" ? (
                    <label className="space-y-2 text-xs font-medium text-cream-200 tracking-wide">
                      Split mode
                     <SelectField
                         className="w-full appearance-none rounded-lg border border-obsidian-600 bg-obsidian-800 px-3 py-2 pr-9 text-sm text-cream-100 transition-colors duration-150 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/20"
                       value={draft.splitMode}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            splitMode: event.target.value,
                            owedToId:
                              event.target.value === "owed"
                                ? current.owedToId
                                : "",
                          }))
                        }
                      >
                        <option value="none">Personal</option>
                        <option value="owed">Owed</option>
                        <option value="custom">Custom</option>
                      </SelectField>
                    </label>
                  ) : null}
                  {transaction.type === "EXPENSE" && draft.splitMode === "owed" ? (
                   <label className="space-y-2 text-xs font-medium text-cream-200 tracking-wide">
                     Owed by
                     <SelectField
                         className="w-full appearance-none rounded-lg border border-obsidian-600 bg-obsidian-800 px-3 py-2 pr-9 text-sm text-cream-100 transition-colors duration-150 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/20"
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
                          .filter(
                            (profile) => String(profile.id) !== String(draft.payerId)
                          )
                          .map((profile) => (
                            <option key={profile.id} value={profile.id}>
                              {profile.display_name || profile.id}
                           </option>
                         ))}
                     </SelectField>
                    </label>
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
                              <input
                                className="w-full rounded-lg border border-obsidian-600 bg-obsidian-800 px-2 py-1.5 text-right text-xs font-mono tabular-nums text-cream-100 transition-colors duration-150 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/20"
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
                          hasCustomTotalError ? "text-coral-300" : "text-cream-300"
                        }`}
                      >
                        Total: {customTotalPercent.toFixed(1)}%
                      </p>
                    </div>
                  ) : null}
                  <label className="space-y-2 text-xs font-medium text-cream-200 tracking-wide">
                    Amount
                    <input
                      className="w-full rounded-lg border border-obsidian-600 bg-obsidian-800 px-3 py-2 text-left text-sm text-cream-100 font-mono tabular-nums transition-colors duration-150 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/20"
                     placeholder="0.00"
                     inputMode="decimal"
                     value={draft.amount}
                     onChange={(event) => {
                       const normalized = normalizeNumberInput(event.target.value);
                       setDraft((current) => ({ ...current, amount: normalized }));
                     }}
                   />
                 </label>
                 <label className="space-y-2 text-xs font-medium text-cream-200 tracking-wide">
                   Note
                   <input
                       className="w-full rounded-lg border border-obsidian-600 bg-obsidian-800 px-3 py-2 text-sm text-cream-100 placeholder:text-cream-300/60 transition-colors duration-150 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/20"
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

              {error ? <p className="text-xs text-coral-300 font-medium">{error}</p> : null}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors duration-150 ${
                    isDeleteConfirm
                      ? "bg-coral-500 text-white"
                      : "bg-coral-500/85 text-white hover:bg-coral-500"
                  }`}
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting
                    ? "Deleting…"
                    : isDeleteConfirm
                      ? "Confirm Delete"
                      : "Delete"}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-obsidian-600 bg-obsidian-800 px-4 py-2 text-xs font-medium text-cream-200 transition-colors duration-150 hover:border-cream-500/35 hover:text-cream-100"
                    onClick={handleCloseModal}
                    disabled={isSaving || isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-cream-500/40 bg-cream-500 px-4 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-cream-600"
                    onClick={handleSave}
                    disabled={isSaving || isDeleting}
                  >
                    {isSaving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}
    </div>
  );
}

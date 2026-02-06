"use client";

import { useEffect, useMemo, useState } from "react";

import AppModal from "../shared/AppModal";
import SelectField from "../shared/SelectField";
import { buildDefaultCustomSplits } from "../shared/domain/splits";
import { formatCurrency, formatDayOfMonth } from "../shared/format";
import { normalizeNumberInput } from "../shared/inputs";
import { useToast } from "../shared/ToastProvider";

const iconKeyFromValue = (icon, label) => {
  const value = String(icon || "").trim().toLowerCase();
  const labelValue = String(label || "").trim().toLowerCase();

  if (
    [
      "cart",
      "home",
      "bolt",
      "car",
      "health",
      "media",
      "bag",
      "box",
      "briefcase",
      "gift",
      "paw",
      "book",
      "shield",
      "smile",
      "receipt",
      "tag",
    ].includes(value)
  ) {
    return value;
  }

  const emojiMap = {
    "🛒": "cart",
    "🏠": "home",
    "💡": "bolt",
    "🍽️": "cart",
    "🚗": "car",
    "🩺": "health",
    "🎬": "media",
    "✈️": "car",
    "🛍️": "bag",
    "📦": "box",
    "💼": "briefcase",
    "🧑‍💻": "briefcase",
    "🎁": "gift",
    "🐾": "paw",
    "🎓": "book",
    "🛡️": "shield",
    "🧹": "home",
    "🧸": "smile",
    "🧾": "receipt",
    "🧩": "tag",
    "💕": "gift",
    "🏞️": "car",
  };

  if (emojiMap[icon]) {
    return emojiMap[icon];
  }

  if (labelValue.includes("rent") || labelValue.includes("home")) return "home";
  if (labelValue.includes("groc") || labelValue.includes("food") || labelValue.includes("restaurant")) return "cart";
  if (labelValue.includes("util") || labelValue.includes("bill")) return "bolt";
  if (labelValue.includes("transport") || labelValue.includes("travel") || labelValue.includes("trip")) return "car";
  if (labelValue.includes("health") || labelValue.includes("medical")) return "health";
  if (labelValue.includes("entertain")) return "media";
  if (labelValue.includes("shop")) return "bag";
  if (labelValue.includes("subscr")) return "box";
  if (labelValue.includes("salary") || labelValue.includes("freelance")) return "briefcase";
  if (labelValue.includes("gift") || labelValue.includes("date night")) return "gift";
  if (labelValue.includes("pet")) return "paw";
  if (labelValue.includes("education")) return "book";
  if (labelValue.includes("insurance")) return "shield";
  if (labelValue.includes("kids")) return "smile";
  if (labelValue.includes("tax")) return "receipt";
  return "tag";
};

function CategoryIcon({ icon, label, className = "h-4 w-4 text-cream-300" }) {
  const key = iconKeyFromValue(icon, label);
  let path = "M3 10l7-7h7v7l-7 7-7-7zm9-3h.01";

  if (key === "home") path = "M3 8.75L10 3l7 5.75V17H3V8.75zM7.5 17v-4h5v4";
  if (key === "cart") path = "M3 4h2l1.4 8.2h8.3L16 6H6.2M8 16a1 1 0 100-2 1 1 0 000 2zm6 0a1 1 0 100-2 1 1 0 000 2z";
  if (key === "bolt") path = "M11 2L5 10h4l-1 8 7-10h-4l1-6z";
  if (key === "car") path = "M4 11l1.5-4h9L16 11v4h-1.5v-1.5h-9V15H4v-4zm2 .5h8";
  if (key === "health") path = "M10 4v12M4 10h12";
  if (key === "media") path = "M4 5h12v10H4zM8 8l4 2-4 2V8z";
  if (key === "bag") path = "M5 7h10l-1 10H6L5 7zm3 0V5a2 2 0 114 0v2";
  if (key === "box") path = "M4 7l6-3 6 3-6 3-6-3zm0 0v6l6 3 6-3V7";
  if (key === "briefcase") path = "M3 7h14v9H3V7zm5-2h4v2H8V5z";
  if (key === "gift") path = "M4 8h12v8H4V8zm0-2h12v2H4V6zm6 0v10M8 6s-2-3 0-3c1.5 0 2 3 2 3M12 6s2-3 0-3c-1.5 0-2 3-2 3";
  if (key === "paw") path = "M7 8a1.2 1.2 0 110-2.4A1.2 1.2 0 017 8zm6 0a1.2 1.2 0 110-2.4A1.2 1.2 0 0113 8zM6 12.5c0-1.7 1.8-2.5 4-2.5s4 .8 4 2.5S12.2 15 10 15s-4-.8-4-2.5z";
  if (key === "book") path = "M4 4h8a3 3 0 013 3v9H7a3 3 0 00-3 3V4zm0 0v12";
  if (key === "shield") path = "M10 3l6 2v4c0 4.2-2.6 6.6-6 8-3.4-1.4-6-3.8-6-8V5l6-2z";
  if (key === "smile") path = "M10 17a7 7 0 100-14 7 7 0 000 14zm-3-5c.6.8 1.7 1.2 3 1.2s2.4-.4 3-1.2M7.5 8.5h.01M12.5 8.5h.01";
  if (key === "receipt") path = "M6 3h8v14l-2-1.2L10 17l-2-1.2L6 17V3zm2 4h4M8 9h4M8 11h3";

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
    <div className="grid grid-cols-12 items-center gap-1.5 text-[13px] md:grid-cols-[70px_130px_140px_1fr_100px_96px_84px] md:gap-2 md:text-sm">
      <span className="col-span-2 text-cream-100 tabular-nums font-mono md:col-auto">{dayLabel}</span>
      <span className="col-span-3 truncate text-cream-100 font-medium md:col-auto">{payerLabel}</span>
      <span className="col-span-4 truncate text-cream-100/60 md:hidden">
        {noteLabel || notePlaceholder}
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
      <span className={`col-span-3 text-right font-mono tabular-nums font-semibold md:col-auto ${amountClass}`}>
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
        <span className="inline-flex items-center gap-1.5 text-cream-100">
          <CategoryIcon icon={categoryIcon} label={categoryLabel} />
          <span>{categoryLabel}</span>
        </span>
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
               className="rounded-lg border border-obsidian-600 bg-obsidian-800 px-3 py-1.5 text-xs font-medium text-cream-200 transition-colors duration-150 hover:border-cream-500/35 hover:text-cream-100"
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
          subtitle={`Type: ${transaction.type}`}
          maxWidth="max-w-lg"
        >
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

               {error ? <p className="mt-4 text-xs text-coral-300 font-medium">{error}</p> : null}
               <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-obsidian-600 pt-3">
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
        </AppModal>
      ) : null}
    </div>
  );
}

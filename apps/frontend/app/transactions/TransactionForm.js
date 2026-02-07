"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  FieldLabel,
  PrimaryButton,
  TextInput,
  fieldInputClassName,
} from "../shared/FormPrimitives";
import SelectField from "../shared/SelectField";
import { useToast } from "../shared/ToastProvider";
import { normalizeNumberInput } from "../shared/inputs";
import { apiPost } from "../shared/api";
import { buildDefaultPercentSplits } from "../shared/domain/splits";
import { getCategoryIconPath } from "../shared/categoryIcons";
import { useCategories } from "../shared/hooks/useCategories";
import { useProfiles } from "../shared/hooks/useProfiles";
import { categoryOptions } from "../shared/transactions";
import { notifyTransactionsUpdated } from "./transactionsCache";

const initialSplit = { user_id: "", percent: "" };

function CategoryIcon({ icon: iconProp, label, active }) {
  const path = getCategoryIconPath(iconProp, label);
  const className = active ? "h-4 w-4 text-cream-100" : "h-4 w-4 text-cream-300";

  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function TransactionForm() {
  const searchParams = useSearchParams();
  const amountInputRef = useRef(null);
  const [payerId, setPayerId] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [type, setType] = useState("EXPENSE");
  const [splitMode, setSplitMode] = useState("custom");
  const [splits, setSplits] = useState([initialSplit]);
  const [beneficiaryId, setBeneficiaryId] = useState("");
  const [owedToId, setOwedToId] = useState("");
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false);
  const [amountFormatError, setAmountFormatError] = useState(false);
  const [hasAppliedPrefill, setHasAppliedPrefill] = useState(false);
  const [touched, setTouched] = useState({
    payer: false,
    amount: false,
    date: false,
    beneficiary: false,
    category: false,
  });
  const { showToast } = useToast();
  const { data: profiles } = useProfiles();
  const { data: categories } = useCategories({ fallback: categoryOptions });

  const sectionClassName = "space-y-2";
  const panelClassName =
    "rounded-2xl border border-obsidian-600/90 bg-obsidian-800 p-4 md:p-5";

  useEffect(() => {
    amountInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (profiles.length === 0) {
      return;
    }

    setSplits(buildDefaultPercentSplits(profiles));
  }, [profiles]);

  useEffect(() => {
    if (type === "INCOME" || type === "LIQUIDATION") {
      setSplitMode("none");
    }

    if (type !== "LIQUIDATION") {
      setBeneficiaryId("");
    }

    if (type !== "EXPENSE" || splitMode !== "owed") {
      setOwedToId("");
    }

    if (type === "INCOME") {
      setCategory("");
      setTouched((current) => ({ ...current, category: false }));
    }

    if (splitMode !== "owed") {
      setTouched((current) => ({ ...current, beneficiary: false }));
    }
  }, [type, splitMode]);

  useEffect(() => {
    if (splitMode === "owed" && owedToId && owedToId === payerId) {
      setOwedToId("");
    }
  }, [splitMode, owedToId, payerId]);

  useEffect(() => {
    if (hasAppliedPrefill || profiles.length === 0) {
      return;
    }

    const prefillType = String(searchParams.get("type") || "").toUpperCase();
    const prefillPayerId = String(searchParams.get("payer_id") || "");
    const prefillBeneficiaryId = String(searchParams.get("beneficiary_id") || "");
    const prefillAmount = normalizeNumberInput(searchParams.get("amount") || "");
    const prefillNote = searchParams.get("note") || "";

    const profileIds = new Set(profiles.map((profile) => String(profile.id)));

    if (prefillType === "LIQUIDATION") {
      setType("LIQUIDATION");
      setSplitMode("none");
    }

    if (profileIds.has(prefillPayerId)) {
      setPayerId(prefillPayerId);
    }

    if (profileIds.has(prefillBeneficiaryId)) {
      setBeneficiaryId(prefillBeneficiaryId);
    }

    if (prefillAmount) {
      setAmount(prefillAmount);
      setTouched((current) => ({ ...current, amount: true }));
    }

    if (prefillNote.trim()) {
      setNote(prefillNote.trim());
    }

    setHasAppliedPrefill(true);
  }, [hasAppliedPrefill, profiles, searchParams]);

  const totalPercent = useMemo(() => {
    return splits.reduce((sum, split) => sum + Number(split.percent || 0), 0);
  }, [splits]);

  const hasSplitInput = useMemo(() => {
    return splits.some((split) => split.user_id || split.percent);
  }, [splits]);

  const hasInvalidSplit = useMemo(() => {
    return splits.some(
      (split) => !split.user_id || Number(split.percent || 0) <= 0
    );
  }, [splits]);

  const hasSplitTotalError = Math.abs(totalPercent - 100) > 0.01;
  const isPayerMissing = !payerId;
  const amountNumber = Number(amount);
  const isAmountMissing =
    !amount || Number.isNaN(amountNumber) || amountNumber <= 0;
  const isDateMissing = !date;
  const isCategoryMissing = type === "EXPENSE" && !category;
  const isBeneficiaryMissing = type === "LIQUIDATION" && !beneficiaryId;
  const isOwedMissing =
    splitMode === "owed" &&
    type === "EXPENSE" &&
    (!owedToId || owedToId === payerId);

  const showPayerError = (hasTriedSubmit || touched.payer) && isPayerMissing;
  const showAmountError = (hasTriedSubmit || touched.amount) && isAmountMissing;
  const showAmountFormatError =
    (hasTriedSubmit || touched.amount) && amountFormatError;
  const showDateError = (hasTriedSubmit || touched.date) && isDateMissing;
  const showCategoryError =
    (hasTriedSubmit || touched.category) && isCategoryMissing;
  const showBeneficiaryError =
    (hasTriedSubmit || touched.beneficiary) && isBeneficiaryMissing;
  const showOwedError =
    (hasTriedSubmit || touched.beneficiary) && isOwedMissing;
  const showSplitError =
    type === "EXPENSE" &&
    splitMode === "custom" &&
    (hasInvalidSplit || hasSplitTotalError) &&
    (hasTriedSubmit || hasSplitInput);

  const canSubmit = useMemo(() => {
    if (isPayerMissing || isAmountMissing || isDateMissing || amountFormatError) {
      return false;
    }

    if (type === "EXPENSE" && isCategoryMissing) {
      return false;
    }

    if (type === "INCOME") {
      return true;
    }

    if (type === "LIQUIDATION") {
      return Boolean(beneficiaryId);
    }

    if (type === "EXPENSE" && splitMode === "owed") {
      return Boolean(owedToId) && owedToId !== payerId;
    }

    if (splitMode === "none") {
      return true;
    }

    return !hasInvalidSplit && !hasSplitTotalError;
  }, [
    isPayerMissing,
    isAmountMissing,
    isDateMissing,
    isCategoryMissing,
    amountFormatError,
    beneficiaryId,
    splitMode,
    hasInvalidSplit,
    hasSplitTotalError,
    type,
    owedToId,
  ]);

  const updateSplit = (index, field, value) => {
    setSplits((current) =>
      current.map((split, splitIndex) =>
        splitIndex === index ? { ...split, [field]: value } : split
      )
    );
  };

  const addSplit = () => {
    setSplits((current) => [...current, { ...initialSplit }]);
  };

  const removeSplit = (index) => {
    setSplits((current) => current.filter((_, splitIndex) => splitIndex !== index));
  };

  const handleAmountChange = (event) => {
    const rawValue = event.target.value;
    const normalizedValue = normalizeNumberInput(rawValue);

    setAmount(normalizedValue);
    setTouched((current) => ({ ...current, amount: true }));
    setAmountFormatError(rawValue !== normalizedValue);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setHasTriedSubmit(true);

    if (!canSubmit) {
      return;
    }

    const payerValue = payerId ? Number(payerId) : null;
    const beneficiaryValue = beneficiaryId ? Number(beneficiaryId) : null;
    const owedValue = owedToId ? Number(owedToId) : null;

    const payload = {
      payer_id: type === "INCOME" ? null : payerValue,
      amount: Number(amount),
      category: type === "INCOME" ? null : category.trim() || null,
      date,
      note: note.trim() || null,
      type,
      split_mode: type === "INCOME" || type === "LIQUIDATION" ? "none" : splitMode,
      beneficiary_id:
        type === "LIQUIDATION"
          ? beneficiaryValue
          : type === "INCOME"
            ? payerValue
            : splitMode === "owed"
              ? owedValue
              : null,
      splits_percent:
        type === "INCOME" || type === "LIQUIDATION" || splitMode !== "custom"
          ? []
          : splits.map((split) => ({
              user_id: split.user_id ? Number(split.user_id) : null,
              percent: Number(split.percent || 0),
            })),
    };

    try {
      await apiPost("/transactions", payload, "Failed to save transaction");

      showToast("Transaction saved.");
      notifyTransactionsUpdated({
        month: payload.date ? String(payload.date).slice(0, 7) : "",
      });
      setAmount("");
      setCategory("");
      setNote("");
      setSplitMode(type === "INCOME" || type === "LIQUIDATION" ? "none" : "custom");
      setBeneficiaryId("");
      setOwedToId("");
      setSplits(
        profiles.length ? buildDefaultPercentSplits(profiles) : [initialSplit]
      );
      setHasTriedSubmit(false);
      setAmountFormatError(false);
      setTouched({
        payer: false,
        amount: false,
        date: false,
        beneficiary: false,
        category: false,
      });
    } catch (error) {
      showToast(error.message, { tone: "error" });
    }
  };

  const inputIds = {
    amount: "transaction-amount",
    date: "transaction-date",
    payer: "transaction-payer",
    note: "transaction-note",
    beneficiary: "transaction-beneficiary",
    owedTo: "transaction-owed-to",
  };

  return (
    <form
      className="animate-fade-in space-y-4"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <h2 className="text-sm font-display font-semibold tracking-tight text-cream-100">
          Add transaction
        </h2>
        <p className="text-xs font-medium text-cream-300">Fields marked * are required</p>
      </div>

      <div className={`${panelClassName} space-y-5`}>
        <div className="space-y-2 text-center">
          <FieldLabel htmlFor={inputIds.amount} required>
            Amount
          </FieldLabel>
          <div className="mx-auto max-w-xs">
            <input
              id={inputIds.amount}
              ref={amountInputRef}
              className="w-full border-0 bg-transparent px-2 py-1 text-center text-5xl font-semibold tabular-nums text-cream-50 placeholder:text-cream-300/50 focus:outline-none"
              placeholder="0.00"
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.]?[0-9]*"
              value={amount}
              onChange={handleAmountChange}
              aria-invalid={showAmountError || showAmountFormatError}
              aria-describedby={
                showAmountFormatError || showAmountError ? "transaction-amount-error" : undefined
              }
            />
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cream-400">EUR</p>
          </div>
          {showAmountFormatError ? (
            <p id="transaction-amount-error" aria-live="polite" className="text-xs text-coral-300 font-medium">
              Only numbers and a decimal point are allowed.
            </p>
          ) : showAmountError ? (
            <p id="transaction-amount-error" aria-live="polite" className="text-xs text-coral-300 font-medium">
              Enter an amount above 0.
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <div className="space-y-2">
            <FieldLabel htmlFor={inputIds.date} required>
              Date
            </FieldLabel>
            <TextInput
              id={inputIds.date}
              hasError={showDateError}
              className="h-12"
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setTouched((current) => ({ ...current, date: true }));
              }}
              aria-invalid={showDateError}
              aria-describedby={showDateError ? "transaction-date-error" : undefined}
            />
            {showDateError ? (
              <p id="transaction-date-error" aria-live="polite" className="text-xs text-coral-300 font-medium">
                Choose a date.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <FieldLabel required>Type</FieldLabel>
            <div className="grid grid-cols-3 gap-1 rounded-xl border border-obsidian-600 bg-obsidian-900 p-1">
              {["EXPENSE", "INCOME", "LIQUIDATION"].map((value) => {
                const isActive = type === value;
                return (
                  <button
                    key={value}
                    type="button"
                    className={`min-h-11 min-w-0 truncate rounded-lg px-2 py-2 text-[11px] font-semibold tracking-wide text-center transition-colors sm:px-3 sm:text-xs ${
                      isActive
                        ? value === "EXPENSE"
                          ? "bg-coral-500/30 text-coral-100"
                          : value === "INCOME"
                            ? "bg-sage-600/30 text-sage-100"
                            : "bg-cream-500/20 text-cream-100"
                        : "text-cream-300 hover:bg-obsidian-800"
                    }`}
                    onClick={() => setType(value)}
                  >
                    {value === "LIQUIDATION"
                      ? "Settlement"
                      : value[0] + value.slice(1).toLowerCase()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className={`${panelClassName} grid gap-4`}>
        <div className={sectionClassName}>
          <FieldLabel htmlFor={inputIds.payer} required>
            {type === "INCOME" ? "Recipient" : "Paid by"}
          </FieldLabel>
          <SelectField
            className={`${fieldInputClassName(showPayerError)} appearance-none pr-9`}
            id={inputIds.payer}
            value={payerId}
            onChange={(event) => {
              setPayerId(event.target.value);
              setTouched((current) => ({ ...current, payer: true }));
            }}
            aria-invalid={showPayerError}
            aria-describedby={showPayerError ? "transaction-payer-error" : undefined}
          >
            <option value="">
              {type === "INCOME" ? "Select recipient" : "Select payer"}
            </option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.display_name || profile.id}
              </option>
            ))}
          </SelectField>
          {showPayerError ? (
            <p id="transaction-payer-error" aria-live="polite" className="text-xs text-coral-300 font-medium">
              {type === "INCOME" ? "Select a recipient." : "Select who paid."}
            </p>
          ) : null}
        </div>

        <div className={sectionClassName}>
          <FieldLabel required={type !== "INCOME"}>
            Category
          </FieldLabel>
          {type === "INCOME" ? (
            <div className="min-h-11 rounded-xl border border-obsidian-600 bg-obsidian-900 px-3 py-2 text-sm text-cream-300">
              Not required for income
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
              {categories.map((option) => {
                const isActive = category === option.label;
                return (
                  <button
                    key={option.id || option.label}
                    type="button"
                    className={`flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-center text-[11px] font-semibold ${
                      isActive
                        ? "border-2 border-cream-500 bg-cream-500/25 text-cream-50"
                        : "border-2 border-obsidian-600 bg-obsidian-900 text-cream-200"
                    }`}
                    onClick={() => {
                      setCategory(option.label);
                      setTouched((current) => ({ ...current, category: true }));
                    }}
                    aria-pressed={isActive}
                  >
                    <CategoryIcon icon={option.icon} label={option.label} active={isActive} />
                    <span className="truncate w-full">{option.label}</span>
                  </button>
                );
              })}
            </div>
          )}
          {showCategoryError ? (
            <p className="mt-2 text-xs text-coral-300 font-medium">Select a category.</p>
          ) : null}
        </div>
      </div>

      <div className={`${panelClassName} ${sectionClassName}`}>
        <FieldLabel htmlFor={inputIds.note}>Note</FieldLabel>
        <TextInput
          id={inputIds.note}
          className="placeholder:text-cream-300/70"
          placeholder="Optional note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
      <div className={`${panelClassName} space-y-3`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <FieldLabel>Split mode</FieldLabel>
          <div className="grid w-full grid-cols-3 gap-1 rounded-xl border border-obsidian-600 bg-obsidian-900 p-1 text-xs sm:w-auto sm:min-w-[264px]">
            <button
              className={`rounded-lg px-2.5 py-2 font-medium whitespace-nowrap transition-colors duration-200 disabled:opacity-50 ${
                splitMode === "none"
                  ? "bg-cream-500/20 text-cream-100"
                  : "text-cream-300 hover:bg-obsidian-800"
              }`}
              type="button"
              onClick={() => setSplitMode("none")}
              disabled={type === "INCOME" || type === "LIQUIDATION"}
            >
              Personal
            </button>
            <button
              className={`rounded-lg px-2.5 py-2 font-medium whitespace-nowrap transition-colors duration-200 disabled:opacity-50 ${
                splitMode === "owed"
                  ? "bg-cream-500/20 text-cream-100"
                  : "text-cream-300 hover:bg-obsidian-800"
              }`}
              type="button"
              onClick={() => setSplitMode("owed")}
              disabled={type === "INCOME" || type === "LIQUIDATION"}
            >
              Owed
            </button>
            <button
              className={`rounded-lg px-2.5 py-2 font-medium whitespace-nowrap transition-colors duration-200 disabled:opacity-50 ${
                splitMode === "custom"
                  ? "bg-cream-500/20 text-cream-100"
                  : "text-cream-300 hover:bg-obsidian-800"
              }`}
              type="button"
              onClick={() => setSplitMode("custom")}
              disabled={type === "INCOME" || type === "LIQUIDATION"}
            >
              Custom
            </button>
          </div>
        </div>
        {type === "INCOME" ? (
          <p className="text-xs text-cream-300 font-medium">
            Income is always assigned 100% to the recipient.
          </p>
        ) : null}
        {type === "LIQUIDATION" ? (
          <div className="space-y-2">
            <p className="text-xs text-cream-300 font-medium">
              Settlements always send 100% to the other partner.
            </p>
            <FieldLabel htmlFor={inputIds.beneficiary} required>
              Recipient
            </FieldLabel>
            <SelectField
              className={`${fieldInputClassName(showBeneficiaryError)} appearance-none pr-9`}
              id={inputIds.beneficiary}
              value={beneficiaryId}
              onChange={(event) => {
                setBeneficiaryId(event.target.value);
                setTouched((current) => ({ ...current, beneficiary: true }));
              }}
              aria-invalid={showBeneficiaryError}
              aria-describedby={showBeneficiaryError ? "transaction-beneficiary-error" : undefined}
            >
              <option value="">Select recipient</option>
              {profiles
                .filter((profile) => profile.id !== payerId)
                .map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.display_name || profile.id}
                  </option>
                ))}
            </SelectField>
            {showBeneficiaryError ? (
              <p
                id="transaction-beneficiary-error"
                aria-live="polite"
                className="text-xs text-coral-300 font-medium"
              >
                Select a recipient.
              </p>
            ) : null}
          </div>
        ) : null}
        {splitMode === "owed" && type === "EXPENSE" ? (
          <div className="space-y-2">
            <p className="text-xs text-cream-300 font-medium">
              Owed expenses assign 100% to the other partner.
            </p>
            <FieldLabel htmlFor={inputIds.owedTo} required>
              Owed by
            </FieldLabel>
            <SelectField
              className={`${fieldInputClassName(showOwedError)} appearance-none pr-9`}
              id={inputIds.owedTo}
              value={owedToId}
              onChange={(event) => {
                setOwedToId(event.target.value);
                setTouched((current) => ({ ...current, beneficiary: true }));
              }}
              aria-invalid={showOwedError}
              aria-describedby={showOwedError ? "transaction-owed-error" : undefined}
            >
              <option value="">Select partner</option>
              {profiles
                .filter((profile) => profile.id !== payerId)
                .map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.display_name || profile.id}
                  </option>
                ))}
            </SelectField>
            {showOwedError ? (
              <p id="transaction-owed-error" aria-live="polite" className="text-xs text-coral-300 font-medium">
                Select the other partner who owes you.
              </p>
            ) : null}
          </div>
        ) : null}
        {splitMode === "custom" && type === "EXPENSE" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <FieldLabel>Splits</FieldLabel>
              <button
                className="rounded-lg border border-obsidian-600 px-2.5 py-1 text-xs font-medium text-cream-300 hover:border-cream-500/35 hover:text-cream-100"
                type="button"
                onClick={addSplit}
              >
                + Add split
              </button>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-[minmax(0,1fr)_68px_36px] gap-2 px-2.5 text-[11px] font-medium text-cream-400 sm:grid-cols-[minmax(0,1fr)_80px_44px] sm:px-3 sm:text-xs">
                <span>
                  User<span className="text-coral-400"> *</span>
                </span>
                <span>
                  Percent<span className="text-coral-400"> *</span>
                </span>
                <span className="text-right">Remove</span>
              </div>
              <div className="divide-y divide-obsidian-600 rounded-2xl border border-obsidian-600/80 bg-obsidian-800">
                {splits.map((split, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[minmax(0,1fr)_68px_36px] items-center gap-2 px-2.5 py-3 sm:grid-cols-[minmax(0,1fr)_80px_44px] sm:px-3"
                  >
                    <SelectField
                      className="w-full min-w-0 appearance-none rounded-lg border border-obsidian-600 bg-obsidian-800 px-3 py-2 pr-9 text-sm text-cream-100 transition-colors duration-200 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/20"
                      value={split.user_id}
                      onChange={(event) =>
                        updateSplit(index, "user_id", event.target.value)
                      }
                      aria-label="Split user"
                    >
                      <option value="">Select user</option>
                      {profiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.display_name || profile.id}
                        </option>
                      ))}
                    </SelectField>
                    <input
                      className="w-full rounded-lg border border-obsidian-600 bg-obsidian-800 px-2 py-2 text-right text-sm font-mono text-cream-100 transition-colors duration-200 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/20"
                      placeholder="%"
                      type="number"
                      step="0.1"
                      value={split.percent}
                      onChange={(event) =>
                        updateSplit(
                          index,
                          "percent",
                          normalizeNumberInput(event.target.value)
                        )
                      }
                      aria-label="Split percent"
                    />
                    {splits.length > 1 ? (
                      <button
                        className="flex h-7 w-7 items-center justify-center justify-self-end rounded-lg bg-obsidian-900 text-coral-300 transition-colors duration-200 hover:bg-coral-100/20 sm:h-8 sm:w-8"
                        type="button"
                        onClick={() => removeSplit(index)}
                        aria-label="Remove split"
                      >
                        ×
                      </button>
                    ) : (
                      <div className="text-right text-xs text-cream-400">—</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="text-xs text-cream-300 font-medium">
              <span className={hasSplitTotalError ? "text-coral-300" : "text-sage-300"}>
                Total: {totalPercent.toFixed(1)}%
              </span>
            </div>
            {showSplitError ? (
              <p className="text-xs text-coral-300 font-medium">
                Select a user and percent for each split. Total must be 100%.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className={sectionClassName}>
        <PrimaryButton
          className="w-full"
          type="submit"
          disabled={!canSubmit}
        >
          Save Transaction
        </PrimaryButton>
      </div>
    </form>
  );
}

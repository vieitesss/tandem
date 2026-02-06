"use client";

import { useEffect, useMemo, useState } from "react";

import SelectField from "../shared/SelectField";
import { useToast } from "../shared/ToastProvider";
import { normalizeNumberInput } from "../shared/inputs";
import { categoryOptions } from "../shared/transactions";
import { notifyTransactionsUpdated } from "./transactionsCache";

const initialSplit = { user_id: "", percent: "" };

export default function TransactionForm() {
  const [payerId, setPayerId] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [type, setType] = useState("EXPENSE");
  const [splitMode, setSplitMode] = useState("custom");
  const [splits, setSplits] = useState([initialSplit]);
  const [profiles, setProfiles] = useState([]);
  const [categories, setCategories] = useState(categoryOptions);
  const [beneficiaryId, setBeneficiaryId] = useState("");
  const [owedToId, setOwedToId] = useState("");
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false);
  const [amountFormatError, setAmountFormatError] = useState(false);
  const [touched, setTouched] = useState({
    payer: false,
    amount: false,
    date: false,
    beneficiary: false,
    category: false,
  });
  const { showToast } = useToast();

  const apiBaseUrl = "/api";

  const inputClassName = (hasError) =>
    `w-full rounded-xl border bg-obsidian-800 px-3.5 py-2.5 text-cream-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cream-500/20 ${
      hasError ? "border-coral-400" : "border-obsidian-600 hover:border-cream-500/35"
    }`;

  const sectionClassName = "space-y-2";
  const panelClassName =
    "rounded-2xl border border-obsidian-600/90 bg-obsidian-800 p-4 md:p-5";

  const fieldLabelClassName =
    "text-[11px] font-semibold uppercase tracking-[0.14em] text-cream-300";

  useEffect(() => {
    let isMounted = true;

    fetch(`${apiBaseUrl}/profiles`)
      .then((response) => response.json())
      .then((data) => {
        if (isMounted) {
          setProfiles(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {
        if (isMounted) {
          setProfiles([]);
        }
      });

    fetch(`${apiBaseUrl}/categories`)
      .then((response) => response.json())
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setCategories(data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCategories(categoryOptions);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [apiBaseUrl]);

  useEffect(() => {
    if (profiles.length === 0) {
      return;
    }

    setSplits(
      profiles.map((profile) => ({
        user_id: profile.id,
        percent: Number(profile.default_split || 0) * 100,
      }))
    );
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
      const response = await fetch(`${apiBaseUrl}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || "Failed to save transaction");
      }

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
        profiles.length
          ? profiles.map((profile) => ({
              user_id: profile.id,
              percent: Number(profile.default_split || 0) * 100,
            }))
          : [initialSplit]
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

  return (
    <form
      className="animate-fade-in space-y-4 rounded-3xl border border-obsidian-600/90 bg-obsidian-800 p-4 md:p-6"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <h2 className="text-sm font-display font-semibold tracking-tight text-cream-100">
          Add transaction
        </h2>
        <p className="text-xs font-medium text-cream-300">Fields marked * are required</p>
      </div>

      <div className={`${panelClassName} space-y-4`}>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="space-y-2">
            <label className={fieldLabelClassName}>
              Amount<span className="text-coral-400"> *</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-cream-300">
                EUR
              </span>
              <input
                className={`${inputClassName(showAmountError)} tabular-nums h-16 !pl-[5.1rem] !pr-4 text-3xl font-semibold text-cream-50 sm:!pl-[4.8rem]`}
                placeholder="0.00"
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.]?[0-9]*"
                value={amount}
                onChange={handleAmountChange}
                aria-invalid={showAmountError}
              />
            </div>
            {showAmountFormatError ? (
              <p className="text-xs text-coral-300 font-medium">
                Only numbers and a decimal point are allowed.
              </p>
            ) : showAmountError ? (
              <p className="text-xs text-coral-300 font-medium">Enter an amount above 0.</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className={fieldLabelClassName}>
              Date<span className="text-coral-400"> *</span>
            </label>
            <input
              className={`${inputClassName(showDateError)} h-16`}
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setTouched((current) => ({ ...current, date: true }));
              }}
              aria-invalid={showDateError}
            />
            {showDateError ? (
              <p className="text-xs text-coral-300 font-medium">Choose a date.</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <label className={fieldLabelClassName}>
            Type<span className="text-coral-400"> *</span>
          </label>
          <div className="grid grid-cols-3 gap-1 rounded-xl border border-obsidian-600 bg-obsidian-900 p-1">
            {["EXPENSE", "INCOME", "LIQUIDATION"].map((value) => {
              const isActive = type === value;
              return (
                <button
                  key={value}
                  type="button"
                  className={`min-w-0 truncate rounded-lg px-2 py-2 text-[11px] font-semibold tracking-wide text-center transition-colors sm:px-3 sm:text-xs ${
                    isActive
                      ? value === "EXPENSE"
                        ? "bg-coral-600/30 text-coral-100"
                        : value === "INCOME"
                          ? "bg-sage-600/30 text-sage-100"
                          : "bg-cream-500/20 text-cream-100"
                      : "text-cream-300 hover:bg-obsidian-800"
                  }`}
                  onClick={() => setType(value)}
                >
                  {value === "LIQUIDATION" ? "Liquidation" : value[0] + value.slice(1).toLowerCase()}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className={`${panelClassName} grid gap-4 sm:grid-cols-2`}>
        <div className={sectionClassName}>
          <label className={fieldLabelClassName}>
            {type === "INCOME" ? "Recipient" : "Paid by"}
            <span className="text-coral-400"> *</span>
          </label>
          <SelectField
            className={`${inputClassName(showPayerError)} appearance-none pr-9`}
            value={payerId}
            onChange={(event) => {
              setPayerId(event.target.value);
              setTouched((current) => ({ ...current, payer: true }));
            }}
            aria-invalid={showPayerError}
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
            <p className="text-xs text-coral-300 font-medium">
              {type === "INCOME" ? "Select a recipient." : "Select who paid."}
            </p>
          ) : null}
        </div>

        <div className={`${sectionClassName} ${type === "INCOME" ? "opacity-60" : ""}`}>
          <label className={fieldLabelClassName}>
            Category{type !== "INCOME" ? <span className="text-coral-400"> *</span> : null}
          </label>
          <SelectField
            className={`${inputClassName(showCategoryError)} appearance-none pr-9`}
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setTouched((current) => ({ ...current, category: true }));
            }}
            disabled={type === "INCOME"}
            aria-invalid={showCategoryError}
          >
            <option value="">{type === "INCOME" ? "Not required" : "Select category"}</option>
            {categories.map((option) => (
              <option key={option.id || option.label} value={option.label}>
                {option.label}
              </option>
            ))}
          </SelectField>
          {showCategoryError ? (
            <p className="mt-2 text-xs text-coral-300 font-medium">Select a category.</p>
          ) : null}
        </div>
      </div>

      <div className={`${panelClassName} ${sectionClassName}`}>
        <label className={fieldLabelClassName}>Note</label>
        <input
          className="w-full rounded-xl border border-obsidian-600 bg-obsidian-800 px-3.5 py-2.5 text-cream-100 placeholder:text-cream-300/70 transition-colors duration-200 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/20"
          placeholder="Optional note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
      <div className={`${panelClassName} space-y-3`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <label className={fieldLabelClassName}>Split mode</label>
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
              Liquidations always send 100% to the other partner.
            </p>
            <label className={fieldLabelClassName}>
              Recipient<span className="text-coral-400"> *</span>
            </label>
            <SelectField
              className={`${inputClassName(showBeneficiaryError)} appearance-none pr-9`}
              value={beneficiaryId}
              onChange={(event) => {
                setBeneficiaryId(event.target.value);
                setTouched((current) => ({ ...current, beneficiary: true }));
              }}
              aria-invalid={showBeneficiaryError}
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
              <p className="text-xs text-coral-300 font-medium">Select a recipient.</p>
            ) : null}
          </div>
        ) : null}
        {splitMode === "owed" && type === "EXPENSE" ? (
          <div className="space-y-2">
            <p className="text-xs text-cream-300 font-medium">
              Owed expenses assign 100% to the other partner.
            </p>
            <label className={fieldLabelClassName}>
              Owed by<span className="text-coral-400"> *</span>
            </label>
            <SelectField
              className={`${inputClassName(showOwedError)} appearance-none pr-9`}
              value={owedToId}
              onChange={(event) => {
                setOwedToId(event.target.value);
                setTouched((current) => ({ ...current, beneficiary: true }));
              }}
              aria-invalid={showOwedError}
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
              <p className="text-xs text-coral-300 font-medium">
                Select the other partner who owes you.
              </p>
            ) : null}
          </div>
        ) : null}
        {splitMode === "custom" && type === "EXPENSE" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className={fieldLabelClassName}>Splits</label>
              <button
                className="text-xs font-medium text-cream-400 hover:text-cream-200"
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
              Total: {totalPercent.toFixed(1)}%
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
        <button
          className="w-full rounded-xl border border-cream-500/40 bg-cream-500 px-4 py-3 font-display font-semibold text-white transition-colors duration-200 hover:bg-cream-600 disabled:opacity-60"
          type="submit"
          disabled={!canSubmit}
        >
          Save Transaction
        </button>
      </div>
    </form>
  );
}

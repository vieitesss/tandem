"use client";

import { useEffect, useMemo, useState } from "react";

import SelectField from "../shared/SelectField";
import StatusMessage from "../shared/StatusMessage";
import { getApiBaseUrl } from "../shared/api";
import { normalizeNumberInput } from "../shared/inputs";
import { categoryOptions } from "../shared/transactions";

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
  const [status, setStatus] = useState(null);
  const [profiles, setProfiles] = useState([]);
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

  const apiBaseUrl = getApiBaseUrl();

  const inputClassName = (hasError) =>
    `w-full rounded-lg border bg-slate-950 px-3 py-2 ${
      hasError ? "border-rose-400" : "border-slate-700"
    }`;

  const sectionClassName =
    "border-t border-slate-800/70 pt-3 pb-3 first:border-t-0 first:pt-0 last:pb-0";

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
    setStatus(null);

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

      setStatus({ tone: "success", message: "Transaction saved." });
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
      setStatus({ tone: "error", message: error.message });
    }
  };

  return (
    <form
      className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4"
      onSubmit={handleSubmit}
    >
      <div className={`space-y-2 ${sectionClassName}`}>
        <label className="text-sm text-slate-300">
          {type === "INCOME" ? "Recipient" : "Paid by"}
          <span className="text-rose-400"> *</span>
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
          <p className="text-xs text-rose-300">
            {type === "INCOME" ? "Select a recipient." : "Select who paid."}
          </p>
        ) : null}
      </div>
      <div className={`space-y-2 ${sectionClassName}`}>
        <label className="text-sm text-slate-300">
          Type<span className="text-rose-400"> *</span>
        </label>
        <SelectField
          className="w-full appearance-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 pr-9 text-slate-200"
          value={type}
          onChange={(event) => setType(event.target.value)}
        >
          <option value="EXPENSE">Expense</option>
          <option value="INCOME">Income</option>
          <option value="LIQUIDATION">Liquidation</option>
        </SelectField>
      </div>
      <div className={`grid gap-4 sm:grid-cols-2 ${sectionClassName}`}>
        <div className="space-y-2">
          <label className="text-sm text-slate-300">
            Amount<span className="text-rose-400"> *</span>
          </label>
          <input
            className={inputClassName(showAmountError)}
            placeholder="0.00"
            type="text"
            inputMode="decimal"
            pattern="[0-9]*[.]?[0-9]*"
            value={amount}
            onChange={handleAmountChange}
            aria-invalid={showAmountError}
          />
          {showAmountFormatError ? (
            <p className="text-xs text-rose-300">
              Only numbers and a decimal point are allowed.
            </p>
          ) : showAmountError ? (
            <p className="text-xs text-rose-300">Enter an amount above 0.</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-300">
            Date<span className="text-rose-400"> *</span>
          </label>
          <input
            className={inputClassName(showDateError)}
            type="date"
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              setTouched((current) => ({ ...current, date: true }));
            }}
            aria-invalid={showDateError}
          />
          {showDateError ? (
            <p className="text-xs text-rose-300">Choose a date.</p>
          ) : null}
        </div>
      </div>
      {type !== "INCOME" ? (
        <div className={`space-y-2 ${sectionClassName}`}>
          <label className="text-sm text-slate-300">
            Category<span className="text-rose-400"> *</span>
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {categoryOptions.map((option) => (
              <button
                key={option.label}
                type="button"
                className={`flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs ${
                  category === option.label
                    ? "border-emerald-400 bg-emerald-500/10 text-emerald-100"
                    : "border-slate-800 text-slate-200 hover:border-slate-600"
                }`}
                onClick={() => {
                  setCategory(option.label);
                  setTouched((current) => ({ ...current, category: true }));
                }}
              >
                <span className="text-base" aria-hidden>
                  {option.icon}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {option.label}
                </span>
              </button>
            ))}
          </div>
          {showCategoryError ? (
            <p className="mt-2 text-xs text-rose-300">Select a category.</p>
          ) : null}
        </div>
      ) : null}
      <div className={`space-y-2 ${sectionClassName}`}>
        <label className="text-sm text-slate-300">Note</label>
        <input
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
          placeholder="Optional note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
      <div className={`space-y-3 ${sectionClassName}`}>
        <div className="flex items-center justify-between">
          <label className="text-sm text-slate-300">Split mode</label>
          <div className="flex gap-2 text-xs">
            <button
              className={`rounded-full px-3 py-1 ${
                splitMode === "none"
                  ? "bg-emerald-500 text-slate-900"
                  : "bg-slate-800 text-slate-200"
              }`}
              type="button"
              onClick={() => setSplitMode("none")}
              disabled={type === "INCOME" || type === "LIQUIDATION"}
            >
              Personal
            </button>
            <button
              className={`rounded-full px-3 py-1 ${
                splitMode === "owed"
                  ? "bg-emerald-500 text-slate-900"
                  : "bg-slate-800 text-slate-200"
              }`}
              type="button"
              onClick={() => setSplitMode("owed")}
              disabled={type === "INCOME" || type === "LIQUIDATION"}
            >
              Owed
            </button>
            <button
              className={`rounded-full px-3 py-1 ${
                splitMode === "custom"
                  ? "bg-emerald-500 text-slate-900"
                  : "bg-slate-800 text-slate-200"
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
          <p className="text-xs text-slate-400">
            Income is always assigned 100% to the recipient.
          </p>
        ) : null}
        {type === "LIQUIDATION" ? (
          <div className="space-y-2">
            <p className="text-xs text-slate-400">
              Liquidations always send 100% to the other partner.
            </p>
            <label className="text-xs text-slate-400">
              Recipient<span className="text-rose-400"> *</span>
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
              <p className="text-xs text-rose-300">Select a recipient.</p>
            ) : null}
          </div>
        ) : null}
        {splitMode === "owed" && type === "EXPENSE" ? (
          <div className="space-y-2">
            <p className="text-xs text-slate-400">
              Owed expenses assign 100% to the other partner.
            </p>
            <label className="text-xs text-slate-400">
              Owed by<span className="text-rose-400"> *</span>
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
              <p className="text-xs text-rose-300">
                Select the other partner who owes you.
              </p>
            ) : null}
          </div>
        ) : null}
        {splitMode === "custom" && type === "EXPENSE" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-300">Splits</label>
              <button
                className="text-xs text-slate-400 hover:text-slate-200"
                type="button"
                onClick={addSplit}
              >
                + Add split
              </button>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-[minmax(0,1fr)_80px_44px] gap-2 px-3 text-xs text-slate-400">
                <span>
                  User<span className="text-rose-400"> *</span>
                </span>
                <span>
                  Percent<span className="text-rose-400"> *</span>
                </span>
                <span className="text-right">Remove</span>
              </div>
              <div className="divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-900/40">
                {splits.map((split, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[minmax(0,1fr)_80px_44px] items-center gap-2 px-3 py-3"
                  >
                    <SelectField
                      className="w-full min-w-0 appearance-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 pr-9 text-sm text-slate-200"
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
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-right text-sm text-slate-200"
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
                        className="flex h-8 w-8 items-center justify-center justify-self-end rounded-lg bg-slate-800 text-rose-300"
                        type="button"
                        onClick={() => removeSplit(index)}
                        aria-label="Remove split"
                      >
                        ×
                      </button>
                    ) : (
                      <div className="text-right text-xs text-slate-500">—</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="text-xs text-slate-400">
              Total: {totalPercent.toFixed(1)}%
            </div>
            {showSplitError ? (
              <p className="text-xs text-rose-300">
                Select a user and percent for each split. Total must be 100%.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      <StatusMessage status={status} className={sectionClassName} />
      <div className={sectionClassName}>
        <button
          className="w-full rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-900"
          type="submit"
        >
          Save transaction
        </button>
      </div>
    </form>
  );
}

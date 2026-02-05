import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchJson } from "../shared/api";
import { formatCurrency } from "../shared/format";

const API_BASE_URL = "/api";

export const useDebtSummary = () => {
  const [debtSummary, setDebtSummary] = useState({
    state: "idle",
    message: "",
    data: null,
  });
  const refreshDebtSummary = useCallback(() => {
    setDebtSummary({ state: "loading", message: "", data: null });

    return fetchJson(`${API_BASE_URL}/debt-summary`)
      .then(({ data }) => {
        if (data?.error) {
          setDebtSummary({ state: "error", message: data.error, data: null });
          return;
        }

        setDebtSummary({ state: "idle", message: "", data });
      })
      .catch(() => {
        setDebtSummary({
          state: "error",
          message: "Failed to load debt summary.",
          data: null,
        });
      });
  }, []);

  useEffect(() => {
    refreshDebtSummary();
  }, [refreshDebtSummary]);

  const debtLine = useMemo(() => {
    const debtBalance = debtSummary.data?.balance || {};
    const debtProfiles = debtSummary.data?.profiles || [];

    const debtProfilesById = new Map(
      debtProfiles.map((profile) => [profile.id, profile])
    );
    let line = "All settled up.";

    if (debtSummary.state === "loading") {
      line = "Calculating balances...";
    } else if (debtSummary.state === "error") {
      line = "Unable to calculate debt.";
    } else if (debtBalance?.amount) {
      line = `${
        debtProfilesById.get(debtBalance.from_profile_id)?.display_name ||
        "Partner 1"
      } owed ${formatCurrency(debtBalance.amount)} to ${
        debtProfilesById.get(debtBalance.to_profile_id)?.display_name ||
        "Partner 2"
      }`;
    }

    return line;
  }, [debtSummary]);

  return {
    debtSummary,
    debtLine,
    refreshDebtSummary,
  };
};

const iconClassName = "h-4 w-4";

const overviewIcon = (
  <svg className={iconClassName} viewBox="0 0 20 20" fill="currentColor">
    <path d="M10.489 2.386a.75.75 0 00-.978 0L3.01 7.81a.75.75 0 00.48 1.315h.76v6.125a.75.75 0 00.75.75H8.5a.75.75 0 00.75-.75V11h1.5v4.25a.75.75 0 00.75.75H15a.75.75 0 00.75-.75V9.125h.76a.75.75 0 00.48-1.315l-6.5-5.424z" />
  </svg>
);

const timelineIcon = (
  <svg className={iconClassName} viewBox="0 0 20 20" fill="currentColor">
    <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" />
  </svg>
);

const personSummaryIcon = (
  <svg className={iconClassName} viewBox="0 0 20 20" fill="currentColor">
    <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
    <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
  </svg>
);

const debtBreakdownIcon = (
  <svg className={iconClassName} viewBox="0 0 20 20" fill="currentColor">
    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
  </svg>
);

const categoriesIcon = (
  <svg className={iconClassName} viewBox="0 0 20 20" fill="currentColor">
    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

export const analysisSecondaryNavItems = [
  { href: "/transactions", label: "Overview", icon: overviewIcon },
  { href: "/timeline", label: "Timeline", icon: timelineIcon },
  { href: "/person-summary", label: "Person Summary", icon: personSummaryIcon },
  { href: "/debt-breakdown", label: "Debt Breakdown", icon: debtBreakdownIcon },
];

export const setupSecondaryNavItems = [
  { href: "/profiles", label: "Overview", icon: overviewIcon },
  { href: "/categories", label: "Categories", icon: categoriesIcon },
];

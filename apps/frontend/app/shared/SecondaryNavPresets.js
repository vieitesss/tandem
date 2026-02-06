"use client";

import SecondaryActions, { SecondaryLink } from "./SecondaryActions";
import {
  analysisSecondaryNavItems,
  setupSecondaryNavItems,
} from "./navigationConfig";

const SecondaryNavGroup = ({ items }) => {
  return (
    <SecondaryActions>
      {items.map((item) => (
        <SecondaryLink
          key={item.href}
          href={item.href}
          label={item.label}
          icon={item.icon}
        />
      ))}
    </SecondaryActions>
  );
};

export const AnalysisSecondaryActions = () => {
  return <SecondaryNavGroup items={analysisSecondaryNavItems} />;
};

export const SetupSecondaryActions = () => {
  return <SecondaryNavGroup items={setupSecondaryNavItems} />;
};

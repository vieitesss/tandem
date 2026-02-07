const baseFieldInputClassName =
  "w-full rounded-xl border bg-obsidian-800 px-3.5 py-2.5 text-cream-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cream-500/20";

export const fieldLabelClassName =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-cream-300";

export const fieldInputClassName = (hasError) =>
  `${baseFieldInputClassName} ${
    hasError ? "border-coral-400" : "border-obsidian-600 hover:border-cream-500/35"
  }`;

export function FieldLabel({ htmlFor, required = false, className = "", children }) {
  return (
    <label htmlFor={htmlFor} className={`${fieldLabelClassName} ${className}`.trim()}>
      {children}
      {required ? <span className="text-coral-400"> *</span> : null}
    </label>
  );
}

export function TextInput({ hasError = false, className = "", ...props }) {
  return <input className={`${fieldInputClassName(hasError)} ${className}`.trim()} {...props} />;
}

export function PrimaryButton({ className = "", ...props }) {
  return (
    <button
      className={`rounded-xl border border-cream-500/40 bg-cream-500 px-4 py-3 font-display font-semibold text-white shadow-glow-sm transition-colors duration-200 hover:bg-cream-600 disabled:border-cream-500/30 disabled:bg-cream-500/75 disabled:text-white/90 ${className}`.trim()}
      {...props}
    />
  );
}

export function SecondaryButton({ className = "", ...props }) {
  return (
    <button
      className={`rounded-xl border border-obsidian-600 bg-obsidian-800 px-4 py-2 text-xs font-medium text-cream-200 transition-colors duration-150 hover:border-cream-500/35 hover:text-cream-100 ${className}`.trim()}
      {...props}
    />
  );
}

export function DangerButton({ className = "", ...props }) {
  return (
    <button
      className={`rounded-xl bg-coral-500/90 px-4 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-coral-500 disabled:opacity-60 ${className}`.trim()}
      {...props}
    />
  );
}

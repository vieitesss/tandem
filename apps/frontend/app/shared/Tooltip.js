export default function Tooltip({ label, children, className }) {
  const classes = className
    ? `group relative inline-flex items-center gap-1 ${className}`
    : "group relative inline-flex items-center gap-1";

  return (
    <span className={classes}>
      <span>{children}</span>
      <span className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-600 text-[10px] text-slate-300">
        ?
      </span>
      <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-56 -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-200 opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
        <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-l border-t border-slate-700 bg-slate-950" />
        {label}
      </span>
    </span>
  );
}

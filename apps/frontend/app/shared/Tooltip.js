export default function Tooltip({ label, children, className }) {
  const classes = className
    ? `group relative inline-flex items-center gap-1 ${className}`
    : "group relative inline-flex items-center gap-1";

  return (
    <span className={classes}>
      <span>{children}</span>
      <span className="flex h-4 w-4 items-center justify-center rounded-full border border-cream-500/30 text-[10px] font-semibold text-cream-100/60">
        i
      </span>
      <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-56 -translate-x-1/2 rounded-lg border border-cream-500/20 bg-obsidian-900 px-2 py-1.5 text-[11px] font-medium font-body tracking-normal text-cream-100 opacity-0 transition-opacity duration-200 group-hover:opacity-100 normal-case">
        <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-l border-t border-cream-500/20 bg-obsidian-900" />
        {label}
      </span>
    </span>
  );
}

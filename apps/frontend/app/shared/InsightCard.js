export default function InsightCard({ label, value, helper }) {
  return (
    <div className="rounded-2xl border border-obsidian-600/90 bg-obsidian-800 p-3 sm:p-5">
      <div className="text-[11px] font-medium uppercase tracking-wider text-cream-300/70 sm:text-xs">
        {label}
      </div>
      <p className="mt-1.5 text-xl font-mono font-semibold tracking-tight text-cream-50 sm:mt-2 sm:text-2xl">
        {value}
      </p>
      {helper ? (
        <p className="mt-1.5 text-[11px] font-medium text-cream-300/80 sm:mt-2 sm:text-xs">{helper}</p>
      ) : null}
    </div>
  );
}

export default function InsightCard({ label, value, helper }) {
  return (
    <div className="rounded-2xl border border-cream-500/15 bg-obsidian-800/40 p-5 shadow-card backdrop-blur-sm">
      <div className="text-xs tracking-wider text-cream-100/60 font-medium uppercase">
        {label}
      </div>
      <p className="mt-2 text-2xl font-mono font-semibold text-cream-50 tracking-tight">
        {value}
      </p>
      {helper ? (
        <p className="mt-2 text-xs text-cream-100/60 font-medium">{helper}</p>
      ) : null}
    </div>
  );
}

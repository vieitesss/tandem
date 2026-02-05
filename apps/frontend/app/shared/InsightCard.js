export default function InsightCard({ label, value, helper }) {
  return (
    <div className="rounded-2xl border border-obsidian-600/80 bg-white p-5 shadow-card">
      <div className="text-xs font-medium uppercase tracking-wider text-cream-300/70">
        {label}
      </div>
      <p className="mt-2 text-2xl font-mono font-semibold tracking-tight text-cream-50">
        {value}
      </p>
      {helper ? (
        <p className="mt-2 text-xs font-medium text-cream-300/80">{helper}</p>
      ) : null}
    </div>
  );
}

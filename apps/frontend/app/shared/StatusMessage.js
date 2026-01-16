export default function StatusMessage({ status, className }) {
  if (!status) {
    return null;
  }

  const toneClassName =
    status.tone === "success" ? "text-emerald-300" : "text-rose-300";
  const combinedClassName = className
    ? `${className} text-sm ${toneClassName}`
    : `text-sm ${toneClassName}`;

  return <p className={combinedClassName}>{status.message}</p>;
}

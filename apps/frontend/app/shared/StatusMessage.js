export default function StatusMessage({ status, className }) {
  if (!status) {
    return null;
  }

  const toneClassName =
    status.tone === "success" ? "text-sage-300" : "text-coral-300";
  const combinedClassName = className
    ? `${className} text-sm font-medium ${toneClassName}`
    : `text-sm font-medium ${toneClassName}`;

  return <p className={combinedClassName}>{status.message}</p>;
}

export default function SelectField({
  value,
  onChange,
  children,
  className,
  selectClassName,
  ...props
}) {
  const combinedClassName = selectClassName
    ? `${selectClassName} ${className || ""}`.trim()
    : className;

  return (
    <div className="relative">
      <select
        className={combinedClassName}
        value={value}
        onChange={onChange}
        {...props}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cream-400/80"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden
      >
        <path d="M5.5 7.5L10 12l4.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

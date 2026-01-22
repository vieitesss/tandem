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
      <i
        className="fas fa-angle-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-cream-400"
        aria-hidden
      />
    </div>
  );
}

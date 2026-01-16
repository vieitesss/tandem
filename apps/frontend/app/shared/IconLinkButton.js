import Link from "next/link";

const baseClassName =
  "flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 hover:border-slate-500";

export default function IconLinkButton({ href, label, title, children, className }) {
  const combinedClassName = className
    ? `${baseClassName} ${className}`
    : baseClassName;

  return (
    <Link
      className={combinedClassName}
      href={href}
      aria-label={label}
      title={title || label}
    >
      {children}
    </Link>
  );
}

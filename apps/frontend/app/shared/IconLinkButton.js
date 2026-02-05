import Link from "next/link";

const baseClassName =
  "flex h-10 w-10 items-center justify-center rounded-full border border-obsidian-600/80 bg-white text-cream-200 transition-all duration-300 hover:border-cream-500/40 hover:bg-obsidian-900 hover:text-cream-100 hover:shadow-glow-sm";

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

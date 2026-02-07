import DesktopHeaderActions from "./DesktopHeaderActions";

const cx = (...parts) => parts.filter(Boolean).join(" ");

export function PageShell({ maxWidth = "max-w-6xl", className, children }) {
  return (
    <main
      className={cx(
        "mx-auto flex min-h-[100dvh] w-full flex-col gap-8 overflow-x-clip px-5 pt-7 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 md:px-8 md:pt-10",
        maxWidth,
        className
      )}
    >
      {children}
    </main>
  );
}

export function PageHeader({
  title,
  description,
  currentPage,
  eyebrow,
  children,
}) {
  return (
    <header className="w-full max-w-full space-y-3 overflow-x-hidden animate-fade-in">
      <div className="min-w-0 max-w-full space-y-2">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cream-400">
            {eyebrow}
          </p>
        ) : null}
        <div className="flex min-w-0 max-w-full items-center gap-3">
          <div className="title-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cream-500/25 bg-gradient-to-br from-cream-500/12 via-cream-500/4 to-transparent md:h-12 md:w-12">
            <img src="/icon.png" alt="Tandem" className="title-icon-media" />
          </div>
          <h1 className="min-w-0 max-w-full break-words text-[1.85rem] font-display font-semibold leading-tight tracking-tight text-cream-50 md:text-4xl">
            {title}
          </h1>
        </div>
        {description ? (
          <p className="max-w-3xl break-words text-sm font-medium leading-relaxed text-cream-300 [overflow-wrap:anywhere]">
            {description}
          </p>
        ) : null}
      </div>
      <div className="pt-1">
        <DesktopHeaderActions currentPage={currentPage} />
      </div>
      {children ? <div className="pt-1">{children}</div> : null}
    </header>
  );
}

export function SectionCard({ as: Component = "section", className, children, ...props }) {
  return (
    <Component
      className={cx(
        "rounded-3xl border border-obsidian-600/90 bg-obsidian-800",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export function InlineMessage({ tone = "neutral", children }) {
  const toneClassName =
    tone === "error"
      ? "text-coral-300"
      : tone === "muted"
        ? "text-cream-300"
        : "text-cream-200";

  return <p className={cx("text-sm font-medium", toneClassName)}>{children}</p>;
}

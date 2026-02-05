import DesktopHeaderActions from "./DesktopHeaderActions";

const cx = (...parts) => parts.filter(Boolean).join(" ");

export function PageShell({ maxWidth = "max-w-6xl", className, children }) {
  return (
    <main
      className={cx(
        "mx-auto flex min-h-[100dvh] w-full flex-col gap-8 px-5 pt-7 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 md:px-8 md:pt-10",
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
    <header className="space-y-3 animate-fade-in">
      <div className="min-w-0 space-y-2">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cream-400">
            {eyebrow}
          </p>
        ) : null}
        <div className="flex min-w-0 items-center gap-3">
          <div className="title-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cream-500/20 bg-gradient-to-br from-cream-500/15 via-cream-500/5 to-transparent shadow-glow-sm md:h-12 md:w-12">
            <img src="/icon.png" alt="Tandem" className="title-icon-media" />
          </div>
          <h1 className="truncate text-3xl font-display font-semibold tracking-tight text-cream-50 md:text-4xl">
            {title}
          </h1>
        </div>
        {description ? (
          <p className="max-w-3xl text-sm font-medium leading-relaxed text-cream-300">
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
        "rounded-3xl border border-obsidian-600/80 bg-obsidian-800 shadow-card",
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

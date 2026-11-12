import { cn } from "@/lib/utils";

/** Static content panel: surface + 1px border, 16px radius. */
export function Panel({
  title,
  subtitle,
  icon,
  action,
  children,
  className,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-panel border border-border bg-surface", className)}>
      {title && (
        <header className="flex items-start justify-between gap-3 px-5 pb-4 pt-5">
          <div className="flex min-w-0 items-start gap-3">
            {icon && <span className="grid size-10 shrink-0 place-items-center rounded-card border border-border bg-surface-2 text-ink-muted">{icon}</span>}
            <div className="min-w-0">
              <h2 className="text-[18px] font-semibold leading-6 text-ink">{title}</h2>
              {subtitle && <p className="mt-0.5 text-small text-ink-muted">{subtitle}</p>}
            </div>
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ title, subtitle, children }: { title: React.ReactNode; subtitle?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-bold leading-9 text-ink md:text-h1">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-body text-ink-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

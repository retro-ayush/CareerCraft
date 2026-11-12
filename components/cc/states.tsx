import { CircleAlert, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-input bg-surface-2", className)} />;
}

/** Placeholder with the same footprint as a JobMatchCard. */
export function JobCardSkeleton() {
  return (
    <div className="space-y-4 rounded-card border border-border bg-surface p-5" aria-hidden>
      <div className="flex justify-between gap-4">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-12 w-16" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>
      <Skeleton className="h-4 w-2/3" />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-28 rounded-card" />
        <Skeleton className="h-10 w-32 rounded-card" />
      </div>
    </div>
  );
}

export function JobGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3" role="status" aria-label="Loading jobs">
      {Array.from({ length: count }, (_, i) => (
        <JobCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, children, action, className }: { icon: React.ReactNode; title: string; children?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      <span className="grid size-12 place-items-center rounded-card border border-border bg-surface-2 text-ink-muted">{icon}</span>
      <p className="mt-4 font-display text-[18px] font-semibold leading-6 text-ink">{title}</p>
      {children && <div className="mt-2 max-w-sm text-small text-ink-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** A real failure (network, server). Uses the danger colour; skill gaps never do. */
export function ErrorState({ message, onRetry, className }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn("flex flex-col gap-3 rounded-card border border-danger/40 bg-danger/10 p-4 sm:flex-row sm:items-center", className)}>
      <CircleAlert size={20} className="shrink-0 text-danger" />
      <div className="flex-1">
        <p className="text-small font-medium text-danger">Something went wrong</p>
        <p className="text-small text-ink">{message}</p>
      </div>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          <RotateCcw /> Try again
        </Button>
      )}
    </div>
  );
}

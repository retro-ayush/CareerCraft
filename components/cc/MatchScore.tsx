import { cn } from "@/lib/utils";

/** Accent means "ready" (70% or above); below that the score uses the skill-gap colour. */
export const scoreColor = (score: number, muted = false) => (muted ? "text-ink-muted" : score >= 70 ? "text-accent" : "text-warn");

/**
 * Big mono percentage with an uppercase "MATCH" caption.
 * `muted` is for jobs the student is not eligible for, so a high score never reads as "ready".
 */
export function MatchScore({ score, size = "lg", muted = false, className }: { score: number; size?: "lg" | "sm"; muted?: boolean; className?: string }) {
  const rounded = Math.round(score);
  return (
    <div className={cn("flex shrink-0 flex-col items-end", size === "sm" && "flex-row items-baseline gap-1.5", className)}>
      <span className={cn("font-mono font-bold tabular-nums", size === "lg" ? "text-stat" : "text-small", scoreColor(rounded, muted))}>
        {rounded}
        <span className={size === "lg" ? "text-[18px]" : undefined}>%</span>
      </span>
      <span className="text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-ink-muted">Match</span>
    </div>
  );
}

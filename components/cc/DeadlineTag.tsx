import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/** "12 days left" / "Closes today" / "Closed". Urgent deadlines (5 days or fewer) are emphasised with weight, not colour. */
export function DeadlineTag({ days, className }: { days: number; className?: string }) {
  const label = days < 0 ? "Closed" : days === 0 ? "Closes today" : `${days} day${days === 1 ? "" : "s"} left`;
  const urgent = days >= 0 && days <= 5;
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-small", urgent ? "font-medium text-ink" : "text-ink-muted", className)}>
      <Clock size={16} className="shrink-0" />
      <span className="font-mono tabular-nums">{label}</span>
    </span>
  );
}

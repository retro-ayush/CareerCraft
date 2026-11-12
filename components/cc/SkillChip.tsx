import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { prettySkill } from "./format";

const VARIANTS = {
  /** A skill the student already has. */
  have: "bg-accent-soft text-ink border-transparent",
  /** A missing skill. The "+" prefix means colour is not the only signal. */
  gap: "bg-warn-soft text-warn border-transparent",
  neutral: "bg-transparent text-ink-muted border-border",
} as const;

export function SkillChip({
  skill,
  variant = "neutral",
  onRemove,
  removeDisabled,
  className,
  children,
}: {
  skill: string;
  variant?: keyof typeof VARIANTS;
  /** Renders a remove button inside the chip. */
  onRemove?: () => void;
  removeDisabled?: boolean;
  className?: string;
  /** Optional leading content (e.g. an icon) before the label. */
  children?: React.ReactNode;
}) {
  const label = prettySkill(skill);
  return (
    <span className={cn("inline-flex h-7 items-center gap-1 rounded-full border px-3 text-small", VARIANTS[variant], onRemove && "pr-1", className)}>
      {children}
      {variant === "gap" && <span aria-hidden>+</span>}
      {variant === "gap" && <span className="sr-only">Missing: </span>}
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={removeDisabled}
          aria-label={`Remove ${label}`}
          className="ml-0.5 grid size-6 place-items-center rounded-full text-ink-muted transition-colors hover:bg-surface hover:text-ink disabled:opacity-50"
        >
          <X size={14} />
        </button>
      )}
    </span>
  );
}

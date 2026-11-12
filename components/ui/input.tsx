import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/** Shared field styling for inputs, selects and textareas. */
export const fieldClass =
  "w-full rounded-input border border-border bg-surface px-3 text-body text-ink transition-colors placeholder:text-ink-muted hover:border-border-strong focus-visible:border-accent disabled:opacity-50 aria-[invalid=true]:border-danger";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(fieldClass, "h-11", className)} {...props} />
));
Input.displayName = "Input";

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn(fieldClass, "h-11 pr-8", className)} {...props} />
));
Select.displayName = "Select";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-small font-medium text-ink", className)} {...props} />;
}

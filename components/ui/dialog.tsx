"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const SIDES = {
  center: "left-1/2 top-1/2 max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-lg rounded-panel border animate-dialog-in",
  right: "inset-y-0 right-0 h-full w-full max-w-[460px] border-l animate-sheet-right",
  left: "inset-y-0 left-0 h-full w-[280px] border-r animate-sheet-left",
} as const;

type ContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  side?: keyof typeof SIDES;
  /** Hide the built-in close button (when the content renders its own). */
  hideClose?: boolean;
};

export const DialogContent = forwardRef<React.ComponentRef<typeof DialogPrimitive.Content>, ContentProps>(
  ({ className, children, side = "center", hideClose = false, ...props }, ref) => (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="animate-overlay-in fixed inset-0 z-50 bg-black/60" />
      <DialogPrimitive.Content
        ref={ref}
        className={cn("fixed z-50 flex flex-col overflow-hidden border-border bg-surface text-ink", side === "center" && "-translate-x-1/2 -translate-y-1/2", SIDES[side], className)}
        {...props}
      >
        {children}
        {!hideClose && (
          <DialogPrimitive.Close className="absolute right-3 top-3 grid size-10 place-items-center rounded-card text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink" aria-label="Close">
            <X size={20} strokeWidth={1.5} />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
);
DialogContent.displayName = "DialogContent";

export const DialogTitle = forwardRef<React.ComponentRef<typeof DialogPrimitive.Title>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(
  ({ className, ...props }, ref) => <DialogPrimitive.Title ref={ref} className={cn("font-display text-h2 font-semibold text-ink", className)} {...props} />
);
DialogTitle.displayName = "DialogTitle";

export const DialogDescription = forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => <DialogPrimitive.Description ref={ref} className={cn("text-small text-ink-muted", className)} {...props} />);
DialogDescription.displayName = "DialogDescription";

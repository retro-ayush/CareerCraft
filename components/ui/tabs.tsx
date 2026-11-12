"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;
export const TabsContent = TabsPrimitive.Content;

export const TabsList = forwardRef<React.ComponentRef<typeof TabsPrimitive.List>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.List ref={ref} className={cn("inline-flex items-center gap-1 rounded-card border border-border bg-surface p-1", className)} {...props} />
  )
);
TabsList.displayName = "TabsList";

export const TabsTrigger = forwardRef<React.ComponentRef<typeof TabsPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-[6px] px-3 text-small text-ink-muted transition-colors hover:text-ink data-[state=active]:bg-surface-2 data-[state=active]:font-medium data-[state=active]:text-ink",
        className
      )}
      {...props}
    />
  )
);
TabsTrigger.displayName = "TabsTrigger";

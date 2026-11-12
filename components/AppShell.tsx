"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MotionConfig } from "framer-motion";
import { Bookmark, Compass, LayoutDashboard, LogOut, Menu, Settings, TrendingUp, UserRound } from "lucide-react";
import { SHORTLIST_CHANGED, api } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { FadeIn } from "./cc/FadeIn";
import { ThemeToggle } from "./cc/ThemeToggle";
import { useSignOut } from "./useSignOut";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Explore jobs", icon: Compass },
  { href: "/shortlist", label: "My shortlist", icon: Bookmark, badge: true },
  { href: "/profile", label: "My profile", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Brand({ size = "md" }: { size?: "md" | "sm" }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-card">
      <span className={cn("grid place-items-center rounded-card bg-accent text-accent-ink", size === "md" ? "size-8" : "size-7")}>
        <TrendingUp size={size === "md" ? 20 : 16} strokeWidth={2} />
      </span>
      <span className={cn("font-display font-bold text-ink", size === "md" ? "text-[18px]" : "text-body")}>CareerCraft</span>
    </Link>
  );
}

/**
 * App frame: sidebar on desktop, top bar + slide-in menu on mobile.
 * Hidden for signed-out visitors (they only ever see the landing page at "/"). `authed` comes from the server layout.
 */
export default function AppShell({ children, authed }: { children: React.ReactNode; authed: boolean }) {
  const pathname = usePathname();
  // The mobile menu remembers the path it was opened on, so it closes itself after navigation.
  const [openOnPath, setOpenOnPath] = useState<string | null>(null);
  const open = openOnPath === pathname;
  const setOpen = (value: boolean) => setOpenOnPath(value ? pathname : null);
  const signOut = useSignOut();
  const [saved, setSaved] = useState<number | null>(null);

  // Shortlist count badge; refreshed on navigation and when a page announces a change.
  useEffect(() => {
    if (!authed) return;
    const load = () =>
      api.shortlist
        .list()
        .then((d) => setSaved(d.shortlist.length))
        .catch(() => undefined); // The badge is optional; pages show their own errors.
    load();
    window.addEventListener(SHORTLIST_CHANGED, load);
    return () => window.removeEventListener(SHORTLIST_CHANGED, load);
  }, [pathname, authed]);

  if (!authed) return <MotionConfig reducedMotion="user">{children}</MotionConfig>;

  const nav = (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon, badge }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-10 items-center gap-3 rounded-card px-3 text-small transition-colors",
              active ? "bg-surface-2 font-medium text-ink" : "text-ink-muted hover:bg-surface-2 hover:text-ink"
            )}
          >
            {active && <span aria-hidden className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent" />}
            <Icon size={20} className={active ? "text-accent" : undefined} />
            <span className="flex-1">{label}</span>
            {badge && saved != null && saved > 0 && (
              <span className="rounded-full border border-border px-2 font-mono text-[12px] leading-5 tabular-nums text-ink-muted" aria-label={`${saved} saved`}>
                {saved}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="flex items-center gap-3 border-t border-border pt-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-surface-2 text-small font-semibold text-ink">DK</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-small font-medium text-ink">Divya K</p>
        <p className="font-mono text-[12px] leading-4 text-ink-muted">S001</p>
      </div>
      <ThemeToggle />
      <button
        type="button"
        onClick={signOut}
        aria-label="Log out"
        title="Log out"
        className="grid size-10 place-items-center rounded-card text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <LogOut size={20} />
      </button>
    </div>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="lg:pl-[248px]">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col justify-between border-r border-border bg-surface px-4 py-6 lg:flex">
          <div className="space-y-8">
            <div className="px-2">
              <Brand />
            </div>
            {nav}
          </div>
          {footer}
        </aside>

        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface px-4 lg:hidden">
          <Brand />
          <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="grid size-10 place-items-center rounded-card text-ink hover:bg-surface-2">
            <Menu size={20} />
          </button>
        </header>

        {/* Mobile drawer */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent side="left" className="justify-between px-4 py-6 lg:hidden" aria-describedby={undefined}>
            <DialogTitle className="sr-only">Menu</DialogTitle>
            <div className="space-y-8">
              <div className="px-2">
                <Brand />
              </div>
              {nav}
            </div>
            {footer}
          </DialogContent>
        </Dialog>

        <main className="min-h-screen">
          <FadeIn key={pathname} className="mx-auto max-w-[1120px] px-4 py-6 md:px-8 md:py-10">
            {children}
          </FadeIn>
        </main>
      </div>
    </MotionConfig>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSignOut } from "./useSignOut";
import { Bookmark, Compass, LayoutDashboard, LogOut, Menu, Settings, Sparkles, UserRound, X } from "lucide-react";
import { SHORTLIST_CHANGED, api } from "@/lib/apiClient";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Explore Jobs", icon: Compass },
  { href: "/shortlist", label: "My Shortlist", icon: Bookmark, badge: true },
  { href: "/profile", label: "My Profile", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** App frame: sidebar on desktop, top bar + slide-in menu on mobile. Hidden on /login. */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // The mobile menu remembers the path it was opened on, so it closes itself after navigation.
  const [openOnPath, setOpenOnPath] = useState<string | null>(null);
  const open = openOnPath === pathname;
  const setOpen = (value: boolean) => setOpenOnPath(value ? pathname : null);
  const signOut = useSignOut();
  const [saved, setSaved] = useState<number | null>(null);
  const isLogin = pathname.startsWith("/login");

  // Shortlist count badge; refreshed on navigation and when a page announces a change.
  useEffect(() => {
    if (isLogin) return;
    const load = () =>
      api.shortlist
        .list()
        .then((d) => setSaved(d.shortlist.length))
        .catch(() => undefined); // The badge is optional; pages show their own errors.
    load();
    window.addEventListener(SHORTLIST_CHANGED, load);
    return () => window.removeEventListener(SHORTLIST_CHANGED, load);
  }, [pathname, isLogin]);

  if (isLogin) return <>{children}</>;

  const nav = (
    <nav className="flex flex-col gap-0.5">
      {NAV.map(({ href, label, icon: Icon, badge }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[14px] transition ${
              active ? "bg-white/[0.06] text-fg" : "text-muted hover:bg-white/[0.03] hover:text-fg"
            }`}
          >
            <span
              className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-violet to-blue transition-all duration-300 ${
                active ? "opacity-100" : "scale-y-0 opacity-0"
              }`}
            />
            <Icon size={17} strokeWidth={1.8} className={`transition ${active ? "text-violet" : "group-hover:text-fg-2"}`} />
            <span className="flex-1">{label}</span>
            {badge && saved != null && saved > 0 && (
              <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-fg-2">{saved}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="space-y-3">
      <div className="rounded-xl border border-edge bg-gradient-to-br from-violet/10 to-transparent p-3">
        <p className="flex items-center gap-1.5 text-[12px] font-medium text-fg">
          <Sparkles size={13} className="text-violet" /> AI agent
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-muted">10 tools · 4 write to Supabase. Ask it anything on the dashboard.</p>
      </div>
      <div className="flex items-center gap-3 rounded-xl px-2 py-1.5">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet to-blue text-[12px] font-semibold text-white">DK</span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[13.5px] font-medium">Divya K</p>
          <p className="font-mono text-[11px] text-muted">S001</p>
        </div>
        <button onClick={signOut} aria-label="Log out" title="Log out" className="rounded-lg p-2 text-muted transition hover:bg-bad/10 hover:text-bad">
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );

  const brand = (
    <Link href="/" className="flex items-center gap-2.5 px-2">
      <span className="relative grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-br from-violet to-blue shadow-[0_6px_20px_-6px_rgb(116_97_240/0.9)]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 17l5-5 4 4 7-8" />
          <path d="M15 8h5v5" />
        </svg>
      </span>
      <span className="text-[15px] font-semibold tracking-[-0.01em]">CareerCraft</span>
    </Link>
  );

  return (
    <div className="lg:pl-[248px]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col justify-between border-r border-edge bg-panel/60 px-3 py-5 lg:flex">
        <div className="space-y-7">
          {brand}
          <div>
            <p className="eyebrow mb-2 px-3">Menu</p>
            {nav}
          </div>
        </div>
        {footer}
      </aside>

      {/* Mobile top bar */}
      <header className="glass sticky top-0 z-30 flex h-14 items-center justify-between border-x-0 border-t-0 px-4 lg:hidden">
        {brand}
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-lg p-2 text-fg-2 hover:bg-white/[0.05]">
          <Menu size={20} />
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="animate-fade absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="animate-sheet relative flex h-full w-[280px] flex-col justify-between border-r border-edge bg-panel px-3 py-5">
            <div className="space-y-7">
              <div className="flex items-center justify-between">
                {brand}
                <button onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-lg p-2 text-muted hover:bg-white/[0.05]">
                  <X size={18} />
                </button>
              </div>
              {nav}
            </div>
            {footer}
          </aside>
        </div>
      )}

      <main key={pathname} className="animate-fade relative min-h-screen">
        <div className="page-glow" aria-hidden />
        <div className="relative mx-auto max-w-[1280px] px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Job Chat" },
  { href: "/jobs", label: "Jobs" },
  { href: "/shortlist", label: "My Shortlist" },
  { href: "/profile", label: "My Profile" },
];

export default function NavBar() {
  const pathname = usePathname();
  if (pathname.startsWith("/login")) return null;

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-sm font-bold text-white">CM</span>
          <span>
            <span className="block font-semibold leading-tight">CareerCraft</span>
            <span className="block text-xs leading-tight text-slate-500">Job Match Agent · S001 Divya K</span>
          </span>
        </Link>
        <nav className="flex w-full items-center gap-1 overflow-x-auto text-sm sm:w-auto">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 ${
                  active ? "bg-indigo-50 font-medium text-indigo-700" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <button onClick={logout} className="ml-auto whitespace-nowrap px-2 text-slate-400 hover:text-slate-800 sm:ml-2">
            Log out
          </button>
        </nav>
      </div>
    </header>
  );
}

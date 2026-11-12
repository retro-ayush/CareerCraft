"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, ShieldCheck, TriangleAlert } from "lucide-react";
import { api } from "@/lib/apiClient";

export default function LoginPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.login(passcode);
      setSuccess(true);
      router.replace("/");
      router.refresh();
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="animate-float absolute left-1/2 top-[-180px] h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(116_97_240/0.35),transparent)] blur-2xl" />
        <div className="absolute bottom-[-220px] right-[-120px] h-[460px] w-[460px] rounded-full bg-[radial-gradient(closest-side,rgb(79_140_255/0.22),transparent)] blur-2xl" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: "linear-gradient(rgb(255 255 255 / 0.04) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.04) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
      </div>

      <div className="relative w-full max-w-[400px]">
        <div className="animate-enter mb-8 flex flex-col items-center text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet to-blue shadow-[0_12px_40px_-10px_rgb(116_97_240/1)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 17l5-5 4 4 7-8" />
              <path d="M15 8h5v5" />
            </svg>
          </span>
          <h1 className="mt-5 text-[26px] font-semibold tracking-[-0.03em]">Welcome to CareerCraft</h1>
          <p className="mt-1.5 text-[14px] text-muted">Your AI career assistant for jobs you&rsquo;re ready for.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          key={error}
          className={`glass ring-gradient rounded-2xl p-6 shadow-[0_32px_80px_-32px_rgb(0_0_0/0.9)] ${error ? "animate-shake" : "animate-enter"}`}
        >
          <label htmlFor="passcode" className="text-[13px] font-medium text-fg-2">
            Team passcode
          </label>
          <div className="relative mt-2">
            <KeyRound size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              id="passcode"
              type={show ? "text" : "password"}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="field !py-3 !pl-10 !pr-11"
              placeholder="Enter the shared passcode"
              autoFocus
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              aria-label={show ? "Hide passcode" : "Show passcode"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted transition hover:bg-white/[0.06] hover:text-fg"
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <p className="mt-3 flex items-center gap-2 rounded-lg border border-bad/20 bg-bad/10 px-3 py-2 text-[13px] text-bad">
              <TriangleAlert size={14} /> {error}
            </p>
          )}
          {success && (
            <p className="mt-3 flex items-center gap-2 rounded-lg border border-good/20 bg-good/10 px-3 py-2 text-[13px] text-good">
              <CheckCircle2 size={14} /> Signed in. Opening your dashboard…
            </p>
          )}

          <button type="submit" disabled={loading || !passcode} className="btn mt-5 w-full !py-3">
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> {success ? "Redirecting…" : "Checking…"}
              </>
            ) : (
              <>
                Continue <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <p className="animate-enter mt-6 flex items-center justify-center gap-1.5 text-[12.5px] text-muted">
          <ShieldCheck size={14} /> The passcode keeps the app and the model quota private.
        </p>
      </div>
    </main>
  );
}

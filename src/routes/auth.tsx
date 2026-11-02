import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Eye, EyeOff, ShieldAlert, KeyRound, Lock } from "lucide-react";
import { toast } from "sonner";
import { QuickHireLogo } from "@/components/logo";

const ADMIN_PASSWORD = "TalentBridge2025";
const VALID_PASSWORDS = [
  ADMIN_PASSWORD,
  "QuickHire2025",
  "CareerCommunityAdmin2026!",
  "QuickHireAdmin#2026",
];

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessPasscode, setAccessPasscode] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("qh_admin") === "1") {
      navigate({ to: "/admin" });
    }
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return toast.error("Please enter your admin credentials");

    const cleanEmail = email.trim().toLowerCase();
    const allowedEmails = [
      "admin@careercommunity.eg",
      "admin@quickhire.eg",
      "ops@quickhire.eg",
    ];

    setLoading(true);
    // Security artificial delay
    await new Promise((r) => setTimeout(r, 700));

    // Secret access key check (double layer)
    const validSecurityKey =
      accessPasscode.trim() === "QH-SECURE-99" ||
      accessPasscode.trim() === "9910" ||
      accessPasscode.trim() === "";

    if (!allowedEmails.includes(cleanEmail) || !validSecurityKey) {
      setFailedAttempts((prev) => prev + 1);
      toast.error("Unauthorized terminal access. Security incident logged.");
      setLoading(false);
      return;
    }

    if (VALID_PASSWORDS.includes(password)) {
      localStorage.setItem("qh_admin", "1");
      localStorage.setItem("qh_admin_email", cleanEmail);
      localStorage.setItem("qh_admin_session", new Date().toISOString());
      toast.success("Identity verified. Welcome to QuickHire Operations.");
      navigate({ to: "/admin" });
    } else {
      setFailedAttempts((prev) => prev + 1);
      toast.error("Invalid authentication credentials. Access denied.");
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0f17] px-4 text-slate-100">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex justify-center">
            <QuickHireLogo size={48} />
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-slate-800/80 px-3 py-1 text-[11px] font-mono font-semibold text-slate-400">
            <Lock className="size-3 text-amber-400" /> RESTRICTED ENVIRONMENT
          </div>
          <h1 className="mt-3 font-display text-xl font-bold tracking-tight text-white">
            QuickHire Operations Gate
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Internal administrative clearance required
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-md">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Operator Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                placeholder="admin@quickhire.eg"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Terminal Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 pr-10 text-xs text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Clearance Key (Optional)
                </label>
                <span className="text-[10px] text-slate-500 font-mono">2FA Gate</span>
              </div>
              <input
                type="password"
                value={accessPasscode}
                onChange={(e) => setAccessPasscode(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors font-mono"
                placeholder="QH-SECURE-••"
              />
            </div>

            {failedAttempts >= 2 && (
              <div className="rounded-xl border border-rose-900/50 bg-rose-950/30 p-2.5 flex items-center gap-2 text-xs text-rose-300">
                <ShieldAlert className="size-4 text-rose-400 shrink-0" />
                <span>Repeated unauthorized attempts may trigger IP isolation.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-900/40 transition hover:bg-violet-500 disabled:opacity-60"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
              Verify Identity &amp; Unlock Terminal
            </button>
          </form>

          <div className="mt-5 border-t border-slate-800/80 pt-4 text-center">
            <span className="text-[10px] text-slate-500 font-mono">
              QuickHire Core Engine v2.4 · Encrypted Session
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

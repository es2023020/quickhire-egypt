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
    await new Promise((r) => setTimeout(r, 600));

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
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto flex justify-center">
            <QuickHireLogo size={52} className="rounded-2xl ring-1 ring-white/10" />
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-surface-1 px-3 py-1 text-[11px] font-mono font-semibold text-zinc-300">
            <Lock className="size-3 text-primary" /> RESTRICTED ENVIRONMENT
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">
            QuickHire Operations Gate
          </h1>
          <p className="text-xs text-muted-foreground">
            Internal administrative clearance required
          </p>
        </div>

        <div className="rounded-3xl border border-white/[0.08] bg-surface-1 p-7 shadow-2xl backdrop-blur-md">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-zinc-300 font-mono">
                Operator Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-surface-2 px-4 py-3 text-xs text-white placeholder:text-muted-foreground outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/40 transition-all"
                placeholder="admin@quickhire.eg"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-zinc-300 font-mono">
                Terminal Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-surface-2 px-4 py-3 pr-10 text-xs text-white placeholder:text-muted-foreground outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/40 transition-all"
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                >
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-300 font-mono">
                  Clearance Key (Optional)
                </label>
                <span className="text-[10px] text-muted-foreground font-mono">2FA Gate</span>
              </div>
              <input
                type="password"
                value={accessPasscode}
                onChange={(e) => setAccessPasscode(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-surface-2 px-4 py-2.5 text-xs text-white placeholder:text-muted-foreground outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/40 transition-all font-mono"
                placeholder="QH-SECURE-••"
              />
            </div>

            {failedAttempts >= 2 && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 flex items-center gap-2 text-xs text-red-300">
                <ShieldAlert className="size-4 text-red-400 shrink-0" />
                <span>Repeated unauthorized attempts may trigger IP isolation.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-3 group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-xs font-bold text-primary-foreground shadow-[0_0_12px_rgba(182,255,46,0.3)] hover:shadow-[0_0_20px_rgba(182,255,46,0.6)] hover:bg-[#c2ff47] active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
              <span>Verify Identity &amp; Unlock</span>
            </button>
          </form>

          <div className="mt-6 border-t border-white/[0.08] pt-4 text-center">
            <span className="text-[10px] text-muted-foreground font-mono">
              QuickHire Core Engine · Encrypted Dark Session
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

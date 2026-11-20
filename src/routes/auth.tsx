import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Eye, EyeOff, ShieldAlert, KeyRound, Lock } from "lucide-react";
import { toast } from "sonner";
import { QuickHireLogo } from "@/components/logo";
import { supabase } from "@/integrations/supabase/client";

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        localStorage.setItem("qh_admin", "1");
        navigate({ to: "/admin" });
      }
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return toast.error("Please enter your operator email");
    if (!password.trim()) return toast.error("Please enter your password");

    const cleanEmail = email.trim().toLowerCase();
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password.trim(),
      });

      if (authError || !authData.session) {
        setFailedAttempts((prev) => prev + 1);
        toast.error(authError?.message || "Invalid authentication credentials. Access denied.");
        setLoading(false);
        return;
      }

      localStorage.setItem("qh_admin", "1");
      localStorage.setItem("qh_admin_email", cleanEmail);
      localStorage.setItem("qh_admin_session", new Date().toISOString());
      toast.success("Identity verified via Supabase Auth. Welcome to QuickHire Operations.");
      navigate({ to: "/admin" });
    } catch (err: any) {
      setFailedAttempts((prev) => prev + 1);
      toast.error(err?.message || "Authentication service error.");
    } finally {
      setLoading(false);
    }
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
            Supabase Cryptographic Authentication Required
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
                placeholder="admin@quickhire.eg"
                className="w-full rounded-xl border border-white/10 bg-surface-2 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono transition-colors"
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-300 font-mono">
                  Master Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="text-xs text-muted-foreground hover:text-white transition-colors flex items-center gap-1"
                >
                  {showPw ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  <span>{showPw ? "Hide" : "Show"}</span>
                </button>
              </div>
              <input
                type={showPw ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-white/10 bg-surface-2 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono transition-colors"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <KeyRound className="size-4" />
                  <span>Authorize Session</span>
                </>
              )}
            </button>
          </form>

          {failedAttempts > 0 && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
              <ShieldAlert className="size-4 shrink-0" />
              <span>Failed verification attempt recorded.</span>
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-[11px] font-mono text-zinc-300">
            SECURED WITH SUPABASE ROW LEVEL SECURITY (RLS)
          </p>
        </div>
      </div>
    </div>
  );
}

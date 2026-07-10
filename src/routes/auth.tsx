import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Zap, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const ADMIN_PASSWORD = "QuickHire2025";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Admin Portal — QuickHire" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("qh_admin") === "1") {
      navigate({ to: "/admin" });
    }
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return toast.error("Please enter an email address");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem("qh_admin", "1");
      localStorage.setItem("qh_admin_email", email.trim());
      toast.success("Welcome back");
      navigate({ to: "/admin" });
    } else {
      toast.error("Incorrect password. Contact your system administrator.");
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand-gradient px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-hero shadow-lift">
            <Zap className="size-7 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold text-ink">QuickHire Portal</h1>
          <p className="mt-1 text-sm text-muted-foreground">Authorised personnel only</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-lift">
          <h2 className="mb-6 font-display text-xl">Sign in to your account</h2>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="admin@quickhire.eg"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-90 disabled:opacity-60"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              Sign in
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Access restricted. For assistance contact your system administrator.
        </p>
      </div>
    </div>
  );
}

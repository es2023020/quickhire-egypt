import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Briefcase, LogOut, Zap,
  BarChart3, CalendarDays, KanbanSquare, ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/applicants", label: "Applicants", icon: Users },
  { to: "/admin/pipeline", label: "Pipeline", icon: KanbanSquare },
  { to: "/admin/offers", label: "Job Offers", icon: Briefcase },
  { to: "/admin/interviews", label: "Interviews", icon: CalendarDays },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
] as const;

export function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-card shadow-soft sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
        <div className="flex size-9 items-center justify-center rounded-xl bg-hero shadow-soft">
          <Zap className="size-4 text-white" />
        </div>
        <div>
          <div className="font-display text-base font-bold text-ink leading-tight">
            Quick<span className="text-primary">Hire</span>
          </div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Admin Portal</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Main
        </div>
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const active = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to) && item.to !== "/admin";
            const isAdminRoot = item.to === "/admin" && item.exact;
            const isActive = isAdminRoot
              ? location.pathname === "/admin" || location.pathname === "/admin/"
              : location.pathname.startsWith(item.to) && item.to !== "/admin";

            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                    isActive || (item.exact && location.pathname === "/admin")
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "text-muted-foreground hover:bg-sand hover:text-foreground",
                  )}
                >
                  <item.icon className="size-4 shrink-0" />
                  {item.label}
                  {!isActive && <ChevronRight className="ml-auto size-3.5 opacity-30" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-4 space-y-2">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-sand hover:text-foreground transition-colors"
        >
          <Zap className="size-4" />
          View public site
        </a>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="size-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

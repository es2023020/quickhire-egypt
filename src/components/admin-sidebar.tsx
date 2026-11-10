import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Briefcase, LogOut,
  BarChart3, CalendarDays, KanbanSquare, Globe, X,
  ChevronRight, Banknote,
} from "lucide-react";
import { QuickHireLogo } from "@/components/logo";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/applicants", label: "Applicants", icon: Users },
  { to: "/admin/pipeline", label: "Pipeline", icon: KanbanSquare },
  { to: "/admin/offers", label: "Job Offers", icon: Briefcase },
  { to: "/admin/interviews", label: "Interviews", icon: CalendarDays },
  { to: "/admin/billing", label: "Billing & Bounties", icon: Banknote },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
] as const;

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  function signOut() {
    localStorage.removeItem("qh_admin");
    localStorage.removeItem("qh_admin_email");
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  function isActive(item: (typeof navItems)[number]) {
    if (item.exact) return location.pathname === item.to || location.pathname === item.to + "/";
    return location.pathname.startsWith(item.to);
  }

  const adminEmail =
    (typeof window !== "undefined" && localStorage.getItem("qh_admin_email")) || "admin@quickhire.eg";
  const initials = adminEmail.slice(0, 2).toUpperCase();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-surface-1 border-r border-white/[0.08] shadow-2xl transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:shadow-none lg:z-auto",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      {/* Logo area */}
      <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-5">
        <Link to="/admin" className="flex items-center gap-3" onClick={onClose}>
          <QuickHireLogo size={34} className="rounded-xl ring-1 ring-white/10" />
          <div>
            <div className="font-display text-base font-bold text-white tracking-tight leading-tight">
              Quick<span className="text-primary">Hire</span>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Admin Engine</div>
          </div>
        </Link>
        <button
          onClick={onClose}
          className="rounded-xl p-2 text-muted-foreground hover:bg-surface-2 hover:text-white lg:hidden transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        <div>
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Management
          </p>
          <ul className="space-y-1">
            {navItems.map((item) => {
              const active = isActive(item);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onClose}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all duration-200",
                      active
                        ? "bg-primary text-primary-foreground shadow-[0_0_12px_rgba(182,255,46,0.3)]"
                        : "text-zinc-400 hover:bg-white/[0.06] hover:text-white",
                    )}
                  >
                    <item.icon className={cn("size-4 shrink-0 transition-colors", active ? "text-primary-foreground" : "text-zinc-400 group-hover:text-primary")} />
                    <span>{item.label}</span>
                    {!active && (
                      <ChevronRight className="ml-auto size-3 opacity-0 transition-opacity group-hover:opacity-40" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Divider */}
        <div className="border-t border-white/[0.06]" />

        <div>
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Quick Actions
          </p>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-zinc-400 hover:bg-white/[0.06] hover:text-white transition-all duration-200"
          >
            <Globe className="size-4 shrink-0 text-zinc-400 group-hover:text-primary" />
            <span>Public Website</span>
            <span className="ml-auto text-xs text-muted-foreground">↗</span>
          </a>
        </div>
      </nav>

      {/* User footer */}
      <div className="border-t border-white/[0.08] p-4 bg-surface-2/40">
        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 mb-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 text-primary text-xs font-bold shadow-[0_0_10px_rgba(182,255,46,0.15)]">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="truncate text-xs font-bold text-white">{adminEmail}</div>
            <div className="text-[10px] text-muted-foreground">Authorized Operator</div>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 cursor-pointer"
        >
          <LogOut className="size-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

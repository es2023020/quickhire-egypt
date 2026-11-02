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
        "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white border-r border-border/60 shadow-xl transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:shadow-none lg:z-auto",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      {/* Logo area */}
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
        <Link to="/admin" className="flex items-center gap-2.5" onClick={onClose}>
          <QuickHireLogo size={32} />
          <div>
            <div className="font-display text-[14px] font-bold text-ink leading-tight">
              QuickHire
            </div>
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Admin Portal</div>
          </div>
        </Link>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-sand hover:text-foreground lg:hidden"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Navigation
        </p>
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const active = isActive(item);
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={onClose}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                    active
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "text-muted-foreground hover:bg-sand hover:text-ink",
                  )}
                >
                  <item.icon className={cn("size-4 shrink-0", active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary")} />
                  <span>{item.label}</span>
                  {!active && (
                    <ChevronRight className="ml-auto size-3 opacity-0 transition-opacity group-hover:opacity-30" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Divider */}
        <div className="my-4 border-t border-border/50" />

        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          External
        </p>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-sand hover:text-ink transition-all duration-150"
        >
          <Globe className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
          <span>Public site</span>
          <span className="ml-auto text-[10px] text-muted-foreground/50">↗</span>
        </a>
      </nav>

      {/* User footer */}
      <div className="border-t border-border/60 p-3">
        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 mb-1">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="truncate text-xs font-semibold text-ink">{adminEmail}</div>
            <div className="text-[10px] text-muted-foreground">Administrator</div>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-all duration-150"
        >
          <LogOut className="size-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

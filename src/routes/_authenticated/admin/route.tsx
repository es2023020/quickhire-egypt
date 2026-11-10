import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { Menu } from "lucide-react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Link } from "@tanstack/react-router";
import { QuickHireLogo } from "@/components/logo";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex items-center gap-3 border-b border-white/[0.08] bg-surface-1 px-5 py-3.5 shadow-md lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-xl p-2 text-muted-foreground hover:bg-surface-2 hover:text-white transition-colors"
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>
          <Link to="/admin" className="flex items-center gap-2.5">
            <QuickHireLogo size={28} className="rounded-lg" />
            <span className="font-display text-base font-bold text-white tracking-tight">
              Quick<span className="text-primary">Hire</span>
            </span>
          </Link>
          <div className="ml-auto text-xs font-semibold text-primary">Admin</div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

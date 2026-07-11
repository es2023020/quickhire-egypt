import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, BriefcaseBusiness } from "lucide-react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f6f7f9]">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex items-center gap-3 border-b border-border/60 bg-white px-4 py-3 shadow-sm lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-sand hover:text-foreground transition-colors"
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>
          <Link to="/admin" className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80">
              <BriefcaseBusiness className="size-3.5 text-white" />
            </div>
            <span className="font-display text-base font-bold text-ink">
              Talent<span className="text-primary">Bridge</span>
            </span>
          </Link>
          <div className="ml-auto text-xs text-muted-foreground">Admin</div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

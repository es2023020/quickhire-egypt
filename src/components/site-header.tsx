import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickHireLogo } from "@/components/logo";

const nav = [
  { to: "/", label: "Home" },
  { to: "/offers", label: "Jobs" },
  { to: "/prep", label: "Resources" },
  { to: "/how-it-works", label: "How it works" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsAdmin(typeof window !== "undefined" && localStorage.getItem("qh_admin") === "1");
  }, []);

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const isAdminRoute = location.pathname.startsWith("/admin");
  if (isAdminRoute) return null;

  return (
    <header className={cn(
      "sticky top-0 z-40 border-b transition-all duration-200",
      scrolled
        ? "border-border/60 bg-background/95 shadow-soft backdrop-blur-md"
        : "border-border/30 bg-background/80 backdrop-blur-sm",
    )}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2.5 group">
          <QuickHireLogo size={36} />
          <div className="leading-tight">
            <div className="font-display text-lg font-bold text-ink tracking-tight">
              QuickHire
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-sand",
                "[&.active]:text-foreground [&.active]:bg-sand [&.active]:font-semibold",
              )}
              activeOptions={{ exact: n.to === "/" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            to="/offers"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-90"
          >
            Browse Jobs →
          </Link>
        </div>

        <button
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          className="rounded-lg p-2 hover:bg-sand md:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/50 bg-background/95 backdrop-blur-md md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-sand">
                {n.label}
              </Link>
            ))}
            <Link to="/offers" className="mt-1 rounded-lg bg-primary px-3 py-2.5 text-center text-sm font-semibold text-primary-foreground">
              Browse Jobs →
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

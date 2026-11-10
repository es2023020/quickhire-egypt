import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickHireLogo } from "@/components/logo";

const nav = [
  { to: "/", label: "Home" },
  { to: "/offers", label: "Jobs" },
  { to: "/referrals", label: "Refer & Earn" },
  { to: "/track", label: "Track Application" },
  { to: "/prep", label: "Resources" },
  { to: "/how-it-works", label: "How it works" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const isCustomLayoutRoute =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/wave") ||
    location.pathname.startsWith("/c/");
  if (isCustomLayoutRoute) return null;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-all duration-300",
        scrolled
          ? "border-white/[0.08] bg-[#08090B]/95 shadow-2xl backdrop-blur-md"
          : "border-white/[0.04] bg-[#08090B]/80 backdrop-blur-sm",
      )}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 md:px-8">
        <Link to="/" className="flex items-center gap-3 group">
          <QuickHireLogo size={38} className="rounded-xl ring-1 ring-white/10 group-hover:ring-primary/40 transition-all duration-300" />
          <div className="leading-tight">
            <div className="font-display text-xl font-bold tracking-tight text-white">
              Quick<span className="text-primary">Hire</span>
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Egypt
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:text-white hover:bg-white/[0.06]",
                "[&.active]:text-white [&.active]:bg-white/[0.08] [&.active]:font-semibold [&.active]:border [&.active]:border-white/10",
              )}
              activeOptions={{ exact: n.to === "/" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/offers"
            className="group inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-[0_0_12px_rgba(182,255,46,0.25)] hover:shadow-[0_0_20px_rgba(182,255,46,0.55)] hover:bg-[#c4ff47] active:scale-[0.98] transition-all duration-200"
          >
            <span>Browse Jobs</span>
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <button
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          className="rounded-xl border border-white/10 p-2.5 text-muted-foreground hover:text-white hover:bg-white/[0.06] md:hidden transition-colors"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/[0.08] bg-[#08090B]/98 backdrop-blur-xl md:hidden px-6 py-5 shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <nav className="mx-auto flex max-w-7xl flex-col gap-2">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                {n.label}
              </Link>
            ))}
            <Link
              to="/offers"
              className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-center text-sm font-bold text-primary-foreground shadow-[0_0_15px_rgba(182,255,46,0.35)]"
            >
              Browse Jobs <ArrowRight className="size-4" />
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

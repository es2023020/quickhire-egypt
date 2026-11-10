import { Link, useLocation } from "@tanstack/react-router";
import { QuickHireLogo } from "@/components/logo";
import { Phone, Mail, MapPin, Sparkles, ArrowRight } from "lucide-react";

export function SiteFooter() {
  const location = useLocation();
  if (
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/wave") ||
    location.pathname.startsWith("/c/")
  )
    return null;

  return (
    <footer className="border-t border-white/[0.08] bg-[#0A0B0F] relative overflow-hidden">
      {/* Subtle midnight ambient glow */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 w-3/4 h-24 bg-primary/[0.03] blur-3xl pointer-events-none" />

      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-18 md:grid-cols-4 md:px-8">
        <div className="md:col-span-2 space-y-5">
          <div className="flex items-center gap-3">
            <QuickHireLogo size={36} className="ring-1 ring-white/10 rounded-xl" />
            <div className="font-display text-2xl font-bold tracking-tight text-white">
              Quick<span className="text-primary">Hire</span>
            </div>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            Egypt's premier recruitment and hiring platform for high-velocity sales, call center,
            and business development talent. Direct HR connection with AI screening.
          </p>
          <div className="space-y-2.5 text-sm text-muted-foreground pt-1">
            <div className="flex items-center gap-2.5 text-zinc-300">
              <MapPin className="size-4 shrink-0 text-primary" /> Cairo, Egypt
            </div>
            <div className="flex items-center gap-2.5 text-zinc-300">
              <Mail className="size-4 shrink-0 text-primary" /> hello@quickhire.eg
            </div>
            <a
              href="https://wa.me/201029324783"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 text-zinc-300 hover:text-primary transition-colors group"
            >
              <Phone className="size-4 shrink-0 text-primary" />
              <span>+20 102 932 4783</span>
              <span className="text-xs text-primary/80 group-hover:underline">(WhatsApp)</span>
            </a>
          </div>
        </div>

        <div>
          <div className="mb-4 text-xs font-bold uppercase tracking-wider text-white">Candidates</div>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li>
              <Link to="/offers" className="hover:text-white transition-colors">
                Browse Live Jobs
              </Link>
            </li>
            <li>
              <Link to="/track" className="hover:text-white transition-colors">
                Track Application
              </Link>
            </li>
            <li>
              <Link to="/prep" className="hover:text-white transition-colors">
                Interview Prep Kit
              </Link>
            </li>
            <li>
              <Link to="/how-it-works" className="hover:text-white transition-colors">
                How It Works
              </Link>
            </li>
            <li>
              <Link to="/referrals" className="text-primary hover:underline font-semibold flex items-center gap-1.5">
                <span>Refer &amp; Earn Bounties</span>
                <span className="text-[10px] bg-primary/20 border border-primary/30 px-1.5 py-0.2 rounded-full">Cash</span>
              </Link>
            </li>
          </ul>

          <div className="mb-3 mt-8 text-xs font-bold uppercase tracking-wider text-white">Key Roles</div>
          <ul className="space-y-2 text-xs text-muted-foreground">
            {[
              "Sales Representatives",
              "Call Center Specialists",
              "SDRs & Cold Callers",
              "Account Executives",
              "Customer Support Pros",
            ].map((r) => (
              <li key={r} className="flex items-center gap-2">
                <span className="size-1 rounded-full bg-primary/70" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-6">
          <div>
            <div className="mb-4 text-xs font-bold uppercase tracking-wider text-white">Company</div>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <span className="hover:text-white cursor-pointer transition-colors">About Us</span>
              </li>
              <li>
                <span className="hover:text-white cursor-pointer transition-colors">For Employers</span>
              </li>
              <li>
                <span className="hover:text-white cursor-pointer transition-colors">Privacy & Terms</span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-surface-2 p-5 shadow-lg">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
              <Sparkles className="size-3.5" /> 100% Free For Candidates
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              QuickHire never charges candidates. We only earn a fee from vetted employers when you get successfully hired.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.06] bg-[#07080A] py-6 px-6 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} QuickHire Egypt. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-primary animate-pulse" />
              <span>Operational & Hiring 24/7</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

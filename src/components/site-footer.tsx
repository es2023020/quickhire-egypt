import { Link, useLocation } from "@tanstack/react-router";
import { QuickHireLogo } from "@/components/logo";
import { Phone, Mail, MapPin } from "lucide-react";

export function SiteFooter() {
  const location = useLocation();
  if (location.pathname.startsWith("/admin")) return null;
  return (
    <footer className="border-t border-border/50 bg-sand">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4 md:px-6">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5">
            <QuickHireLogo size={32} />
            <div className="font-display text-xl font-bold text-ink">
              QuickHire
            </div>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Egypt's premier hiring platform for sales, call center, and business development talent.
            Apply once — AI scores you — HR calls you directly.
          </p>
          <div className="mt-5 space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><MapPin className="size-3.5 shrink-0" /> Cairo, Egypt</div>
            <div className="flex items-center gap-2"><Mail className="size-3.5 shrink-0" /> hello@quickhire.eg</div>
            <a href="https://wa.me/201029324783" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors">
              <Phone className="size-3.5 shrink-0" /> +20 102 932 4783 (WhatsApp)
            </a>
          </div>
        </div>
        <div>
          <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-ink">Candidates</div>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li><Link to="/offers" className="hover:text-primary transition-colors">Browse Jobs</Link></li>
            <li><Link to="/prep" className="hover:text-primary transition-colors">Interview Prep</Link></li>
            <li><Link to="/how-it-works" className="hover:text-primary transition-colors">How It Works</Link></li>
          </ul>
          <div className="mb-4 mt-6 text-sm font-semibold uppercase tracking-wider text-ink">Roles We Place</div>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {["Sales Representatives", "Call Center Agents", "SDRs", "Telesales", "Account Executives", "Cold Callers"].map(r => (
              <li key={r} className="flex items-center gap-1.5">
                <span className="size-1 rounded-full bg-primary/40" />
                {r}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-ink">Company</div>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li><span className="hover:text-primary cursor-pointer transition-colors">About Us</span></li>
            <li><span className="hover:text-primary cursor-pointer transition-colors">For Employers</span></li>
            <li><span className="hover:text-primary cursor-pointer transition-colors">Privacy Policy</span></li>
          </ul>
          <div className="mt-8 rounded-xl bg-primary/5 border border-primary/10 p-4">
            <div className="text-xs font-semibold text-primary uppercase tracking-wider">100% Free</div>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              QuickHire is always free for candidates. We're paid by employers when you get placed.
            </p>
          </div>
        </div>
      </div>
      <div className="border-t border-border/60 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} QuickHire. Built for Egypt's sales & call center ecosystem.
      </div>
    </footer>
  );
}

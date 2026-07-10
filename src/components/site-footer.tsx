import { Link, useLocation } from "@tanstack/react-router";

export function SiteFooter() {
  const location = useLocation();
  if (location.pathname.startsWith("/admin")) return null;
  return (
    <footer className="border-t border-border/50 bg-sand">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-4 md:px-6">
        <div className="md:col-span-2">
          <div className="font-display text-xl font-semibold text-ink">HireEgypt</div>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            Egypt's hiring-as-a-service platform for call center, sales and multilingual
            talent. One application, direct to the HRs who hire.
          </p>
        </div>
        <div>
          <div className="text-sm font-semibold">Candidates</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/offers">Browse Jobs</Link></li>
            <li><Link to="/prep">Study & Prep</Link></li>
            <li><Link to="/how-it-works">How it works</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-semibold">Legal</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Your data is stored securely.</li>
            <li>Only shortlisted candidates are contacted.</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} HireEgypt. Built for Egypt's HR ecosystem.
      </div>
    </footer>
  );
}

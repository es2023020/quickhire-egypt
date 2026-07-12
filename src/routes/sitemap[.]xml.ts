import { createFileRoute } from "@tanstack/react-router";
import { BUILT_IN_OFFERS } from "@/lib/data";

// Base URL for the site – you can set this in an env var if needed
const BASE_URL = process.env.BASE_URL ?? "";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        // Use the built‑in offers list instead of querying Supabase
        const offers = BUILT_IN_OFFERS.filter((o) => o.status === "active");

        const entries = [
          { path: "/", priority: "1.0", changefreq: "weekly" },
          { path: "/offers", priority: "0.9", changefreq: "daily" },
          { path: "/prep", priority: "0.7", changefreq: "weekly" },
          { path: "/how-it-works", priority: "0.6", changefreq: "monthly" },
          ...offers.map((o) => ({ path: `/offers/${o.slug}`, priority: "0.8", changefreq: "weekly" as const })),
        ];

        const urls = entries.map(
          (e) => `  <url>\n    <loc>${BASE_URL}${e.path}</loc>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`
        );
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;

        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});

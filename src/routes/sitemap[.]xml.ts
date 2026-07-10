import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const BASE_URL = "";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const sb = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );
        const { data: offers } = await sb
          .from("offers")
          .select("slug")
          .eq("status", "active");

        const entries = [
          { path: "/", priority: "1.0", changefreq: "weekly" },
          { path: "/offers", priority: "0.9", changefreq: "daily" },
          { path: "/prep", priority: "0.7", changefreq: "weekly" },
          { path: "/how-it-works", priority: "0.6", changefreq: "monthly" },
          ...(offers ?? []).map((o) => ({ path: `/offers/${o.slug}`, priority: "0.8", changefreq: "weekly" as const })),
        ];

        const urls = entries.map(
          (e) => `  <url>\n    <loc>${BASE_URL}${e.path}</loc>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`,
        );
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;

        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});

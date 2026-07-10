import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { adminListOffers, upsertOffer } from "@/lib/offers.functions";

export const Route = createFileRoute("/_authenticated/admin/offers")({
  head: () => ({ meta: [{ title: "Offers — HireEgypt Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminOffers,
});

function AdminOffers() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "offers"], queryFn: () => adminListOffers() });

  const toggle = useMutation({
    mutationFn: (o: { id: string; patch: Partial<{ status: "active" | "archived"; featured: boolean }> }) => {
      const existing = data?.find((x) => x.id === o.id);
      if (!existing) throw new Error("Offer missing");
      return upsertOffer({
        data: {
          id: existing.id,
          slug: existing.slug,
          title: existing.title,
          company: existing.company,
          category: existing.category,
          language: existing.language,
          salary_text: existing.salary_text,
          salary_min: existing.salary_min,
          location: existing.location,
          shift_type: existing.shift_type,
          summary: existing.summary,
          description: existing.description,
          requirements: existing.requirements ?? [],
          benefits: existing.benefits ?? [],
          form_schema: existing.form_schema ?? {},
          hr_phone: existing.hr_phone,
          status: (o.patch.status ?? existing.status) as "active" | "archived",
          featured: o.patch.featured ?? existing.featured,
        },
      });
    },
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin", "offers"] });
      qc.invalidateQueries({ queryKey: ["offers", "public"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <Link to="/admin" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">← Dashboard</Link>
      <h1 className="mt-1 flex items-center gap-2 font-display text-3xl"><Briefcase className="size-6 text-primary" /> Job offers</h1>
      <p className="mt-1 text-sm text-muted-foreground">Toggle status and featured flag. Full offer editor coming soon.</p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        {isLoading ? (
          <div className="flex items-center justify-center p-16"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-sand text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3">Title</th>
                <th className="p-3">Company</th>
                <th className="p-3">Salary</th>
                <th className="p-3">Status</th>
                <th className="p-3">Featured</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="p-3 font-medium">{o.title}</td>
                  <td className="p-3 text-muted-foreground">{o.company}</td>
                  <td className="p-3 text-muted-foreground">{o.salary_text}</td>
                  <td className="p-3">
                    <button
                      onClick={() => toggle.mutate({ id: o.id, patch: { status: o.status === "active" ? "archived" : "active" } })}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${o.status === "active" ? "bg-success/15 text-success-foreground" : "bg-muted text-muted-foreground"}`}
                    >
                      {o.status}
                    </button>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => toggle.mutate({ id: o.id, patch: { featured: !o.featured } })}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${o.featured ? "bg-gold-gradient text-gold-foreground" : "bg-muted text-muted-foreground"}`}
                    >
                      <Star className="size-3" /> {o.featured ? "Featured" : "—"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

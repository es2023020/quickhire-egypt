import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { BookOpen, ExternalLink, GraduationCap, Sparkles } from "lucide-react";
import { listStudyResources, type StudyResource } from "@/lib/study.functions";

const studyQO = queryOptions({
  queryKey: ["study", "resources"],
  queryFn: () => listStudyResources(),
});

export const Route = createFileRoute("/prep")({
  head: () => ({
    meta: [
      { title: "Interview Prep & Study Materials — QuickHire" },
      { name: "description", content: "Free interview scripts, English fluency drills and call-center know-how curated for Egyptian candidates." },
      { property: "og:title", content: "Interview Prep — QuickHire" },
      { property: "og:description", content: "Sharpen your fluency and interview answers before you apply." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(studyQO),
  component: PrepPage,
});

function PrepPage() {
  const { data } = useSuspenseQuery(studyQO);
  const grouped = data.reduce<Record<string, StudyResource[]>>((acc, r) => {
    (acc[r.category] ||= []).push(r);
    return acc;
  }, {});
  const categories = Object.keys(grouped);

  return (
    <div>
      <section className="bg-hero text-primary-foreground">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center md:px-6 md:py-20">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs backdrop-blur">
            <Sparkles className="size-3.5" /> Free interview prep pack
          </span>
          <h1 className="mt-5 font-display text-4xl md:text-5xl text-balance">
            Walk into the interview like you've been there.
          </h1>
          <p className="mt-4 text-white/80">
            Curated scripts, English drills and behavioral answers — used by our top-scoring candidates.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 md:px-6">
        {categories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            Prep pack is being updated. Check back soon.
          </div>
        ) : (
          <div className="space-y-12">
            {categories.map((cat) => (
              <div key={cat}>
                <div className="mb-4 flex items-center gap-2">
                  <GraduationCap className="size-5 text-primary" />
                  <h2 className="font-display text-2xl">{cat}</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {grouped[cat].map((r) => (
                    <article key={r.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                      <div className="flex items-start gap-3">
                        <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                          <BookOpen className="size-4" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-display text-lg leading-snug">{r.title}</h3>
                          {r.description && <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>}
                          {r.content && <p className="mt-3 whitespace-pre-line text-sm text-foreground/90">{r.content}</p>}
                          {r.url && (
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                            >
                              Open resource <ExternalLink className="size-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

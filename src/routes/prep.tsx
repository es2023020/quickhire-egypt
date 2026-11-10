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
    <div className="bg-background text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero py-20 md:py-28 border-b border-white/[0.06]">
        <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] [background-size:4rem_4rem] pointer-events-none" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 size-96 rounded-full bg-primary/[0.08] blur-[100px] pointer-events-none" />

        <div className="relative mx-auto max-w-4xl px-6 text-center md:px-8 space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-surface-1 px-4 py-1.5 text-xs font-semibold text-zinc-300">
            <Sparkles className="size-3.5 text-primary" /> Free Candidate Training Kit
          </span>
          <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight text-white leading-tight">
            Walk In Prepared. Get Hired Confident.
          </h1>
          <p className="max-w-2xl mx-auto text-base md:text-lg text-[#E4E4E7]/90 leading-relaxed font-normal">
            Proven scripts, English fluency drills, and behavioral interview scenarios utilized by high-scoring candidates across Egypt.
          </p>
        </div>
      </section>

      {/* Categories & Resources Grid */}
      <section className="mx-auto max-w-5xl px-6 py-16 md:py-24 md:px-8">
        {categories.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/15 bg-surface-1 p-16 text-center text-muted-foreground shadow-xl">
            <BookOpen className="size-10 mx-auto text-muted-foreground/30 animate-pulse" />
            <p className="mt-4 text-base font-semibold text-white">Resource kit is being updated.</p>
            <p className="text-xs text-muted-foreground mt-1">Check back shortly — new material is added weekly.</p>
          </div>
        ) : (
          <div className="space-y-16">
            {categories.map((cat) => (
              <div key={cat} className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl border border-white/10 bg-surface-2 text-primary">
                    <GraduationCap className="size-5" />
                  </div>
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-white">{cat}</h2>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {grouped[cat].map((r) => (
                    <article
                      key={r.id}
                      className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-surface-1 p-7 shadow-xl shadow-black/40 transition-all duration-300 hover:border-white/20 hover:bg-surface-2"
                    >
                      <div>
                        <div className="flex items-start gap-4">
                          <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-surface-3 text-primary">
                            <BookOpen className="size-4.5" />
                          </div>
                          <div>
                            <h3 className="font-display text-xl font-bold text-white leading-snug">{r.title}</h3>
                            {r.description && (
                              <p className="mt-1.5 text-sm leading-relaxed text-[#E4E4E7]/90 font-normal">
                                {r.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {r.content && (
                          <div className="mt-5 rounded-xl border border-white/5 bg-surface-2 p-4 text-xs leading-relaxed text-zinc-300 font-normal whitespace-pre-line">
                            {r.content}
                          </div>
                        )}
                      </div>

                      {r.url && (
                        <div className="mt-6 pt-4 border-t border-white/[0.06]">
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
                          >
                            <span>Open Resource Guide</span>
                            <ExternalLink className="size-3.5" />
                          </a>
                        </div>
                      )}
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

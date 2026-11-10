import { cn } from "@/lib/utils";

export function ScorePill({ score, label }: { score: number | null; label?: string }) {
  const s = score ?? 0;
  const tone =
    score == null
      ? "bg-white/[0.04] text-muted-foreground border-white/10"
      : s >= 22
        ? "bg-primary/15 text-primary border-primary/30 shadow-[0_0_10px_rgba(182,255,46,0.15)]"
        : s >= 16
          ? "bg-amber-400/15 text-amber-300 border-amber-400/30"
          : "bg-red-500/15 text-red-400 border-red-500/30";

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold", tone)}>
      {label && <span className="text-[10px] uppercase tracking-wider opacity-80">{label}</span>}
      {score == null ? "—" : `${s}/30`}
    </span>
  );
}

import { cn } from "@/lib/utils";

export function ScorePill({ score, label }: { score: number | null; label?: string }) {
  const s = score ?? 0;
  const tone =
    score == null
      ? "bg-muted text-muted-foreground"
      : s >= 22
        ? "bg-success/15 text-success-foreground"
        : s >= 16
          ? "bg-gold/20 text-gold-foreground"
          : "bg-destructive/10 text-destructive";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", tone)}>
      {label && <span className="text-[10px] opacity-70">{label}</span>}
      {score == null ? "—" : `${s}/30`}
    </span>
  );
}

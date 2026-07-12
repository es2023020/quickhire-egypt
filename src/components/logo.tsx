import { cn } from "@/lib/utils";

export function QuickHireLogo({ className = "", size = 36 }: { className?: string; size?: number }) {
  return (
    <img
      src="/quickhire-logo.png"
      alt="QuickHire"
      style={{ width: size, height: size }}
      className={cn("rounded-xl object-contain", className)}
    />
  );
}

export function QuickHireWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display font-bold tracking-tight ${className}`}>
      Quick<span className="text-primary">Hire</span>
    </span>
  );
}

// Legacy aliases so we don't have to rename every import
export { QuickHireLogo as TalentBridgeLogo, QuickHireWordmark as TalentBridgeWordmark };

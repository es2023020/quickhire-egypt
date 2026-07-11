import { BriefcaseBusiness } from "lucide-react";

export function TalentBridgeLogo({ className = "", size = 36 }: { className?: string; size?: number }) {
  return (
    <div 
      style={{ width: size, height: size }}
      className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-soft ${className}`}
    >
      <BriefcaseBusiness className="text-white shrink-0" style={{ width: size * 0.5, height: size * 0.5 }} />
    </div>
  );
}

export function TalentBridgeWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display font-bold tracking-tight ${className}`}>
      Talent<span className="text-primary">Bridge</span>
    </span>
  );
}

import { cn } from "@/lib/utils";

export function QuickHireLogo({
  className = "",
  size = 36,
  variant = "image",
}: {
  className?: string;
  size?: number;
  variant?: "image" | "vector";
}) {
  if (variant === "vector") {
    return (
      <div
        style={{ width: size, height: size }}
        className={cn("relative shrink-0 select-none", className)}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_0_12px_rgba(182,255,46,0.35)]"
        >
          <defs>
            <linearGradient id="qh-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#13141B" />
              <stop offset="100%" stopColor="#08090C" />
            </linearGradient>
            <linearGradient id="qh-lime-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D2FF52" />
              <stop offset="100%" stopColor="#B6FF2E" />
            </linearGradient>
            <linearGradient id="qh-white-arc" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#D4D4D8" />
            </linearGradient>
            <filter id="qh-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Squircle Background Base */}
          <rect
            x="3"
            y="3"
            width="94"
            height="94"
            rx="24"
            fill="url(#qh-bg)"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="2"
          />

          {/* Glowing Inner Rim */}
          <rect
            x="4"
            y="4"
            width="92"
            height="92"
            rx="23"
            stroke="url(#qh-lime-grad)"
            strokeWidth="1"
            strokeOpacity="0.25"
          />

          {/* Circular Loop of the Q (Pure White) */}
          <path
            d="M 50 22 C 34.536 22 22 34.536 22 50 C 22 65.464 34.536 78 50 78 C 58.12 78 65.44 74.54 70.56 69.04"
            stroke="url(#qh-white-arc)"
            strokeWidth="8.5"
            strokeLinecap="round"
          />

          {/* Dynamic Velocity Arrow & Tail of the Q (Neon Lime #B6FF2E) */}
          <path
            d="M 43 57 L 64 36 M 64 36 L 48 36 M 64 36 L 64 52"
            stroke="url(#qh-lime-grad)"
            strokeWidth="8.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#qh-glow)"
          />

          {/* Central Pulse Dot */}
          <circle cx="36" cy="38" r="3" fill="#B6FF2E" />
        </svg>
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        "relative shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10 shadow-[0_0_12px_rgba(182,255,46,0.25)] bg-[#08090C]",
        className,
      )}
    >
      <img
        src="/quickhire-logo.png"
        alt="QuickHire"
        className="w-full h-full object-cover"
      />
    </div>
  );
}

export function QuickHireWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display font-bold tracking-tight text-white ${className}`}>
      Quick<span className="text-primary">Hire</span>
    </span>
  );
}

// Legacy aliases
export { QuickHireLogo as TalentBridgeLogo, QuickHireWordmark as TalentBridgeWordmark };

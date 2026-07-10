export function QuickHireLogo({ className = "", size = 36 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="40" height="40" rx="10" fill="url(#qh-grad)" />
      <path
        d="M23 8L13 22h8l-4 10 14-16h-8l3-8z"
        fill="white"
        fillOpacity="0.95"
      />
      <defs>
        <linearGradient id="qh-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="oklch(0.28 0.05 205)" />
          <stop offset="100%" stopColor="oklch(0.5 0.12 175)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function QuickHireWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display font-bold tracking-tight ${className}`}>
      Quick<span className="text-primary">Hire</span>
    </span>
  );
}

import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-white/10 bg-surface-2 px-4 py-2.5 text-sm text-white placeholder:text-muted-foreground shadow-inner transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-white focus-visible:outline-none focus-visible:border-primary/80 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:shadow-[0_0_12px_rgba(182,255,46,0.2)] disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };

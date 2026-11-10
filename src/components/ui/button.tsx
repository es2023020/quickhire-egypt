import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_0_12px_rgba(182,255,46,0.25)] hover:bg-[#c2ff47] hover:shadow-[0_0_18px_rgba(182,255,46,0.5)] active:scale-[0.98]",
        inverted:
          "bg-primary text-primary-foreground border border-primary hover:bg-transparent hover:text-primary hover:shadow-[0_0_16px_rgba(182,255,46,0.45)] active:scale-[0.98]",
        glow:
          "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(182,255,46,0.35)] hover:shadow-[0_0_24px_rgba(182,255,46,0.65)] hover:bg-[#c2ff47] active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-white/15 bg-transparent text-white shadow-sm hover:border-primary/60 hover:text-primary hover:bg-white/[0.03] hover:shadow-[0_0_14px_rgba(182,255,46,0.2)]",
        secondary:
          "border border-white/10 bg-secondary text-secondary-foreground shadow-sm hover:bg-surface-3 hover:border-white/20 hover:text-white",
        ghost:
          "text-muted-foreground hover:bg-white/[0.06] hover:text-white",
        link:
          "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 rounded-lg px-4 text-xs font-medium",
        lg: "h-13 rounded-2xl px-8 text-base",
        icon: "h-11 w-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

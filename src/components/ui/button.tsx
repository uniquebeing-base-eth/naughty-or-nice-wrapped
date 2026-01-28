import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-indigo-900/60 via-black/50 to-purple-900/60 text-cyan-400 hover:from-indigo-800/70 hover:to-purple-800/70 shadow-lg",
        destructive: "bg-gradient-to-r from-red-900/50 via-black/50 to-red-700/50 text-red-400 hover:from-red-800/60 hover:to-red-600/60 shadow-lg",
        outline: "border border-white/20 bg-black/50 text-white hover:bg-white/10 hover:text-cyan-400",
        secondary: "bg-gradient-to-r from-pink-700/50 via-red-700/50 to-pink-900/50 text-pink-200 hover:from-pink-600/60 hover:to-pink-800/60 shadow-md",
        ghost: "bg-transparent text-cyan-400 hover:bg-white/10 hover:text-white",
        link: "text-cyan-400 underline-offset-4 hover:underline hover:text-cyan-300",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

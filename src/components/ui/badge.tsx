import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-gradient-to-r from-indigo-900/60 via-black/50 to-purple-900/60 text-cyan-400 hover:from-indigo-800/70 hover:to-purple-800/70",
        secondary: "border-transparent bg-gradient-to-r from-pink-700/50 via-red-700/50 to-pink-900/50 text-pink-200 hover:from-pink-600/60 hover:to-pink-800/60",
        destructive: "border-transparent bg-gradient-to-r from-red-900/50 via-black/50 to-red-700/50 text-red-400 hover:from-red-800/60 hover:to-red-600/60",
        outline: "text-white border border-white/20 hover:bg-white/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        division1: "border-transparent bg-gradient-to-r from-yellow-400 to-yellow-600 text-white",
        division2: "border-transparent bg-gradient-to-r from-gray-300 to-gray-400 text-gray-900",
        division3: "border-transparent bg-gradient-to-r from-orange-400 to-orange-600 text-white",
        division4: "border-transparent bg-gradient-to-r from-blue-400 to-blue-600 text-white",
        division5: "border-transparent bg-gradient-to-r from-gray-500 to-gray-600 text-white",
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

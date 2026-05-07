import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default:
          "bg-foreground text-background",
        secondary:
          "bg-foreground/[0.06] text-foreground/80",
        destructive:
          "bg-destructive text-white",
        outline:
          "border border-foreground/20 text-foreground/80",
        coral:
          "bg-foreground text-background",
        champagne:
          "bg-[var(--champagne)] text-foreground",
      },
      shape: {
        default: "rounded-sm",
        pill: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      shape: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, shape, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, shape }), className)} {...props} />
}

export { Badge, badgeVariants }

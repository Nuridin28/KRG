import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-foreground text-background hover:bg-foreground/90 active:scale-[0.98]",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 active:scale-[0.98]",
        outline:
          "border border-foreground/20 bg-transparent text-foreground hover:border-foreground hover:bg-foreground hover:text-background active:scale-[0.98]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/70 active:scale-[0.98]",
        ghost:
          "text-foreground hover:bg-foreground/5",
        link:
          "text-foreground underline-offset-4 hover:underline",
        coral:
          "bg-foreground text-background hover:bg-foreground/90 active:scale-[0.98]",
        editorial:
          "bg-foreground text-background uppercase tracking-[0.18em] text-[11px] font-medium hover:bg-foreground/90 active:scale-[0.98]",
        editorialOutline:
          "border border-foreground/30 bg-transparent text-foreground uppercase tracking-[0.18em] text-[11px] font-medium hover:border-foreground hover:bg-foreground hover:text-background active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-md px-8",
        xl: "h-14 rounded-md px-10 text-sm",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

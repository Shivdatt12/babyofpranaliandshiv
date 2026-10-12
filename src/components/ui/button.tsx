import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-bold border-2 border-border cursor-pointer transition-[transform,background-color,color,box-shadow] duration-150 ease-out active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[var(--shadow-control)] hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[var(--shadow-control)] hover:bg-destructive/90",
        outline: "bg-card text-card-foreground shadow-[var(--shadow-control)] hover:bg-secondary",
        secondary: "bg-secondary text-secondary-foreground shadow-[var(--shadow-control)] hover:bg-muted",
        ghost: "border-transparent hover:border-border hover:bg-secondary hover:text-secondary-foreground",
        link: "border-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-5 py-2.5",
        sm: "h-10 rounded-lg px-3 text-xs",
        lg: "h-14 rounded-lg px-8",
        icon: "size-12",
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

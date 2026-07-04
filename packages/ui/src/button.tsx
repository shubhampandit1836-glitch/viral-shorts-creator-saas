import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./lib";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757]/40 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[#1A1A1A] text-white hover:bg-[#333]",
        secondary: "bg-[#F5F4F0] text-[#1A1A1A] hover:bg-[#EBE9E4]",
        outline: "border border-[#E8E6E1] bg-white hover:bg-[#FAF9F5]",
        ghost: "hover:bg-[#F5F4F0]",
        accent: "bg-[#D97757] text-white hover:bg-[#C4684A]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-lg px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
);
Button.displayName = "Button";

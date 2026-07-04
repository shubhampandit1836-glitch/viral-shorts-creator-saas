import * as React from "react";
import { cn } from "./lib";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border border-[#E8E6E1] bg-white px-3 py-2 text-sm text-[#1A1A1A] placeholder:text-[#9B9B9B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757]/30",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";

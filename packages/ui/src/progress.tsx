import { cn } from "./lib";

interface ProgressProps {
  value: number;
  className?: string;
}

export function Progress({ value, className }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-[#F5F4F0]", className)}>
      <div
        className="h-full rounded-full bg-[#D97757] transition-all duration-300"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

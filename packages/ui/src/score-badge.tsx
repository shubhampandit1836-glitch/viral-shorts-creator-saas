import { Badge } from "./badge";
import { cn } from "./lib";

interface ScoreBadgeProps {
  score: number;
  label?: string;
  className?: string;
}

export function ScoreBadge({ score, label, className }: ScoreBadgeProps) {
  const variant =
    score >= 80 ? "success" : score >= 60 ? "accent" : score >= 40 ? "warning" : "default";

  return (
    <Badge variant={variant} className={cn("gap-1", className)}>
      {label && <span className="text-[#6B6B6B]">{label}</span>}
      <span className="font-semibold">{score}</span>
    </Badge>
  );
}

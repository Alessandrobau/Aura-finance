import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface SummaryCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "neutral" | "positive" | "negative";
}

const toneColor = {
  neutral: "text-foreground",
  positive: "text-sage",
  negative: "text-terra",
};

export const SummaryCard = ({ label, value, hint, tone = "neutral" }: SummaryCardProps) => (
  <div className="bg-surface rounded-2xl border border-border p-6 shadow-card flex flex-col justify-between min-h-[140px] animate-fade-in">
    <div className="text-sm font-medium text-muted-foreground">{label}</div>
    <div>
      <div className={cn("text-3xl font-serif tracking-tight tabular-nums mb-1", toneColor[tone])}>
        {value}
      </div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  </div>
);

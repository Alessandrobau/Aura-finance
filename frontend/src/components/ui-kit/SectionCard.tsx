import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const SectionCard = ({ title, action, children, className }: SectionCardProps) => (
  <section
    className={cn(
      "bg-surface rounded-2xl border border-border shadow-card p-8 animate-fade-in",
      className
    )}
  >
    {(title || action) && (
      <div className="flex items-baseline justify-between mb-6">
        {title && <h2 className="text-lg font-serif tracking-tight">{title}</h2>}
        {action}
      </div>
    )}
    {children}
  </section>
);

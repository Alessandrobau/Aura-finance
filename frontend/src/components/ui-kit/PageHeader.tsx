import { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export const PageHeader = ({ eyebrow, title, description, action }: PageHeaderProps) => (
  <header className="flex items-end justify-between gap-6 flex-wrap">
    <div className="min-w-0">
      {eyebrow && (
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{eyebrow}</div>
      )}
      <h1 className="text-4xl font-serif tracking-tight text-balance mb-2">{title}</h1>
      {description && (
        <p className="text-muted-foreground text-pretty max-w-[65ch]">{description}</p>
      )}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </header>
);

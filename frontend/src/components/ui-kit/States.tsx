import { Loader2 } from "lucide-react";

export const Loading = ({ label = "Carregando..." }: { label?: string }) => (
  <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
    <Loader2 className="size-4 animate-spin" />
    {label}
  </div>
);

export const EmptyState = ({ title, description }: { title: string; description?: string }) => (
  <div className="text-center py-12">
    <div className="font-serif text-xl mb-1">{title}</div>
    {description && <div className="text-sm text-muted-foreground max-w-md mx-auto">{description}</div>}
  </div>
);

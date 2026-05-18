import { cn } from "@/lib/utils";

export function Card({ className, children, glow = false }: { className?: string; children: React.ReactNode; glow?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-gradient-card p-5 shadow-elegant",
        glow && "glow-border",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "success" | "destructive" | "warning" | "primary";
}) {
  const tones: Record<string, string> = {
    muted: "bg-surface-2 text-muted-foreground border-border",
    success: "bg-success/10 text-success border-success/20",
    destructive: "bg-destructive/10 text-destructive border-destructive/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    primary: "bg-primary/10 text-primary border-primary/20",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", tones[tone])}>
      {children}
    </span>
  );
}

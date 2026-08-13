import { cn } from "@/lib/utils";

export function Badge({
  children,
  className,
  tone = "default",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "accent";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 font-mono text-[0.68rem] tracking-[0.06em] whitespace-nowrap",
        tone === "accent"
          ? "border-accent/40 bg-accent/10 text-accent"
          : "border-line-strong text-muted bg-bg-2/60",
        className,
      )}
    >
      {children}
    </span>
  );
}

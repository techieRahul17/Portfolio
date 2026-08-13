import { cn } from "@/lib/utils";

/**
 * Every section opens the same way: an indexed monospace label, a rule that
 * wipes across on scroll, then the display headline splitting in by line.
 */
export function SectionHeading({
  index,
  label,
  title,
  lead,
  className,
  align = "left",
}: {
  /** "01", "02"… shown next to the label. */
  index?: string;
  label: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  className?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn(align === "center" && "mx-auto max-w-3xl text-center", className)}>
      <div
        className={cn(
          "flex items-center gap-4",
          align === "center" && "justify-center",
        )}
      >
        <p className="text-faint font-mono text-[0.65rem] tracking-[0.28em] whitespace-nowrap uppercase">
          {index && <span className="text-accent">{index} — </span>}
          {label}
        </p>
        <span data-fill aria-hidden className="bg-line-strong h-px flex-1" />
      </div>

      <h2
        data-split="lines"
        className="font-display mt-6 text-[clamp(2rem,5.5vw,4.25rem)] leading-[0.95] tracking-[-0.035em]"
      >
        {title}
      </h2>

      {lead && (
        <p
          data-reveal
          data-reveal-delay="0.15"
          className={cn(
            "text-muted mt-6 text-lg leading-relaxed",
            align === "center" ? "mx-auto max-w-2xl" : "max-w-2xl",
          )}
        >
          {lead}
        </p>
      )}
    </div>
  );
}

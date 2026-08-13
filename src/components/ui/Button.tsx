import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";

/**
 * All variants share one hover move: an accent panel wipes up from the bottom
 * while the label crossfades to the ink colour. `isolate` + a z-indexed label
 * keep the text above the wipe.
 */
const base =
  "group relative isolate inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-full font-medium transition-colors duration-400 disabled:pointer-events-none disabled:opacity-40";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:text-accent",
  secondary: "border border-line-strong text-fg hover:text-accent-ink hover:border-accent",
  ghost: "text-muted hover:text-accent-ink",
};

/** The wipe layer — inverted for `primary`, accent for everything else. */
const wipes: Record<Variant, string> = {
  primary: "bg-bg",
  secondary: "bg-accent",
  ghost: "bg-accent",
};

const sizes = {
  sm: "h-9 px-5 text-[0.8rem]",
  md: "h-12 px-7 text-sm",
  lg: "h-14 px-9 text-base",
} as const;

type Props = {
  variant?: Variant;
  size?: keyof typeof sizes;
  className?: string;
  children: React.ReactNode;
};

function Inner({ variant, children }: { variant: Variant; children: React.ReactNode }) {
  return (
    <>
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 -z-10 origin-bottom translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:translate-y-0",
          wipes[variant],
        )}
      />
      <span className="relative z-10 inline-flex items-center gap-2.5">{children}</span>
    </>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: Props & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      <Inner variant={variant}>{children}</Inner>
    </button>
  );
}

/** Same look, but renders an anchor. Use for navigation, not actions. */
export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  external,
  children,
  ...props
}: Props & { href: string; external?: boolean } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const classes = cn(base, variants[variant], sizes[size], className);
  const inner = <Inner variant={variant}>{children}</Inner>;

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={classes} {...props}>
        {inner}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} {...props}>
      {inner}
    </Link>
  );
}

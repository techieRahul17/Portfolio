/**
 * Stand-in artwork for projects without a screenshot: a tinted field, a dot
 * grid and the project's initials. Deterministic, so a given card always looks
 * the same — and rather better than a stretched placeholder photo.
 */
const TINTS = [
  "radial-gradient(120% 120% at 20% 20%, rgba(232,255,79,0.22), transparent 60%)",
  "radial-gradient(120% 120% at 80% 10%, rgba(110,91,255,0.32), transparent 60%)",
  "radial-gradient(120% 120% at 30% 80%, rgba(255,92,61,0.22), transparent 60%)",
  "radial-gradient(120% 120% at 70% 70%, rgba(232,255,79,0.16), transparent 60%)",
];

export function initialsOf(title: string) {
  return title
    .split(/[\s-]+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

export function ProceduralCover({
  index,
  title,
  className,
}: {
  index: number;
  title: string;
  className?: string;
}) {
  return (
    <div
      className={`bg-bg-3 dot-grid absolute inset-0 grid place-items-center overflow-hidden ${className ?? ""}`}
    >
      <div aria-hidden className="absolute inset-0" style={{ background: TINTS[index % TINTS.length] }} />
      <span
        aria-hidden
        className="text-stroke font-display relative text-[clamp(3rem,11vw,8rem)] leading-none font-bold tracking-[-0.05em] transition-transform duration-700 group-hover:scale-110"
      >
        {initialsOf(title)}
      </span>
    </div>
  );
}

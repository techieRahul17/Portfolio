import { Container } from "./Container";

/**
 * The masthead every inner page opens with — oversized title, an indexed
 * label, and an optional meta rail down the right. Keeps /about, /projects
 * and /contact reading as one publication.
 */
export function PageHeader({
  index,
  label,
  title,
  lead,
  meta,
}: {
  index: string;
  label: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  meta?: { label: string; value: React.ReactNode }[];
}) {
  return (
    <header className="border-line relative overflow-hidden border-b">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/3 h-[30rem] w-[40rem] rounded-[50%] opacity-30 blur-[120px]"
        style={{
          background: "radial-gradient(closest-side, rgba(110,91,255,0.5), transparent)",
        }}
      />

      <Container size="wide" className="relative pt-[calc(var(--nav-h)+4rem)] pb-16 sm:pb-20">
        <div className="flex items-center gap-4">
          <p className="text-faint font-mono text-[0.65rem] tracking-[0.28em] whitespace-nowrap uppercase">
            <span className="text-accent">{index} — </span>
            {label}
          </p>
          <span data-fill aria-hidden className="bg-line-strong h-px flex-1" />
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <h1
              data-split="lines"
              className="font-display text-[clamp(2.75rem,9vw,7.5rem)] leading-[0.9] tracking-[-0.045em]"
            >
              {title}
            </h1>

            {lead && (
              <p
                data-reveal
                data-reveal-delay="0.15"
                className="text-muted mt-8 max-w-2xl text-lg leading-relaxed"
              >
                {lead}
              </p>
            )}
          </div>

          {meta && meta.length > 0 && (
            <dl data-stagger="0.08" className="lg:col-span-3 lg:col-start-10">
              {meta.map((m) => (
                <div key={m.label} className="border-line border-t py-4 first:border-t-0 lg:first:border-t">
                  <dt className="text-faint font-mono text-[0.62rem] tracking-[0.2em] uppercase">
                    {m.label}
                  </dt>
                  <dd className="text-fg mt-1.5 text-sm">{m.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </Container>
    </header>
  );
}

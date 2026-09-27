import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { profile, stats } from "@/data/profile";
import { ScrollText } from "@/components/motion/ScrollText";
import { Container } from "@/components/ui/Container";
import { Tilt } from "@/components/motion/Tilt";

/**
 * The "who is this" beat: a short scroll-lit statement, a portrait, and the
 * four numbers worth leading with.
 */
export function Intro() {
  return (
    <section id="intro" className="relative scroll-mt-24 py-24 sm:py-32">
      <Container size="wide">
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="text-faint font-mono text-[0.65rem] tracking-[0.28em] uppercase">
              <span className="text-accent">01 — </span>Introduction
            </p>

            <ScrollText className="font-display mt-8 text-[clamp(1.5rem,3.4vw,2.75rem)] leading-[1.22] tracking-[-0.025em]">
              I&apos;m a frontend developer who builds in three dimensions — Three.js scenes, GSAP
              choreography and interfaces that react to you. Underneath, I&apos;m a CSE undergrad at
              SSN who likes measurable wins, like the MCP tooling I built at Amazon that turned an
              eleven-day investigation into a two-minute query.
            </ScrollText>

            <div data-reveal className="mt-10">
              <Link
                href="/about"
                className="group text-fg hover:text-accent inline-flex items-center gap-3 text-sm transition-colors"
              >
                <span className="border-line group-hover:border-accent group-hover:bg-accent group-hover:text-accent-ink grid h-10 w-10 place-items-center rounded-full border transition-all duration-300">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
                More about me
              </Link>
            </div>
          </div>

          {/* -------------------------------- portrait ------------------------- */}
          <div data-reveal className="lg:col-span-4 lg:col-start-9">
            <Tilt max={9} className="rounded-2xl">
              <div className="group border-line relative aspect-[4/5] w-full overflow-hidden rounded-2xl border">
                <Image
                  src={profile.avatar}
                  alt={profile.name}
                  fill
                  sizes="(min-width: 1024px) 33vw, 100vw"
                  className="object-cover grayscale transition-all duration-700 group-hover:scale-[1.04] group-hover:grayscale-0"
                />
                <div
                  aria-hidden
                  className="from-bg/90 absolute inset-0 bg-gradient-to-t via-transparent to-transparent"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
                  <div>
                    <p className="font-display text-lg leading-tight">{profile.name}</p>
                    <p className="text-muted font-mono text-[0.65rem] tracking-[0.2em] uppercase">
                      {profile.degree.replace("B.E. ", "")} · &apos;{profile.gradYear.slice(2)}
                    </p>
                  </div>
                  <span className="text-accent font-mono text-[0.65rem] tracking-[0.2em] uppercase">
                    {profile.location.split(",")[0]}
                  </span>
                </div>
              </div>
            </Tilt>
          </div>
        </div>

        {/* --------------------------------- stats ---------------------------- */}
        <dl
          data-stagger="0.1"
          className="border-line mt-20 grid grid-cols-2 gap-px border-t lg:grid-cols-4"
        >
          {stats.map((s) => (
            <div key={s.label} className="group border-line relative border-b pt-8 pb-8 lg:border-b-0">
              <span
                aria-hidden
                className="bg-accent absolute top-0 left-0 h-px w-0 transition-[width] duration-700 group-hover:w-full"
              />
              <dd className="font-display text-[clamp(2.25rem,5vw,3.75rem)] leading-none tracking-[-0.03em] tabular-nums">
                <span data-counter={s.value} data-decimals={s.decimals}>
                  0
                </span>
                <span className="text-accent text-[0.45em] align-super">{s.suffix}</span>
              </dd>
              <dt className="mt-4">
                <span className="block text-sm font-medium">{s.label}</span>
                <span className="text-faint block font-mono text-[0.65rem] tracking-[0.18em] uppercase">
                  {s.sub}
                </span>
              </dt>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}

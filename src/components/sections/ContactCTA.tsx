import { ArrowUpRight } from "lucide-react";
import { profile, socials } from "@/data/profile";
import { Container } from "@/components/ui/Container";
import { Marquee } from "@/components/motion/Marquee";
import { Magnetic } from "@/components/motion/Magnetic";
import { ButtonLink } from "@/components/ui/Button";
import { CopyEmail } from "@/components/ui/CopyEmail";

const CHANT = ["Let's work together", "Open to SDE roles", "Say hello"];

export function ContactCTA() {
  return (
    <section id="contact" className="border-line relative scroll-mt-24 overflow-hidden border-t">
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/2 h-[45rem] w-[min(120vw,80rem)] -translate-x-1/2 translate-y-1/3 rounded-[50%] opacity-45 blur-[140px]"
        style={{
          background:
            "radial-gradient(closest-side, rgba(232,255,79,0.4), rgba(110,91,255,0.28) 55%, transparent)",
        }}
      />

      {/* An oversized chant across the top of the section. */}
      <div className="border-line relative border-b py-6">
        <Marquee
          items={CHANT}
          speed={55}
          className="font-display text-[clamp(2rem,7vw,5.5rem)] leading-none tracking-[-0.04em]"
          separator="✦"
        />
      </div>

      <Container size="wide" className="relative py-24 sm:py-32">
        <div className="grid gap-16 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="text-faint font-mono text-[0.65rem] tracking-[0.28em] uppercase">
              <span className="text-accent">06 — </span>Contact
            </p>

            <h2
              data-split="lines"
              className="font-display mt-7 text-[clamp(2.25rem,7vw,5.5rem)] leading-[0.94] tracking-[-0.04em]"
            >
              Have something
              <br />
              worth building?
            </h2>

            <p data-reveal className="text-muted mt-7 max-w-lg text-lg leading-relaxed">
              I&apos;m {profile.availableForWork ? "open to " : "always up for a chat about "}
              software engineering roles and internships — and I answer every message that
              isn&apos;t a template.
            </p>

            <div data-reveal data-reveal-delay="0.1" className="mt-10 flex flex-wrap items-center gap-3">
              <Magnetic strength={0.3}>
                <ButtonLink href="/contact" size="lg" data-cursor="talk">
                  Start a conversation
                  <ArrowUpRight className="h-4 w-4" />
                </ButtonLink>
              </Magnetic>
              <Magnetic strength={0.3}>
                <ButtonLink href={profile.resumeUrl} size="lg" variant="secondary" external>
                  Download résumé
                </ButtonLink>
              </Magnetic>
            </div>
          </div>

          {/* -------------------------------- details -------------------------- */}
          <div data-stagger="0.08" className="lg:col-span-4 lg:col-start-9">
            <div className="border-line border-t pt-6">
              <p className="text-faint font-mono text-[0.62rem] tracking-[0.2em] uppercase">
                Email
              </p>
              <CopyEmail className="mt-3 text-sm" />
            </div>

            <div className="border-line mt-6 border-t pt-6">
              <p className="text-faint font-mono text-[0.62rem] tracking-[0.2em] uppercase">
                Phone
              </p>
              <a
                href={`tel:${profile.phone.replace(/\s/g, "")}`}
                className="text-muted hover:text-accent mt-3 block text-sm transition-colors"
              >
                {profile.phone}
              </a>
            </div>

            <div className="border-line mt-6 border-t pt-6">
              <p className="text-faint font-mono text-[0.62rem] tracking-[0.2em] uppercase">
                Elsewhere
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {socials
                  .filter((s) => s.href.startsWith("http"))
                  .map((s) => (
                    <li key={s.label}>
                      <a
                        href={s.href}
                        target="_blank"
                        rel="noreferrer"
                        className="group text-muted hover:text-accent inline-flex items-center gap-2 text-sm transition-colors"
                      >
                        {s.label}
                        <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </a>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

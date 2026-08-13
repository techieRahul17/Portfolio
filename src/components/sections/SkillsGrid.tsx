import { skills } from "@/data/skills";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Spotlight } from "@/components/motion/Spotlight";

/**
 * The toolkit, grouped rather than dumped. A sticky heading holds the left
 * rail while the groups scroll past it, and a cursor-tracking spotlight lights
 * whichever row is being read.
 */
export function SkillsGrid() {
  return (
    <section id="skills" className="border-line scroll-mt-24 border-t py-24 sm:py-32">
      <Container size="wide">
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-[calc(var(--nav-h)+3rem)]">
              <SectionHeading
                index="04"
                label="Toolkit"
                title={
                  <>
                    The stack I<br />
                    <span className="text-accent">reach for</span>
                  </>
                }
                lead="Honest list. Everything here has shipped something I'd be happy to walk through line by line."
              />
            </div>
          </div>

          <Spotlight className="lg:col-span-8">
            <div className="border-line border-t">
              {skills.map((group, i) => (
                <div
                  key={group.title}
                  data-reveal
                  data-reveal-delay={String(i * 0.05)}
                  className="group border-line grid gap-5 border-b py-8 sm:grid-cols-4 sm:gap-8"
                >
                  <div className="sm:col-span-1">
                    <h3 className="font-display group-hover:text-accent text-lg leading-tight transition-colors duration-300">
                      {group.title}
                    </h3>
                    {group.note && (
                      <p className="text-faint mt-1 font-mono text-[0.62rem] tracking-[0.18em] uppercase">
                        {group.note}
                      </p>
                    )}
                  </div>

                  <ul className="flex flex-wrap gap-2 sm:col-span-3">
                    {group.items.map((item) => (
                      <li
                        key={item}
                        className="border-line-strong text-muted hover:border-accent hover:bg-accent hover:text-accent-ink rounded-full border px-3.5 py-1.5 text-[0.8rem] transition-colors duration-300"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Spotlight>
        </div>
      </Container>
    </section>
  );
}

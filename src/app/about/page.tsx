import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { profile, stats } from "@/data/profile";
import { experience, education, leadership } from "@/data/experience";
import { achievements } from "@/data/achievements";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ExperienceTimeline } from "@/components/sections/ExperienceTimeline";
import { SkillsGrid } from "@/components/sections/SkillsGrid";
import { ContactCTA } from "@/components/sections/ContactCTA";
import { ScrollText } from "@/components/motion/ScrollText";
import { ButtonLink } from "@/components/ui/Button";
import { Magnetic } from "@/components/motion/Magnetic";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "About",
  description: profile.bio[0],
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <PageHeader
        index="02"
        label="About"
        title={
          <>
            Engineer, and
            <br />
            <span className="text-accent">a stubborn</span> one
          </>
        }
        lead={profile.headline}
        meta={[
          { label: "Based in", value: profile.location },
          { label: "Studying", value: `${profile.degree} · ${profile.university}` },
          { label: "CGPA", value: `${profile.cgpa} / 10` },
          { label: "Graduating", value: profile.gradYear },
        ]}
      />

      {/* --------------------------------- bio ------------------------------- */}
      <section className="py-24 sm:py-28">
        <Container size="wide">
          <div className="grid gap-14 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <div
                data-reveal
                className="group border-line relative aspect-[4/5] overflow-hidden rounded-2xl border lg:sticky lg:top-[calc(var(--nav-h)+2rem)]"
              >
                <Image
                  src={profile.avatar}
                  alt={profile.name}
                  fill
                  sizes="(min-width: 1024px) 30vw, 100vw"
                  priority
                  className="object-cover grayscale transition-all duration-700 group-hover:grayscale-0"
                />
                <div
                  aria-hidden
                  className="from-bg/85 absolute inset-0 bg-gradient-to-t via-transparent to-transparent"
                />
                <p className="absolute inset-x-0 bottom-0 p-5 font-mono text-[0.62rem] tracking-[0.22em] uppercase">
                  <span className="text-accent">●</span> {profile.availabilityNote}
                </p>
              </div>
            </div>

            <div className="lg:col-span-7 lg:col-start-6">
              <ScrollText className="font-display text-[clamp(1.35rem,2.6vw,2.1rem)] leading-[1.3] tracking-[-0.02em]">
                {profile.bio[0]}
              </ScrollText>

              <div className="mt-10 space-y-6">
                {profile.bio.slice(1).map((para) => (
                  <p key={para.slice(0, 24)} data-reveal className="text-muted leading-relaxed">
                    {para}
                  </p>
                ))}
              </div>

              <div data-reveal className="mt-12 flex flex-wrap gap-3">
                <Magnetic strength={0.3}>
                  <ButtonLink href={profile.resumeUrl} external>
                    Download résumé
                    <ArrowUpRight className="h-4 w-4" />
                  </ButtonLink>
                </Magnetic>
                <Magnetic strength={0.3}>
                  <ButtonLink href="/projects" variant="secondary">
                    See the work
                  </ButtonLink>
                </Magnetic>
              </div>

              {/* ------------------------------ stats ------------------------- */}
              <dl data-stagger="0.08" className="mt-16 grid grid-cols-2 gap-8 sm:grid-cols-4">
                {stats.map((s) => (
                  <div key={s.label}>
                    <dd className="font-display text-3xl leading-none tabular-nums">
                      <span data-counter={s.value} data-decimals={s.decimals}>
                        0
                      </span>
                      <span className="text-accent align-super text-[0.5em]">{s.suffix}</span>
                    </dd>
                    <dt className="text-faint mt-3 font-mono text-[0.62rem] tracking-[0.18em] uppercase">
                      {s.label}
                    </dt>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </Container>
      </section>

      {/* ------------------------------ experience --------------------------- */}
      <section className="border-line border-t py-24 sm:py-28">
        <Container size="wide">
          <div className="grid gap-14 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <div className="lg:sticky lg:top-[calc(var(--nav-h)+3rem)]">
                <SectionHeading
                  index="01"
                  label="Career"
                  title={
                    <>
                      Where I&apos;ve
                      <br />
                      <span className="text-accent">worked</span>
                    </>
                  }
                />
              </div>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              <ExperienceTimeline items={experience} />
            </div>
          </div>
        </Container>
      </section>

      {/* ------------------------------- education --------------------------- */}
      <section className="border-line border-t py-24 sm:py-28">
        <Container size="wide">
          <div className="grid gap-14 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <div className="lg:sticky lg:top-[calc(var(--nav-h)+3rem)]">
                <SectionHeading
                  index="02"
                  label="Education"
                  title={
                    <>
                      Where I&apos;m
                      <br />
                      <span className="text-accent">learning</span>
                    </>
                  }
                />
              </div>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              <ExperienceTimeline items={education} />

              <div className="border-line mt-14 border-t pt-10">
                <p className="text-faint font-mono text-[0.65rem] tracking-[0.28em] uppercase">
                  <span className="text-accent">↳ </span>On campus
                </p>
                <div data-stagger="0.07" className="mt-6 grid gap-4 sm:grid-cols-2">
                  {leadership.map((role) => (
                    <div key={role.org} className="panel rounded-xl p-5">
                      <h3 className="font-display text-base leading-tight">{role.role}</h3>
                      <p className="text-muted mt-2 text-sm">{role.org}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ------------------------------ recognition -------------------------- */}
      <section className="border-line border-t py-24 sm:py-28">
        <Container size="wide">
          <SectionHeading
            index="03"
            label="Recognition"
            title={
              <>
                Wins worth
                <br />
                <span className="text-accent">mentioning</span>
              </>
            }
          />
          <div data-stagger="0.08" className="mt-14 grid gap-4 sm:grid-cols-2">
            {achievements.map((item) => (
              <div
                key={item.title}
                className="panel hover:border-accent/40 rounded-xl p-6 transition-colors duration-300"
              >
                <p className="text-accent font-mono text-[0.62rem] tracking-[0.2em] uppercase">
                  {item.year} · {item.project}
                </p>
                <h3 className="font-display mt-3 text-lg leading-tight">{item.title}</h3>
                <p className="text-muted mt-2 text-sm leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <SkillsGrid />
      <ContactCTA />
    </>
  );
}

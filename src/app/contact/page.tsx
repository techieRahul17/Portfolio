import { Briefcase, Code2, MessageSquare, Clock, MapPin, Send } from "lucide-react";
import { profile, socials } from "@/data/profile";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { CopyEmail } from "@/components/ui/CopyEmail";
import { LocalTime } from "@/components/ui/LocalTime";
import { ContactForm } from "@/components/sections/ContactForm";
import { Spotlight } from "@/components/motion/Spotlight";
import { Marquee } from "@/components/motion/Marquee";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Contact",
  description: `Get in touch with ${profile.name} — open to software engineering roles and internships.`,
  path: "/contact",
});

/** What's actually worth writing to me about. */
const OPEN_TO = [
  {
    icon: Briefcase,
    title: "Full-time SDE roles",
    body: "Graduating in 2027 and open to conversations now — backend, full-stack, or anything close to cloud and GenAI infrastructure.",
    tag: "Primary",
  },
  {
    icon: Code2,
    title: "Internships",
    body: "Summer and off-cycle. I've done two — one on site at Amazon, one fully remote at a startup — and I'm comfortable in either setup.",
    tag: "Open",
  },
  {
    icon: MessageSquare,
    title: "Building something together",
    body: "Hackathon teams, side projects, or a question about anything on this site. Three of the four projects here started as exactly this kind of message.",
    tag: "Always",
  },
];

/** The things people ask before they write, answered up front. */
const GOOD_TO_KNOW = [
  {
    q: "How fast will you reply?",
    a: "Within a day or two, and I answer every message that isn't a template. If it's urgent, the phone number above is real.",
  },
  {
    q: "What should I put in the message?",
    a: "Whatever the role or the problem actually is. A one-line brief beats a formal introduction — I'd rather know what you're solving than how you found me.",
  },
  {
    q: "Are you willing to relocate?",
    a: "Yes. I'm in Chennai and studying at SSN, but I'm open to relocating and I've worked remotely across time zones before.",
  },
  {
    q: "Can I see more than the résumé?",
    a: "Every project has a full case study under Work — the problem, the trade-off I'd defend, and what I'd rebuild. That's usually a better read than the PDF.",
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHeader
        index="04"
        label="Contact"
        title={
          <>
            Let&apos;s make
            <br />
            <span className="text-accent">something</span>
          </>
        }
        lead="A role, a project, or a question about anything on this site — send it over. I reply to every message that isn't a template."
        meta={[
          { label: "Status", value: profile.availabilityNote },
          { label: "Based in", value: profile.location },
          { label: "Local time", value: <LocalTime className="font-mono tabular-nums" /> },
          { label: "Graduating", value: profile.gradYear },
        ]}
      />

      {/* ------------------------------- open to ----------------------------- */}
      <section className="border-line border-b py-20 sm:py-24">
        <Container size="wide">
          <div className="flex items-center gap-4">
            <p className="text-faint font-mono text-[0.65rem] tracking-[0.28em] whitespace-nowrap uppercase">
              <span className="text-accent">↳ </span>What I&apos;m open to
            </p>
            <span data-fill aria-hidden className="bg-line-strong h-px flex-1" />
          </div>

          <Spotlight className="mt-10">
            <div data-stagger="0.08" className="grid gap-4 lg:grid-cols-3">
              {OPEN_TO.map(({ icon: Icon, title, body, tag }) => (
                <div
                  key={title}
                  className="panel hover:border-accent/40 flex flex-col rounded-2xl p-7 transition-colors duration-300"
                >
                  <div className="flex items-center justify-between gap-4">
                    <Icon aria-hidden className="text-accent h-5 w-5" />
                    <span className="text-faint font-mono text-[0.6rem] tracking-[0.2em] uppercase">
                      {tag}
                    </span>
                  </div>
                  <h2 className="font-display mt-5 text-xl leading-tight">{title}</h2>
                  <p className="text-muted mt-3 text-sm leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </Spotlight>
        </Container>
      </section>

      {/* --------------------------------- form ------------------------------ */}
      <section className="py-20 sm:py-24">
        <Container size="wide">
          <div className="grid gap-14 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <div className="lg:sticky lg:top-[calc(var(--nav-h)+3rem)]">
                <h2
                  data-split="lines"
                  className="font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1] tracking-[-0.03em]"
                >
                  Reach me
                  <br />
                  <span className="text-accent">directly</span>
                </h2>

                <div className="border-line mt-8 border-t pt-6">
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
                  <div className="mt-4 flex flex-wrap gap-3">
                    {socials.map((s) => (
                      <a
                        key={s.label}
                        href={s.href}
                        target={s.href.startsWith("http") ? "_blank" : undefined}
                        rel="noreferrer"
                        aria-label={s.label}
                        title={s.label}
                        className="border-line text-muted hover:border-accent hover:bg-accent hover:text-accent-ink grid h-11 w-11 place-items-center rounded-full border transition-colors duration-300"
                      >
                        <SocialIcon icon={s.icon} className="h-4 w-4" />
                      </a>
                    ))}
                  </div>
                </div>

                <div className="border-line text-muted mt-6 space-y-3 border-t pt-6 text-sm">
                  <p className="flex items-center gap-3">
                    <Clock aria-hidden className="text-faint h-4 w-4 shrink-0" />
                    <LocalTime className="font-mono tabular-nums" />
                  </p>
                  <p className="flex items-center gap-3">
                    <MapPin aria-hidden className="text-faint h-4 w-4 shrink-0" />
                    {profile.location}
                  </p>
                  <p className="flex items-center gap-3">
                    <Send aria-hidden className="text-faint h-4 w-4 shrink-0" />
                    Usually replies in 1–2 days
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 lg:col-start-6">
              <div className="flex items-center gap-4">
                <p className="text-faint font-mono text-[0.65rem] tracking-[0.28em] whitespace-nowrap uppercase">
                  <span className="text-accent">↳ </span>Send a message
                </p>
                <span data-fill aria-hidden className="bg-line-strong h-px flex-1" />
              </div>

              <div className="mt-10">
                <ContactForm />
              </div>

              {/* ------------------------------ FAQ ------------------------- */}
              <div className="border-line mt-20 border-t pt-10">
                <p className="text-faint font-mono text-[0.65rem] tracking-[0.28em] uppercase">
                  <span className="text-accent">↳ </span>Good to know
                </p>

                <dl data-stagger="0.07" className="mt-8">
                  {GOOD_TO_KNOW.map((item) => (
                    <div key={item.q} className="border-line border-b py-6 first:border-t">
                      <dt className="font-display text-base leading-snug">{item.q}</dt>
                      <dd className="text-muted mt-2 max-w-xl text-sm leading-relaxed">
                        {item.a}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* -------------------------------- chant ------------------------------ */}
      <div className="border-line border-t py-6">
        <Marquee
          items={["Say hello", "Open to SDE roles", "Let's build something"]}
          speed={50}
          className="font-display text-[clamp(2rem,7vw,5.5rem)] leading-none tracking-[-0.04em]"
        />
      </div>
    </>
  );
}

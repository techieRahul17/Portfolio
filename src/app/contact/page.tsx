import { profile, socials } from "@/data/profile";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { CopyEmail } from "@/components/ui/CopyEmail";
import { LocalTime } from "@/components/ui/LocalTime";
import { ContactForm } from "@/components/sections/ContactForm";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Contact",
  description: `Get in touch with ${profile.name} — open to software engineering roles and internships.`,
  path: "/contact",
});

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
        ]}
      />

      <section className="py-20 sm:py-24">
        <Container size="wide">
          <div className="grid gap-14 lg:grid-cols-12">
            {/* ------------------------------ details ------------------------ */}
            <div className="lg:col-span-4">
              <div className="lg:sticky lg:top-[calc(var(--nav-h)+3rem)]">
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
                  <div className="mt-4 flex flex-wrap gap-3">
                    {socials.map((s) => (
                      <a
                        key={s.label}
                        href={s.href}
                        target={s.href.startsWith("http") ? "_blank" : undefined}
                        rel="noreferrer"
                        aria-label={s.label}
                        className="border-line text-muted hover:border-accent hover:bg-accent hover:text-accent-ink grid h-11 w-11 place-items-center rounded-full border transition-colors duration-300"
                      >
                        <SocialIcon icon={s.icon} className="h-4 w-4" />
                      </a>
                    ))}
                  </div>
                </div>

                <p className="text-faint mt-10 max-w-xs text-sm leading-relaxed">
                  Prefer email? Everything in the form lands in the same inbox — the form
                  just saves you writing a subject line.
                </p>
              </div>
            </div>

            {/* -------------------------------- form ------------------------- */}
            <div className="lg:col-span-7 lg:col-start-6">
              <ContactForm />
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}

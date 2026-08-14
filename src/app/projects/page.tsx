import { Target, Gauge, ShieldCheck, Layers } from "lucide-react";
import { getProjects, getProjectTags, toCards } from "@/lib/mdx";
import { skills } from "@/data/skills";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProjectIndex } from "@/components/sections/ProjectIndex";
import { ContactCTA } from "@/components/sections/ContactCTA";
import { Badge } from "@/components/ui/Badge";
import { Spotlight } from "@/components/motion/Spotlight";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Work",
  description: "Selected projects — what I built, why, and what I'd do differently.",
  path: "/projects",
});

/** The four numbers that describe the body of work, not any single project. */
const TALLIES = [
  { value: "04", label: "Case studies", sub: "written up in full" },
  { value: "03", label: "First places", sub: "hackathons & expos" },
  { value: "01", label: "Live pilot", sub: "running at SSN" },
  { value: "06", label: "Core stacks", sub: "React → Spring → AWS" },
];

/** How I actually approach a build — the through-line across all four projects. */
const PRINCIPLES = [
  {
    icon: Target,
    title: "Measure the before",
    body: "Every project here has a number attached to it, because “it feels faster” is not a result. Eleven days to under two minutes is a result. If I can't measure the before, I don't know whether I helped.",
  },
  {
    icon: ShieldCheck,
    title: "Design the failure path first",
    body: "Campus Wi-Fi drops. Cameras fail. The projector is the only screen in the room. The features that made AttendEz survive contact with real users were all fallbacks, not the happy path.",
  },
  {
    icon: Layers,
    title: "Put the boundary where the tooling is",
    body: "InterVueX runs its NLP in Python and its API in Node because that's where each ecosystem is strongest. Forcing one runtime to do everything is how you spend a hackathon writing glue.",
  },
  {
    icon: Gauge,
    title: "Build the verifier early",
    body: "On SecUrVote we wrote the ledger before the thing that checks the ledger, and paid for it. Now I build the part that proves it works alongside the part that does the work.",
  },
];

export default async function ProjectsPage() {
  const [projects, tags] = await Promise.all([getProjects(), getProjectTags()]);
  const cards = toCards(projects);

  return (
    <>
      <PageHeader
        index="03"
        label="Selected work"
        title={
          <>
            Things I built
            <br />
            that <span className="text-accent">shipped</span>
          </>
        }
        lead="Three hackathon winners, a platform being piloted in my own department, and the internships in between. Every case study covers the problem, the decision I'd defend, and the part I'd rebuild."
        meta={[
          { label: "Projects", value: String(projects.length) },
          { label: "First places", value: "3" },
          { label: "Written up", value: "Full case studies" },
        ]}
      />

      {/* -------------------------------- tallies ---------------------------- */}
      <section className="border-line border-b">
        <Container size="wide">
          <dl data-stagger="0.08" className="grid grid-cols-2 gap-px lg:grid-cols-4">
            {TALLIES.map((t) => (
              <div key={t.label} className="border-line group relative border-b py-8 lg:border-b-0">
                <span
                  aria-hidden
                  className="bg-accent absolute bottom-0 left-0 h-px w-0 transition-[width] duration-700 group-hover:w-full lg:bottom-auto lg:top-0"
                />
                <dd className="font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-none tracking-[-0.03em] tabular-nums">
                  {t.value}
                </dd>
                <dt className="mt-3">
                  <span className="block text-sm font-medium">{t.label}</span>
                  <span className="text-faint block font-mono text-[0.62rem] tracking-[0.18em] uppercase">
                    {t.sub}
                  </span>
                </dt>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* ------------------------------- the index --------------------------- */}
      <section className="py-20 sm:py-24">
        <Container size="wide">
          <div className="flex items-center gap-4">
            <p className="text-faint font-mono text-[0.65rem] tracking-[0.28em] whitespace-nowrap uppercase">
              <span className="text-accent">↳ </span>The index
            </p>
            <span data-fill aria-hidden className="bg-line-strong h-px flex-1" />
          </div>

          <div className="mt-10">
            {projects.length === 0 ? (
              <p className="border-line text-muted rounded-2xl border border-dashed p-10 text-center text-sm">
                No projects yet. Add an <code>.mdx</code> file in{" "}
                <code>src/content/projects/</code> and it will appear here.
              </p>
            ) : (
              <ProjectIndex projects={cards} />
            )}
          </div>
        </Container>
      </section>

      {/* ------------------------------- principles -------------------------- */}
      <section className="border-line border-t py-24 sm:py-28">
        <Container size="wide">
          <div className="grid gap-14 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <div className="lg:sticky lg:top-[calc(var(--nav-h)+3rem)]">
                <div className="flex items-center gap-4">
                  <p className="text-faint font-mono text-[0.65rem] tracking-[0.28em] whitespace-nowrap uppercase">
                    <span className="text-accent">↳ </span>How I build
                  </p>
                  <span data-fill aria-hidden className="bg-line-strong h-px flex-1" />
                </div>
                <h2
                  data-split="lines"
                  className="font-display mt-6 text-[clamp(2rem,4.5vw,3.25rem)] leading-[0.98] tracking-[-0.035em]"
                >
                  Four habits
                  <br />
                  behind <span className="text-accent">all of it</span>
                </h2>
                <p data-reveal className="text-muted mt-6 max-w-md leading-relaxed">
                  The projects are different. The way I approach them isn&apos;t — and these
                  are the four things I&apos;d bring to a team on day one.
                </p>
              </div>
            </div>

            <Spotlight className="lg:col-span-8">
              <div data-stagger="0.08" className="grid gap-4 sm:grid-cols-2">
                {PRINCIPLES.map(({ icon: Icon, title, body }) => (
                  <div
                    key={title}
                    className="panel hover:border-accent/40 flex flex-col rounded-2xl p-7 transition-colors duration-300"
                  >
                    <Icon aria-hidden className="text-accent h-5 w-5" />
                    <h3 className="font-display mt-5 text-xl leading-tight">{title}</h3>
                    <p className="text-muted mt-3 text-sm leading-relaxed">{body}</p>
                  </div>
                ))}
              </div>
            </Spotlight>
          </div>
        </Container>
      </section>

      {/* --------------------------------- stack ----------------------------- */}
      <section className="border-line border-t py-24 sm:py-28">
        <Container size="wide">
          <div className="flex items-center gap-4">
            <p className="text-faint font-mono text-[0.65rem] tracking-[0.28em] whitespace-nowrap uppercase">
              <span className="text-accent">↳ </span>Everything used across these builds
            </p>
            <span data-fill aria-hidden className="bg-line-strong h-px flex-1" />
          </div>

          <div data-stagger="0.03" className="mt-10 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} tone="accent">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="border-line mt-14 grid gap-8 border-t pt-10 sm:grid-cols-2 lg:grid-cols-3">
            {skills.slice(0, 3).map((group) => (
              <div key={group.title} data-reveal>
                <h3 className="font-display text-lg leading-tight">{group.title}</h3>
                <p className="text-muted mt-3 text-sm leading-relaxed">
                  {group.items.join(", ")}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <ContactCTA />
    </>
  );
}

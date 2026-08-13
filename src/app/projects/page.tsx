import { getProjects, getProjectTags, toCards } from "@/lib/mdx";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProjectIndex } from "@/components/sections/ProjectIndex";
import { ContactCTA } from "@/components/sections/ContactCTA";
import { Badge } from "@/components/ui/Badge";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Work",
  description: "Selected projects — what I built, why, and what I'd do differently.",
  path: "/projects",
});

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
        lead="Hackathon winners, a departmental pilot, and the internships in between. Every case study covers the problem, the decision I'd defend, and the part I'd rebuild."
        meta={[
          { label: "Projects", value: String(projects.length) },
          { label: "First places", value: "3" },
        ]}
      />

      <section className="py-20 sm:py-24">
        <Container size="wide">
          {projects.length === 0 ? (
            <p className="border-line text-muted rounded-2xl border border-dashed p-10 text-center text-sm">
              No projects yet. Add an <code>.mdx</code> file in{" "}
              <code>src/content/projects/</code> and it will appear here.
            </p>
          ) : (
            <>
              <ProjectIndex projects={cards} />

              <div className="mt-16">
                <p className="text-faint font-mono text-[0.65rem] tracking-[0.28em] uppercase">
                  <span className="text-accent">↳ </span>Everything used across these builds
                </p>
                <div data-stagger="0.03" className="mt-6 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </Container>
      </section>

      <ContactCTA />
    </>
  );
}

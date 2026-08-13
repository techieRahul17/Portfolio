import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getFeaturedProjects, toCards } from "@/lib/mdx";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProjectStack } from "./ProjectStack";

export async function FeaturedProjects() {
  const projects = await getFeaturedProjects(4);

  if (projects.length === 0) return null;

  const cards = toCards(projects);

  return (
    <section id="work" className="border-line scroll-mt-24 border-t py-24 sm:py-32">
      <Container size="wide">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <SectionHeading
            index="03"
            label="Selected work"
            title={
              <>
                Things I built
                <br />
                that <span className="text-accent">shipped</span>
              </>
            }
            className="max-w-2xl"
          />

          <Link
            href="/projects"
            data-reveal
            className="group text-muted hover:text-accent flex items-center gap-3 text-sm transition-colors"
          >
            All projects
            <span className="border-line group-hover:border-accent group-hover:bg-accent group-hover:text-accent-ink grid h-10 w-10 place-items-center rounded-full border transition-all duration-300">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </Link>
        </div>

        <ProjectStack projects={cards} />
      </Container>
    </section>
  );
}

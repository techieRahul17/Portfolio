import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, ExternalLink } from "lucide-react";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { getProject, getProjects } from "@/lib/mdx";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { ProceduralCover } from "@/components/ui/ProceduralCover";
import { Mdx } from "@/components/mdx/Mdx";
import { ContactCTA } from "@/components/sections/ContactCTA";
import { formatDate } from "@/lib/utils";
import { buildMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

/** Pre-renders every project at build time — instant loads, great SEO. */
export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return buildMetadata({ title: "Not found" });

  return buildMetadata({
    title: project.title,
    description: project.summary,
    path: `/projects/${project.slug}`,
    image: project.cover,
    type: "article",
    publishedTime: project.date,
    tags: project.tags,
  });
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const projects = await getProjects();
  const project = projects.find((p) => p.slug === slug);

  if (!project) notFound();

  const index = projects.findIndex((p) => p.slug === slug);
  const next = projects[(index + 1) % projects.length];

  return (
    <>
      <header className="border-line relative overflow-hidden border-b">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 right-1/4 h-[28rem] w-[36rem] rounded-[50%] opacity-25 blur-[120px]"
          style={{ background: "radial-gradient(closest-side, rgba(110,91,255,0.6), transparent)" }}
        />

        <Container size="wide" className="relative pt-[calc(var(--nav-h)+3rem)] pb-14">
          <Link
            href="/projects"
            className="group text-faint hover:text-accent inline-flex items-center gap-2.5 font-mono text-[0.65rem] tracking-[0.22em] uppercase transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
            All work
          </Link>

          <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-faint font-mono text-[0.65rem] tracking-[0.25em] uppercase">
                  {project.kicker ?? "Project"}
                </p>
                {project.award && <Badge tone="accent">{project.award}</Badge>}
              </div>

              <h1
                data-split="lines"
                className="font-display mt-6 text-[clamp(2.5rem,8vw,6.5rem)] leading-[0.9] tracking-[-0.045em]"
              >
                {project.title}
              </h1>

              <p
                data-reveal
                data-reveal-delay="0.15"
                className="text-muted mt-7 max-w-2xl text-lg leading-relaxed"
              >
                {project.summary}
              </p>
            </div>

            <dl data-stagger="0.08" className="lg:col-span-3 lg:col-start-10">
              <div className="border-line border-t py-4">
                <dt className="text-faint font-mono text-[0.62rem] tracking-[0.2em] uppercase">
                  Date
                </dt>
                <dd className="mt-1.5 text-sm">
                  <time dateTime={project.date}>{formatDate(project.date)}</time>
                </dd>
              </div>
              <div className="border-line border-t py-4">
                <dt className="text-faint font-mono text-[0.62rem] tracking-[0.2em] uppercase">
                  Stack
                </dt>
                <dd className="text-muted mt-1.5 text-sm">{project.tags?.join(" · ")}</dd>
              </div>
            </dl>
          </div>

          {(project.repo || project.demo) && (
            <div data-reveal className="mt-10 flex flex-wrap gap-3">
              {project.demo && (
                <ButtonLink href={project.demo} external>
                  Live demo
                  <ExternalLink className="h-3.5 w-3.5" />
                </ButtonLink>
              )}
              {project.repo && (
                <ButtonLink href={project.repo} variant="secondary" external>
                  <SocialIcon icon="github" className="h-4 w-4" />
                  Source
                </ButtonLink>
              )}
            </div>
          )}
        </Container>
      </header>

      {/* --------------------------------- hero ------------------------------ */}
      <Container size="wide" className="pt-14">
        <div
          data-reveal
          className="group border-line relative aspect-[16/9] overflow-hidden rounded-2xl border sm:aspect-[21/9]"
        >
          {project.cover ? (
            <Image
              src={project.cover}
              alt={project.title}
              fill
              sizes="100vw"
              priority
              className="object-cover"
            />
          ) : (
            <ProceduralCover index={index} title={project.title} />
          )}
        </div>
      </Container>

      {/* --------------------------------- body ------------------------------ */}
      <Container size="prose" className="py-20">
        <article>
          <Mdx source={project.content} />
        </article>
      </Container>

      {/* ------------------------------ next project ------------------------- */}
      {next && next.slug !== project.slug && (
        <section className="border-line border-t">
          <Link
            href={`/projects/${next.slug}`}
            data-cursor="next"
            className="group hover:text-accent-ink relative block overflow-hidden"
          >
            <span
              aria-hidden
              className="bg-accent absolute inset-0 origin-bottom scale-y-0 transition-transform duration-600 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:scale-y-100"
            />
            <Container size="wide" className="relative flex flex-col gap-6 py-16 sm:py-20">
              <p className="text-faint group-hover:text-accent-ink/70 font-mono text-[0.65rem] tracking-[0.25em] uppercase transition-colors duration-500">
                Next project
              </p>
              <div className="flex flex-wrap items-center justify-between gap-6">
                <h2 className="font-display text-[clamp(2rem,7vw,5rem)] leading-none tracking-[-0.04em] transition-transform duration-500 group-hover:translate-x-3">
                  {next.title}
                </h2>
                <ArrowUpRight className="h-8 w-8 shrink-0 transition-transform duration-500 group-hover:translate-x-2 group-hover:-translate-y-2" />
              </div>
            </Container>
          </Link>
        </section>
      )}

      <ContactCTA />
    </>
  );
}

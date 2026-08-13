import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/types";
import { Badge } from "./Badge";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group border-border bg-surface hover:border-accent/50 flex flex-col overflow-hidden rounded-2xl border transition-colors"
    >
      <div className="bg-border/40 relative aspect-[16/10] overflow-hidden">
        {project.cover ? (
          <Image
            src={project.cover}
            alt={project.title}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="text-muted/30 grid h-full place-items-center text-4xl font-semibold">
            {project.title.charAt(0)}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold tracking-tight">{project.title}</h3>
          <ArrowUpRight className="text-muted group-hover:text-accent h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>

        <p className="text-muted mt-2 flex-1 text-sm">{project.summary}</p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {project.tags?.slice(0, 4).map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
      </div>
    </Link>
  );
}

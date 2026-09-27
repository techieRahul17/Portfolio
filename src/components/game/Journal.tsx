"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowUpRight, Check, FastForward, Lock, X } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";
import { achievements } from "@/data/achievements";
import { skills } from "@/data/skills";
import type { ZoneDef } from "@/lib/game/engine";
import type { Project } from "@/types";
import { resolve } from "./content";
import { mono } from "./Hud";

export function itemName(id: string, projects: Project[]) {
  const r = resolve(id, projects);
  if (!r) return id;
  switch (r.kind) {
    case "about":
      return "Who I am";
    case "xp":
      return `${r.item.role} · ${r.item.company.split(" ")[0]}`;
    case "project":
      return r.project.title;
    case "skill":
      return skills[r.index].title;
    case "trophy":
      return achievements[r.index].title;
    case "contact":
      return "Get in touch";
  }
}

/** Everything on the pitch, unlocked or not — with a way out for the hurried. */
export function Journal({
  zones,
  unlocked,
  projects,
  onOpen,
  onClose,
  onUnlockAll,
}: {
  zones: ZoneDef[];
  unlocked: Set<string>;
  projects: Project[];
  onOpen: (id: string) => void;
  onClose: () => void;
  onUnlockAll: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      gsap.from("[data-jr-panel]", { x: -60, opacity: 0, duration: 0.6, ease: "voltage" });
      gsap.from("[data-jr-zone]", { y: 16, opacity: 0, duration: 0.5, stagger: 0.05, delay: 0.1, ease: "voltage" });
    },
    { scope: root },
  );

  const total = zones.reduce((n, z) => n + z.ids.length, 0);
  const got = zones.reduce((n, z) => n + z.ids.filter((id) => unlocked.has(id)).length, 0);

  return (
    <div ref={root} className="absolute inset-0 z-40 flex bg-[rgba(7,7,10,0.55)] backdrop-blur-sm" onClick={onClose}>
      <aside
        data-jr-panel
        role="dialog"
        aria-label="Journal"
        onClick={(e) => e.stopPropagation()}
        className="panel flex h-full w-full max-w-md flex-col border-y-0 border-l-0"
      >
        <header className="border-line border-b px-6 py-5">
          <div className="flex items-center justify-between">
            <p className={`${mono} text-accent text-[0.6rem]`}>Journal</p>
            <button
              onClick={onClose}
              aria-label="Close journal"
              className="border-line-strong hover:border-accent hover:text-accent grid h-9 w-9 place-items-center rounded-full border transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="font-display mt-2 text-2xl tracking-[-0.02em]">Everything on the pitch</p>
          <div className="mt-4 flex items-center gap-3">
            <div className="bg-line-strong h-1.5 flex-1 overflow-hidden rounded-full">
              <div className="bg-accent h-full rounded-full" style={{ width: `${(got / Math.max(total, 1)) * 100}%` }} />
            </div>
            <span className="text-muted font-mono text-xs tabular-nums">
              {got}/{total}
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5" data-lenis-prevent>
          {zones.map((z, i) => {
            const zg = z.ids.filter((id) => unlocked.has(id)).length;
            return (
              <section key={z.id} data-jr-zone className="mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-faint font-mono text-[0.6rem]">0{i + 1}</span>
                  <h3 className="font-display text-base">{z.name}</h3>
                  <span className={`ml-auto font-mono text-[0.6rem] ${zg === z.ids.length ? "text-accent" : "text-faint"}`}>
                    {zg}/{z.ids.length}
                  </span>
                </div>
                <p className="text-faint mt-0.5 pl-7 text-xs">{z.task}</p>
                <ul className="mt-3 space-y-1.5">
                  {z.ids.map((id) => {
                    const has = unlocked.has(id);
                    return (
                      <li key={id}>
                        <button
                          disabled={!has}
                          onClick={() => onOpen(id)}
                          className="border-line hover:border-accent/60 disabled:hover:border-line group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors disabled:cursor-not-allowed"
                        >
                          <span
                            className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${has ? "bg-accent text-accent-ink" : "bg-bg-3 text-faint"}`}
                          >
                            {has ? <Check className="h-3.5 w-3.5" /> : <Lock className="h-3 w-3" />}
                          </span>
                          <span className={has ? "text-fg" : "text-faint"}>{has ? itemName(id, projects) : "Locked"}</span>
                          {has && <ArrowUpRight className="text-faint group-hover:text-accent ml-auto h-3.5 w-3.5 transition-colors" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        <footer className="border-line flex flex-wrap items-center gap-3 border-t px-6 py-4">
          {got < total && (
            <button onClick={onUnlockAll} className="text-muted hover:text-accent inline-flex items-center gap-2 text-xs transition-colors">
              <FastForward className="h-3.5 w-3.5" /> In a hurry? Unlock everything
            </button>
          )}
          <Link href="/portfolio" className="text-muted hover:text-accent ml-auto inline-flex items-center gap-1.5 text-xs transition-colors">
            Classic portfolio <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </footer>
      </aside>
    </div>
  );
}

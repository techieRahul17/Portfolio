"use client";

import { useRef } from "react";
import { Award, Briefcase, Layers, Mail, Target, User } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";
import { mono } from "./Hud";

export type Banner = { kind: "goal" | "save" | "bullseye" | "strike"; key: number; minute: number };
export type Note = { key: number; title: string; zone: string };

const COPY: Record<Banner["kind"], { title: string; sub: (m: number) => string; bands: [string, string] }> = {
  goal: { title: "GOAL", sub: (m) => `Rahul V S  ·  ${m}'`, bands: ["#6e5bff", "#e8ff4f"] },
  save: { title: "SAVED", sub: () => "Hold longer — full power beats the keeper", bands: ["#ff5c3d", "#15151f"] },
  bullseye: { title: "BULLSEYE", sub: () => "Project unlocked", bands: ["#e8ff4f", "#6e5bff"] },
  strike: { title: "STRIKE", sub: () => "All ten pins down", bands: ["#e8ff4f", "#ff5c3d"] },
};

const ZONE_ICON: Record<string, typeof User> = {
  about: User,
  experience: Briefcase,
  work: Target,
  skills: Layers,
  trophies: Award,
  contact: Mail,
};

/** Big broadcast moments: a TV-graphics sweep across the pitch. */
export function BannerSweep({ banner }: { banner: Banner | null }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!banner) return;
      const tl = gsap.timeline();
      tl.set(root.current, { autoAlpha: 1 })
        .fromTo("[data-band='a']", { xPercent: -110 }, { xPercent: 0, duration: 0.45, ease: "power4.out" })
        .fromTo("[data-band='b']", { xPercent: -110 }, { xPercent: 0, duration: 0.45, ease: "power4.out" }, 0.07)
        .fromTo(
          "[data-letter]",
          { yPercent: 110, skewX: -12, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.5, stagger: 0.045, ease: "back.out(2)" },
          0.15,
        )
        .fromTo("[data-sub]", { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.4 }, 0.35)
        .to("[data-band]", { xPercent: 110, duration: 0.45, ease: "power4.in", stagger: 0.05 }, "+=0.9")
        .to("[data-letter], [data-sub]", { opacity: 0, duration: 0.25 }, "<")
        .set(root.current, { autoAlpha: 0 });
    },
    { scope: root, dependencies: [banner?.key] },
  );

  const copy = banner ? COPY[banner.kind] : null;
  const big = banner?.kind === "goal";

  return (
    <div ref={root} aria-live="polite" className="pointer-events-none invisible absolute inset-0 z-30 grid place-items-center overflow-hidden">
      {copy && banner && (
        <div className="relative w-full -skew-y-3">
          <div data-band="a" className="absolute inset-x-0 top-1/2 h-[62%] -translate-y-1/2" style={{ background: copy.bands[0] }} />
          <div data-band="b" className="absolute inset-x-0 top-1/2 mt-[4%] h-[14%]" style={{ background: copy.bands[1] }} />
          <div className="relative flex flex-col items-center py-6">
            <p
              className={`font-display flex overflow-hidden leading-[0.85] font-semibold tracking-[-0.05em] text-white italic ${big ? "text-[clamp(5rem,17vw,13rem)]" : "text-[clamp(3rem,9vw,6.5rem)]"}`}
              style={{ textShadow: "0 8px 0 rgba(0,0,0,0.25)" }}
            >
              {copy.title.split("").map((c, i) => (
                <span key={i} data-letter className="inline-block">
                  {c}
                </span>
              ))}
            </p>
            <p data-sub className={`${mono} mt-3 text-[0.7rem] text-white/90`}>
              {copy.sub(banner.minute)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/** Achievement-style toasts, stacked under the scoreboard. */
export function Notes({ notes }: { notes: Note[] }) {
  return (
    <div className="pointer-events-none absolute top-20 left-1/2 z-30 flex w-[min(22rem,calc(100%-1.5rem))] -translate-x-1/2 flex-col gap-2 sm:top-24">
      {notes.map((n) => (
        <NoteCard key={n.key} note={n} />
      ))}
    </div>
  );
}

function NoteCard({ note }: { note: Note }) {
  const root = useRef<HTMLDivElement>(null);
  const Icon = ZONE_ICON[note.zone] ?? Award;
  useGSAP(
    () => {
      gsap
        .timeline()
        .from(root.current, { y: -24, opacity: 0, scale: 0.94, duration: 0.5, ease: "back.out(1.8)" })
        .fromTo("[data-shine]", { xPercent: -120 }, { xPercent: 220, duration: 0.9, ease: "power2.inOut" }, 0.15);
    },
    { scope: root },
  );
  return (
    <div ref={root} className="panel relative flex items-center gap-3 overflow-hidden rounded-2xl p-2.5 pr-4">
      <span data-shine aria-hidden className="absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <span className="bg-accent text-accent-ink grid h-10 w-10 shrink-0 place-items-center rounded-xl">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className={`${mono} text-accent text-[0.55rem]`}>Unlocked</p>
        <p className="truncate text-sm font-medium">{note.title}</p>
      </div>
    </div>
  );
}

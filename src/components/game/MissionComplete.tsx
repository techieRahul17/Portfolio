"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { CHALLENGES, formatStat, type ChallengeId, type Medal } from "@/lib/game/challenges";
import { MedalIcon } from "./icons";
import { mono } from "./Hud";

export type MissionResult = { key: number; id: ChallengeId; medal: Medal; value: number; improved: boolean; first: boolean };

const LABEL: Record<Medal, string> = { gold: "Gold", silver: "Silver", bronze: "Bronze" };

/**
 * The end-of-mission moment: the medal drops in and spins to rest, the stat
 * counts in, and a line says whether it's a new best. Then it gets out of the
 * way for the unlock cards.
 */
export function MissionComplete({ result }: { result: MissionResult }) {
  const root = useRef<HTMLDivElement>(null);
  const c = CHALLENGES[result.id];

  useGSAP(
    () => {
      gsap
        .timeline()
        .from("[data-mc-card]", { y: -40, opacity: 0, scale: 0.92, duration: 0.5, ease: "back.out(1.7)" })
        .from("[data-mc-medal]", { y: -120, rotateY: 720, scale: 0.4, duration: 1, ease: "bounce.out" }, 0.1)
        .from("[data-mc-line]", { y: 12, opacity: 0, duration: 0.4, stagger: 0.08 }, 0.45)
        .to("[data-mc-card]", { y: -30, opacity: 0, duration: 0.4, ease: "power2.in" }, 2.1);
    },
    { scope: root },
  );

  const headline = result.first ? "Mission complete" : result.improved ? "New best" : "Challenge done";

  return (
    <div ref={root} aria-live="polite" className="pointer-events-none absolute inset-x-0 top-[18%] z-30 flex justify-center px-4">
      <div data-mc-card className="panel flex items-center gap-5 rounded-3xl py-5 pr-8 pl-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
        <div data-mc-medal style={{ perspective: 400 }}>
          <MedalIcon medal={result.medal} className="h-20 w-16" />
        </div>
        <div>
          <p data-mc-line className={`${mono} text-accent text-[0.6rem]`}>
            {headline} · {c.title}
          </p>
          <p data-mc-line className="font-display mt-1 text-4xl leading-none tracking-[-0.03em]">
            {LABEL[result.medal]}
          </p>
          <p data-mc-line className="text-muted mt-2 text-sm">
            {formatStat(result.id, result.value)}
            {result.medal !== "gold" && <span className="text-faint"> · gold is {goldHint(result.id)}</span>}
          </p>
        </div>
      </div>
    </div>
  );
}

function goldHint(id: ChallengeId) {
  const c = CHALLENGES[id];
  if (c.stat === "seconds") return `under ${c.gold}s`;
  if (c.stat === "saves") return "no saves";
  return c.gold === 1 ? "first time" : `${c.gold} shots`;
}

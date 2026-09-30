"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, BookOpen, Menu, Star, Volume2, VolumeX } from "lucide-react";
import { profile } from "@/data/profile";
import type { Game, ZoneDef } from "@/lib/game/engine";
import { ZONE_ANCHORS } from "@/lib/game/layout";
import { Key, LiveDot, MedalIcon, NeedleIcon } from "./icons";
import { CHALLENGES, targetsLine, type ChallengeId } from "@/lib/game/challenges";
import type { Medals } from "./progress";
import { Minimap } from "./Minimap";

export const mono = "font-mono tracking-[0.2em] uppercase";

const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * Everything drawn over the pitch while playing. High-frequency values (clock,
 * power, compass) are written straight to the DOM from a rAF loop; React only
 * re-renders when something discrete changes (zone, prompt).
 */
export function Hud({
  game,
  zones,
  unlocked,
  score,
  stars,
  medals,
  muted,
  touch,
  onMute,
  onJournal,
  onMenu,
}: {
  game: React.RefObject<Game | null>;
  zones: ZoneDef[];
  unlocked: Set<string>;
  score: { goals: number; saves: number };
  stars: { count: number; total: number };
  medals: Medals;
  muted: boolean;
  touch: boolean;
  onMute: () => void;
  onJournal: () => void;
  onMenu: () => void;
}) {
  const clockRef = useRef<HTMLSpanElement>(null);
  const powerRef = useRef<HTMLDivElement>(null);
  const needleRef = useRef<HTMLDivElement>(null);
  const distRef = useRef<HTMLSpanElement>(null);
  const challengeRef = useRef<HTMLSpanElement>(null);
  const [brief, setBrief] = useState<{ id: ChallengeId; key: number } | null>(null);
  const [live, setLive] = useState({ zone: null as string | null, next: null as string | null, near: false, charging: false });
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    let raf = 0;
    let prev = live;
    let wentIdle = false;
    const briefed = new Set<string>();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const g = game.current;
      if (!g) return;
      const s = g.snapshot();
      if (clockRef.current) clockRef.current.textContent = clock(s.playTime);
      if (powerRef.current) powerRef.current.style.transform = `scaleX(${s.charge})`;
      if (s.next && needleRef.current && distRef.current) {
        const a = ZONE_ANCHORS[s.next];
        // The camera looks north, so world bearings map straight onto the screen.
        const bearing = Math.atan2(a.x - s.x, -(a.z - s.z));
        needleRef.current.style.transform = `rotate(${bearing}rad)`;
        distRef.current.textContent = `${Math.round(s.nextDist)} m`;
      }
      if (challengeRef.current) challengeRef.current.textContent = s.challenge?.text ?? "";
      const charging = s.charge > 0;
      // First time into a mission zone this match: the briefing card.
      if (s.zone && s.zone !== prev.zone && s.zone in CHALLENGES && !briefed.has(s.zone)) {
        briefed.add(s.zone);
        const key = performance.now();
        setBrief({ id: s.zone as ChallengeId, key });
        setTimeout(() => setBrief((b) => (b?.key === key ? null : b)), 5200);
      }
      if (s.zone !== prev.zone || s.next !== prev.next || s.near !== prev.near || charging !== prev.charging) {
        prev = { zone: s.zone, next: s.next, near: s.near, charging };
        setLive(prev);
      }
      if (!wentIdle && s.playTime > 25) {
        wentIdle = true;
        setIdle(true);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  const total = zones.reduce((n, z) => n + z.ids.length, 0);
  const got = zones.reduce((n, z) => n + z.ids.filter((id) => unlocked.has(id)).length, 0);
  const here = zones.find((z) => z.id === live.zone);
  const nextIndex = zones.findIndex((z) => z.id === live.next);
  const mission = here ?? zones[nextIndex];
  const missionGot = mission ? mission.ids.filter((id) => unlocked.has(id)).length : 0;
  const missionDone = mission ? missionGot === mission.ids.length : false;
  const challengeId = here && here.id in CHALLENGES ? (here.id as ChallengeId) : null;
  const best = challengeId ? medals[challengeId] : undefined;

  const ring = 2 * Math.PI * 21;

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* ---------------------------------------------------- top bar */}
      <div className="flex items-start justify-between gap-3 p-3 sm:p-5">
        {/* player card */}
        <div className="panel pointer-events-auto flex items-center gap-3 rounded-2xl py-2 pr-4 pl-2">
          <div className="relative h-12 w-12 shrink-0">
            <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90" aria-hidden>
              <circle cx="24" cy="24" r="21" fill="none" stroke="var(--line-strong)" strokeWidth="2.5" />
              <circle
                cx="24"
                cy="24"
                r="21"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={ring}
                strokeDashoffset={ring * (1 - got / Math.max(total, 1))}
                className="transition-[stroke-dashoffset] duration-1000"
              />
            </svg>
            <div className="absolute inset-[5px] overflow-hidden rounded-full">
              <Image src={profile.avatar} alt="" fill sizes="40px" className="object-cover" />
            </div>
            <span className="bg-accent text-accent-ink absolute -right-1 -bottom-1 rounded-md px-1 font-mono text-[0.55rem] font-bold">
              17
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-display truncate text-sm leading-tight">{profile.name}</p>
            <p className={`${mono} text-faint mt-0.5 text-[0.55rem]`}>
              <span className="text-accent tabular-nums">
                {got}/{total}
              </span>{" "}
              unlocked
            </p>
          </div>
          <span
            className="border-line-strong ml-1 flex items-center gap-1 rounded-full border px-2 py-1 font-mono text-[0.6rem] tabular-nums"
            title="Golden stars"
          >
            <Star className="h-3 w-3 fill-[#ffd24a] text-[#ffd24a]" />
            {stars.count}/{stars.total}
          </span>
        </div>

        {/* scoreboard */}
        <div className="pointer-events-auto absolute left-1/2 hidden -translate-x-1/2 md:block" aria-label="Scoreboard">
          <div className="flex items-stretch overflow-hidden rounded-xl border border-white/10 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)]">
            <div className="flex items-center gap-2 bg-[#6e5bff] px-3 py-1.5">
              <span className="font-display text-sm font-semibold tracking-tight text-white">RVS</span>
            </div>
            <div className="bg-bg-2 flex items-center gap-2 px-3 font-mono text-lg font-semibold tabular-nums">
              <span>{score.goals}</span>
              <span className="text-faint">–</span>
              <span>{score.saves}</span>
            </div>
            <div className="flex items-center bg-[#ff5c3d] px-3 py-1.5">
              <span className="font-display text-sm font-semibold tracking-tight text-white">GK</span>
            </div>
            <div className="bg-accent text-accent-ink flex items-center gap-1.5 px-3 font-mono text-sm font-semibold tabular-nums">
              <span ref={clockRef}>00:00</span>
            </div>
          </div>
          <p className={`${mono} text-muted bg-bg/90 mx-auto mt-1.5 flex w-fit items-center gap-2 rounded-full px-3 py-1 text-[0.55rem]`}>
            <LiveDot /> Live · The portfolio match
          </p>
        </div>

        {/* buttons */}
        <div className="pointer-events-auto flex items-center gap-2">
          <HudButton label={muted ? "Unmute (M)" : "Mute (M)"} onClick={onMute}>
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </HudButton>
          <HudButton label="Journal (J)" onClick={onJournal}>
            <BookOpen className="h-4 w-4" />
          </HudButton>
          <HudButton label="Menu (Esc)" onClick={onMenu}>
            <Menu className="h-4 w-4" />
          </HudButton>
          <Link
            href="/portfolio"
            className="panel hover:border-accent hover:text-accent hidden h-10 items-center gap-2 rounded-full px-4 text-xs transition-colors lg:flex"
          >
            Portfolio <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* ------------------------------------------------ mission card */}
      {mission && (
        <div className="absolute top-[4.5rem] right-3 left-3 sm:top-24 sm:right-5 sm:left-auto sm:w-72">
          <div key={mission.id} className="panel animate-[fadeUp_0.5s_var(--ease-out)] overflow-hidden rounded-2xl">
            <div className="bg-accent/90 text-accent-ink flex items-center justify-between px-4 py-1.5">
              <span className={`${mono} text-[0.58rem] font-semibold`}>
                {here ? (missionDone ? "Zone complete" : "Objective") : `Mission ${nextIndex + 1} of ${zones.length}`}
              </span>
              {!here && (
                <span className="flex items-center gap-1.5 font-mono text-[0.62rem] font-semibold">
                  <span ref={needleRef} className="inline-block transition-transform duration-150">
                    <NeedleIcon className="h-3 w-3" />
                  </span>
                  <span ref={distRef}>–</span>
                </span>
              )}
            </div>
            <div className="px-4 pt-3 pb-4">
              <p className="font-display text-lg leading-tight">{mission.name}</p>
              <p className="text-muted mt-1 text-xs leading-relaxed">
                {missionDone
                  ? challengeId && best !== "gold"
                    ? "All unlocked. Go again for a better medal."
                    : "All unlocked. Follow the light to the next mission."
                  : mission.task}
              </p>
              {challengeId && (
                <div className="border-line mt-3 rounded-xl border px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`${mono} text-accent text-[0.55rem]`}>Challenge · {CHALLENGES[challengeId].title}</p>
                    <MedalIcon medal={best ?? "none"} className="h-5 w-4" />
                  </div>
                  <p className="font-display mt-1 text-base leading-tight tabular-nums">
                    <span ref={challengeRef} />
                  </p>
                  <p className="text-faint mt-1 text-[0.65rem]">{targetsLine(challengeId)}</p>
                </div>
              )}
              <div className="mt-3 flex gap-1">
                {mission.ids.map((id) => (
                  <span
                    key={id}
                    className={`h-1 flex-1 rounded-full transition-colors duration-500 ${unlocked.has(id) ? "bg-accent" : "bg-line-strong"}`}
                  />
                ))}
              </div>
              <p className={`${mono} text-faint mt-2 text-[0.55rem]`}>
                {missionGot}/{mission.ids.length} unlocked
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------- mission briefing */}
      {brief && (
        <div className="absolute inset-x-0 top-28 flex justify-center px-4 md:top-32">
          <div key={brief.key} className="panel w-[min(26rem,100%)] animate-[fadeUp_0.5s_var(--ease-out)] rounded-2xl p-5 text-center">
            <p className={`${mono} text-accent text-[0.55rem]`}>Mission briefing</p>
            <p className="font-display mt-1.5 text-2xl leading-tight tracking-[-0.02em]">{CHALLENGES[brief.id].title}</p>
            <p className="text-muted mt-2 text-sm leading-relaxed">{CHALLENGES[brief.id].brief}</p>
            <div className="mt-3 flex items-center justify-center gap-3">
              <MedalIcon medal="gold" className="h-6 w-5" />
              <MedalIcon medal="silver" className="h-6 w-5" />
              <MedalIcon medal="bronze" className="h-6 w-5" />
            </div>
            <p className="text-faint mt-2 text-xs">{targetsLine(brief.id)}</p>
          </div>
        </div>
      )}

      {/* --------------------------------------------- contextual prompt */}
      <div className="absolute inset-x-0 bottom-36 flex justify-center px-4 sm:bottom-10">
        {live.charging ? (
          <div className="panel w-64 rounded-2xl px-4 py-3">
            <div className={`${mono} text-faint mb-2 flex justify-between text-[0.55rem]`}>
              <span>Power</span>
              <span className="text-accent">Release to shoot</span>
            </div>
            <div className="bg-line-strong relative h-2 overflow-hidden rounded-full">
              <div
                ref={powerRef}
                className="absolute inset-0 origin-left rounded-full"
                style={{ transform: "scaleX(0)", background: "linear-gradient(90deg,#6e5bff,#e8ff4f 70%,#ff5c3d)" }}
              />
              <div className="absolute inset-0 flex justify-between">
                {Array.from({ length: 9 }).map((_, i) => (
                  <span key={i} className="bg-bg-2 w-0.5 first:opacity-0" />
                ))}
              </div>
            </div>
          </div>
        ) : live.near ? (
          <p className="panel flex animate-[fadeUp_0.3s_var(--ease-out)] items-center gap-2.5 rounded-full px-4 py-2 text-sm">
            Hold {touch ? <Key wide>KICK</Key> : <Key wide>SPACE</Key>} to shoot
          </p>
        ) : null}
      </div>

      {/* --------------------------------------------------- controls */}
      {!touch && (
        <ul
          className={`absolute bottom-5 left-5 hidden flex-col gap-1.5 transition-opacity duration-700 lg:flex ${idle ? "opacity-35 hover:opacity-100" : "opacity-100"}`}
        >
          {[
            [["W", "A", "S", "D"], "Move"],
            [["SHIFT"], "Sprint"],
            [["SPACE"], "Shoot · hold for power"],
            [["R"], "Reset ball"],
            [["J"], "Journal"],
            [["ESC"], "Menu"],
          ].map(([ks, label]) => (
            <li key={label as string} className="text-muted flex items-center gap-2 text-xs">
              <span className="flex gap-0.5">
                {(ks as string[]).map((k) => (
                  <Key key={k} wide={k.length > 1}>
                    {k}
                  </Key>
                ))}
              </span>
              {label as string}
            </li>
          ))}
        </ul>
      )}

      {/* ------------------------------------------------------ radar */}
      <div className="pointer-events-auto absolute right-5 bottom-5 hidden sm:block">
        <Minimap game={game} zones={zones} unlocked={unlocked} />
      </div>
    </div>
  );
}

function HudButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={(e) => {
        onClick();
        e.currentTarget.blur();
      }}
      aria-label={label}
      title={label}
      className="panel hover:border-accent hover:text-accent grid h-10 w-10 place-items-center rounded-full transition-colors"
    >
      {children}
    </button>
  );
}

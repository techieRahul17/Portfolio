"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Volume2, VolumeX } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";
import { profile } from "@/data/profile";
import type { ZoneDef } from "@/lib/game/engine";
import { BallIcon, Key } from "./icons";
import { mono } from "./Hud";
import { KeepieUppie } from "./KeepieUppie";

/** What the loader claims to be doing. Only some of it is true. */
const LOADING_LINES = [
  "Inflating the ball to regulation pressure",
  "Mowing 64,000 blades of grass by hand",
  "Convincing the goalkeeper to show up",
  "Ironing the number 17 shirt",
  "Teaching the crowd to do the wave",
  "Painting the lines (slightly wobbly)",
  "Negotiating with the floodlights",
  "Hiding ten golden stars",
  "Stretching the hamstrings",
  "Checking VAR. It's fine.",
];

const TIPS = [
  "Pro tip: hold Space longer. The keeper hates that.",
  "Pro tip: there are ten golden stars. Almost nobody finds all ten.",
  "Pro tip: run into the bowling pins. Trust me.",
  "Warning: may contain hat-tricks.",
  "Pro tip: reverse hard at full sprint for a skid.",
];

/**
 * Two screens in one. While the stadium builds: a loader you can play — a
 * keepie-uppie, a pitch-shaped progress bar and a lot of nonsense. Once it's
 * ready the ball scores, the black lifts off the orbiting stadium and the
 * title menu slides in. Mid-juggle? It waits for you.
 */
export function GameBoot({
  progress,
  ready,
  failed,
  zones,
  unlocked,
  muted,
  touch,
  onMute,
  onStart,
  onHover,
}: {
  progress: number;
  label: string;
  ready: boolean;
  failed: boolean;
  zones: ZoneDef[];
  unlocked: Set<string>;
  muted: boolean;
  touch: boolean;
  onMute: () => void;
  onStart: () => void;
  /** The avatar reacts when you eye up the Kick off button. */
  onHover?: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const ballRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const pct = useRef<HTMLSpanElement>(null);
  const shown = useRef({ v: 0 });
  const [line, setLine] = useState(0);
  const [tip, setTip] = useState(0);
  const [juggling, setJuggling] = useState(false);
  const [lifted, setLifted] = useState(false);

  /* Ease the bar toward the real progress; the ball rolls along with it. */
  useEffect(() => {
    const tween = gsap.to(shown.current, {
      v: progress,
      duration: 0.7,
      ease: "power2.out",
      onUpdate: () => {
        const v = shown.current.v;
        if (fillRef.current) fillRef.current.style.transform = `scaleX(${v})`;
        if (ballRef.current) {
          ballRef.current.style.left = `calc(${v * 100}% - ${v * 28}px)`;
          ballRef.current.style.transform = `rotate(${v * 900}deg)`;
        }
        if (pct.current) pct.current.textContent = String(Math.round(v * 100)).padStart(3, "0");
      },
    });
    return () => void tween.kill();
  }, [progress]);

  /* The loader's running commentary. */
  useEffect(() => {
    const id = setInterval(() => setLine((l) => (l + 1) % LOADING_LINES.length), 1500);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!lifted) return;
    const id = setInterval(() => setTip((t) => (t + 1) % TIPS.length), 3600);
    return () => clearInterval(id);
  }, [lifted]);

  /* Ready and not mid-juggle: give the goal a beat, then lift. */
  useEffect(() => {
    if (!ready || juggling || lifted) return;
    const id = setTimeout(() => setLifted(true), 1400);
    return () => clearTimeout(id);
  }, [ready, juggling, lifted]);

  const lift = useCallback(() => ready && setLifted(true), [ready]);

  /* Enter: lift the loader when ready, then kick off from the title. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Enter") return;
      e.preventDefault();
      if (!lifted) lift();
      else onStart();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lifted, lift, onStart]);

  useGSAP(
    () => {
      if (!ready) return;
      gsap.fromTo("[data-goal]", { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2.5)" });
    },
    { scope: root, dependencies: [ready] },
  );

  useGSAP(
    () => {
      if (!lifted) return;
      gsap
        .timeline()
        .to("[data-loader]", { autoAlpha: 0, y: -20, duration: 0.45, ease: "power2.in" })
        .to("[data-blackout]", { autoAlpha: 0, duration: 1.1, ease: "power2.inOut" }, "-=0.1")
        .from("[data-title] > *", { y: 40, opacity: 0, duration: 0.9, stagger: 0.07, ease: "voltage" }, "-=0.75")
        .from("[data-side] > *", { x: 40, opacity: 0, duration: 0.8, stagger: 0.08, ease: "voltage" }, "<0.1");
    },
    { scope: root, dependencies: [lifted] },
  );

  const total = zones.reduce((n, z) => n + z.ids.length, 0);
  const got = zones.reduce((n, z) => n + z.ids.filter((id) => unlocked.has(id)).length, 0);

  return (
    <div ref={root} className="absolute inset-0 z-20">
      {/* ------------------------------------------------ title menu */}
      <div
        className="absolute inset-0 flex flex-col justify-between p-5 sm:p-10"
        style={{ background: "linear-gradient(90deg, rgba(7,7,10,0.92) 0%, rgba(7,7,10,0.55) 45%, rgba(7,7,10,0.15) 75%)" }}
      >
        <div className="flex items-start justify-between gap-4">
          <p className={`${mono} text-muted flex items-center gap-2 text-[0.62rem]`}>
            <span className="bg-accent h-1.5 w-1.5 rounded-full" /> Season 2026 · Kit 17
          </p>
          <Link href="/portfolio" className={`${mono} text-muted hover:text-accent flex items-center gap-2 text-[0.62rem] transition-colors`}>
            Skip the game <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid items-end gap-10 lg:grid-cols-12">
          <div data-title className="lg:col-span-7">
            <p className={`${mono} text-accent text-[0.65rem]`}>The portfolio match</p>
            <h1 className="font-display mt-4 text-[clamp(3.5rem,12vw,9.5rem)] leading-[0.84] font-medium tracking-[-0.05em]">
              RAHUL
              <br />
              <span className="text-accent">V S</span>
            </h1>
            <p className="text-fg mt-6 max-w-xl text-lg leading-snug">
              {profile.role} building 3D, motion-driven interfaces with Three.js and GSAP.
            </p>
            <p className="text-muted mt-3 max-w-lg leading-relaxed">
              Take the pitch as me. Six missions — score, dribble, shoot, collect — each one unlocks a piece of my work.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <button
                onClick={onStart}
                onPointerEnter={onHover}
                onFocus={onHover}
                disabled={!ready}
                className="bg-accent text-accent-ink group relative inline-flex items-center gap-3 overflow-hidden rounded-full py-2 pr-2 pl-7 text-base font-semibold shadow-[0_0_40px_-8px_rgba(232,255,79,0.6)] transition-transform hover:scale-[1.04] disabled:opacity-50"
              >
                <span className="absolute inset-0 -translate-x-full bg-white/30 transition-transform duration-700 group-hover:translate-x-full" />
                {got > 0 && got < total ? "Continue match" : "Kick off"}
                <span className="bg-accent-ink text-accent grid h-10 w-10 place-items-center rounded-full transition-transform duration-500 group-hover:rotate-[360deg]">
                  <BallIcon className="h-5 w-5" />
                </span>
              </button>
              <button
                onClick={onMute}
                aria-pressed={!muted}
                className="border-line-strong hover:border-accent hover:text-accent inline-flex h-14 items-center gap-2 rounded-full border px-5 text-sm transition-colors"
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                Sound {muted ? "off" : "on"}
              </button>
              {!touch && (
                <span className={`${mono} text-faint hidden items-center gap-2 text-[0.58rem] sm:flex`}>
                  or press <Key wide>ENTER</Key>
                </span>
              )}
            </div>
            <p key={tip} className="text-faint mt-5 animate-[fadeUp_0.5s_var(--ease-out)] text-sm">
              {TIPS[tip]}
            </p>
            {failed && (
              <p className="text-accent-3 mt-4 text-sm">
                This device couldn&apos;t start WebGL — the{" "}
                <Link href="/portfolio" className="underline">
                  classic portfolio
                </Link>{" "}
                has everything.
              </p>
            )}
          </div>

          <div data-side className="hidden gap-3 lg:col-span-4 lg:col-start-9 lg:grid">
            <div className="panel rounded-2xl p-5">
              <div className="flex items-baseline justify-between">
                <p className={`${mono} text-accent text-[0.6rem]`}>Match objectives</p>
                <p className="text-faint font-mono text-[0.6rem] tabular-nums">
                  {got}/{total}
                </p>
              </div>
              <ol className="mt-4 space-y-2.5">
                {zones.map((z, i) => {
                  const zg = z.ids.filter((id) => unlocked.has(id)).length;
                  const done = zg === z.ids.length;
                  return (
                    <li key={z.id} className="flex items-center gap-3 text-sm">
                      <span
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-md font-mono text-[0.62rem] ${done ? "bg-accent text-accent-ink" : "border-line-strong text-muted border"}`}
                      >
                        {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                      </span>
                      <span className={done ? "text-muted line-through decoration-1" : "text-fg"}>{z.name}</span>
                      <span className="text-faint ml-auto font-mono text-[0.6rem]">
                        {zg}/{z.ids.length}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
            <div className="panel rounded-2xl p-5">
              <p className={`${mono} text-accent text-[0.6rem]`}>Controls</p>
              <ul className="text-muted mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                {(touch
                  ? [
                      ["STICK", "Move"],
                      ["KICK", "Shoot"],
                    ]
                  : [
                      ["WASD", "Move"],
                      ["SHIFT", "Sprint"],
                      ["SPACE", "Shoot"],
                      ["R", "Reset ball"],
                      ["J", "Journal"],
                      ["ESC", "Menu"],
                    ]
                ).map(([k, v]) => (
                  <li key={k} className="flex items-center gap-2">
                    <Key wide={k.length > 1}>{k}</Key>
                    {v}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------- loader */}
      <div data-blackout className="bg-bg absolute inset-0 grid place-items-center overflow-y-auto p-5">
        <div data-loader className="w-[min(28rem,100%)]">
          <p className={`${mono} text-faint text-center text-[0.6rem]`}>The portfolio match</p>
          <p className="font-display mt-2 text-center text-4xl font-medium tracking-[-0.04em] sm:text-5xl">
            RAHUL <span className="text-accent">V S</span>
          </p>

          <div className="mt-8">
            <KeepieUppie muted={muted} onStreakChange={setJuggling} />
          </div>

          {/* progress: a little pitch, the ball dribbling to goal */}
          <div className="relative mt-7 h-9 rounded-md border border-[#2f6b3c] bg-[#123a1c]">
            <div ref={fillRef} className="absolute inset-y-0 left-0 w-full origin-left bg-[#1b5a2a]" style={{ transform: "scaleX(0)" }} />
            <span className="absolute inset-y-1 left-1/2 w-px bg-white/25" />
            <span className="absolute top-1/2 left-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" />
            <span className="absolute inset-y-2 left-0 w-2 border border-l-0 border-white/30" />
            <span className="absolute inset-y-2 right-0 w-2 border border-r-0 border-white/60 bg-white/10" />
            <div ref={ballRef} className="text-fg absolute top-1/2 -mt-[10px] ml-1 h-5 w-5" style={{ left: "0%" }}>
              <BallIcon className="h-5 w-5" />
            </div>
          </div>
          <div className={`${mono} mt-3 flex items-center justify-between gap-3 text-[0.58rem]`}>
            <span key={ready ? "ready" : line} className="text-faint animate-[fadeUp_0.35s_var(--ease-out)] truncate">
              {failed ? "WebGL unavailable" : ready ? "Stadium ready" : LOADING_LINES[line]}
            </span>
            <span className="text-fg shrink-0 tabular-nums">
              <span ref={pct}>000</span>%
            </span>
          </div>

          {ready && (
            <div data-goal className="mt-6 flex flex-col items-center gap-3">
              <p className="font-display text-accent text-2xl font-semibold tracking-[-0.02em] italic">GOAL. We&apos;re live.</p>
              {juggling && (
                <button
                  onClick={lift}
                  className="bg-accent text-accent-ink rounded-full px-5 py-2.5 text-sm font-semibold transition-transform hover:scale-[1.04]"
                >
                  Enter the stadium {!touch && <span className="opacity-60">(Enter)</span>}
                </button>
              )}
            </div>
          )}
          {failed && (
            <Link href="/portfolio" className="text-accent mt-8 block text-center text-sm underline">
              Open the classic portfolio instead
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

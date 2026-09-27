"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight, Check, Volume2, VolumeX } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";
import { profile } from "@/data/profile";
import type { ZoneDef } from "@/lib/game/engine";
import { BallIcon, Key } from "./icons";
import { mono } from "./Hud";

/**
 * Two screens in one. While the stadium builds: a black loader with real
 * progress. Once it's ready the black lifts off the orbiting stadium and the
 * title menu slides in.
 */
export function GameBoot({
  progress,
  label,
  ready,
  failed,
  zones,
  unlocked,
  muted,
  touch,
  onMute,
  onStart,
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
}) {
  const root = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const pct = useRef<HTMLSpanElement>(null);
  const shown = useRef({ v: 0 });

  /* Ease the bar toward the real progress, so steps never jump. */
  useEffect(() => {
    const tween = gsap.to(shown.current, {
      v: progress,
      duration: 0.6,
      ease: "power2.out",
      onUpdate: () => {
        const v = shown.current.v;
        if (bar.current) bar.current.style.transform = `scaleX(${v})`;
        if (pct.current) pct.current.textContent = String(Math.round(v * 100)).padStart(3, "0");
      },
    });
    return () => void tween.kill();
  }, [progress]);

  useGSAP(
    () => {
      if (!ready) return;
      gsap
        .timeline({ delay: 0.35 })
        .to("[data-loader]", { autoAlpha: 0, duration: 0.5, ease: "power2.in" })
        .to("[data-blackout]", { autoAlpha: 0, duration: 1.2, ease: "power2.inOut" }, "-=0.1")
        .from("[data-title] > *", { y: 40, opacity: 0, duration: 0.9, stagger: 0.07, ease: "voltage" }, "-=0.8")
        .from("[data-side] > *", { x: 40, opacity: 0, duration: 0.8, stagger: 0.08, ease: "voltage" }, "<0.1");
    },
    { scope: root, dependencies: [ready] },
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
                disabled={!ready}
                className="bg-accent text-accent-ink group relative inline-flex items-center gap-3 overflow-hidden rounded-full py-2 pr-2 pl-7 text-base font-semibold transition-transform hover:scale-[1.03] disabled:opacity-50"
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

      {/* ------------------------------------------------- blackout + loader */}
      <div data-blackout className="bg-bg absolute inset-0 grid place-items-center">
        <div data-loader className="w-[min(26rem,80vw)]">
          <p className={`${mono} text-faint text-center text-[0.6rem]`}>The portfolio match</p>
          <p className="font-display mt-3 text-center text-5xl font-medium tracking-[-0.04em]">
            RAHUL <span className="text-accent">V S</span>
          </p>
          <div className="bg-line mt-10 h-px overflow-hidden">
            <div ref={bar} className="bg-accent h-px origin-left" style={{ transform: "scaleX(0)" }} />
          </div>
          <div className={`${mono} text-faint mt-3 flex justify-between text-[0.58rem]`}>
            <span>{failed ? "WebGL unavailable" : label}</span>
            <span className="text-fg tabular-nums">
              <span ref={pct}>000</span>%
            </span>
          </div>
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

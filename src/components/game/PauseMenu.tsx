"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, BookOpen, Keyboard, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";
import { Key } from "./icons";
import { mono } from "./Hud";

/**
 * Esc menu. Arrow keys move between options like a console menu; Enter picks.
 */
export function PauseMenu({
  muted,
  touch,
  onResume,
  onJournal,
  onMute,
  onReset,
}: {
  muted: boolean;
  touch: boolean;
  onResume: () => void;
  onJournal: () => void;
  onMute: () => void;
  onReset: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<"main" | "controls" | "reset">("main");

  useGSAP(
    () => {
      gsap.from("[data-pm-card]", { y: 30, opacity: 0, scale: 0.97, duration: 0.5, ease: "voltage" });
      gsap.from("[data-pm-item]", { x: -16, opacity: 0, duration: 0.4, stagger: 0.04, delay: 0.1, ease: "voltage" });
    },
    { scope: root, dependencies: [view] },
  );

  useEffect(() => {
    root.current?.querySelector<HTMLElement>("[data-pm-item]")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "ArrowDown" && e.code !== "ArrowUp") return;
      e.preventDefault();
      const items = [...(root.current?.querySelectorAll<HTMLElement>("[data-pm-item]") ?? [])];
      const i = items.indexOf(document.activeElement as HTMLElement);
      const next = e.code === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
      items[next]?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view]);

  const item =
    "group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm outline-none transition-colors hover:bg-white/5 focus-visible:bg-accent focus-visible:text-accent-ink focus:bg-accent focus:text-accent-ink";

  return (
    <div ref={root} className="absolute inset-0 z-50 grid place-items-center bg-[rgba(7,7,10,0.6)] p-4 backdrop-blur-md">
      <div data-pm-card role="dialog" aria-label="Paused" className="panel w-full max-w-sm overflow-hidden rounded-3xl">
        <div className="border-line flex items-baseline justify-between border-b px-6 py-5">
          <p className="font-display text-3xl tracking-[-0.03em]">{view === "controls" ? "Controls" : view === "reset" ? "Reset?" : "Paused"}</p>
          <p className={`${mono} text-faint text-[0.55rem]`}>Esc to resume</p>
        </div>

        {view === "main" && (
          <div className="p-2">
            <button data-pm-item className={item} onClick={onResume}>
              <Play className="h-4 w-4" /> Resume
            </button>
            <button data-pm-item className={item} onClick={onJournal}>
              <BookOpen className="h-4 w-4" /> Journal
            </button>
            <button data-pm-item className={item} onClick={() => setView("controls")}>
              <Keyboard className="h-4 w-4" /> Controls
            </button>
            <button data-pm-item className={item} onClick={onMute}>
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />} Sound: {muted ? "off" : "on"}
            </button>
            <Link data-pm-item href="/portfolio" className={item}>
              <ArrowUpRight className="h-4 w-4" /> Classic portfolio
            </Link>
            <button data-pm-item className={`${item} text-muted`} onClick={() => setView("reset")}>
              <RotateCcw className="h-4 w-4" /> Reset progress
            </button>
          </div>
        )}

        {view === "controls" && (
          <div className="p-6">
            <ul className="text-muted space-y-3 text-sm">
              {(touch
                ? [
                    [["STICK"], "Move — push to the rim to sprint"],
                    [["KICK"], "Shoot — hold for power"],
                  ]
                : [
                    [["W", "A", "S", "D"], "Move (or arrow keys)"],
                    [["SHIFT"], "Sprint"],
                    [["SPACE"], "Shoot — hold for power"],
                    [["R"], "Reset the nearest ball"],
                    [["J"], "Journal"],
                    [["M"], "Mute"],
                    [["ESC"], "Menu"],
                  ]
              ).map(([ks, label]) => (
                <li data-pm-item key={label as string} className="flex items-center gap-3">
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
            <p className="text-faint mt-5 text-xs leading-relaxed">
              Shots aim themselves at the nearest goal corner or target you&apos;re facing. Power decides whether the keeper gets there first.
            </p>
            <button data-pm-item className={`${item} mt-4`} onClick={() => setView("main")}>
              Back
            </button>
          </div>
        )}

        {view === "reset" && (
          <div className="p-6">
            <p className="text-muted text-sm leading-relaxed">Lock everything again and start the match from kick-off?</p>
            <div className="mt-5 grid gap-1">
              <button data-pm-item className={item} onClick={onReset}>
                <RotateCcw className="h-4 w-4" /> Yes, reset
              </button>
              <button data-pm-item className={item} onClick={() => setView("main")}>
                Keep my progress
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

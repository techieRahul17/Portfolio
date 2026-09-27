"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { profile } from "@/data/profile";
import { skills } from "@/data/skills";
import { useMotion } from "@/components/motion/MotionProvider";
import { useMediaQuery } from "@/lib/hooks";
import type { Game, GameEvent } from "@/lib/game/engine";
import type { Project } from "@/types";
import { buildZones, gateLabels, ids, loadProgress, resolve, saveProgress } from "./content";
import { BannerSweep, Notes, type Banner, type Note } from "./Broadcast";
import { GameBoot } from "./GameBoot";
import { Hud, mono } from "./Hud";
import { Journal, itemName } from "./Journal";
import { Joystick } from "./Joystick";
import { PauseMenu } from "./PauseMenu";
import { RevealPanel } from "./RevealPanel";

const MUTE_KEY = "rvs:game:muted";

/**
 * The portfolio as a football match. Three.js draws the pitch; everything you
 * read — HUD, banners, unlock cards, menus — is real HTML layered on top.
 */
export function FootballGame({ projects }: { projects: Project[] }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const game = useRef<Game | null>(null);
  const bootRef = useRef<HTMLDivElement>(null);

  const zones = useMemo(() => buildZones(projects), [projects]);
  const allIds = useMemo(() => zones.flatMap((z) => z.ids), [zones]);
  const touch = useMediaQuery("(pointer: coarse)");
  const { lockScroll } = useMotion();

  const [phase, setPhase] = useState<"boot" | "play">("boot");
  const [ready, setReady] = useState(false);
  const [boot, setBoot] = useState({ progress: 0.05, label: "Warming up" });
  const [failed, setFailed] = useState(false);
  const [unlocked, setUnlocked] = useState<Set<string>>(() => new Set());
  const [open, setOpen] = useState<{ id: string; fresh: boolean } | null>(null);
  const [journal, setJournal] = useState(false);
  const [menu, setMenu] = useState(false);
  const [muted, setMuted] = useState(false);
  const [score, setScore] = useState({ goals: 0, saves: 0 });
  const [banner, setBanner] = useState<Banner | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [fullTimeReady, setFullTimeReady] = useState(false);
  const [finalMinutes, setFinalMinutes] = useState(0);
  const unlockedRef = useRef<Set<string>>(new Set());

  /* The game owns the viewport: no page scroll, no smooth-scroll engine. */
  useEffect(() => {
    lockScroll(true);
    return () => lockScroll(false);
  }, [lockScroll]);

  /* ------------------------------------------------------------ events */
  const minute = () => Math.floor((game.current?.snapshot().playTime ?? 0) / 60) + 1;

  const onEvent = useCallback(
    (e: GameEvent) => {
      const key = performance.now();
      if (e.type === "goal") {
        setScore((s) => ({ ...s, goals: s.goals + 1 }));
        setBanner({ kind: "goal", key, minute: minute() });
      } else if (e.type === "save") {
        setScore((s) => ({ ...s, saves: s.saves + 1 }));
        setBanner({ kind: "save", key, minute: minute() });
      } else if (e.type === "bullseye") {
        setBanner({ kind: "bullseye", key, minute: minute() });
      } else if (e.type === "strike") {
        setBanner({ kind: "strike", key, minute: minute() });
      } else if (e.type === "unlock" && e.fresh) {
        const zone = zones.find((z) => z.ids.includes(e.id))?.id ?? "";
        const note = { key, title: itemName(e.id, projects), zone };
        setNotes((n) => [...n.slice(-2), note]);
        setTimeout(() => setNotes((n) => n.filter((x) => x.key !== key)), 3200);
      }
    },
    [zones, projects],
  );

  // The engine is built once; it reaches the latest handler through this ref.
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  /* ------------------------------------------------------------ engine */
  useEffect(() => {
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const saved = loadProgress().filter((id) => allIds.includes(id));
    let startMuted = false;
    try {
      startMuted = localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      /* storage blocked — default to sound on */
    }

    let cancelled = false;
    let instance: Game | null = null;
    const step = (progress: number, label: string) => !cancelled && setBoot({ progress, label });

    // Web fonts first: the floor lettering is painted with them.
    const fonts = (document.fonts?.ready ?? Promise.resolve()).then(() => step(0.25, "Lacing up number 17"));
    const engine = import("@/lib/game/engine").then((m) => (step(0.5, "Mowing the pitch"), m));

    Promise.all([fonts, engine])
      .then(([, { createGame }]) => {
        if (cancelled || !canvas.current) return;
        unlockedRef.current = new Set(saved);
        setUnlocked(new Set(saved));
        setMuted(startMuted);
        instance = createGame(canvas.current, {
          zones,
          gateLabels,
          projects: projects.map((p) => ({ id: ids.project(p.slug), title: p.title })),
          skills: skills.map((s, i) => ({ id: ids.skill(i), title: s.title })),
          unlocked: saved,
          touch: isTouch,
          onProgress: step,
          onReady: () => !cancelled && setReady(true),
          onReveal: (id, fresh) => {
            const next = new Set(unlockedRef.current).add(id);
            const completes = fresh && allIds.every((x) => next.has(x));
            unlockedRef.current = next;
            saveProgress(next);
            setUnlocked(next);
            setOpen({ id, fresh });
            if (completes) {
              setFinalMinutes(Math.floor((instance?.snapshot().playTime ?? 0) / 60));
              setFullTimeReady(true);
            }
          },
          onEvent: (e) => onEventRef.current(e),
        });
        instance.setMuted(startMuted);
        game.current = instance;
      })
      .catch(() => !cancelled && setFailed(true));

    return () => {
      cancelled = true;
      instance?.dispose();
      game.current = null;
    };
    // Built once per mount; everything after that flows through state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------------------------------------ actions */
  const kickOff = useCallback(() => {
    if (!game.current) return;
    (document.activeElement as HTMLElement | null)?.blur();
    game.current.start();
    gsap.to(bootRef.current, {
      autoAlpha: 0,
      scale: 1.03,
      duration: 0.8,
      ease: "power2.inOut",
      onComplete: () => setPhase("play"),
    });
  }, []);

  const closePanel = useCallback(() => {
    setOpen(null);
    (document.activeElement as HTMLElement | null)?.blur();
    game.current?.resume();
  }, []);

  const openJournal = useCallback(() => {
    setMenu(false);
    setJournal(true);
    game.current?.pause();
  }, []);

  const closeJournal = useCallback(() => {
    setJournal(false);
    game.current?.resume();
  }, []);

  const openMenu = useCallback(() => {
    setMenu(true);
    game.current?.pause();
  }, []);

  const closeMenu = useCallback(() => {
    setMenu(false);
    (document.activeElement as HTMLElement | null)?.blur();
    game.current?.resume();
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      game.current?.setMuted(next);
      try {
        localStorage.setItem(MUTE_KEY, next ? "1" : "0");
      } catch {
        /* private mode — the choice just won't persist */
      }
      return next;
    });
  }, []);

  const unlockAll = useCallback(() => {
    const next = new Set(allIds);
    unlockedRef.current = next;
    saveProgress(next);
    setUnlocked(next);
    game.current?.unlockAll(allIds);
  }, [allIds]);

  const resetProgress = useCallback(() => {
    saveProgress([]);
    window.location.reload();
  }, []);

  const openFromJournal = (id: string) => {
    setJournal(false);
    setOpen({ id, fresh: false });
  };

  /* Full time: shown once the final unlock's card has been closed. */
  const fullTime = fullTimeReady && !open && phase === "play";
  const endFullTime = useCallback(() => {
    setFullTimeReady(false);
    game.current?.resume();
  }, []);
  useEffect(() => {
    if (fullTime) game.current?.pause();
  }, [fullTime]);

  /* Keyboard: Esc backs out of whatever is open, else opens the menu. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === "boot") {
        if (ready && (e.code === "Enter" || e.code === "Space")) {
          e.preventDefault();
          kickOff();
        }
        return;
      }
      if (e.code === "Escape") {
        if (open) closePanel();
        else if (journal) closeJournal();
        else if (menu) closeMenu();
        else if (fullTime) endFullTime();
        else openMenu();
        return;
      }
      if (open && e.code === "Enter") {
        closePanel();
        return;
      }
      if (open || menu || fullTime) return;
      if (e.code === "KeyJ") (journal ? closeJournal : openJournal)();
      if (e.code === "KeyM") toggleMute();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, ready, open, journal, menu, fullTime, kickOff, closePanel, closeJournal, closeMenu, endFullTime, openMenu, openJournal, toggleMute]);

  const reveal = open ? resolve(open.id, projects) : null;
  const overlay = open || journal || menu || fullTime;

  /* ------------------------------------------------------------- render */
  return (
    <div className="bg-bg fixed inset-0 overflow-hidden select-none" data-lenis-prevent>
      <canvas ref={canvas} aria-hidden className="absolute inset-0 h-full w-full touch-none outline-none" />

      {/* lens vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(120% 90% at 50% 45%, transparent 55%, rgba(4,4,8,0.55) 100%)" }}
      />

      {phase === "play" && (
        <>
          <Hud
            game={game}
            zones={zones}
            unlocked={unlocked}
            score={score}
            muted={muted}
            touch={touch}
            onMute={toggleMute}
            onJournal={openJournal}
            onMenu={openMenu}
          />
          {touch && !overlay && (
            <Joystick
              onMove={(x, y) => game.current?.setJoystick(x, y)}
              onKick={(down) => game.current?.setKick(down)}
              onReset={() => game.current?.resetBall()}
            />
          )}
        </>
      )}

      <BannerSweep banner={banner} />
      <Notes notes={notes} />

      {phase === "boot" && (
        <div ref={bootRef} className="absolute inset-0 z-20">
          <GameBoot
            progress={boot.progress}
            label={boot.label}
            ready={ready}
            failed={failed}
            zones={zones}
            unlocked={unlocked}
            muted={muted}
            touch={touch}
            onMute={toggleMute}
            onStart={kickOff}
          />
        </div>
      )}

      {reveal && open && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-end justify-center p-3 sm:items-center sm:justify-end sm:p-6">
          <RevealPanel key={open.id} reveal={reveal} fresh={open.fresh} onClose={closePanel} />
        </div>
      )}

      {journal && (
        <Journal zones={zones} unlocked={unlocked} projects={projects} onOpen={openFromJournal} onClose={closeJournal} onUnlockAll={unlockAll} />
      )}

      {menu && (
        <PauseMenu muted={muted} touch={touch} onResume={closeMenu} onJournal={openJournal} onMute={toggleMute} onReset={resetProgress} />
      )}

      {fullTime && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-[rgba(7,7,10,0.72)] p-5 backdrop-blur-md">
          <div className="max-w-xl text-center">
            <p className={`${mono} text-accent text-[0.65rem]`}>Full time</p>
            <div className="mx-auto mt-5 flex w-fit items-stretch overflow-hidden rounded-xl border border-white/10">
              <span className="font-display bg-[#6e5bff] px-4 py-2 font-semibold text-white">RVS</span>
              <span className="bg-bg-2 px-4 py-2 font-mono text-xl font-semibold tabular-nums">
                {score.goals} – {score.saves}
              </span>
              <span className="font-display bg-[#ff5c3d] px-4 py-2 font-semibold text-white">GK</span>
            </div>
            <h2 className="font-display mt-6 text-[clamp(3rem,10vw,6.5rem)] leading-[0.9] tracking-[-0.04em]">
              That&apos;s the
              <br />
              <span className="text-accent">whole squad.</span>
            </h2>
            <p className="text-muted mx-auto mt-5 max-w-md leading-relaxed">
              {allIds.length} of {allIds.length} unlocked{finalMinutes > 0 ? ` in ${finalMinutes} minutes` : ""}. If you enjoyed the match, I&apos;d
              love to build something like it with you.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/contact" className="bg-accent text-accent-ink rounded-full px-6 py-3.5 text-sm font-semibold">
                Let&apos;s talk
              </Link>
              <a
                href={profile.resumeUrl}
                target="_blank"
                rel="noreferrer"
                className="border-line-strong hover:border-accent rounded-full border px-6 py-3.5 text-sm transition-colors"
              >
                Résumé
              </a>
              <button onClick={endFullTime} className="text-muted hover:text-accent px-4 py-3.5 text-sm transition-colors">
                Keep playing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

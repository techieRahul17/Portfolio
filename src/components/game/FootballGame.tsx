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
import { Countdown } from "./Countdown";
import { MissionComplete, type MissionResult } from "./MissionComplete";
import { MedalIcon } from "./icons";
import { clearProgressExtras, loadAchievements, loadMedals, matchRating, recordMedal, saveAchievements, type Medals } from "./progress";
import { ACHIEVEMENTS, CHALLENGES, type AchievementId, type ChallengeId } from "@/lib/game/challenges";

const MUTE_KEY = "rvs:game:muted";
const STARS_KEY = "rvs:game:stars";

function loadStars(): number[] {
  try {
    const v = JSON.parse(localStorage.getItem(STARS_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((n) => Number.isInteger(n)) : [];
  } catch {
    return [];
  }
}

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
  /** Unlock cards waiting to be read, oldest first. */
  const [queue, setQueue] = useState<{ id: string; fresh: boolean }[]>([]);
  const open = queue[0] ?? null;
  const [journal, setJournal] = useState(false);
  const [menu, setMenu] = useState(false);
  const [muted, setMuted] = useState(false);
  const [score, setScore] = useState({ goals: 0, saves: 0 });
  const [banner, setBanner] = useState<Banner | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [fullTimeReady, setFullTimeReady] = useState(false);
  const [stars, setStars] = useState({ count: 0, total: 10 });
  const [count, setCount] = useState<{ text: string; key: number } | null>(null);
  const [finalMinutes, setFinalMinutes] = useState(0);
  const unlockedRef = useRef<Set<string>>(new Set());
  const [medals, setMedals] = useState<Medals>({});
  const medalsRef = useRef<Medals>({});
  const [achieved, setAchieved] = useState<AchievementId[]>([]);
  const achievedRef = useRef<Set<AchievementId>>(new Set());
  const [mission, setMission] = useState<MissionResult | null>(null);

  /* The game owns the viewport: no page scroll, no smooth-scroll engine. */
  useEffect(() => {
    lockScroll(true);
    return () => lockScroll(false);
  }, [lockScroll]);

  /* ------------------------------------------------------------ events */
  const minute = () => Math.floor((game.current?.snapshot().playTime ?? 0) / 60) + 1;

  const note = useCallback((title: string, zone: string, ms = 3000) => {
    const key = performance.now() + Math.random();
    setNotes((n) => [...n.slice(-2), { key, title, zone }]);
    setTimeout(() => setNotes((n) => n.filter((x) => x.key !== key)), ms);
  }, []);

  const achieve = useCallback(
    (id: AchievementId) => {
      if (achievedRef.current.has(id)) return;
      achievedRef.current.add(id);
      saveAchievements(achievedRef.current);
      setAchieved([...achievedRef.current]);
      const a = ACHIEVEMENTS.find((x) => x.id === id);
      if (a) note(`Achievement · ${a.title}`, "achievement", 3600);
    },
    [note],
  );

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
      } else if (e.type === "star") {
        setStars({ count: e.count, total: e.total });
        try {
          const got = new Set(loadStars()).add(e.index);
          localStorage.setItem(STARS_KEY, JSON.stringify([...got]));
        } catch {
          /* private mode — stars just won't persist */
        }
        if (e.count === e.total) setBanner({ kind: "stars", key, minute: minute() });
        else {
          const note = { key, title: `Golden star ${e.count} of ${e.total}`, zone: "star" };
          setNotes((n) => [...n.slice(-2), note]);
          setTimeout(() => setNotes((n) => n.filter((x) => x.key !== key)), 2400);
        }
      } else if (e.type === "unlock" && e.fresh) {
        const zone = zones.find((z) => z.ids.includes(e.id))?.id ?? "";
        note(itemName(e.id, projects), zone, 3200);
      } else if (e.type === "challenge") {
        const r = recordMedal(medalsRef.current, e.id, e.medal);
        medalsRef.current = r.medals;
        setMedals(r.medals);
        setMission({ key, id: e.id, medal: e.medal, value: e.value, improved: r.improved, first: r.first });
        setTimeout(() => setMission((m) => (m?.key === key ? null : m)), 2700);
        const all = Object.keys(CHALLENGES) as ChallengeId[];
        if (all.every((id) => r.medals[id] === "gold")) achieve("perfectionist");
      } else if (e.type === "achievement") {
        achieve(e.id);
      } else if (e.type === "crossbar") {
        setBanner({ kind: "crossbar", key, minute: minute() });
      }
    },
    [zones, projects, note, achieve],
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

    const savedStars = loadStars();
    const savedMedals = loadMedals();
    const savedAch = loadAchievements();

    Promise.all([fonts, engine])
      .then(async ([, { createGame }]) => {
        if (cancelled || !canvas.current) return;
        unlockedRef.current = new Set(saved);
        setUnlocked(new Set(saved));
        setMuted(startMuted);
        setStars((s) => ({ ...s, count: savedStars.length }));
        medalsRef.current = savedMedals;
        setMedals(savedMedals);
        achievedRef.current = new Set(savedAch);
        setAchieved(savedAch);
        const built = await createGame(canvas.current, {
          zones,
          gateLabels,
          projects: projects.map((p) => ({ id: ids.project(p.slug), title: p.title })),
          skills: skills.map((s, i) => ({ id: ids.skill(i), title: s.title })),
          unlocked: saved,
          stars: savedStars,
          achieved: savedAch,
          touch: isTouch,
          onProgress: step,
          onReady: () => !cancelled && setReady(true),
          onReveal: (id, fresh) => {
            const next = new Set(unlockedRef.current).add(id);
            const completes = fresh && allIds.every((x) => next.has(x));
            unlockedRef.current = next;
            saveProgress(next);
            setUnlocked(next);
            setQueue((q) => (q.some((x) => x.id === id) ? q : [...q, { id, fresh }]));
            if (completes) {
              setFinalMinutes(Math.floor((instance?.snapshot().playTime ?? 0) / 60));
              setFullTimeReady(true);
            }
          },
          onEvent: (e) => onEventRef.current(e),
        });
        // Unmounted while the stadium was still being built: tear it down.
        if (cancelled) {
          built.dispose();
          return;
        }
        instance = built;
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
    const g = game.current;
    g.start();
    gsap.to(bootRef.current, {
      autoAlpha: 0,
      scale: 1.03,
      duration: 0.8,
      ease: "power2.inOut",
      onComplete: () => setPhase("play"),
    });
    // 3 · 2 · 1 · KICK OFF, in time with the camera swooping down.
    const beats: [number, string][] = [
      [0.35, "3"],
      [0.9, "2"],
      [1.45, "1"],
      [2.0, "KICK OFF"],
    ];
    beats.forEach(([at, text]) =>
      setTimeout(() => {
        setCount({ text, key: performance.now() });
        g.cue(text === "KICK OFF" ? "go" : "beep");
      }, at * 1000),
    );
    setTimeout(() => setCount(null), 3000);
  }, []);

  const queueRef = useRef(queue);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  /** Close the card on top; the game resumes only when none are left. */
  const closePanel = useCallback(() => {
    const rest = queueRef.current.slice(1);
    setQueue(rest);
    (document.activeElement as HTMLElement | null)?.blur();
    if (rest.length === 0) game.current?.resume();
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
    clearProgressExtras();
    window.location.reload();
  }, []);

  const openFromJournal = (id: string) => {
    setJournal(false);
    setQueue([{ id, fresh: false }]);
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
      // The boot screen handles its own keys (Space juggles, Enter proceeds).
      if (phase === "boot") return;
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
    <div data-game-root className="bg-bg fixed inset-0 overflow-hidden select-none" data-lenis-prevent>
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
            stars={stars}
            medals={medals}
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
      {mission && <MissionComplete key={mission.key} result={mission} />}
      {count && <Countdown key={count.key} text={count.text} />}
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
            onHover={() => game.current?.emote("fistpump")}
            medals={medals}
            onJuggle={(n) => n >= 10 && achieve("juggler")}
          />
        </div>
      )}

      {reveal && open && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-end justify-center p-3 sm:items-center sm:justify-end sm:p-6">
          <RevealPanel key={open.id} reveal={reveal} fresh={open.fresh} onClose={closePanel} />
        </div>
      )}

      {journal && (
        <Journal
          zones={zones}
          unlocked={unlocked}
          projects={projects}
          medals={medals}
          achieved={achieved}
          onOpen={openFromJournal}
          onClose={closeJournal}
          onUnlockAll={unlockAll}
        />
      )}

      {menu && (
        <PauseMenu muted={muted} touch={touch} onResume={closeMenu} onJournal={openJournal} onMute={toggleMute} onReset={resetProgress} />
      )}

      {fullTime && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-[rgba(7,7,10,0.86)] p-5">
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
            <div className="mx-auto mt-6 flex w-fit items-center gap-6">
              <div className="text-left">
                <p className={`${mono} text-faint text-[0.55rem]`}>Match rating</p>
                <p className="font-display text-accent text-5xl leading-none tabular-nums">
                  {matchRating(medals, achieved.length, stars.count).toFixed(1)}
                </p>
              </div>
              <div className="flex gap-1.5">
                {(Object.keys(CHALLENGES) as ChallengeId[]).map((id) => (
                  <MedalIcon key={id} medal={medals[id] ?? "none"} className="h-10 w-8" />
                ))}
              </div>
            </div>
            <p className="text-muted mx-auto mt-5 max-w-md leading-relaxed">
              {allIds.length} of {allIds.length} unlocked{finalMinutes > 0 ? ` in ${finalMinutes} minutes` : ""}, {achieved.length} of{" "}
              {ACHIEVEMENTS.length} achievements, {stars.count} of {stars.total} stars. Go back for gold on every mission — or, if you
              enjoyed the match, let&apos;s build something like it together.
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

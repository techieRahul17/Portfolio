"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP, ScrollTrigger } from "@/lib/gsap";
import { useMotion } from "./MotionProvider";
import { profile } from "@/data/profile";

const SESSION_KEY = "rvs:visited";

/**
 * First-load curtain: a counter runs to 100 while the name assembles, then
 * the whole panel shutters upward in slats.
 *
 * It only plays once per session. On repeat visits a blocking script in the
 * root layout adds `.visited` to <html>, so CSS hides this before first paint
 * and the effect below tears it down without ever showing a frame.
 */
export function Preloader() {
  const root = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);
  const { setReady, lockScroll, reduced } = useMotion();

  useGSAP(
    () => {
      const alreadyVisited =
        document.documentElement.classList.contains("visited") ||
        (() => {
          try {
            return Boolean(sessionStorage.getItem(SESSION_KEY));
          } catch {
            return false;
          }
        })();

      if (alreadyVisited || reduced) {
        setDone(true);
        setReady(true);
        return;
      }

      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* private mode — the curtain simply plays again next time */
      }

      lockScroll(true);

      const counter = { value: 0 };
      const output = root.current!.querySelector<HTMLElement>("[data-count]")!;

      const tl = gsap.timeline({
        onComplete: () => {
          lockScroll(false);
          setDone(true);
          setReady(true);
          ScrollTrigger.refresh();
        },
      });

      tl.to(counter, {
        value: 100,
        duration: 1.9,
        ease: "power2.inOut",
        onUpdate: () => {
          output.textContent = String(Math.round(counter.value)).padStart(3, "0");
        },
      })
        .to("[data-pre-bar]", { scaleX: 1, duration: 1.9, ease: "power2.inOut" }, 0)
        .from(
          "[data-pre-word] span",
          { yPercent: 115, duration: 1, stagger: 0.045, ease: "voltage" },
          0.25,
        )
        .from("[data-pre-meta]", { opacity: 0, duration: 0.6 }, 0.7)
        // Hold for a beat so 100 is actually readable, then shutter away.
        .to(["[data-pre-word]", "[data-pre-meta]", "[data-pre-foot]"], {
          opacity: 0,
          y: -18,
          duration: 0.5,
          ease: "power2.in",
        })
        .to(
          "[data-slat]",
          {
            scaleY: 0,
            transformOrigin: "top center",
            duration: 0.9,
            stagger: { each: 0.06, from: "start" },
            ease: "voltageInOut",
          },
          "-=0.15",
        );
    },
    { scope: root, dependencies: [reduced] },
  );

  if (done) return null;

  return (
    <div
      id="preloader"
      ref={root}
      aria-hidden
      className="fixed inset-0 z-[9999] flex flex-col justify-between overflow-hidden p-6 sm:p-10"
    >
      {/* Slats that shutter upward, revealing the page beneath. */}
      <div className="absolute inset-0 -z-10 flex">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} data-slat className="bg-bg h-full flex-1 origin-top" />
        ))}
      </div>

      <div data-pre-meta className="flex items-start justify-between">
        <p className="font-mono text-[0.65rem] tracking-[0.25em] uppercase">
          <span className="text-faint">Portfolio</span>{" "}
          <span className="text-accent">/ 2026</span>
        </p>
        <p className="text-faint hidden font-mono text-[0.65rem] tracking-[0.25em] uppercase sm:block">
          {profile.location}
        </p>
      </div>

      <div className="flex flex-col items-start">
        <h1
          data-pre-word
          className="font-display text-[clamp(2.5rem,11vw,9rem)] leading-[0.86] font-medium tracking-[-0.04em]"
        >
          {profile.nameParts.map((part) => (
            <span key={part} className="line-mask">
              <span className="block">{part}</span>
            </span>
          ))}
        </h1>
      </div>

      <div data-pre-foot className="flex items-end justify-between gap-6">
        <div className="w-full max-w-md">
          <div className="bg-line h-px w-full overflow-hidden">
            <div data-pre-bar className="bg-accent h-px w-full origin-left scale-x-0" />
          </div>
          <p className="text-faint mt-3 font-mono text-[0.65rem] tracking-[0.25em] uppercase">
            Loading experience
          </p>
        </div>
        <p
          data-count
          className="font-display text-fg text-[clamp(2rem,7vw,4.5rem)] leading-none tabular-nums"
        >
          000
        </p>
      </div>
    </div>
  );
}

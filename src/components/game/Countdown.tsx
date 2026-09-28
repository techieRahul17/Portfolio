"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

/**
 * One beat of the kick-off countdown: the number slams in, rings out, and
 * leaves. "KICK OFF" gets the bigger, longer treatment.
 */
export function Countdown({ text }: { text: string }) {
  const root = useRef<HTMLDivElement>(null);
  const final = text.length > 1;

  useGSAP(
    () => {
      gsap
        .timeline()
        .fromTo("[data-cd]", { scale: 2.4, opacity: 0, rotate: final ? -8 : 0 }, { scale: 1, opacity: 1, rotate: 0, duration: 0.32, ease: "power4.out" })
        .fromTo("[data-ring]", { scale: 0.4, opacity: 0.8 }, { scale: 2.2, opacity: 0, duration: 0.6, ease: "power2.out" }, 0)
        .to("[data-cd]", { scale: 0.8, opacity: 0, duration: 0.22, ease: "power2.in" }, final ? 0.75 : 0.34);
    },
    { scope: root },
  );

  return (
    <div ref={root} aria-live="assertive" className="pointer-events-none absolute inset-0 z-30 grid place-items-center">
      <span data-ring className="border-accent absolute h-40 w-40 rounded-full border-2" />
      <p
        data-cd
        className={`font-display text-accent leading-none font-semibold tracking-[-0.05em] italic ${final ? "text-[clamp(3.5rem,13vw,9rem)]" : "text-[clamp(6rem,20vw,14rem)]"}`}
        style={{ textShadow: "0 0 50px rgba(232,255,79,0.55), 0 8px 0 rgba(0,0,0,0.35)" }}
      >
        {text}
      </p>
    </div>
  );
}

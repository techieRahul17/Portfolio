"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { gsap, useGSAP, ScrollTrigger, SplitText } from "@/lib/gsap";
import { useMotion } from "./MotionProvider";

/**
 * The site's animation engine.
 *
 * Sections stay server components and simply mark up their intent with data
 * attributes; this one client component finds those nodes and wires the
 * GSAP timelines. That keeps the shipped JS in one place instead of turning
 * every section into a client boundary.
 *
 *   data-reveal            fade + rise into view       (data-reveal-delay="0.2")
 *   data-stagger           same, cascaded over children
 *   data-split="lines"     mask-reveal each text line  ("chars" for per-letter)
 *   data-parallax="0.25"   drift against the scroll
 *   data-counter="8.594"   count up when scrolled to   (data-decimals="3")
 *   data-fill              wipe an accent rule across
 */
export function Animator() {
  const pathname = usePathname();
  const { ready, reduced } = useMotion();
  const [fontsReady, setFontsReady] = useState(false);

  // Splitting text before the webfont lands measures the fallback face and
  // produces lines that jump on swap.
  useEffect(() => {
    let cancelled = false;
    const done = () => !cancelled && setFontsReady(true);
    if (document.fonts?.ready) {
      document.fonts.ready.then(done);
    } else {
      done();
    }
    return () => {
      cancelled = true;
    };
  }, []);

  useGSAP(
    () => {
      if (reduced || !ready || !fontsReady) return;

      const splits: SplitText[] = [];

      /* ---------------------------------------------------------- text */
      gsap.utils.toArray<HTMLElement>("[data-split]").forEach((el) => {
        const mode = el.dataset.split === "chars" ? "chars" : "lines";

        const split = new SplitText(el, {
          type: mode === "chars" ? "chars,words" : "lines",
          mask: mode === "chars" ? "chars" : "lines",
          linesClass: "split-line",
        });
        splits.push(split);

        // The element was held at opacity 0 by CSS so the un-split text never
        // flashes. Splitting is done, so the masks can take over the hiding.
        gsap.set(el, { opacity: 1 });

        const targets = mode === "chars" ? split.chars : split.lines;

        gsap.from(targets, {
          yPercent: 120,
          duration: mode === "chars" ? 0.8 : 1.1,
          stagger: mode === "chars" ? 0.022 : 0.09,
          delay: Number(el.dataset.revealDelay ?? 0),
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });

      /* -------------------------------------------------------- reveals */
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 1,
          delay: Number(el.dataset.revealDelay ?? 0),
          startAt: { y: 26 },
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-stagger]").forEach((el) => {
        gsap.to(Array.from(el.children), {
          opacity: 1,
          y: 0,
          duration: 0.9,
          stagger: Number(el.dataset.stagger) || 0.07,
          startAt: { y: 30 },
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });

      /* ------------------------------------------------------- parallax */
      gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el) => {
        const strength = Number(el.dataset.parallax) || 0.2;
        gsap.fromTo(
          el,
          { yPercent: -strength * 50 },
          {
            yPercent: strength * 50,
            ease: "none",
            scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
          },
        );
      });

      /* ------------------------------------------------------- counters */
      gsap.utils.toArray<HTMLElement>("[data-counter]").forEach((el) => {
        const target = Number(el.dataset.counter) || 0;
        const decimals = Number(el.dataset.decimals) || 0;
        const obj = { v: 0 };

        gsap.to(obj, {
          v: target,
          duration: 2,
          ease: "power3.out",
          onUpdate: () => {
            el.textContent = obj.v.toLocaleString("en-US", {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            });
          },
          scrollTrigger: { trigger: el, start: "top 92%", once: true },
        });
      });

      /* ---------------------------------------------------- accent rules */
      gsap.utils.toArray<HTMLElement>("[data-fill]").forEach((el) => {
        gsap.fromTo(
          el,
          { scaleX: 0, transformOrigin: "left center" },
          {
            scaleX: 1,
            duration: 1.4,
            ease: "voltageInOut",
            scrollTrigger: { trigger: el, start: "top 92%", once: true },
          },
        );
      });

      ScrollTrigger.refresh();

      return () => splits.forEach((s) => s.revert());
    },
    { dependencies: [pathname, ready, reduced, fontsReady], revertOnUpdate: true },
  );

  return null;
}

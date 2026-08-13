"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { REDUCED_MOTION, useMediaQuery } from "@/lib/hooks";

type MotionCtx = {
  /** Flips true once the preloader has finished and the page may animate in. */
  ready: boolean;
  setReady: (v: boolean) => void;
  /** Smooth-scroll to an element or offset. Falls back to native behaviour. */
  scrollTo: (target: string | number | HTMLElement, offset?: number) => void;
  lockScroll: (locked: boolean) => void;
  reduced: boolean;
};

const Ctx = createContext<MotionCtx | null>(null);

export function useMotion() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMotion must be used inside <MotionProvider>");
  return ctx;
}

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const reduced = useMediaQuery(REDUCED_MOTION);

  /* ------------------------------------------------------------------
     Lenis drives the scroll; GSAP's ticker drives Lenis; ScrollTrigger
     listens to Lenis. One clock for everything means pinned sections
     never drift out of sync with the smoothed scroll position.

     Anyone who asked for reduced motion keeps the browser's own scroll —
     <Preloader> flips `ready` for them, so content still un-hides.
     ------------------------------------------------------------------ */
  useEffect(() => {
    if (reduced) return;

    const lenis = new Lenis({
      duration: 1.1,
      lerp: 0.09,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
      // Let touch devices use their own native, battery-friendly scrolling.
      smoothWheel: true,
      syncTouch: false,
    });
    lenisRef.current = lenis;

    lenis.on("scroll", ScrollTrigger.update);

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [reduced]);

  /* Safety net: content is hidden until `ready`, so it must never be able to
     stay false because something upstream threw. */
  useEffect(() => {
    const id = setTimeout(() => setReady(true), 4500);
    return () => clearTimeout(id);
  }, []);

  /* Scroll to top and re-measure on navigation. */
  useEffect(() => {
    lenisRef.current?.scrollTo(0, { immediate: true });
    // Layout for the new route lands a frame later; measure after it does.
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  const scrollTo = useCallback((target: string | number | HTMLElement, offset = 0) => {
    const lenis = lenisRef.current;
    if (lenis) {
      lenis.scrollTo(target, { offset, duration: 1.4 });
      return;
    }
    // Reduced motion, or Lenis not running: use the platform.
    if (typeof target === "number") {
      window.scrollTo({ top: target + offset });
    } else {
      const el = typeof target === "string" ? document.querySelector(target) : target;
      el?.scrollIntoView({ block: "start" });
    }
  }, []);

  const lockScroll = useCallback((locked: boolean) => {
    const lenis = lenisRef.current;
    if (locked) {
      lenis?.stop();
      document.documentElement.style.overflow = "hidden";
    } else {
      lenis?.start();
      document.documentElement.style.overflow = "";
    }
  }, []);

  /* Intercept in-page anchors so they glide instead of jumping. */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement | null)?.closest?.('a[href^="#"]');
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href === "#") return;
      const el = document.querySelector(href);
      if (!el) return;
      e.preventDefault();
      scrollTo(el as HTMLElement, -80);
      history.replaceState(null, "", href);
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [scrollTo]);

  return (
    <Ctx.Provider value={{ ready, setReady, scrollTo, lockScroll, reduced }}>
      {children}
    </Ctx.Provider>
  );
}

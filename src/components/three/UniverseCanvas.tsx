"use client";

import { useEffect, useRef, useState } from "react";
import { useMotion } from "@/components/motion/MotionProvider";
import type { Universe } from "@/lib/webgl/universe";

/**
 * Fixed, full-viewport WebGL layer behind the home page.
 *
 * Three.js is pulled in with a dynamic import, so it never sits on the
 * critical path: the page paints, the preloader runs, and the universe streams
 * in behind it. Anything that goes wrong — no WebGL, a lost context — just
 * leaves the plain background, which is what the page looked like anyway.
 */
export function UniverseCanvas() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [engine, setEngine] = useState<Universe | null>(null);
  const [visible, setVisible] = useState(false);
  const { ready, reduced } = useMotion();

  useEffect(() => {
    let cancelled = false;
    let instance: Universe | null = null;

    import("@/lib/webgl/universe")
      .then(({ createUniverse }) => {
        if (cancelled || !canvas.current) return;
        instance = createUniverse(canvas.current, {
          reduced,
          onFirstFrame: () => !cancelled && setVisible(true),
        });
        setEngine(instance);
      })
      .catch(() => {
        /* No WebGL: the flat background stands in. */
      });

    return () => {
      cancelled = true;
      instance?.dispose();
      setEngine(null);
      setVisible(false);
    };
  }, [reduced]);

  // The preloader curtain lifts on `ready`; that's the cue for the big bang.
  useEffect(() => {
    if (ready && engine) engine.intro();
  }, [ready, engine]);

  return (
    <canvas
      ref={canvas}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-30 h-[100lvh] w-full transition-opacity duration-1000"
      style={{ opacity: visible ? 1 : 0 }}
    />
  );
}

"use client";

import { useEffect, useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { FINE_POINTER, REDUCED_MOTION, useMediaQuery } from "@/lib/hooks";

/**
 * Two-part cursor: a dot pinned to the pointer and a ring that trails it.
 *
 * Any element can drive it declaratively — `data-cursor="view"` swells the
 * ring and prints a label inside it, `data-cursor="hide"` gets out of the way.
 * Touch devices and reduced-motion visitors keep their native cursor.
 */
export function Cursor() {
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  // Both queries are false during SSR, so the native cursor is the default and
  // this only takes over once the client confirms a real pointer. They're read
  // into locals first — `&&` between the two calls would short-circuit one of
  // the hooks and break the rules of hooks.
  const finePointer = useMediaQuery(FINE_POINTER);
  const reducedMotion = useMediaQuery(REDUCED_MOTION);
  const enabled = finePointer && !reducedMotion;

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.classList.add("cursor-ready");
    return () => document.documentElement.classList.remove("cursor-ready");
  }, [enabled]);

  useGSAP(
    () => {
      if (!enabled) return;

      const ringEl = ring.current!;
      const dotEl = dot.current!;
      const labelEl = label.current!;

      gsap.set([ringEl, dotEl], { xPercent: -50, yPercent: -50, opacity: 0 });

      // quickTo keeps a single tween alive per axis instead of spawning one
      // per mousemove — the difference is very visible on a busy page.
      const ringX = gsap.quickTo(ringEl, "x", { duration: 0.5, ease: "power3" });
      const ringY = gsap.quickTo(ringEl, "y", { duration: 0.5, ease: "power3" });
      const dotX = gsap.quickTo(dotEl, "x", { duration: 0.12, ease: "power3" });
      const dotY = gsap.quickTo(dotEl, "y", { duration: 0.12, ease: "power3" });

      let visible = false;

      const onMove = (e: PointerEvent) => {
        if (!visible) {
          visible = true;
          gsap.to([ringEl, dotEl], { opacity: 1, duration: 0.3 });
        }
        ringX(e.clientX);
        ringY(e.clientY);
        dotX(e.clientX);
        dotY(e.clientY);
      };

      const onLeave = () => {
        visible = false;
        gsap.to([ringEl, dotEl], { opacity: 0, duration: 0.2 });
      };

      const INTERACTIVE = 'a, button, [role="button"], input, textarea, select, [data-cursor]';

      const onOver = (e: MouseEvent) => {
        const el = (e.target as HTMLElement | null)?.closest?.(INTERACTIVE);
        if (!el) return;

        const mode = el.getAttribute("data-cursor");

        if (mode === "hide") {
          gsap.to([ringEl, dotEl], { scale: 0, duration: 0.3 });
          return;
        }

        const text = mode && mode !== "true" ? mode : "";
        labelEl.textContent = text;

        gsap.to(ringEl, {
          scale: text ? 3.1 : 1.9,
          backgroundColor: text ? "var(--accent)" : "rgba(232,255,79,0.12)",
          borderColor: "var(--accent)",
          duration: 0.4,
        });
        gsap.to(dotEl, { scale: text ? 0 : 0.4, duration: 0.3 });
        gsap.to(labelEl, { opacity: text ? 1 : 0, duration: 0.25 });
      };

      const onOut = (e: MouseEvent) => {
        if (!(e.target as HTMLElement | null)?.closest?.(INTERACTIVE)) return;
        gsap.to(ringEl, {
          scale: 1,
          backgroundColor: "rgba(0,0,0,0)",
          borderColor: "var(--line-strong)",
          duration: 0.4,
        });
        gsap.to(dotEl, { scale: 1, duration: 0.3 });
        gsap.to(labelEl, { opacity: 0, duration: 0.15 });
      };

      window.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerleave", onLeave);
      document.addEventListener("mouseover", onOver);
      document.addEventListener("mouseout", onOut);

      return () => {
        window.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerleave", onLeave);
        document.removeEventListener("mouseover", onOver);
        document.removeEventListener("mouseout", onOut);
      };
    },
    { dependencies: [enabled] },
  );

  if (!enabled) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[9997]">
      <div
        ref={ring}
        className="border-line-strong absolute top-0 left-0 grid h-9 w-9 place-items-center rounded-full border will-change-transform"
      >
        <span
          ref={label}
          className="text-accent-ink font-mono text-[0.3rem] font-semibold tracking-[0.1em] uppercase opacity-0"
        />
      </div>
      <div ref={dot} className="bg-accent absolute top-0 left-0 h-1.5 w-1.5 rounded-full" />
    </div>
  );
}

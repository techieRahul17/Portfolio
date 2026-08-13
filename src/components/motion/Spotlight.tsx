"use client";

import { useRef } from "react";
import { gsap, useGSAP, hasFinePointer } from "@/lib/gsap";
import { cn } from "@/lib/utils";

/**
 * Tracks the pointer as two CSS custom properties on the wrapper, letting any
 * descendant paint a light that follows the cursor via `--mx` / `--my`.
 * Writing custom properties (rather than re-rendering) keeps this off React's
 * critical path entirely.
 */
export function Spotlight({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!hasFinePointer()) return;
      const el = root.current!;

      const setX = gsap.quickSetter(el, "--mx", "px");
      const setY = gsap.quickSetter(el, "--my", "px");

      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        setX(e.clientX - r.left);
        setY(e.clientY - r.top);
      };

      const onEnter = () => gsap.to(el, { "--spot": 1, duration: 0.45 });
      const onLeave = () => gsap.to(el, { "--spot": 0, duration: 0.6 });

      el.addEventListener("pointermove", onMove, { passive: true });
      el.addEventListener("pointerenter", onEnter);
      el.addEventListener("pointerleave", onLeave);

      return () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerenter", onEnter);
        el.removeEventListener("pointerleave", onLeave);
      };
    },
    { scope: root },
  );

  return (
    <div
      ref={root}
      className={cn("group/spot relative", className)}
      style={{ "--mx": "50%", "--my": "50%", "--spot": 0 } as React.CSSProperties}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0 rounded-[inherit]"
        style={{
          opacity: "var(--spot)",
          background:
            "radial-gradient(28rem circle at var(--mx) var(--my), rgba(232,255,79,0.07), transparent 65%)",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

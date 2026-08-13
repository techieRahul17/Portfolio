"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/gsap";

const SPACING = 34;
const RADIUS = 190; // pointer influence, in px
const BASE = "rgba(255,255,255,0.13)";
const ACCENT = [232, 255, 79] as const;

/**
 * A dot matrix that breathes on its own and reacts to the pointer: dots near
 * the cursor swell, warm to the accent colour and lean away from it.
 *
 * Drawn on a 2D canvas rather than in the DOM — a few thousand nodes with
 * per-frame transforms would pin the main thread; this stays a single paint.
 */
export function HeroField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduce = prefersReducedMotion();

    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let raf = 0;
    let running = true;

    // Pointer is tracked in two values so it can be eased toward the real
    // position — raw coordinates make the field feel twitchy.
    const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999 };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(width / SPACING) + 1;
      rows = Math.ceil(height / SPACING) + 1;
    };

    const draw = (time: number) => {
      if (!running) return;

      pointer.x += (pointer.tx - pointer.x) * 0.12;
      pointer.y += (pointer.ty - pointer.y) * 0.12;

      ctx.clearRect(0, 0, width, height);

      const t = time * 0.0004;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * SPACING;
          const y = j * SPACING;

          // Slow diagonal swell so the grid is never completely still.
          const wave = reduce ? 0 : Math.sin(x * 0.012 + y * 0.014 + t * 3);

          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const dist = Math.hypot(dx, dy);
          const influence = dist < RADIUS ? 1 - dist / RADIUS : 0;
          const eased = influence * influence;

          const r = 0.8 + wave * 0.3 + eased * 2.9;
          if (r <= 0.05) continue;

          // Push away from the cursor, so the field parts around it.
          const push = eased * 14;
          const px = dist > 0.001 ? x + (dx / dist) * push : x;
          const py = dist > 0.001 ? y + (dy / dist) * push : y;

          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fillStyle = eased
            ? `rgba(${ACCENT[0]},${ACCENT[1]},${ACCENT[2]},${0.1 + eased * 0.85})`
            : BASE;
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(draw);
    };

    const onPointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.tx = e.clientX - rect.left;
      pointer.ty = e.clientY - rect.top;
    };

    const onLeave = () => {
      pointer.tx = -9999;
      pointer.ty = -9999;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    // Stop painting entirely once the hero has scrolled away.
    const io = new IntersectionObserver(
      ([entry]) => {
        running = entry.isIntersecting;
        if (running) raf = requestAnimationFrame(draw);
        else cancelAnimationFrame(raf);
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    raf = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={className} />;
}

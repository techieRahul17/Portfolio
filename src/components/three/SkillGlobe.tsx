"use client";

import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { cn } from "@/lib/utils";

/**
 * The toolkit as a globe: every skill sits on a Fibonacci sphere and the whole
 * thing turns in 3D. Drag (or flick) to spin it; it keeps its momentum and
 * settles back into a slow idle drift.
 *
 * Plain DOM rather than WebGL — the labels stay crisp, selectable text, and
 * forty transforms a frame is nothing. It only animates while on screen.
 */
export function SkillGlobe({ items, className }: { items: string[]; className?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current!;
      const tags = gsap.utils.toArray<HTMLElement>("[data-globe-tag]", el);
      const n = tags.length;
      const golden = Math.PI * (3 - Math.sqrt(5));

      // Unit-sphere home position for each tag.
      const pts = tags.map((_, i) => {
        const y = 1 - (2 * (i + 0.5)) / n;
        const r = Math.sqrt(1 - y * y);
        return { x: Math.cos(golden * i) * r, y, z: Math.sin(golden * i) * r };
      });

      let radius = el.clientWidth * 0.4;
      const ro = new ResizeObserver(() => (radius = el.clientWidth * 0.4));
      ro.observe(el);

      // Rotation as two angles plus angular velocity (radians / second).
      const rot = { x: -0.25, y: 0 };
      const vel = { x: 0.0, y: 0.22 };
      const IDLE = { x: 0.0, y: 0.22 };
      let dragging = false;
      let last = { x: 0, y: 0, t: 0 };

      const render = () => {
        const cx = Math.cos(rot.x);
        const sx = Math.sin(rot.x);
        const cy = Math.cos(rot.y);
        const sy = Math.sin(rot.y);

        for (let i = 0; i < n; i++) {
          const p = pts[i];
          // Rotate around Y, then X.
          const x1 = p.x * cy + p.z * sy;
          const z1 = -p.x * sy + p.z * cy;
          const y2 = p.y * cx - z1 * sx;
          const z2 = p.y * sx + z1 * cx;

          const depth = (z2 + 1) / 2; // 0 back … 1 front
          const scale = 0.55 + depth * 0.65;
          const tag = tags[i];
          tag.style.transform = `translate3d(${x1 * radius}px, ${y2 * radius}px, 0) translate(-50%, -50%) scale(${scale})`;
          tag.style.opacity = String(0.12 + depth * 0.88);
          tag.style.zIndex = String(Math.round(depth * 100));
          tag.style.filter = depth < 0.35 ? `blur(${(0.35 - depth) * 5}px)` : "";
          tag.dataset.front = depth > 0.82 ? "1" : "0";
        }
      };

      if (prefersReducedMotion()) {
        render();
        return () => ro.disconnect();
      }

      let visible = false;
      const tick = (_t: number, deltaMs: number) => {
        if (!visible) return;
        const dt = Math.min(deltaMs / 1000, 0.05);
        if (!dragging) {
          // Momentum decays back toward the idle spin.
          const k = 1 - Math.exp(-1.6 * dt);
          vel.x += (IDLE.x - vel.x) * k;
          vel.y += (IDLE.y - vel.y) * k;
          rot.x += vel.x * dt;
          rot.y += vel.y * dt;
        }
        rot.x = Math.max(-1.2, Math.min(1.2, rot.x));
        render();
      };

      const onDown = (e: PointerEvent) => {
        dragging = true;
        last = { x: e.clientX, y: e.clientY, t: performance.now() };
        el.setPointerCapture(e.pointerId);
      };
      const onMove = (e: PointerEvent) => {
        if (!dragging) return;
        const now = performance.now();
        const dt = Math.max((now - last.t) / 1000, 1 / 240);
        const dx = e.clientX - last.x;
        const dy = e.clientY - last.y;
        const k = 1 / radius;
        rot.y += dx * k;
        rot.x -= dy * k;
        vel.y = (dx * k) / dt;
        vel.x = (-dy * k) / dt;
        last = { x: e.clientX, y: e.clientY, t: now };
      };
      const onUp = () => {
        dragging = false;
        vel.x = Math.max(-6, Math.min(6, vel.x));
        vel.y = Math.max(-6, Math.min(6, vel.y));
      };

      el.addEventListener("pointerdown", onDown);
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
      el.addEventListener("pointercancel", onUp);

      const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
      io.observe(el);
      render();
      gsap.ticker.add(tick);

      return () => {
        gsap.ticker.remove(tick);
        io.disconnect();
        ro.disconnect();
        el.removeEventListener("pointerdown", onDown);
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
        el.removeEventListener("pointercancel", onUp);
      };
    },
    { scope: root },
  );

  return (
    <div
      ref={root}
      data-cursor="drag"
      className={cn(
        "relative aspect-square w-full touch-pan-y select-none active:cursor-grabbing",
        className,
      )}
    >
      {/* orbit rings */}
      <div
        aria-hidden
        className="border-line-strong/60 absolute inset-[10%] rounded-full border"
      />
      <div
        aria-hidden
        className="border-accent/20 absolute inset-[10%] [transform:rotateX(72deg)] rounded-full border"
      />
      <div
        aria-hidden
        className="absolute inset-[30%] rounded-full opacity-60 blur-3xl"
        style={{
          background: "radial-gradient(closest-side, rgba(110,91,255,0.5), transparent)",
        }}
      />

      <ul className="absolute top-1/2 left-1/2 h-0 w-0">
        {items.map((item) => (
          <li
            key={item}
            data-globe-tag
            className="text-muted data-[front=1]:text-accent absolute top-0 left-0 font-mono text-[0.7rem] tracking-[0.08em] whitespace-nowrap uppercase transition-colors duration-300 will-change-transform sm:text-[0.78rem]"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

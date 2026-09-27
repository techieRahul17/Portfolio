"use client";

import { useEffect, useRef } from "react";
import type { Game, ZoneDef } from "@/lib/game/engine";
import { GOAL, TROPHIES, ZONE_ANCHORS } from "@/lib/game/layout";
import { FIELD } from "@/lib/game/textures";

const W = 208;
const H = Math.round((W * FIELD.halfD) / FIELD.halfW);

/**
 * Radar in the corner: the pitch from above, zones numbered in mission order,
 * every ball, the keeper, and you. Drawn on a 2D canvas straight from the
 * engine's snapshot — no React renders per frame.
 */
export function Minimap({
  game,
  zones,
  unlocked,
}: {
  game: React.RefObject<Game | null>;
  zones: ZoneDef[];
  unlocked: Set<string>;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef({ zones, unlocked });

  useEffect(() => {
    state.current = { zones, unlocked };
  }, [zones, unlocked]);

  useEffect(() => {
    const canvas = ref.current!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const pad = 8;
    const sx = (W - pad * 2) / (FIELD.halfW * 2);
    const sz = (H - pad * 2) / (FIELD.halfD * 2);
    const mx = (x: number) => pad + (x + FIELD.halfW) * sx;
    const mz = (z: number) => pad + (z + FIELD.halfD) * sz;

    let raf = 0;
    let last = 0;
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < 33) return;
      last = t;
      const g = game.current;
      if (!g) return;
      const s = g.snapshot();
      const { zones, unlocked } = state.current;

      ctx.clearRect(0, 0, W, H);

      // pitch
      ctx.fillStyle = "rgba(22, 64, 34, 0.55)";
      ctx.beginPath();
      ctx.roundRect(pad, pad, W - pad * 2, H - pad * 2, 6);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.28)";
      ctx.lineWidth = 1;
      ctx.strokeRect(mx(-FIELD.lineHalfW), mz(-FIELD.lineHalfD), FIELD.lineHalfW * 2 * sx, FIELD.lineHalfD * 2 * sz);
      ctx.beginPath();
      ctx.moveTo(mx(0), mz(-FIELD.lineHalfD));
      ctx.lineTo(mx(0), mz(FIELD.lineHalfD));
      ctx.stroke();
      for (const side of [-1, 1]) {
        const gx = side * GOAL.lineX;
        ctx.strokeRect(Math.min(mx(gx), mx(gx - side * 12)), mz(-10), 12 * sx, 20 * sz);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillRect(Math.min(mx(gx), mx(gx + side * GOAL.depth)), mz(-GOAL.halfWidth), GOAL.depth * sx, GOAL.halfWidth * 2 * sz);
      }

      // zones, numbered in mission order
      zones.forEach((z, i) => {
        const a = ZONE_ANCHORS[z.id];
        const x = mx(a.x);
        const y = mz(a.z);
        const done = z.ids.every((id) => unlocked.has(id));
        const next = s.next === z.id;
        if (next) {
          const pulse = 7 + ((t / 90) % 10);
          ctx.strokeStyle = `rgba(232,255,79,${1 - (pulse - 7) / 10})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, y, pulse, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = done ? "#e8ff4f" : next ? "#f3f3f6" : "rgba(12,12,17,0.9)";
        ctx.strokeStyle = done ? "#e8ff4f" : next ? "#f3f3f6" : "rgba(110,91,255,0.9)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if (done) {
          ctx.strokeStyle = "#0a0a0c";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(x - 2.8, y + 0.2);
          ctx.lineTo(x - 0.8, y + 2.2);
          ctx.lineTo(x + 3, y - 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = next ? "#0a0a0c" : "#c9c4ff";
          ctx.font = "600 8px ui-monospace, monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(i + 1), x, y + 0.5);
        }
      });

      // keeper
      ctx.fillStyle = "#ff5c3d";
      ctx.beginPath();
      ctx.arc(mx(TROPHIES.keeperX), mz(s.keeperZ), 2.4, 0, Math.PI * 2);
      ctx.fill();

      // balls
      ctx.fillStyle = "#ffffff";
      for (const b of s.balls) {
        ctx.beginPath();
        ctx.arc(mx(b.x), mz(b.z), 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // you: a heading arrow
      const px = mx(s.x);
      const pz = mz(s.z);
      ctx.save();
      ctx.translate(px, pz);
      ctx.rotate(-s.yaw + Math.PI);
      ctx.fillStyle = "#e8ff4f";
      ctx.shadowColor = "rgba(232,255,79,0.8)";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(4.5, 4.5);
      ctx.lineTo(0, 2.4);
      ctx.lineTo(-4.5, 4.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [game]);

  return (
    <div className="panel rounded-2xl p-1.5">
      <canvas ref={ref} aria-hidden style={{ width: W, height: H }} className="block" />
      <div className="text-faint flex items-center justify-between px-1.5 pt-1 pb-0.5 font-mono text-[0.55rem] tracking-[0.2em] uppercase">
        <span>Radar</span>
        <span className="flex items-center gap-2">
          <i className="bg-accent inline-block h-1.5 w-1.5 rounded-full" /> done
          <i className="inline-block h-1.5 w-1.5 rounded-full border border-[#6e5bff]" /> locked
        </span>
      </div>
    </div>
  );
}

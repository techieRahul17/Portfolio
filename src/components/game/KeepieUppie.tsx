"use client";

import { useEffect, useRef, useState } from "react";

const BEST_KEY = "rvs:game:keepie-best";

/** Commentary for streak milestones. */
const QUIPS: [number, string][] = [
  [1, "First touch. Clean."],
  [3, "Nice feet."],
  [5, "Okay, show-off."],
  [8, "The crowd is on its feet."],
  [12, "Scouts are watching."],
  [18, "Ballon d'Or conversations have started."],
  [25, "Someone sign this person."],
  [40, "You were supposed to wait for a portfolio."],
];
const DROPS = [
  "The grass wanted it more.",
  "Gravity: 1, you: 0.",
  "Unlucky. Go again.",
  "The ball needed a rest.",
  "We'll call that a warm-up.",
];

/**
 * A keepie-uppie to play while the stadium loads. Click or tap the ball — or
 * press Space when it's dropping — to keep it in the air. Plain 2D canvas,
 * its own tiny physics, silent until the first touch (browsers need a click
 * before audio anyway).
 */
export function KeepieUppie({
  muted,
  onStreakChange,
}: {
  muted: boolean;
  /** Reports whether the player is mid-juggle, so loading waits for them. */
  onStreakChange?: (juggling: boolean) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [streak, setStreak] = useState(0);
  // Best comes from storage, which the server can't see — write it straight
  // to the DOM after mount rather than risk a hydration mismatch.
  const bestRef = useRef<HTMLSpanElement>(null);
  const [quip, setQuip] = useState("Tap the ball. Keep it up while the stadium loads.");
  const mutedRef = useRef(muted);
  const cb = useRef(onStreakChange);

  useEffect(() => {
    mutedRef.current = muted;
    cb.current = onStreakChange;
  }, [muted, onStreakChange]);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0;
    let H = 0;
    const fit = () => {
      const r = canvas.getBoundingClientRect();
      W = r.width;
      H = r.height;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);

    let storedBest = 0;
    try {
      storedBest = Number(localStorage.getItem(BEST_KEY)) || 0;
    } catch {
      /* storage blocked — best starts at 0 */
    }
    if (bestRef.current) bestRef.current.textContent = String(storedBest);

    const R = 22;
    const ball = { x: W / 2, y: H - R - 14, vx: 0, vy: 0, rot: 0, spin: 0 };
    const sparks: { x: number; y: number; vx: number; vy: number; life: number }[] = [];
    let count = 0;
    let airborne = false;

    // tiny synth for the thump, created on the first touch
    let audio: AudioContext | null = null;
    const thump = (strength: number) => {
      if (mutedRef.current) return;
      audio ??= new AudioContext();
      const o = audio.createOscillator();
      const g = audio.createGain();
      const t = audio.currentTime;
      o.frequency.setValueAtTime(180 + strength * 60, t);
      o.frequency.exponentialRampToValueAtTime(55, t + 0.14);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g).connect(audio.destination);
      o.start(t);
      o.stop(t + 0.2);
    };

    const kick = (fromX: number) => {
      // Sized to the play area: the peak of the arc stays inside the canvas.
      const peak = H - R - 14 - R - 6;
      ball.vy = -Math.sqrt(2 * 1650 * peak * (0.72 + Math.random() * 0.22));
      ball.vx = THREE_CLAMP((ball.x - fromX) * 7 + (Math.random() - 0.5) * 160, -320, 320);
      ball.spin = ball.vx * 0.02;
      airborne = true;
      count++;
      setStreak(count);
      if (count > storedBest) {
        storedBest = count;
        if (bestRef.current) bestRef.current.textContent = String(count);
        try {
          localStorage.setItem(BEST_KEY, String(count));
        } catch {
          /* private mode — the best just won't persist */
        }
      }
      const line = QUIPS.filter(([n]) => n <= count).pop();
      if (line && line[0] === count) setQuip(line[1]);
      cb.current?.(true);
      thump(Math.min(1, count / 10));
      for (let i = 0; i < 8; i++) {
        const a = Math.PI + Math.random() * Math.PI;
        sparks.push({ x: ball.x, y: ball.y + R, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, life: 0.4 });
      }
    };

    const onPointer = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (Math.hypot(x - ball.x, y - ball.y) < R * 2.2) kick(x);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      // only when it's coming down within reach, or it'd be too easy
      if (ball.y > H * 0.42 && ball.vy >= -60) kick(ball.x + (Math.random() - 0.5) * 20);
    };
    canvas.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;

      // physics
      ball.vy += 1650 * dt;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      ball.rot += ball.spin * dt * 6;
      // soft ceiling, so the ball can never leave the frame
      if (ball.y < R) {
        ball.y = R;
        ball.vy = Math.abs(ball.vy) * 0.3;
      }
      if (ball.x < R) {
        ball.x = R;
        ball.vx = Math.abs(ball.vx) * 0.7;
      } else if (ball.x > W - R) {
        ball.x = W - R;
        ball.vx = -Math.abs(ball.vx) * 0.7;
      }
      const floor = H - R - 14;
      if (ball.y > floor) {
        ball.y = floor;
        if (airborne && count > 0) {
          setQuip(DROPS[Math.floor(Math.random() * DROPS.length)]);
          count = 0;
          setStreak(0);
          cb.current?.(false);
        }
        airborne = false;
        ball.vy = Math.abs(ball.vy) > 140 ? -ball.vy * 0.45 : 0;
        ball.vx *= 0.9;
        ball.spin *= 0.9;
      }

      // draw
      ctx.clearRect(0, 0, W, H);
      // turf strip
      ctx.fillStyle = "rgba(34,102,47,0.35)";
      ctx.fillRect(0, H - 14, W, 14);
      ctx.fillStyle = "rgba(232,255,79,0.5)";
      ctx.fillRect(0, H - 14, W, 1);
      // shadow shrinks as the ball rises
      const h = Math.max(0, floor - ball.y) / H;
      ctx.fillStyle = `rgba(0,0,0,${0.45 - h * 0.35})`;
      ctx.beginPath();
      ctx.ellipse(ball.x, H - 12, R * (1 - h * 0.6), 4 * (1 - h * 0.6), 0, 0, Math.PI * 2);
      ctx.fill();
      // sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life -= dt;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        ctx.fillStyle = `rgba(232,255,79,${s.life * 2})`;
        ctx.fillRect(s.x, s.y, 3, 3);
      }
      drawBall(ctx, ball.x, ball.y, R, ball.rot);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
      void audio?.close();
    };
    // mount once; props flow through refs
  }, []);

  return (
    <div className="w-full">
      <div className="flex items-end justify-between font-mono tracking-[0.2em] uppercase">
        <div>
          <p className="text-faint text-[0.55rem]">Keepie-uppies</p>
          <p className="font-display text-fg text-4xl leading-none tracking-normal tabular-nums">{streak}</p>
        </div>
        <p className="text-faint text-[0.55rem]">
          Best{" "}
          <span ref={bestRef} className="text-accent tabular-nums">
            0
          </span>
        </p>
      </div>
      <canvas
        ref={ref}
        aria-label="Keepie-uppie mini game: click the ball to keep it in the air"
        className="mt-2 block h-44 w-full cursor-pointer touch-none"
      />
      <p key={quip} className="text-muted mt-2 min-h-5 animate-[fadeUp_0.4s_var(--ease-out)] text-center text-sm">
        {quip}
      </p>
    </div>
  );
}

const THREE_CLAMP = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** A proper football: white with a black centre pentagon and panel seams. */
function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = "#f4f4f6";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.clip();
  const pent = (cx: number, cy: number, s: number) => {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      const px = cx + Math.cos(a) * s;
      const py = cy + Math.sin(a) * s;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  };
  ctx.fillStyle = "#15151c";
  pent(0, 0, r * 0.36);
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    pent(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95, r * 0.3);
  }
  ctx.strokeStyle = "rgba(20,20,28,0.35)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.36, Math.sin(a) * r * 0.36);
    ctx.lineTo(Math.cos(a) * r * 0.66, Math.sin(a) * r * 0.66);
    ctx.stroke();
  }
  ctx.restore();
  // rim light
  ctx.strokeStyle = "rgba(232,255,79,0.35)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r - 0.5, 0, Math.PI * 2);
  ctx.stroke();
}

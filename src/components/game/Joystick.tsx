"use client";

import { useRef } from "react";
import { RotateCcw } from "lucide-react";
import { BallIcon } from "./icons";

const RADIUS = 52;

/**
 * Touch controls: a floating thumbstick on the left, a hold-to-power kick
 * button on the right. Pointer events, so it works with any touch device.
 */
export function Joystick({
  onMove,
  onKick,
  onReset,
}: {
  onMove: (x: number, y: number) => void;
  onKick: (down: boolean) => void;
  onReset: () => void;
}) {
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);

  const update = (clientX: number, clientY: number) => {
    const rect = base.current!.getBoundingClientRect();
    let dx = clientX - (rect.left + rect.width / 2);
    let dy = clientY - (rect.top + rect.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > RADIUS) {
      dx = (dx / d) * RADIUS;
      dy = (dy / d) * RADIUS;
    }
    knob.current!.style.transform = `translate(${dx}px, ${dy}px)`;
    onMove(dx / RADIUS, dy / RADIUS);
  };

  const release = () => {
    pointer.current = null;
    knob.current!.style.transform = "translate(0px, 0px)";
    onMove(0, 0);
  };

  return (
    <>
      <div
        ref={base}
        className="panel pointer-events-auto absolute bottom-8 left-6 h-36 w-36 touch-none rounded-full"
        onPointerDown={(e) => {
          pointer.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          update(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => pointer.current === e.pointerId && update(e.clientX, e.clientY)}
        onPointerUp={release}
        onPointerCancel={release}
      >
        <div
          ref={knob}
          className="bg-fg/90 absolute top-1/2 left-1/2 -mt-8 -ml-8 h-16 w-16 rounded-full shadow-[0_0_30px_rgba(232,255,79,0.35)]"
        />
      </div>

      <div className="pointer-events-auto absolute right-6 bottom-8 flex items-end gap-3">
        <button
          aria-label="Reset ball"
          onClick={onReset}
          className="panel grid h-12 w-12 place-items-center rounded-full"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          aria-label="Kick — hold for power"
          className="bg-accent text-accent-ink grid h-24 w-24 touch-none place-items-center rounded-full shadow-[0_0_40px_rgba(232,255,79,0.45)] transition-transform active:scale-90"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            onKick(true);
          }}
          onPointerUp={() => onKick(false)}
          onPointerCancel={() => onKick(false)}
        >
          <BallIcon className="h-9 w-9" />
        </button>
      </div>
    </>
  );
}

"use client";

import { useRef } from "react";
import { gsap, useGSAP, hasFinePointer } from "@/lib/gsap";
import { useMotion } from "@/components/motion/MotionProvider";

const SIZE = "text-[clamp(3.5rem,19vw,17rem)] font-medium";

/** Outline copies stacked behind the name, pushed back along Z. */
const GHOSTS = [
  { z: -70, stroke: "rgba(232,255,79,0.55)", opacity: 0.55 },
  { z: -140, stroke: "rgba(110,91,255,0.7)", opacity: 0.4 },
  { z: -210, stroke: "rgba(110,91,255,0.45)", opacity: 0.22 },
];

/**
 * The hero name as a physical object.
 *
 * Behind the solid type sit outline copies at increasing depth. Flat-on they
 * hide behind the letters; as the block tilts toward the pointer, parallax
 * pulls them apart into an extrusion. Scrolling away tips the whole thing
 * backward into the scene, as if it's falling into the universe behind it.
 */
export function HeroName({
  first,
  second,
  aside,
}: {
  first: string;
  second: string;
  aside?: React.ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const { ready, reduced } = useMotion();

  useGSAP(
    () => {
      const scroller = root.current!.querySelector<HTMLElement>("[data-hn-scroll]")!;
      const tilt = root.current!.querySelector<HTMLElement>("[data-hn-tilt]")!;
      const ghosts = gsap.utils.toArray<HTMLElement>("[data-hn-ghost]", root.current);

      if (reduced) {
        ghosts.forEach((g, i) =>
          gsap.set(g, { z: GHOSTS[i].z, opacity: GHOSTS[i].opacity * 0.6 }),
        );
        return;
      }
      if (!ready) return;

      /* extrude: ghosts slide back out of the letters once they've landed */
      ghosts.forEach((g, i) => {
        gsap.fromTo(
          g,
          { z: 0, opacity: 0 },
          {
            z: GHOSTS[i].z,
            opacity: GHOSTS[i].opacity,
            duration: 1.8,
            delay: 0.9 + i * 0.12,
            ease: "expo.out",
          },
        );
      });

      /* scroll exit — opacity goes on the perspective root, because fading
         a preserve-3d element would flatten the extrusion inside it */
      gsap
        .timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: root.current!.closest("section"),
            start: "top top",
            end: "bottom top",
            scrub: 0.6,
          },
        })
        .to(scroller, { rotationX: 42, z: -320, yPercent: -18 }, 0)
        .to(root.current, { opacity: 0 }, 0);

      // A resting three-quarter angle, so the extrusion reads even on touch.
      gsap.set(tilt, { rotationY: -7, rotationX: 5 });

      /* pointer tilt — whole-window, so the name follows you everywhere */
      if (!hasFinePointer()) return;

      const rx = gsap.quickTo(tilt, "rotationX", { duration: 1.2, ease: "power3" });
      const ry = gsap.quickTo(tilt, "rotationY", { duration: 1.2, ease: "power3" });
      const onMove = (e: PointerEvent) => {
        ry((e.clientX / window.innerWidth - 0.5) * 22);
        rx(-(e.clientY / window.innerHeight - 0.5) * 16);
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      return () => window.removeEventListener("pointermove", onMove);
    },
    { scope: root, dependencies: [ready, reduced], revertOnUpdate: true },
  );

  return (
    <div ref={root} className="[perspective:1400px]">
      <div data-hn-scroll className="origin-bottom [transform-style:preserve-3d]">
        <div
          data-hn-tilt
          aria-hidden
          className="font-display relative leading-[0.82] tracking-[-0.05em] [transform-style:preserve-3d]"
        >
          {GHOSTS.map((g) => (
            <div
              key={g.z}
              data-hn-ghost
              className="pointer-events-none absolute inset-0 select-none"
              style={{ color: "transparent", WebkitTextStroke: `1px ${g.stroke}`, opacity: 0 }}
            >
              <div className={SIZE}>{first}</div>
              <div className={SIZE}>{second}</div>
            </div>
          ))}

          {/* the solid face */}
          <div className="relative">
            <div data-split="chars" data-reveal-delay="0.1" className={SIZE}>
              {first}
            </div>
            <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
              <div
                data-split="chars"
                data-reveal-delay="0.25"
                className={`text-accent ${SIZE}`}
              >
                {second}
              </div>
              {aside}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

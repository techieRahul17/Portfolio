"use client";

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { CustomEase } from "gsap/CustomEase";

/**
 * One place to register GSAP plugins.
 *
 * Client components are still rendered on the server, so the registration is
 * guarded — GSAP's DOM plugins need a real `window` to attach themselves to.
 */
if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, ScrambleTextPlugin, CustomEase);

  /** The site's signature easing, matching --ease-out in globals.css. */
  CustomEase.create("voltage", "0.16, 1, 0.3, 1");
  CustomEase.create("voltageInOut", "0.76, 0, 0.24, 1");

  gsap.defaults({ ease: "voltage", duration: 1 });

  // Pinned sections measure the page; do it after fonts settle, or the
  // measurements are taken against fallback metrics and end up wrong.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

/** True when the visitor has asked the OS for less animation. */
export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** True on devices with a real, precise pointer — i.e. not touch. */
export function hasFinePointer() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export { gsap, useGSAP, ScrollTrigger, SplitText, ScrambleTextPlugin, CustomEase };

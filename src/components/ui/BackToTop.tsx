"use client";

import { ArrowUp } from "lucide-react";
import { useMotion } from "@/components/motion/MotionProvider";

export function BackToTop() {
  const { scrollTo } = useMotion();

  return (
    <button
      type="button"
      onClick={() => scrollTo(0)}
      className="group text-muted hover:text-accent mt-2 flex w-fit items-center gap-2 text-sm transition-colors"
    >
      <span className="border-line group-hover:border-accent grid h-8 w-8 place-items-center rounded-full border transition-colors">
        <ArrowUp className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5" />
      </span>
      Back to top
    </button>
  );
}

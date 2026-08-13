"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap, useGSAP, ScrollTrigger } from "@/lib/gsap";

/** A hairline at the very top of the viewport that fills as the page is read. */
export function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useGSAP(
    () => {
      const st = ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => {
          gsap.set(bar.current, { scaleX: self.progress });
        },
      });
      return () => st.kill();
    },
    { dependencies: [pathname] },
  );

  return (
    <div aria-hidden className="fixed inset-x-0 top-0 z-[9996] h-px">
      <div ref={bar} className="bg-accent h-full w-full origin-left scale-x-0" />
    </div>
  );
}

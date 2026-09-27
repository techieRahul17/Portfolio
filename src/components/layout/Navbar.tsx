"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP, ScrollTrigger } from "@/lib/gsap";
import { NAV_LINKS } from "@/lib/constants";
import { profile, socials } from "@/data/profile";
import { cn } from "@/lib/utils";
import { useMotion } from "@/components/motion/MotionProvider";

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const bar = useRef<HTMLElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const { lockScroll } = useMotion();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  /* Close the overlay whenever the route actually changes. Adjusting state
     during render (rather than in an effect) means the menu is already gone
     in the same commit as the new page — no flash of the old overlay. */
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    lockScroll(open);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, lockScroll]);

  /* Solidify the bar past the fold, and get out of the way on the way down. */
  useGSAP(
    () => {
      const el = bar.current!;
      const solid = gsap.quickTo(el.querySelector("[data-bar-bg]"), "opacity", {
        duration: 0.4,
      });

      const st = ScrollTrigger.create({
        start: 60,
        end: "max",
        onUpdate: (self) => {
          solid(1);
          const hide = self.direction === 1 && self.scroll() > 400 && !open;
          gsap.to(el, { yPercent: hide ? -140 : 0, duration: 0.5, overwrite: true });
        },
        onLeaveBack: () => {
          solid(0);
          gsap.to(el, { yPercent: 0, duration: 0.4, overwrite: true });
        },
      });

      return () => st.kill();
    },
    { dependencies: [open] },
  );

  /* Full-screen menu: slats wipe down, then the big links rise into place. */
  useGSAP(
    () => {
      if (!open || !overlay.current) return;

      const tl = gsap.timeline();
      tl.set(overlay.current, { pointerEvents: "auto" })
        .fromTo(
          "[data-menu-slat]",
          { scaleY: 0, transformOrigin: "top center" },
          { scaleY: 1, duration: 0.75, stagger: 0.05, ease: "voltageInOut" },
        )
        .from(
          "[data-menu-link] > span",
          { yPercent: 115, duration: 0.85, stagger: 0.07, ease: "voltage" },
          "-=0.35",
        )
        .from("[data-menu-foot] > *", { opacity: 0, y: 20, stagger: 0.08, duration: 0.6 }, "-=0.5");

      return () => {
        tl.kill();
      };
    },
    { scope: overlay, dependencies: [open] },
  );

  return (
    <>
      <header
        ref={bar}
        className="fixed inset-x-0 top-0 z-[9990] will-change-transform"
        style={{ height: "var(--nav-h)" }}
      >
        <div
          data-bar-bg
          aria-hidden
          className="panel absolute inset-0 border-x-0 border-t-0 opacity-0"
        />

        <div className="relative mx-auto flex h-full max-w-[110rem] items-center justify-between gap-4 px-5 sm:px-8">
          <Link
            href="/portfolio"
            className="group flex items-center gap-2.5"
            aria-label={`${profile.name} — home`}
          >
            <span className="bg-accent relative flex h-2 w-2 shrink-0 rounded-full">
              <span className="bg-accent absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" />
            </span>
            <span className="font-display text-sm font-medium tracking-tight">
              {profile.name}
            </span>
            <span className="text-faint hidden font-mono text-[0.65rem] tracking-[0.2em] uppercase sm:inline">
              / {profile.role}
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <nav className="panel hidden items-center rounded-full p-1 md:flex">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative rounded-full px-4 py-1.5 text-sm transition-colors duration-300",
                    isActive(link.href)
                      ? "bg-accent text-accent-ink font-medium"
                      : "text-muted hover:text-fg",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              className="panel text-fg hover:border-accent/50 relative z-10 flex h-10 items-center gap-2.5 rounded-full pr-4 pl-4 text-sm transition-colors md:hidden"
            >
              <span className="font-mono text-[0.7rem] tracking-[0.15em] uppercase">
                {open ? "Close" : "Menu"}
              </span>
              <span className="flex h-3 w-4 flex-col justify-between">
                <span
                  className={cn(
                    "bg-fg block h-px w-full origin-center transition-transform duration-300",
                    open && "translate-y-[5.5px] rotate-45",
                  )}
                />
                <span
                  className={cn(
                    "bg-fg block h-px w-full transition-opacity duration-200",
                    open && "opacity-0",
                  )}
                />
                <span
                  className={cn(
                    "bg-fg block h-px w-full origin-center transition-transform duration-300",
                    open && "-translate-y-[5.5px] -rotate-45",
                  )}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------- overlay ------------------------------ */}
      {open && (
        <div
          ref={overlay}
          className="fixed inset-0 z-[9989] flex flex-col justify-between p-5 pt-[var(--nav-h)] sm:p-8 sm:pt-[var(--nav-h)] md:hidden"
        >
          <div aria-hidden className="absolute inset-0 -z-10 flex">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} data-menu-slat className="bg-bg-2 h-full flex-1 origin-top" />
            ))}
          </div>

          <nav className="mt-10 flex flex-col">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                data-menu-link
                className="line-mask group border-line/70 flex items-baseline gap-4 border-b py-4"
              >
                <span className="flex w-full items-baseline gap-4">
                  <span className="text-accent font-mono text-xs">{link.num}</span>
                  <span
                    className={cn(
                      "font-display text-[clamp(2.25rem,13vw,4rem)] leading-none tracking-tight",
                      isActive(link.href) ? "text-accent" : "text-fg",
                    )}
                  >
                    {link.label}
                  </span>
                </span>
              </Link>
            ))}
          </nav>

          <div data-menu-foot className="flex flex-col gap-4">
            <a
              href={`mailto:${profile.email}`}
              className="text-muted hover:text-accent text-sm transition-colors"
            >
              {profile.email}
            </a>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-faint hover:text-fg font-mono text-[0.7rem] tracking-[0.15em] uppercase transition-colors"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

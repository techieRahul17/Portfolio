/**
 * Game UI glyphs that icon libraries don't have. Real SVG, sized by CSS and
 * coloured with currentColor — no emoji anywhere in the interface.
 */

export function BallIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth={1.6}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 7.2 15.6 9.8 14.2 14H9.8L8.4 9.8Z" fill="currentColor" stroke="none" />
      <path d="M12 7.2V2.6M15.6 9.8l4.4-1.5M14.2 14l2.8 3.9M9.8 14 7 17.9M8.4 9.8 4 8.3" strokeLinecap="round" />
    </svg>
  );
}

/** A compass needle; rotate it with CSS to point at the next objective. */
export function NeedleIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 2 18 20l-6-3.6L6 20Z" />
    </svg>
  );
}

/** Small pulsing dot used for "live" states. */
export function LiveDot({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`relative inline-flex h-1.5 w-1.5 ${className}`}>
      <span className="bg-accent absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" />
      <span className="bg-accent relative inline-flex h-1.5 w-1.5 rounded-full" />
    </span>
  );
}

/** Keyboard key cap. */
export function Key({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <kbd
      className={`border-line-strong bg-bg-2/80 text-fg inline-grid h-6 place-items-center rounded-md border border-b-2 px-1.5 font-mono text-[0.62rem] leading-none ${wide ? "min-w-12" : "min-w-6"}`}
    >
      {children}
    </kbd>
  );
}

const MEDAL_COLORS = {
  gold: ["#ffd24a", "#b8860b"],
  silver: ["#e3e8f2", "#8a93a6"],
  bronze: ["#e0975a", "#8a4f24"],
  none: ["#2b2b38", "#1c1c25"],
} as const;

/** A medal on a ribbon. `none` draws an empty slot for unearned medals. */
export function MedalIcon({ medal, className = "h-6 w-6" }: { medal: "gold" | "silver" | "bronze" | "none"; className?: string }) {
  const [face, rim] = MEDAL_COLORS[medal];
  return (
    <svg viewBox="0 0 32 40" aria-hidden className={className}>
      {medal !== "none" && (
        <>
          <path d="M9 1h6l3 12h-6Z" fill="#6e5bff" />
          <path d="M23 1h-6l-3 12h6Z" fill="#e8ff4f" />
        </>
      )}
      <circle cx="16" cy="25" r="12" fill={rim} />
      <circle cx="16" cy="25" r="9.5" fill={face} />
      {medal !== "none" && <path d="m16 19.5 1.7 3.5 3.8.5-2.8 2.6.7 3.8-3.4-1.8-3.4 1.8.7-3.8-2.8-2.6 3.8-.5Z" fill={rim} opacity="0.85" />}
    </svg>
  );
}

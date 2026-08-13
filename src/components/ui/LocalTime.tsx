"use client";

import { useSyncExternalStore } from "react";
import { profile } from "@/data/profile";

const formatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: profile.timezone,
});

/**
 * The wall clock is external state, so it's read through
 * `useSyncExternalStore` rather than an effect that calls `setState` on a
 * timer. `getSnapshot` must be referentially stable between ticks or React
 * re-renders forever — hence the cached string.
 */
let cached = "";

function getSnapshot() {
  const next = formatter.format(new Date());
  if (next !== cached) cached = next;
  return cached;
}

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
}

/** Rahul's local time. Renders a placeholder on the server, where there is none. */
export function LocalTime({ className }: { className?: string }) {
  const time = useSyncExternalStore(subscribe, getSnapshot, () => null);

  return (
    <span className={className} suppressHydrationWarning>
      {time ?? "--:--:--"} <span className="text-faint">IST</span>
    </span>
  );
}

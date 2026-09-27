"use client";

import { usePathname } from "next/navigation";

/** Routes that run full-screen with their own interface, and so skip the site chrome. */
const BARE_ROUTES = new Set(["/"]);

/**
 * Renders the site's navigation, footer, cursor and preloader everywhere
 * except on full-screen experiences (the game on the home route).
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (BARE_ROUTES.has(pathname)) return null;
  return <>{children}</>;
}

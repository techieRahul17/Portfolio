import { Space_Grotesk, Inter, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { Animator } from "@/components/motion/Animator";
import { Preloader } from "@/components/motion/Preloader";
import { Cursor } from "@/components/motion/Cursor";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import { PageTransition } from "@/components/motion/PageTransition";
import { buildMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/constants";
import "./globals.css";

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const sans = Inter({ variable: "--font-sans", subsets: ["latin"] });

const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"] });

const serif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  ...buildMetadata(),
};

export const viewport: Viewport = {
  themeColor: "#07070a",
  colorScheme: "dark",
};

/**
 * Runs before first paint, so it can decide things CSS needs to know
 * immediately: whether JS is available to reveal hidden content, and whether
 * this tab has already sat through the intro curtain.
 */
const bootScript = `
(function () {
  var d = document.documentElement;
  d.classList.add('js');
  try {
    if (sessionStorage.getItem('rvs:visited')) d.classList.add('visited');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      // The boot script below writes `js` (and sometimes `visited`) onto this
      // element before React hydrates, which React would otherwise report as a
      // mismatch. The classes are deliberate, so tell it not to worry.
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable} ${mono.variable} ${serif.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="grain bg-bg text-fg antialiased">
        <a
          href="#main"
          className="focus:bg-accent focus:text-accent-ink sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:rounded-full focus:px-4 focus:py-2 focus:text-sm focus:font-medium"
        >
          Skip to content
        </a>

        <MotionProvider>
          <Preloader />
          <PageTransition />
          <Cursor />
          <ScrollProgress />
          <Animator />

          <Navbar />
          <main id="main">{children}</main>
          <Footer />
        </MotionProvider>
      </body>
    </html>
  );
}

import Link from "next/link";
import { profile, socials } from "@/data/profile";
import { NAV_LINKS } from "@/lib/constants";
import { LocalTime } from "@/components/ui/LocalTime";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { BackToTop } from "@/components/ui/BackToTop";

export function Footer() {
  return (
    <footer className="border-line relative overflow-hidden border-t">
      <div className="mx-auto max-w-[110rem] px-5 sm:px-8">
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <p className="text-faint font-mono text-[0.65rem] tracking-[0.25em] uppercase">
              Elsewhere
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target={s.href.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  className="group panel text-muted hover:text-accent-ink hover:bg-accent hover:border-accent flex items-center gap-2.5 rounded-full py-2.5 pr-5 pl-4 text-sm transition-colors duration-300"
                >
                  <SocialIcon icon={s.icon} className="h-4 w-4" />
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          <nav className="flex flex-col gap-3">
            <p className="text-faint font-mono text-[0.65rem] tracking-[0.25em] uppercase">
              Navigate
            </p>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted hover:text-fg w-fit text-sm transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-3">
            <p className="text-faint font-mono text-[0.65rem] tracking-[0.25em] uppercase">
              Local time
            </p>
            <LocalTime className="font-mono text-sm tabular-nums" />
            <p className="text-muted text-sm">{profile.location}</p>
            <BackToTop />
          </div>
        </div>

        {/* Oversized signature. Decorative — the name is already in the DOM above. */}
        <div aria-hidden className="border-line border-t pt-8">
          <p className="text-stroke font-display w-full text-center text-[clamp(3rem,15.5vw,15rem)] leading-[0.8] font-bold tracking-[-0.045em] whitespace-nowrap select-none">
            {profile.name.toUpperCase()}
          </p>
        </div>

        <div className="text-faint flex flex-col gap-2 py-6 font-mono text-[0.65rem] tracking-[0.15em] uppercase sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {profile.name}
          </p>
          <p>Built with Next.js · GSAP · Tailwind</p>
        </div>
      </div>
    </footer>
  );
}

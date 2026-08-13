import { Trophy } from "lucide-react";
import { achievements } from "@/data/achievements";
import { leadership } from "@/data/experience";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * Wins and responsibilities.
 *
 * Each row is a hover target: an accent panel wipes across from the left and
 * the detail line unfolds beneath. The whole effect is CSS — no JS needed for
 * a list this simple, and it stays smooth on a phone.
 */
export function Achievements() {
  return (
    <section id="achievements" className="border-line scroll-mt-24 border-t py-24 sm:py-32">
      <Container size="wide">
        <SectionHeading
          index="05"
          label="Recognition"
          title={
            <>
              Three firsts, one
              <br />
              <span className="text-accent">global leaderboard</span>
            </>
          }
        />

        <div className="border-line mt-16 border-t">
          {achievements.map((item) => (
            <div
              key={item.title}
              data-reveal
              className="group border-line hover:text-accent-ink relative overflow-hidden border-b transition-colors duration-500"
            >
              <span
                aria-hidden
                className="bg-accent absolute inset-0 origin-left scale-x-0 transition-transform duration-600 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:scale-x-100"
              />

              <div className="relative flex flex-col gap-4 px-1 py-7 sm:flex-row sm:items-center sm:gap-8 sm:px-4">
                <span className="text-accent group-hover:text-accent-ink w-14 shrink-0 font-mono text-[0.7rem] tracking-[0.2em] transition-colors duration-500">
                  {item.year}
                </span>

                <Trophy
                  aria-hidden
                  className="text-faint group-hover:text-accent-ink h-4 w-4 shrink-0 transition-all duration-500 group-hover:scale-110"
                />

                <h3 className="font-display flex-1 text-[clamp(1.25rem,2.6vw,2rem)] leading-tight tracking-[-0.02em] transition-transform duration-500 group-hover:translate-x-2">
                  {item.title}
                </h3>

                <div className="sm:text-right">
                  <p className="text-muted group-hover:text-accent-ink text-sm transition-colors duration-500">
                    {item.project}
                  </p>
                  <p className="text-faint group-hover:text-accent-ink/75 max-w-xs text-sm transition-colors duration-500">
                    {item.detail}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ------------------------------- leadership ------------------------- */}
        <div className="mt-20">
          <p className="text-faint font-mono text-[0.65rem] tracking-[0.28em] uppercase">
            <span className="text-accent">↳ </span>Positions of responsibility
          </p>

          <div data-stagger="0.08" className="mt-8 grid gap-4 sm:grid-cols-3">
            {leadership.map((role) => (
              <div
                key={role.org}
                className="panel hover:border-accent/40 rounded-xl p-6 transition-colors duration-300"
              >
                <p className="text-accent font-mono text-[0.62rem] tracking-[0.2em] uppercase">
                  {role.period}
                </p>
                <h3 className="font-display mt-3 text-lg leading-tight">{role.role}</h3>
                <p className="text-muted mt-2 text-sm">{role.org}</p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

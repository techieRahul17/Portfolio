"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { ArrowUpRight, Mail, Phone, Trophy, X } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";
import { achievements } from "@/data/achievements";
import { leadership } from "@/data/experience";
import { profile, socials, stats } from "@/data/profile";
import { skills } from "@/data/skills";
import { Badge } from "@/components/ui/Badge";
import { CopyEmail } from "@/components/ui/CopyEmail";
import { SocialIcon } from "@/components/ui/SocialIcon";
import type { Reveal } from "./content";

const kicker = "font-mono text-[0.65rem] tracking-[0.25em] uppercase";

/**
 * The card that slides in when something is unlocked on the pitch. Content is
 * plain, real HTML — selectable, linkable, readable by a screen reader.
 */
export function RevealPanel({
  reveal,
  fresh,
  onClose,
}: {
  reveal: Reveal;
  fresh: boolean;
  onClose: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(root.current, { x: 70, opacity: 0, duration: 0.7, ease: "voltage" });
      gsap.from("[data-rp-item]", { y: 18, opacity: 0, duration: 0.6, stagger: 0.05, delay: 0.12, ease: "voltage" });
    },
    { scope: root, dependencies: [reveal] },
  );

  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="false"
      aria-labelledby="reveal-title"
      className="panel pointer-events-auto relative flex max-h-[min(44rem,calc(100dvh-7rem))] w-full flex-col overflow-hidden rounded-3xl shadow-[0_30px_120px_-20px_rgba(110,91,255,0.45)] sm:w-[30rem]"
    >
      <span aria-hidden className="bg-accent absolute top-0 left-8 h-px w-28" style={{ boxShadow: "0 0 24px 2px var(--accent)" }} />

      <header className="flex items-start justify-between gap-4 px-7 pt-7">
        <p data-rp-item className={`${kicker} text-accent`}>
          {fresh ? "Unlocked" : "Replay"} · {label(reveal)}
        </p>
        <button
          onClick={onClose}
          aria-label="Close and keep playing"
          className="border-line-strong hover:border-accent hover:text-accent -mt-1 -mr-2 grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-7 pt-4 pb-7" data-lenis-prevent>
        <Body reveal={reveal} />
      </div>

      <footer className="border-line flex items-center justify-between gap-3 border-t px-7 py-4">
        <p className="text-faint hidden font-mono text-[0.6rem] tracking-[0.2em] uppercase sm:block">
          Esc / Enter to resume
        </p>
        <button
          onClick={onClose}
          className="bg-accent text-accent-ink ml-auto rounded-full px-5 py-2.5 text-sm font-medium transition-transform hover:scale-[1.03]"
        >
          Keep playing
        </button>
      </footer>
    </div>
  );
}

function label(r: Reveal) {
  switch (r.kind) {
    case "about":
      return "About";
    case "xp":
      return r.item.kind === "education" ? "Education" : "Experience";
    case "project":
      return `Project 0${r.index + 1}`;
    case "skill":
      return "Skills";
    case "trophy":
      return "Trophy";
    case "contact":
      return "Contact";
  }
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <h2 id="reveal-title" data-rp-item className="font-display text-[clamp(1.75rem,4vw,2.4rem)] leading-[1.02] tracking-[-0.03em]">
      {children}
    </h2>
  );
}

function Body({ reveal: r }: { reveal: Reveal }) {
  if (r.kind === "about") {
    return (
      <>
        <div data-rp-item className="flex items-center gap-4">
          <div className="border-line relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border">
            <Image src={profile.avatar} alt={profile.name} fill sizes="80px" className="object-cover" />
          </div>
          <div>
            <Title>{profile.name}</Title>
            <p className="text-accent mt-1 text-sm">{profile.role} · #17</p>
          </div>
        </div>
        <p data-rp-item className="text-fg mt-6 leading-snug">
          {profile.headline}
        </p>
        {profile.bio.map((p) => (
          <p key={p.slice(0, 20)} data-rp-item className="text-muted mt-4 text-sm leading-relaxed">
            {p}
          </p>
        ))}
        <dl data-rp-item className="border-line mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border">
          {stats.map((s) => (
            <div key={s.label} className="bg-bg-2/60 p-4">
              <dd className="font-display text-2xl tabular-nums">
                {s.value.toLocaleString("en-US", { minimumFractionDigits: s.decimals, maximumFractionDigits: s.decimals })}
                <span className="text-accent text-sm">{s.suffix}</span>
              </dd>
              <dt className="text-faint mt-1 font-mono text-[0.6rem] tracking-[0.15em] uppercase">{s.label}</dt>
            </div>
          ))}
        </dl>
        <MoreLink href="/about">The longer story</MoreLink>
      </>
    );
  }

  if (r.kind === "xp") {
    const { item } = r;
    return (
      <>
        <Title>{item.role}</Title>
        <p data-rp-item className="text-accent mt-2 text-sm">
          {item.company}
        </p>
        <p data-rp-item className={`${kicker} text-faint mt-2`}>
          {item.period}
          {item.location ? ` · ${item.location}` : ""}
        </p>
        {item.summary && (
          <p data-rp-item className="text-fg mt-5 leading-relaxed">
            {item.summary}
          </p>
        )}
        <ul className="mt-5 space-y-3">
          {item.points.map((p) => (
            <li key={p} data-rp-item className="text-muted flex gap-3 text-sm leading-relaxed">
              <span aria-hidden className="bg-accent mt-2 h-1 w-1 shrink-0 rounded-full" />
              {p}
            </li>
          ))}
        </ul>
        {item.stack && item.stack.length > 0 && (
          <div data-rp-item className="mt-6 flex flex-wrap gap-2">
            {item.stack.map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
          </div>
        )}
      </>
    );
  }

  if (r.kind === "project") {
    const { project: p } = r;
    return (
      <>
        {p.award && (
          <div data-rp-item>
            <Badge tone="accent">{p.award}</Badge>
          </div>
        )}
        <div className="mt-4">
          <Title>{p.title}</Title>
        </div>
        {p.kicker && (
          <p data-rp-item className={`${kicker} text-faint mt-2`}>
            {p.kicker}
          </p>
        )}
        <p data-rp-item className="text-muted mt-5 leading-relaxed">
          {p.summary}
        </p>
        <div data-rp-item className="mt-6 flex flex-wrap gap-2">
          {p.tags?.map((t) => (
            <Badge key={t}>{t}</Badge>
          ))}
        </div>
        <div data-rp-item className="mt-7 flex flex-wrap gap-3">
          <MoreLink href={`/projects/${p.slug}`} inline>
            Read the case study
          </MoreLink>
          {p.repo && (
            <a href={p.repo} target="_blank" rel="noreferrer" className="text-muted hover:text-accent inline-flex items-center gap-2 text-sm transition-colors">
              <SocialIcon icon="github" className="h-4 w-4" /> Code
            </a>
          )}
        </div>
      </>
    );
  }

  if (r.kind === "skill") {
    const group = skills[r.index];
    return (
      <>
        <Title>{group.title}</Title>
        {group.note && (
          <p data-rp-item className={`${kicker} text-faint mt-2`}>
            {group.note}
          </p>
        )}
        <ul data-rp-item className="mt-6 flex flex-wrap gap-2">
          {group.items.map((s) => (
            <li key={s} className="border-line-strong text-fg hover:border-accent hover:bg-accent hover:text-accent-ink rounded-full border px-3.5 py-1.5 text-sm transition-colors">
              {s}
            </li>
          ))}
        </ul>
      </>
    );
  }

  if (r.kind === "trophy") {
    const a = achievements[r.index];
    const last = r.index === achievements.length - 1;
    return (
      <>
        <div data-rp-item className="bg-accent/10 border-accent/30 grid h-14 w-14 place-items-center rounded-2xl border">
          <Trophy className="text-accent h-6 w-6" />
        </div>
        <div className="mt-5">
          <Title>{a.title}</Title>
        </div>
        <p data-rp-item className={`${kicker} text-accent mt-3`}>
          {a.project} · {a.year}
        </p>
        <p data-rp-item className="text-muted mt-4 leading-relaxed">
          {a.detail}
        </p>
        {last && (
          <div data-rp-item className="mt-7">
            <p className={`${kicker} text-faint`}>Also on the team sheet</p>
            <ul className="mt-3 space-y-2">
              {leadership.map((l) => (
                <li key={l.org} className="text-sm">
                  <span className="text-fg">{l.role}</span> <span className="text-muted">· {l.org}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </>
    );
  }

  // contact
  return (
    <>
      <Title>
        Have something
        <br />
        worth building?
      </Title>
      <p data-rp-item className="text-muted mt-4 leading-relaxed">
        I&apos;m {profile.availableForWork ? "open to" : "happy to chat about"} frontend and software engineering roles — and I answer every
        message that isn&apos;t a template.
      </p>
      <div data-rp-item className="border-line mt-6 space-y-4 border-t pt-5">
        <div className="flex items-center gap-3">
          <Mail className="text-accent h-4 w-4" />
          <CopyEmail className="text-sm" />
        </div>
        <a href={`tel:${profile.phone.replace(/\s/g, "")}`} className="text-muted hover:text-accent flex items-center gap-3 text-sm transition-colors">
          <Phone className="text-accent h-4 w-4" /> {profile.phone}
        </a>
        <div className="flex flex-wrap gap-4">
          {socials
            .filter((s) => s.href.startsWith("http"))
            .map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noreferrer" className="text-muted hover:text-accent inline-flex items-center gap-2 text-sm transition-colors">
                <SocialIcon icon={s.icon} className="h-4 w-4" />
                {s.label}
              </a>
            ))}
        </div>
      </div>
      <div data-rp-item className="mt-7 flex flex-wrap gap-3">
        <Link href="/contact" className="bg-fg text-bg hover:bg-accent rounded-full px-5 py-2.5 text-sm font-medium transition-colors">
          Start a conversation
        </Link>
        <a href={profile.resumeUrl} target="_blank" rel="noreferrer" className="border-line-strong hover:border-accent hover:text-accent rounded-full border px-5 py-2.5 text-sm transition-colors">
          Download résumé
        </a>
      </div>
    </>
  );
}

function MoreLink({ href, children, inline }: { href: string; children: React.ReactNode; inline?: boolean }) {
  return (
    <Link
      href={href}
      data-rp-item={inline ? undefined : true}
      className={`group text-fg hover:text-accent inline-flex items-center gap-3 text-sm transition-colors ${inline ? "" : "mt-6"}`}
    >
      <span className="border-line-strong group-hover:border-accent group-hover:bg-accent group-hover:text-accent-ink grid h-9 w-9 place-items-center rounded-full border transition-all">
        <ArrowUpRight className="h-4 w-4" />
      </span>
      {children}
    </Link>
  );
}

"use client";

import { useState } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Status = "idle" | "sending" | "sent" | "error";

/** Underlined fields rather than boxes — quieter, and it suits the type. */
const field =
  "peer w-full border-b border-line bg-transparent py-3 text-base outline-none transition-colors placeholder:text-faint/60 focus:border-accent";

const labelText =
  "font-mono text-[0.62rem] uppercase tracking-[0.2em] text-faint transition-colors peer-focus:text-accent";

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError("");

    const form = e.currentTarget;
    const payload = Object.fromEntries(new FormData(form));

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Something went wrong.");
      }

      form.reset();
      setStatus("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="panel flex flex-col items-start gap-5 rounded-2xl p-10">
        <span className="border-accent text-accent grid h-14 w-14 place-items-center rounded-full border">
          <Check className="h-6 w-6" />
        </span>
        <h2 className="font-display text-3xl leading-tight">Message sent.</h2>
        <p className="text-muted max-w-sm leading-relaxed">
          Thanks for reaching out — it&apos;s on its way to my inbox and I&apos;ll get back to
          you shortly.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="text-muted hover:text-accent mt-2 text-sm underline underline-offset-4 transition-colors"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-10">
      {/* Honeypot: real visitors never see it, bots fill it in and get dropped. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
      />

      <div className="grid gap-10 sm:grid-cols-2">
        <label className="flex flex-col-reverse gap-2">
          <span className={labelText}>01 — Your name</span>
          <input name="name" required maxLength={80} className={field} placeholder="Jane Doe" />
        </label>

        <label className="flex flex-col-reverse gap-2">
          <span className={labelText}>02 — Email</span>
          <input
            name="email"
            type="email"
            required
            className={field}
            placeholder="jane@company.com"
          />
        </label>
      </div>

      <label className="flex flex-col-reverse gap-2">
        <span className={labelText}>03 — Message</span>
        <textarea
          name="message"
          required
          rows={6}
          maxLength={2000}
          className={`${field} resize-y`}
          placeholder="Tell me about the role or the project…"
        />
      </label>

      <div className="flex flex-wrap items-center gap-5">
        <Button type="submit" size="lg" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Send message"}
          <ArrowUpRight className="h-4 w-4" />
        </Button>

        {status === "error" && (
          <p role="alert" className="text-accent-3 text-sm">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}

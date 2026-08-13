"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { profile } from "@/data/profile";

/**
 * Click to copy, with the mail link as the fallback if the clipboard is
 * unavailable (older browsers, or an insecure origin).
 */
export function CopyEmail({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.href = `mailto:${profile.email}`;
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`group text-muted hover:text-accent inline-flex items-center gap-3 transition-colors ${className ?? ""}`}
      aria-label={copied ? "Email copied" : `Copy email address ${profile.email}`}
    >
      <span className="border-line group-hover:border-accent grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-colors">
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </span>
      <span className="tabular-nums">{copied ? "Copied to clipboard" : profile.email}</span>
    </button>
  );
}

"use client";

import { useEffect } from "react";
import { Container } from "@/components/ui/Container";
import { Button, ButtonLink } from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Swap for a real error reporter (Sentry, etc.) when you add one.
    console.error(error);
  }, [error]);

  return (
    <Container
      size="wide"
      className="flex min-h-[80svh] flex-col items-center justify-center py-24 text-center"
    >
      <p className="text-accent font-mono text-[0.65rem] tracking-[0.28em] uppercase">
        Something broke
      </p>

      <h1 className="font-display mt-6 text-[clamp(2rem,6vw,4rem)] leading-none tracking-[-0.04em]">
        Well, that&apos;s
        <br />
        <span className="text-accent">embarrassing</span>
      </h1>

      <p className="text-muted mt-6 max-w-sm leading-relaxed">
        An unexpected error came up while rendering this page. Trying again usually sorts it.
      </p>

      {error.digest && (
        <p className="text-faint mt-4 font-mono text-[0.65rem] tracking-[0.15em]">
          ref: {error.digest}
        </p>
      )}

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="secondary">
          Back home
        </ButtonLink>
      </div>
    </Container>
  );
}

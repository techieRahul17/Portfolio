import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { Magnetic } from "@/components/motion/Magnetic";

export default function NotFound() {
  return (
    <Container
      size="wide"
      className="flex min-h-[80svh] flex-col items-center justify-center py-24 text-center"
    >
      <p
        aria-hidden
        className="text-stroke font-display text-[clamp(7rem,28vw,20rem)] leading-none font-bold tracking-[-0.05em]"
      >
        404
      </p>

      <h1 className="font-display -mt-4 text-3xl tracking-tight sm:text-4xl">
        This page doesn&apos;t exist
      </h1>

      <p className="text-muted mt-4 max-w-sm leading-relaxed">
        The link may have moved, or it may never have pointed anywhere. Either way, the
        good stuff is one click away.
      </p>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Magnetic strength={0.3}>
          <ButtonLink href="/">Back home</ButtonLink>
        </Magnetic>
        <Magnetic strength={0.3}>
          <ButtonLink href="/projects" variant="secondary">
            See the work
          </ButtonLink>
        </Magnetic>
      </div>
    </Container>
  );
}

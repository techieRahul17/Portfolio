import { Container } from "@/components/ui/Container";

/** Shown while a route's server components stream in. */
export default function Loading() {
  return (
    <Container size="wide" className="pt-[calc(var(--nav-h)+4rem)] pb-24">
      <div className="animate-pulse">
        <div className="bg-bg-3 h-3 w-32 rounded-full" />
        <div className="bg-bg-3 mt-8 h-[clamp(2.75rem,9vw,7.5rem)] w-full max-w-3xl rounded-2xl" />
        <div className="bg-bg-3 mt-4 h-[clamp(2.75rem,9vw,7.5rem)] w-full max-w-xl rounded-2xl" />
        <div className="mt-12 space-y-3">
          <div className="bg-bg-3 h-4 w-full max-w-lg rounded-full" />
          <div className="bg-bg-3 h-4 w-full max-w-md rounded-full" />
        </div>
        <div className="mt-16 grid gap-4 sm:grid-cols-2">
          <div className="bg-bg-3 h-56 rounded-2xl" />
          <div className="bg-bg-3 h-56 rounded-2xl" />
        </div>
      </div>
    </Container>
  );
}

import { cn } from "@/lib/utils";

/** The one place page width is decided. Change it here, the whole site follows. */
export function Container({
  className,
  children,
  size = "default",
}: {
  className?: string;
  children: React.ReactNode;
  /** `wide` for full-bleed editorial sections, `prose` for reading columns. */
  size?: "default" | "wide" | "prose";
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-5 sm:px-8",
        size === "wide" && "max-w-[110rem]",
        size === "default" && "max-w-7xl",
        size === "prose" && "max-w-3xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

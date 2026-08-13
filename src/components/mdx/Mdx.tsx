import Image from "next/image";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypeSlug from "rehype-slug";
import rehypePrettyCode from "rehype-pretty-code";
import { cn } from "@/lib/utils";

/**
 * Component overrides available inside every .mdx file.
 * Add your own here (charts, callouts, video embeds) and they become
 * usable in content without any import statement.
 */
const components = {
  a: ({ href = "", ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const isInternal = href.startsWith("/") || href.startsWith("#");
    if (isInternal) return <Link href={href} {...props} />;
    return <a href={href} target="_blank" rel="noreferrer" {...props} />;
  },

  img: ({ src = "", alt = "" }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <Image
      src={String(src)}
      alt={alt}
      width={1200}
      height={700}
      className="border-border rounded-xl border"
    />
  ),

  /** Usage in MDX:  <Callout>Heads up.</Callout> */
  Callout: ({ children }: { children: React.ReactNode }) => (
    <div className="not-prose border-accent/30 bg-accent/5 my-6 rounded-xl border p-4 text-sm">
      {children}
    </div>
  ),
};

const options = {
  mdxOptions: {
    rehypePlugins: [
      rehypeSlug,
      [rehypePrettyCode, { theme: { light: "github-light", dark: "github-dark" } }],
    ],
  },
} as const;

export function Mdx({ source, className }: { source: string; className?: string }) {
  return (
    <div className={cn("prose prose-zinc max-w-none", className)}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <MDXRemote source={source} components={components} options={options as any} />
    </div>
  );
}

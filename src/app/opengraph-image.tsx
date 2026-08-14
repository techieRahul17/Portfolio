import { ImageResponse } from "next/og";
import { profile } from "@/data/profile";

/**
 * The site's social card.
 *
 * This is the file convention rather than a route handler: Next renders it to
 * a PNG at build time and injects the `og:image` / `twitter:image` tags on
 * every route that doesn't override it. That makes it a prerendered asset
 * instead of an on-demand render — faster, and it can't fail at request time.
 *
 * `next/og` supports a narrow subset of CSS: flexbox only, every element that
 * has more than one child needs an explicit `display`, and no custom
 * properties. Everything below is written out literally for that reason.
 */
export const alt = `${profile.name} — ${profile.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#07070a",
          padding: 72,
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Accent bloom, echoing the hero. */}
        <div
          style={{
            position: "absolute",
            top: -260,
            left: 360,
            width: 720,
            height: 560,
            borderRadius: 9999,
            background: "radial-gradient(closest-side, rgba(110,91,255,0.55), transparent)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 9999,
                background: "#e8ff4f",
                marginRight: 16,
              }}
            />
            <div style={{ fontSize: 24, color: "#8f8fa3", letterSpacing: 4 }}>
              {profile.role.toUpperCase()}
            </div>
          </div>
          <div style={{ fontSize: 22, color: "#55556a", letterSpacing: 4 }}>CHENNAI, IN</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 132,
              color: "#f3f3f6",
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: -6,
            }}
          >
            RAHUL
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 132,
              color: "#e8ff4f",
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: -6,
            }}
          >
            V S
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: 56,
                height: 5,
                background: "#e8ff4f",
                borderRadius: 9999,
                marginRight: 20,
              }}
            />
            <div style={{ fontSize: 28, color: "#f3f3f6" }}>ex-Amazon SDE Intern</div>
          </div>
          <div style={{ fontSize: 24, color: "#55556a" }}>SSN COLLEGE OF ENGINEERING</div>
        </div>
      </div>
    ),
    size,
  );
}

import { ImageResponse } from "next/og";
import { profile } from "@/data/profile";

export const contentType = "image/png";

/**
 * Dynamic social cards: /api/og?title=Work&subtitle=Rahul V S
 * Every page gets a branded preview without exporting a single PNG.
 *
 * Note: `next/og` supports a narrow subset of CSS — flexbox only, no gap on
 * some builds, no custom properties. Everything here is written literally.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title")?.slice(0, 80) || profile.name;
  const subtitle = searchParams.get("subtitle")?.slice(0, 80) || profile.role;

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
          padding: "72px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Accent bloom, echoing the site's hero. */}
        <div
          style={{
            position: "absolute",
            top: -260,
            left: 380,
            width: 700,
            height: 560,
            borderRadius: "50%",
            background: "radial-gradient(closest-side, rgba(110,91,255,0.55), transparent)",
          }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 999,
                background: "#e8ff4f",
                marginRight: 16,
              }}
            />
            <div style={{ fontSize: 24, color: "#8f8fa3", letterSpacing: 4 }}>
              {subtitle.toUpperCase()}
            </div>
          </div>
          <div style={{ fontSize: 22, color: "#55556a", letterSpacing: 4 }}>CHENNAI, IN</div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: title.length > 22 ? 78 : 108,
            color: "#f3f3f6",
            fontWeight: 700,
            lineHeight: 1.02,
            letterSpacing: -4,
          }}
        >
          {title}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{ width: 56, height: 5, background: "#e8ff4f", borderRadius: 999, marginRight: 20 }}
            />
            <div style={{ fontSize: 30, color: "#f3f3f6" }}>{profile.name}</div>
          </div>
          <div style={{ fontSize: 24, color: "#55556a" }}>ex-Amazon SDE Intern</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

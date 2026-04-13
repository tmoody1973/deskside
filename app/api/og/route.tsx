import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") || "DESKSIDE";
  const subtitle = searchParams.get("subtitle") || "";
  const genre = searchParams.get("genre") || "";
  const type = searchParams.get("type") || "default"; // default, channel, playlist

  const accentColor =
    type === "channel" ? "#FFD93D" : type === "playlist" ? "#FF3EA5" : "#FFD93D";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0A0A0F",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            width: 96,
            height: 4,
            backgroundColor: accentColor,
            marginBottom: 40,
          }}
        />

        {/* Genre badge */}
        {genre && (
          <div
            style={{
              display: "flex",
              padding: "6px 16px",
              backgroundColor: "#FF3EA5",
              color: "#0A0A0F",
              fontSize: 14,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 3,
              marginBottom: 24,
              border: "2px solid #F5F0E8",
            }}
          >
            {genre}
          </div>
        )}

        {/* Title */}
        <div
          style={{
            fontSize: type === "default" ? 80 : 56,
            fontWeight: 900,
            color: "#F5F0E8",
            textAlign: "center",
            maxWidth: 900,
            lineHeight: 1.1,
          }}
        >
          {title}
        </div>

        {/* Subtitle */}
        {subtitle && (
          <div
            style={{
              fontSize: 24,
              color: "#3EDBFF",
              marginTop: 16,
              textAlign: "center",
            }}
          >
            {subtitle}
          </div>
        )}

        {/* Bottom accent line */}
        <div
          style={{
            width: 96,
            height: 4,
            backgroundColor: "#FF3EA5",
            marginTop: 40,
          }}
        />

        {/* Wordmark */}
        <div
          style={{
            fontSize: 16,
            color: "#6B665E",
            marginTop: 32,
            letterSpacing: 6,
            textTransform: "uppercase",
          }}
        >
          DESKSIDE
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

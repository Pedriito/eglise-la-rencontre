import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "linear-gradient(160deg, #2E6570 0%, #3D7D85 40%, #5A9EA6 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontFamily: "serif",
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 8, opacity: 0.7, marginBottom: 16, textTransform: "uppercase" }}>
          Lieusaint · Seine-et-Marne
        </div>
        <div style={{ fontSize: 80, fontWeight: 300, letterSpacing: 4 }}>
          Église La Rencontre
        </div>
        <div style={{ fontSize: 24, opacity: 0.7, marginTop: 24, letterSpacing: 2 }}>
          Cultes le dimanche · 10h–12h · egliselarencontre.fr
        </div>
      </div>
    ),
    { ...size }
  );
}

import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 30% 30%, #6ee7ff, #7c3aed 45%, #111827 80%)",
          color: "white",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: 64 }}>
          <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: -1 }}>CSNest</div>
          <div style={{ fontSize: 34, opacity: 0.92, maxWidth: 900 }}>
            Fix and convert messy CSV files for Shopify and other tools.
          </div>
          <div style={{ fontSize: 24, opacity: 0.8 }}>Upload → auto-fix safe issues → export</div>
        </div>
      </div>
    ),
    size
  );
}

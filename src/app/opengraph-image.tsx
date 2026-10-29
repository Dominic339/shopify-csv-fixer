import { ImageResponse } from "next/og";
import { LOGO_PATHS as P } from "@/components/brand/Logo";

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
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#f6f7f9",
          color: "#1b2030",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width="112" height="112" viewBox={P.viewBox}>
            <rect {...P.tile} fill="#0f766e" />
            <path d={P.lines} stroke="#ffffff" strokeOpacity="0.42" strokeWidth="1.8" fill="none" />
            <rect {...P.cell} fill="#4f46e5" />
            <path d={P.check} fill="none" stroke="#ffffff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: -2 }}>StriveFormats</div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", marginTop: 40, fontSize: 44, fontWeight: 700, maxWidth: 980, lineHeight: 1.2 }}>
          <span>Fix your product CSV</span>
          <span style={{ color: "#0f766e", marginLeft: 12 }}>before the import fails.</span>
        </div>
        <div style={{ marginTop: 22, fontSize: 28, color: "#5c6377" }}>
          Shopify · WooCommerce · Etsy · eBay · Amazon. Your file never leaves your computer.
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 14, display: "flex" }}>
          <div style={{ flex: 3, background: "#0f766e" }} />
          <div style={{ flex: 1, background: "#4f46e5" }} />
        </div>
      </div>
    ),
    size
  );
}

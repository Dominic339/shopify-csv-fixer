import type { NextConfig } from "next";

// Content Security Policy. Inline scripts stay allowed: pages are static, so there is no
// per-request nonce, and Next and the theme script inject inline <script> tags.
function contentSecurityPolicy(): string {
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : "https://*.supabase.co";
  const supabaseWs = supabase.replace(/^https:/, "wss:");
  const dev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com`,
    "style-src 'self' 'unsafe-inline'",
    // Product image previews come from any shop's CDN.
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' ${supabase} ${supabaseWs} https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com${dev ? " ws:" : ""}`,
    "worker-src 'self' blob:",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    // Checkout and the billing portal are server redirects, not form posts.
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

const nextConfig: NextConfig = {
  // There are two root layouts (app/(en) and app/[locale]), so unmatched URLs need their own 404 page.
  experimental: {
    globalNotFound: true,
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // The site is never meant to be framed; this blocks clickjacking.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
          { key: "Content-Security-Policy", value: contentSecurityPolicy() },
        ],
      },
    ];
  },

  // Old URLs that are linked from outside: send them to the pages that replaced them.
  async redirects() {
    return [
      { source: "/ecommerce", destination: "/presets", permanent: true },
      { source: "/ecommerce-csv-fixer", destination: "/presets", permanent: true },
      { source: "/ecommerce/shopify", destination: "/shopify-csv-fixer", permanent: true },
      { source: "/ecommerce/woocommerce", destination: "/woocommerce-csv-fixer", permanent: true },
      { source: "/ecommerce/etsy", destination: "/etsy-csv-fixer", permanent: true },
      { source: "/ecommerce/ebay", destination: "/ebay-csv-fixer", permanent: true },
      { source: "/ecommerce/amazon", destination: "/amazon-csv-fixer", permanent: true },
      { source: "/ecommerce/:path*", destination: "/presets", permanent: true },
      { source: "/pricing", destination: "/#pricing", permanent: true },
      // Duplicate guide for the same Etsy check (etsy/tags_too_many is an alias of etsy/too_many_tags).
      { source: "/guides/etsy/tags-too-many", destination: "/guides/etsy/too-many-tags", permanent: true },
      { source: "/:locale(de|es|fr|it|pt|nl|pl|ru|tr|ja|ko|zh)/guides/etsy/tags-too-many", destination: "/:locale/guides/etsy/too-many-tags", permanent: true },
    ];
  },
};

export default nextConfig;

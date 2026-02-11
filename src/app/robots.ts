import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/app", "/formats"],
        disallow: ["/account", "/profile", "/login", "/checkout", "/api"],
      },
    ],
    sitemap: "https://csnest.vercel.app/sitemap.xml",
  };
}

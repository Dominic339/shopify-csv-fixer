// src/app/page.tsx
import HomeClient from "@/app/HomeClient";

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "CSNest",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Fix and convert messy CSV files for Shopify and other tools. Upload, auto-fix safe issues, and export clean files in seconds.",
    url: "https://csnest.vercel.app",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeClient />
    </>
  );
}

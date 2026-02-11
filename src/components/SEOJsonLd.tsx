"use client";

export default function SEOJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "CSV Nest",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Fix, clean, validate, and merge CSV files online directly in your browser.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD"
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

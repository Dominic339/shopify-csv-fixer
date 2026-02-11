// src/app/page.tsx
import HomeClient from "./HomeClient";

export default function HomePage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "CSNest",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "Fix and convert messy CSV files for Shopify and other tools. Upload, auto-fix safe issues, and export clean files in seconds.",
      url: "https://csnest.vercel.app",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Does CSNest upload or store my CSV files?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "CSNest processes CSV files in your browser. You can export a clean CSV, and optional account features are for subscription and saved formats.",
          },
        },
        {
          "@type": "Question",
          name: "Will this fix Shopify product CSV import errors?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "CSNest is designed for Shopify CSV cleanup: it normalizes formatting, flags risky rows, and helps you export a cleaner file for import. Some issues still require manual review depending on your data.",
          },
        },
        {
          "@type": "Question",
          name: "Can I use CSNest without creating an account?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. The Free plan works without an account. An account is required for paid plans and billing management.",
          },
        },
        {
          "@type": "Question",
          name: "Will CSNest fix every CSV automatically?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No tool can safely auto-fix every edge case. CSNest auto-fixes what is safe and clearly flags what needs review so you stay in control.",
          },
        },
        {
          "@type": "Question",
          name: "Can I create reusable formats for repeat jobs?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Custom Formats let you save column templates and reusable rules. That feature is included with the Advanced plan.",
          },
        },
      ],
    },
  ];

  return <HomeClient jsonLd={jsonLd} />;
}

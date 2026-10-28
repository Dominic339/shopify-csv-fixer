import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ];
  },
};

export default nextConfig;

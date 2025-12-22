import "./globals.css";
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { Header } from "@/components/ui/Header";

export const metadata: Metadata = {
  title: "Shopify CSV Fixer",
  description: "Fix, validate, and create Shopify product CSVs without spreadsheets or guesswork.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <div className="min-h-dvh">
            <Header />
            <main>{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

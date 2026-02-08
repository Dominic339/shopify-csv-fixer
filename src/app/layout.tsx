// src/app/layout.tsx
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import TopBar from "@/components/TopBar";
import { Analytics } from "@vercel/analytics/next";


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <TopBar />
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}

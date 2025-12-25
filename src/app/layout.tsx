// src/app/layout.tsx
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { TopBar } from "@/components/TopBar";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <TopBar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import "./globals.css";

// Space Grotesk for display/headings (a little technical, not the default
// warm-serif AI look), Inter for body copy, JetBrains Mono for anything
// numeric — tabular figures read as "this is a real ledger" rather than
// generic marketing type.
const displayFont = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", weight: ["500", "700"] });
const bodyFont = Inter({ subsets: ["latin"], variable: "--font-body" });
const monoFont = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "PayCore",
  description: "Digital wallet and peer-to-peer money transfers.",
  // manifest.json + icons make the app installable ("Add to Home Screen" /
  // the browser install prompt) — same idea as the Dispatch app, so a
  // client doesn't have to keep hunting for the link. start_url in
  // manifest.json points at /dashboard: a logged-in user lands on their
  // wallet, and a logged-out one is bounced to /login by the existing
  // middleware, same as visiting that URL directly in a normal tab.
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PayCore",
  },
};

export const viewport: Viewport = {
  themeColor: "#149259", // brand-600 — matches tailwind.config.ts
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}>
      <body className="font-body antialiased">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
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

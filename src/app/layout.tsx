import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "flag-icons/css/flag-icons.min.css";
import "./globals.css";
import { AgeGate } from "@/components/age-gate";
import { SiteFooter } from "@/components/site-footer";
import { LanguageProvider } from "@/lib/i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "DOPYU",
    template: "%s | DOPYU",
  },
  description: "DOPYU — Global Ejaculation Championship & Tracker. ストップウォッチで記録して、ランキングで世界と競う。",
  applicationName: "DOPYU",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0a0a10",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <LanguageProvider>
          <div id="app-root" className="flex flex-1 flex-col">
            {children}
            <SiteFooter />
          </div>
          <AgeGate />
        </LanguageProvider>
      </body>
    </html>
  );
}

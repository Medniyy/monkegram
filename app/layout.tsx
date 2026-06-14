import type { Metadata, Viewport } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";
import { CRTOverlay } from "@/components/ui/CRTOverlay";
import { AppShell } from "@/components/layout/AppShell";

const pressStart = Press_Start_2P({
  weight: "400",
  variable: "--font-press-start",
  subsets: ["latin"],
  display: "swap",
});

const vt323 = VT323({
  weight: "400",
  variable: "--font-vt323",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MonkeGram — Wear Your Monkey",
  description:
    "Find your Solana Monkey Business PFP, wear it as a live face mask, record a clip, and download it. No wallet. No login. Just monkeys.",
  openGraph: {
    title: "MonkeGram — Wear Your Monkey",
    description:
      "Find your SMB PFP, wear it as a live face mask, record, download.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${pressStart.variable} ${vt323.variable} h-full`}
    >
      <body className="min-h-full">
        <CRTOverlay />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

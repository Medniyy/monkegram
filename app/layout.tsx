import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { CRTOverlay } from "@/components/ui/CRTOverlay";
import { AppShell } from "@/components/layout/AppShell";
import { BASE_PATH } from "@/lib/basePath";

const pressStart = localFont({
  src: "./fonts/PressStart2P-Regular.ttf",
  weight: "400",
  style: "normal",
  variable: "--font-press-start",
  display: "swap",
});

const vt323 = localFont({
  src: "./fonts/VT323-Regular.ttf",
  weight: "400",
  style: "normal",
  variable: "--font-vt323",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ath.camera/monkegram/"),
  title: "MonkeGram — Wear Your Monke",
  description:
    "Wear any Solana Monkey Business PFP as a live face mask, record a clip, post it to X, or save it to your device.",
  openGraph: {
    title: "MonkeGram — Wear Your Monke",
    description:
      "Wear an SMB PFP as a live face mask, record, post to X, or save.",
    type: "website",
  },
  icons: {
    icon: `${BASE_PATH}/mglogo.png`,
    apple: `${BASE_PATH}/mglogo.png`,
  },
};

export const viewport: Viewport = {
  themeColor: "#0c2a18",
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

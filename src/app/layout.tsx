import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "./providers";
import { Analytics } from "@vercel/analytics/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GlobalPhone",
  description: "Get paid to pick up the phone. Set your price, receive calls, earn money.",
  icons: {
    icon: "/globalphone_logo.png",
  },
  openGraph: {
    title: "GlobalPhone",
    description: "Get paid to pick up the phone. Set your price, receive calls, earn money.",
    url: "https://globalphone.me",
    siteName: "GlobalPhone",
    images: [
      {
        url: "https://globalphone.me/logo_transparent.png",
        width: 1200,
        height: 630,
        alt: "GlobalPhone - Get paid to pick up the phone",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GlobalPhone",
    description: "Get paid to pick up the phone. Set your price, receive calls, earn money.",
    images: ["https://globalphone.me/logo_transparent.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Analytics />
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}

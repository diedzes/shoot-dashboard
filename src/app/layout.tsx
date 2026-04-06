import type { Metadata } from "next";
import { Barlow_Condensed, Geist_Mono, Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const headingDisplay = Barlow_Condensed({
  variable: "--font-heading-display",
  subsets: ["latin"],
  weight: ["800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shoot Music NL/BE Dashboard",
  description:
    "Dashboard voor verzonden muziekpakketten, responses en quotes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body
        className={`${roboto.variable} ${headingDisplay.variable} ${geistMono.variable}`}
      >
        {children}
      </body>
    </html>
  );
}

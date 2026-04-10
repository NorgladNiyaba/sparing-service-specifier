import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";

import "./globals.css";

const sparingBody = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const sparingDisplay = localFont({
  src: "../app-tommy.otf",
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sparing Consulting Pricing Flow",
  description: "Presentation-ready pricing reveal prototype for Sparing Consulting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${sparingBody.variable} ${sparingDisplay.variable} min-h-screen bg-[var(--page-bg)] font-sans text-[var(--brand-ink)] antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/components/providers/AuthProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "AI Career Shield - Know Your Risk. Own Your Future.",
  description:
    "AI is changing work. Find out where you stand—and what to do about it. Get your free AI vulnerability assessment and personalized career action plan.",
  keywords: [
    "AI career",
    "job automation",
    "career transition",
    "AI risk assessment",
    "future of work",
  ],
  authors: [{ name: "AI Career Shield" }],
  openGraph: {
    title: "AI Career Shield - Know Your Risk. Own Your Future.",
    description:
      "AI is changing work. Find out where you stand—and what to do about it.",
    type: "website",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

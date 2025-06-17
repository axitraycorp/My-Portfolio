import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hagon | Full-Stack Web Architect",
  description: "Portfolio of Hagon, a Senior Full-Stack Developer & Tech Architect.",
  metadataBase: new URL("https://your-domain.com"),
  openGraph: {
    title: "Hagon | Full-Stack Web Architect",
    description: "Explore projects, architecture, and deep technical insights from Hagon.",
    url: "https://your-domain.com",
    siteName: "Hagon Portfolio",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hagon | Full-Stack Developer",
    description: "Building the future of web, mobile, cloud, and AI.",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-gray-900`}
      >
        <Navbar />
        <main className="min-h-screen max-w-5xl mx-auto p-6">{children}</main>
      </body>
    </html>
  );
}

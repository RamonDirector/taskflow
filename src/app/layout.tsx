import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistration } from "./sw-register";

export const metadata: Metadata = {
  title: "Taskflow — Voice to Task in 2 Seconds",
  description: "Stop losing ideas. One tap, speak, done. AI transforms your voice into organized tasks before you forget them. Built for founders, creators, and overthinkers.",
  keywords: ["voice to text", "task management", "productivity app", "voice notes", "AI tasks", "capture ideas", "ADHD productivity", "voice recorder", "task automation"],
  authors: [{ name: "Ramon Prieto", url: "https://x.com/RamonPrietoX" }],
  creator: "Ramon Prieto",
  publisher: "Taskflow",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  manifest: "/manifest.json",
  metadataBase: new URL("https://taskflow-lyart-beta.vercel.app"),
  alternates: {
    canonical: "/",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Taskflow",
  },
  openGraph: {
    title: "Taskflow — Voice to Task in 2 Seconds",
    description: "Stop losing ideas. One tap, speak, done. AI transforms your voice into organized tasks before you forget them.",
    url: "https://taskflow-lyart-beta.vercel.app",
    siteName: "Taskflow",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Taskflow — Voice to Task in 2 Seconds",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Taskflow — Voice to Task in 2 Seconds",
    description: "Stop losing ideas. One tap, speak, done. AI transforms your voice into organized tasks.",
    creator: "@RamonPrietoX",
    site: "@RamonPrietoX",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#6b8f71",
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
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="antialiased">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}

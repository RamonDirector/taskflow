import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistration } from "./sw-register";

export const metadata: Metadata = {
  title: "Taskflow — Capture ideas in 2 seconds",
  description: "One tap. Speak. Done. Your thoughts become tasks before you forget them.",
  keywords: ["tasks", "voice", "productivity", "capture", "ideas"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Taskflow",
  },
  openGraph: {
    title: "Taskflow — Capture ideas in 2 seconds",
    description: "One tap. Speak. Done. Your thoughts become tasks before you forget them.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Taskflow — Capture ideas in 2 seconds",
    description: "One tap. Speak. Done. Your thoughts become tasks before you forget them.",
    creator: "@RamonPrietoX",
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

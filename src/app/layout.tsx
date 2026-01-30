import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Taskflow — Stop losing tasks. Just say them.",
  description: "You think 10 tasks a day but only write down 6. Taskflow captures your voice and turns it into organized action.",
  keywords: ["tasks", "voice", "ai", "productivity", "taskflow"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Taskflow",
  },
  openGraph: {
    title: "Taskflow — Stop losing tasks. Just say them.",
    description: "Capture tasks by voice. AI organizes them. You execute.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Taskflow — Stop losing tasks. Just say them.",
    description: "Capture tasks by voice. AI organizes them. You execute.",
    creator: "@RamonPrietoX",
  },
};

export const viewport: Viewport = {
  themeColor: "#f97316",
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
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}

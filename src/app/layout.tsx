import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Taskflow — Stop losing tasks. Just say them.",
  description: "You think 10 tasks a day but only write down 6. Taskflow captures your voice and turns it into organized action.",
  keywords: ["tasks", "voice", "ai", "productivity", "taskflow"],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

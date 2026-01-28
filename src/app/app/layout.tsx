import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard — Taskflow',
  description: 'Capture tasks with your voice',
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

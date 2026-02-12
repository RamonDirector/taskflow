import type { Metadata } from 'next';
import { DarkModeInit } from '@/components/DarkModeInit';

export const metadata: Metadata = {
  title: 'Dashboard — Hansei',
  description: 'Capture tasks with your voice',
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DarkModeInit />
      {children}
    </>
  );
}

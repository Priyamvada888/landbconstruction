import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'LB Staff Manager | Construction Labour & Plant CRM',
  description:
    'Dedicated staff, plant operator, and site management system for UK civil engineering and construction recruitment.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

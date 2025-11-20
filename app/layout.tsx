import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { cn } from '@/lib/utils/cn';
import { Suspense } from 'react';

const fontSans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Taxi Money (Passenger)',
  description: 'Pay for your rides seamlessly.',
};

export const viewport: Viewport = {
  themeColor: '#0A0A0A',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          fontSans.variable
        )}
      >
        <Suspense fallback={<div className="min-h-screen bg-black" />}>
          <Providers>{children}</Providers>
        </Suspense>
      </body>
    </html>
  );
}
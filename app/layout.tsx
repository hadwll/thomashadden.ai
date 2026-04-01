import type { Metadata } from 'next';
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import { ThemeProvider } from '@/lib/theme';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
  preload: true
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
  preload: false
});

export const metadata: Metadata = {
  title: 'Thomas Hadden | SPR-01 Bootstrap',
  description: 'App router, route placeholders, theme plumbing, and test harness foundation.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script defer data-domain="thomashadden.ai" src="https://plausible.io/js/script.js"></script>
      </head>
      <body
        className={`${jakarta.variable} ${jetbrains.variable} min-h-screen bg-bg-primary text-text-primary`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

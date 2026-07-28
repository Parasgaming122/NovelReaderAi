import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Warm Duotone Novel Console — WTR-Lab Inspired Reader',
  description: 'Scalable Chinese web novel reader with 4-tier Cloudflare bypass, HTML Google translation, and Warm Duotone Console UI.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light">
      <body>
        <div className="ambient-glow-1" />
        <div className="ambient-glow-2" />
        {children}
      </body>
    </html>
  );
}

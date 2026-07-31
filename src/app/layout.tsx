import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NovelReaderAI — Chinese Web Novel Reader',
  description: 'A sleek, multi-source Chinese web novel reader with real-time translation, bilingual reading modes, and a modern console-style interface.',
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

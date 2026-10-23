import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MemoMind AI — Personalized AI Journal',
  description: 'A private, AI-augmented journal powered by Retrieval-Augmented Generation (RAG)',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 text-slate-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}

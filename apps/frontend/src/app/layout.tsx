import '@/styles/globals.css';
import { Navbar } from '@/components/Navbar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NexusPOS — Concurrency-Safe POS Order & Inventory System',
  description:
    'Fullstack TypeScript Point of Sale with deterministic row-level locking, PostgreSQL, and Next.js.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090d16] text-slate-100 min-h-screen flex flex-col relative antialiased">
        <div className="ambient-glow" />
        <Navbar />
        <main className="flex-1 relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}

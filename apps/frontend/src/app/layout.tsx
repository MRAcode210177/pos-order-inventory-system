import '@/styles/globals.css';
import { Navbar } from '@/components/Navbar';
import { ThemeProvider } from '@/components/ThemeProvider';
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
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground min-h-screen flex flex-col relative antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <div className="ambient-glow" />
          <Navbar />
          <main className="flex-1 relative w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}

import { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import '@/src/web/styles/index.css'; // New Inertia Design System
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Inertia | Institutional Risk Engine',
  description: 'High-performance equity risk and correlation surveillance.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }}>
      <body className={`${inter.variable} ${mono.variable} font-sans antialiased`}>
        {children}
        <Toaster closeButton position="top-right" theme="dark" />
      </body>
    </html>
  );
}

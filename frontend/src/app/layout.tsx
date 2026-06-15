import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'AutoMint — Idle Bot Mining on Stellar',
  description: 'Buy Bot NFTs that auto-accumulate $AMT tokens on Stellar. No tapping — pure passive earning.',
  keywords: ['Stellar', 'Soroban', 'NFT', 'DeFi', 'idle game', 'AutoMint'],
  openGraph: {
    title: 'AutoMint',
    description: 'Idle bot mining dApp on Stellar',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#050403',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className="min-h-screen flex flex-col antialiased"
        style={{ background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Inter', sans-serif" }}
      >
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}

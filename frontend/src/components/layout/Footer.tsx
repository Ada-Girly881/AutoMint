import Link from 'next/link';
import { Bot } from 'lucide-react';

export function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--liner)', background: 'var(--card)' }} className="py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--green)' }}
            >
              <Bot className="w-3 h-3" style={{ color: '#062b18' }} />
            </div>
            <span
              className="text-sm font-black uppercase tracking-tight"
              style={{ fontFamily: "'Sora', sans-serif", color: 'var(--text)' }}
            >
              Auto<span style={{ color: 'var(--green)' }}>Mint</span>
            </span>
            <span className="text-xs ml-2" style={{ color: 'var(--muted)' }}>Built on Stellar Soroban</span>
          </div>

          <div className="flex items-center gap-6 text-xs" style={{ color: 'var(--muted)' }}>
            <Link href="/dashboard" className="hover:text-[var(--text)] transition-colors">Dashboard</Link>
            <Link href="/marketplace" className="hover:text-[var(--text)] transition-colors">Marketplace</Link>
            <Link href="/leaderboard" className="hover:text-[var(--text)] transition-colors">Leaderboard</Link>
          </div>

          <p className="text-xs" style={{ color: 'var(--muted)', opacity: 0.6 }}>
            © 2025 AutoMint. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

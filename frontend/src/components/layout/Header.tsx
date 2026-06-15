'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, LayoutDashboard, ShoppingBag, Trophy, User, Zap } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { truncateAddress } from '@/lib/stellar';
import clsx from 'clsx';

const NAV_LINKS = [
  { href: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/profile',     label: 'Profile',     icon: User },
];

export function Header() {
  const pathname = usePathname();
  const { isConnected, publicKey, status, connect, disconnect } = useWallet();

  return (
    <header
      className="sticky top-0 z-50"
      style={{ background: 'rgba(5,4,3,0.88)', backdropFilter: 'blur(18px)', borderBottom: '1px solid var(--liner)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--green)' }}
            >
              <Bot className="w-4 h-4" style={{ color: '#062b18' }} />
            </div>
            <span
              className="font-display font-black tracking-tight uppercase"
              style={{ fontFamily: "'Sora', sans-serif", color: 'var(--text)', fontSize: '15px', letterSpacing: '-0.3px' }}
            >
              Auto<span style={{ color: 'var(--green)' }}>Mint</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all',
                  )}
                  style={{
                    fontSize: '13px',
                    fontWeight: active ? 700 : 600,
                    fontFamily: "'Sora', sans-serif",
                    letterSpacing: '0.01em',
                    color: active ? 'var(--green)' : 'var(--muted)',
                    background: active ? 'rgba(52,224,138,0.1)' : 'transparent',
                  }}
                  onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--text)'; }}
                  onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--muted)'; }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Wallet */}
          <div className="flex items-center gap-3">
            {isConnected && publicKey ? (
              <div className="flex items-center gap-2">
                <div
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl"
                  style={{ background: 'rgba(52,224,138,0.1)', border: '1px solid rgba(52,224,138,0.25)' }}
                >
                  <div className="w-2 h-2 rounded-full pulse-dot" style={{ background: 'var(--green)' }} />
                  <span className="text-xs font-mono" style={{ color: 'var(--green)' }}>
                    {truncateAddress(publicKey)}
                  </span>
                </div>
                <button onClick={disconnect} className="btn-ghost text-xs px-3 py-1.5">
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connect}
                disabled={status === 'connecting'}
                className="btn-primary text-sm"
                style={{ padding: '8px 18px', borderRadius: '12px' }}
              >
                <Zap className="w-4 h-4" />
                {status === 'connecting' ? 'Connecting…' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden" style={{ borderTop: '1px solid var(--liner)' }}>
        <div className="flex items-center justify-around px-2 py-2">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={{ color: active ? 'var(--green)' : 'var(--muted)' }}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}

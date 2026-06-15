'use client';
import { motion } from 'framer-motion';
import { Trophy, RefreshCw, Users, Zap } from 'lucide-react';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import { useWallet } from '@/hooks/useWallet';
import { formatPoints } from '@/types';

export default function LeaderboardPage() {
  const { rankings, totalUsers, isLoading, refetch } = useLeaderboard();
  const { publicKey } = useWallet();
  const myRank = rankings.findIndex((u) => u.address === publicKey) + 1;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="memefi-h2" style={{ fontSize: '32px' }}>Leaderboard</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Top miners ranked by total points earned on-chain
          </p>
        </div>
        <button
          onClick={() => refetch()}
          aria-label="Refresh"
          className="p-2 rounded-xl transition-colors"
          style={{ border: '1px solid var(--liner)', color: 'var(--muted)', background: 'transparent' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          {
            icon: Users,
            label: 'TOTAL PLAYERS',
            value: String(totalUsers),
            color: 'var(--blue)',
          },
          {
            icon: Trophy,
            label: 'TOP SCORE',
            value: rankings[0] ? formatPoints(rankings[0].totalPoints) : '—',
            color: 'var(--gold)',
          },
          {
            icon: Zap,
            label: 'YOUR RANK',
            value: publicKey && myRank > 0 ? `#${myRank}` : '—',
            color: 'var(--green)',
          },
        ].map(({ icon: Icon, label, value, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="mf-card-2 text-center"
            style={{ padding: '20px 12px', borderRadius: '20px' }}
          >
            <Icon className="w-5 h-5 mx-auto mb-2" style={{ color }} />
            <div className="text-xs uppercase tracking-widest font-semibold mb-1" style={{ color: 'var(--muted)' }}>
              {label}
            </div>
            <div
              className="font-black"
              style={{ fontFamily: "'Sora', sans-serif", fontSize: '26px', color, lineHeight: 1, letterSpacing: '-0.5px' }}
            >
              {value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Table */}
      <LeaderboardTable rankings={rankings} currentUserAddress={publicKey} isLoading={isLoading} />

      <p className="text-center text-xs mt-5" style={{ color: 'var(--muted)', opacity: 0.6 }}>
        Updates every 30s · Sorted by total points earned on Stellar
      </p>
    </div>
  );
}

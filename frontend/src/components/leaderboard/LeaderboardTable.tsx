'use client';
import { motion } from 'framer-motion';
import { Trophy, Medal, Bot } from 'lucide-react';
import { truncateAddress } from '@/lib/stellar';
import { formatPoints } from '@/types';
import { LeaderboardRowSkeleton } from '@/components/ui/Skeleton';
import type { UserProfile } from '@/types';

interface LeaderboardTableProps {
  rankings: UserProfile[];
  currentUserAddress?: string | null;
  isLoading: boolean;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="w-5 h-5" style={{ color: 'var(--gold)' }} />;
  if (rank === 2) return <Medal className="w-5 h-5" style={{ color: '#C0C0C0' }} />;
  if (rank === 3) return <Medal className="w-5 h-5" style={{ color: '#CD7F32' }} />;
  return <span className="text-sm font-mono w-5 text-center" style={{ color: 'var(--muted)' }}>{rank}</span>;
}

export function LeaderboardTable({ rankings, currentUserAddress, isLoading }: LeaderboardTableProps) {
  if (isLoading) {
    return (
      <div style={{ background: 'var(--card)', borderRadius: '20px', overflow: 'hidden' }}>
        {Array.from({ length: 10 }).map((_, i) => <LeaderboardRowSkeleton key={i} />)}
      </div>
    );
  }

  if (rankings.length === 0) {
    return (
      <div
        className="rounded-3xl p-16 text-center"
        style={{ background: 'var(--card)' }}
      >
        <Bot className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--muted)', opacity: 0.4 }} />
        <p style={{ color: 'var(--muted)' }}>No players yet. Be the first!</p>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--card)', borderRadius: '20px', overflow: 'hidden' }}>
      {rankings.map((user, index) => {
        const rank = index + 1;
        const isMe = user.address === currentUserAddress;

        return (
          <motion.div
            key={user.address}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            className="flex items-center gap-4 px-5 py-4 transition-colors"
            style={{
              background: isMe ? 'rgba(52,224,138,0.05)' : 'transparent',
              borderLeft: isMe ? '2px solid var(--green)' : '2px solid transparent',
              borderBottom: '1px solid var(--liner)',
            }}
          >
            {/* Rank */}
            <div className="w-8 flex justify-center shrink-0">
              <RankBadge rank={rank} />
            </div>

            {/* Avatar */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
              style={{
                background: `hsl(${(user.address.charCodeAt(0) * 37) % 360}, 40%, 18%)`,
                color: `hsl(${(user.address.charCodeAt(0) * 37) % 360}, 60%, 65%)`,
                fontFamily: "'Sora', sans-serif",
              }}
            >
              {user.username ? user.username[0].toUpperCase() : '?'}
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm truncate" style={{ color: 'var(--text)', fontFamily: "'Sora', sans-serif" }}>
                  {user.username || truncateAddress(user.address)}
                </span>
                {isMe && (
                  <span className="badge badge-green shrink-0" style={{ fontSize: '9px', padding: '2px 7px' }}>You</span>
                )}
              </div>
              <div className="text-xs font-mono" style={{ color: 'var(--muted)', opacity: 0.6 }}>
                {truncateAddress(user.address)}
              </div>
            </div>

            {/* Bots */}
            <div className="hidden sm:flex items-center gap-1 text-xs shrink-0" style={{ color: 'var(--muted)' }}>
              <Bot className="w-3 h-3" />
              {user.botCount}
            </div>

            {/* Points */}
            <div className="text-right shrink-0">
              <div className="font-black font-mono text-sm" style={{ fontFamily: "'Sora', sans-serif", color: rank <= 3 ? 'var(--gold)' : 'var(--text)' }}>
                {formatPoints(user.totalPoints)}
              </div>
              <div className="text-xs" style={{ color: 'var(--muted)', opacity: 0.6 }}>pts</div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

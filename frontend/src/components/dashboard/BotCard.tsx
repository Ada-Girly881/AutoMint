'use client';
import { motion } from 'framer-motion';
import { Zap, Clock } from 'lucide-react';
import { TIER_META } from '@/types';
import type { BotNFT } from '@/types';

interface BotCardProps {
  bot: BotNFT;
  onList?: (bot: BotNFT) => void;
  compact?: boolean;
}

export function BotCard({ bot, onList, compact = false }: BotCardProps) {
  const meta = TIER_META[bot.tier];
  const mintDate = new Date(Number(bot.mintedAt) * 1000).toLocaleDateString();

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="bot-card overflow-hidden"
      style={{ background: 'var(--card-2)', borderRadius: '20px', border: `1px solid ${meta.color}20` }}
    >
      {/* Tier color top stripe */}
      <div style={{ height: '3px', background: meta.color, opacity: 0.7 }} />

      <div style={{ padding: compact ? '16px' : '20px' }}>
        {/* Header row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}35` }}
            >
              {meta.emoji}
            </div>
            <div>
              <div
                className="font-black text-sm uppercase tracking-wide"
                style={{ fontFamily: "'Sora', sans-serif", color: 'var(--text)' }}
              >
                {meta.tier}
              </div>
              <div className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
                #{String(bot.id).padStart(4, '0')}
              </div>
            </div>
          </div>
          <span
            className="badge"
            style={{ background: `${meta.color}14`, color: meta.color, borderRadius: '8px', fontSize: '10px' }}
          >
            T{meta.index}
          </span>
        </div>

        {/* Rate */}
        <div className="flex items-center gap-1.5 mb-1">
          <Zap className="w-3.5 h-3.5" style={{ color: 'var(--green)' }} />
          <span className="text-xs" style={{ color: 'var(--muted)' }}>
            <span style={{ color: 'var(--green)', fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>
              {meta.ratePerHour}
            </span>{' '}
            pts/hr
          </span>
        </div>

        {!compact && (
          <div className="flex items-center gap-1.5 mb-4">
            <Clock className="w-3 h-3" style={{ color: 'var(--muted)', opacity: 0.5 }} />
            <span className="text-xs" style={{ color: 'var(--muted)', opacity: 0.6 }}>Minted {mintDate}</span>
          </div>
        )}

        {onList && (
          <button
            onClick={() => onList(bot)}
            className="w-full mt-3 py-2 px-3 rounded-xl text-xs font-semibold transition-all"
            style={{ border: '1px solid var(--liner)', color: 'var(--muted)', background: 'transparent', cursor: 'pointer' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = meta.color;
              (e.currentTarget as HTMLElement).style.color = meta.color;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--liner)';
              (e.currentTarget as HTMLElement).style.color = 'var(--muted)';
            }}
          >
            List for Sale
          </button>
        )}
      </div>
    </motion.div>
  );
}

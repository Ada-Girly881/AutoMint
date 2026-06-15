'use client';
import { motion } from 'framer-motion';
import { ShoppingCart, Loader2, X, Zap } from 'lucide-react';
import { TIER_META, tierFromIndex, stroopsToXlm } from '@/types';
import { truncateAddress } from '@/lib/stellar';
import type { Listing } from '@/types';

interface BotListingCardProps {
  listing: Listing;
  currentUserAddress?: string | null;
  onBuy: (listingId: bigint) => void;
  onCancel: (listingId: bigint) => void;
  isBuying: boolean;
  isCancelling: boolean;
}

export function BotListingCard({ listing, currentUserAddress, onBuy, onCancel, isBuying, isCancelling }: BotListingCardProps) {
  const tier = tierFromIndex(listing.botTier);
  const meta = TIER_META[tier];
  const isMine = currentUserAddress === listing.seller;
  const xlmPrice = stroopsToXlm(listing.price);
  const listedDate = new Date(Number(listing.listedAt) * 1000).toLocaleDateString();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bot-card overflow-hidden"
      style={{ background: 'var(--card-2)', borderRadius: '20px', border: `1px solid ${meta.color}20` }}
    >
      {/* Tier stripe */}
      <div style={{ height: '3px', background: meta.color, opacity: 0.7 }} />

      <div style={{ padding: '20px' }}>
        {/* Bot info header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}35` }}
            >
              {meta.emoji}
            </div>
            <div>
              <div className="font-black text-sm uppercase tracking-wide" style={{ fontFamily: "'Sora', sans-serif", color: 'var(--text)' }}>
                {meta.tier}
              </div>
              <div className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
                #{String(listing.botId).padStart(4, '0')}
              </div>
            </div>
          </div>
          {isMine && (
            <span className="badge badge-blue" style={{ fontSize: '9px', padding: '2px 7px' }}>Yours</span>
          )}
        </div>

        {/* Rate */}
        <div className="flex items-center gap-1.5 mb-1">
          <Zap className="w-3.5 h-3.5" style={{ color: 'var(--green)' }} />
          <span className="text-xs" style={{ color: 'var(--muted)' }}>
            <span style={{ color: 'var(--green)', fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>{meta.ratePerHour}</span> pts/hr
          </span>
        </div>

        {/* Seller */}
        <div className="text-xs mb-4" style={{ color: 'var(--muted)', opacity: 0.7 }}>
          Listed {listedDate} · {truncateAddress(listing.seller, 4)}
        </div>

        {/* Price + action */}
        <div className="flex items-center justify-between">
          <div>
            <div
              className="font-black"
              style={{ fontFamily: "'Sora', sans-serif", fontSize: '20px', color: 'var(--gold)', letterSpacing: '-0.5px' }}
            >
              {xlmPrice.toLocaleString()}
              <span className="text-sm ml-1" style={{ color: 'var(--muted)', fontWeight: 500 }}>XLM</span>
            </div>
          </div>

          {isMine ? (
            <button
              onClick={() => onCancel(listing.id)}
              disabled={isCancelling}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{ border: '1px solid rgba(255,111,174,0.35)', color: 'var(--pink)', background: 'rgba(255,111,174,0.1)', cursor: 'pointer' }}
            >
              {isCancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
              Cancel
            </button>
          ) : (
            <button
              onClick={() => onBuy(listing.id)}
              disabled={isBuying || !currentUserAddress}
              className="btn-primary flex items-center gap-1.5"
              style={{ padding: '8px 14px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}
            >
              {isBuying ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShoppingCart className="w-3 h-3" />}
              Buy
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

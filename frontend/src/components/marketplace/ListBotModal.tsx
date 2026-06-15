'use client';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { BotCard } from '@/components/dashboard/BotCard';
import { xlmToStroops } from '@/types';
import { CONTRACT_ADDRESSES } from '@/lib/constants';
import type { BotNFT } from '@/types';

interface ListBotModalProps {
  bot: BotNFT | null;
  isOpen: boolean;
  onClose: () => void;
  onList: (params: {
    botId: bigint;
    botTier: number;
    priceStroops: bigint;
    currencyAddress: string;
  }) => Promise<void>;
  isListing: boolean;
}

export function ListBotModal({ bot, isOpen, onClose, onList, isListing }: ListBotModalProps) {
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const xlm = parseFloat(price);
    if (!xlm || xlm <= 0) { setError('Enter a valid price in XLM'); return; }
    if (!bot) return;
    setError('');
    try {
      await onList({
        botId: bot.id,
        botTier: ['Basic', 'Bronze', 'Silver', 'Gold', 'Diamond'].indexOf(bot.tier),
        priceStroops: xlmToStroops(xlm),
        currencyAddress: CONTRACT_ADDRESSES.TOKEN,
      });
      onClose();
      setPrice('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to list bot');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="List Bot for Sale">
      {bot && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Bot preview */}
          <BotCard bot={bot} compact />

          {/* Price input */}
          <div>
            <label
              className="block text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: 'var(--muted)' }}
            >
              Sale price (XLM)
            </label>
            <div className="relative">
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 500"
                min="1"
                step="1"
                className="w-full rounded-xl px-4 py-3 pr-16 text-sm outline-none transition-all"
                style={{
                  background: 'var(--card-2)',
                  border: '1px solid var(--liner)',
                  color: 'var(--text)',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--gold)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--liner)')}
              />
              <span
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono"
                style={{ color: 'var(--muted)' }}
              >
                XLM
              </span>
            </div>
            {error && <p className="text-xs mt-1.5" style={{ color: 'var(--pink)' }}>{error}</p>}
          </div>

          {/* Fee note */}
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            2.5% marketplace fee applies on sale. You receive{' '}
            <span style={{ color: 'var(--gold)', fontWeight: 600 }}>
              {price ? ((parseFloat(price) || 0) * 0.975).toFixed(2) : '—'} XLM
            </span>{' '}
            after fees.
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-ghost flex-1" style={{ borderRadius: '14px', padding: '12px' }}>
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isListing || !price}
              className="btn-primary flex-1 justify-center"
              style={{ borderRadius: '14px', padding: '12px' }}
            >
              {isListing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Listing…</>
              ) : (
                'Confirm Listing'
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

'use client';
import { motion } from 'framer-motion';
import { Coins, Loader2 } from 'lucide-react';
import { formatPoints } from '@/types';

interface ClaimButtonProps {
  pendingPoints: number;
  isClaiming: boolean;
  onClaim: () => void;
  disabled?: boolean;
}

export function ClaimButton({ pendingPoints, isClaiming, onClaim, disabled }: ClaimButtonProps) {
  const canClaim = pendingPoints > 0 && !disabled && !isClaiming;

  return (
    <div
      className="mf-card flex flex-col h-full"
      style={{ padding: '28px', background: 'var(--card)', borderRadius: '20px', alignItems: 'center', textAlign: 'center', justifyContent: 'center', gap: '20px' }}
    >
      {/* Pending amount */}
      <div>
        <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--muted)' }}>
          Ready to Claim
        </p>
        <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: '42px', lineHeight: 1, color: canClaim ? 'var(--green)' : 'var(--muted)', letterSpacing: '-1px' }}>
          {formatPoints(pendingPoints)}
        </div>
        <div className="text-sm mt-1" style={{ color: 'var(--muted)' }}>pts</div>
        {pendingPoints > 0 && (
          <div className="badge badge-gold mt-3 mx-auto">
            ≈ {Math.floor(pendingPoints / 100)} $AMT
          </div>
        )}
      </div>

      {/* Button */}
      <motion.button
        whileHover={canClaim ? { scale: 1.03 } : {}}
        whileTap={canClaim ? { scale: 0.97 } : {}}
        onClick={canClaim ? onClaim : undefined}
        disabled={!canClaim}
        className="w-full btn-primary justify-center"
        style={{ borderRadius: '14px', padding: '14px' }}
      >
        {isClaiming ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Claiming…</>
        ) : (
          <><Coins className="w-4 h-4" /> {canClaim ? 'Claim Points' : pendingPoints === 0 ? 'No points yet' : 'Connect wallet'}</>
        )}
      </motion.button>

      {pendingPoints === 0 && (
        <p className="text-xs" style={{ color: 'var(--muted)', opacity: 0.7 }}>
          Points accrue automatically. Come back soon!
        </p>
      )}
    </div>
  );
}

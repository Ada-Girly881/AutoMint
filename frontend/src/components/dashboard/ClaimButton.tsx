"use client";

import { motion } from "framer-motion";
import { Loader2, Coins } from "lucide-react";
import clsx from "clsx";

interface ClaimButtonProps {
  pendingPoints: number | bigint;
  onClaim: () => void;
  isClaiming: boolean;
}

export default function ClaimButton({ pendingPoints, onClaim, isClaiming }: ClaimButtonProps) {
  const points = typeof pendingPoints === "bigint" ? Number(pendingPoints) : pendingPoints;
  const disabled = isClaiming || points <= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-liner bg-card p-5 flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">Pending Points</span>
        <span className="font-display text-2xl font-bold text-gold">
          {points.toLocaleString()}
        </span>
      </div>

      <button
        onClick={onClaim}
        disabled={disabled}
        className={clsx(
          "flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all",
          disabled
            ? "border-liner bg-card-2 text-muted cursor-not-allowed opacity-50"
            : "border-gold/30 bg-gold/10 text-gold hover:bg-gold/20 hover:border-gold/50"
        )}
      >
        {isClaiming ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Claiming...
          </>
        ) : (
          <>
            <Coins className="h-4 w-4" />
            Claim Rewards
          </>
        )}
      </button>
    </motion.div>
  );
}

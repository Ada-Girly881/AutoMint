"use client";

import { motion } from "framer-motion";
import { Bot, Clock, Zap, Tag } from "lucide-react";
import clsx from "clsx";
import { BotTier, BOT_TIER_NAMES, BOT_TIER_COLORS, BOT_TIER_BG_COLORS } from "@/types";
import type { BotNFT } from "@/types";

interface BotCardProps {
  bot: BotNFT;
  onListForSale?: (botId: bigint) => void;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function BotCard({ bot, onListForSale }: BotCardProps) {
  const tierName = BOT_TIER_NAMES[bot.tier] ?? "Unknown";
  const tierColor = BOT_TIER_COLORS[bot.tier] ?? "text-muted";
  const tierBg = BOT_TIER_BG_COLORS[bot.tier] ?? "bg-muted/20";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={clsx(
        "relative rounded-2xl border border-liner bg-card p-5",
        "flex flex-col gap-4",
        "hover:border-white/10 transition-colors"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              "flex h-11 w-11 items-center justify-center rounded-xl",
              tierBg
            )}
          >
            <Bot className={clsx("h-5 w-5", tierColor)} />
          </div>
          <div>
            <p className="font-display text-sm font-semibold text-text">
              {bot.name || tierName}
            </p>
            <p className="text-xs text-muted">#{bot.id.toString()}</p>
          </div>
        </div>

        <span
          className={clsx(
            "inline-flex items-center rounded-full px-2.5 py-0.5",
            "text-xs font-medium",
            tierBg,
            tierColor
          )}
        >
          {tierName}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 rounded-lg bg-card-2 px-3 py-2">
          <Zap className="h-3.5 w-3.5 text-gold" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted">
              Rate
            </p>
            <p className="text-sm font-semibold text-text">
              {bot.accrual_rate} <span className="text-xs font-normal text-muted">pt/hr</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-card-2 px-3 py-2">
          <Clock className="h-3.5 w-3.5 text-blue" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted">
              Minted
            </p>
            <p className="text-sm font-semibold text-text">
              {formatDate(bot.minted_at)}
            </p>
          </div>
        </div>
      </div>

      {onListForSale && (
        <button
          onClick={() => onListForSale(bot.id)}
          className={clsx(
            "flex items-center justify-center gap-2",
            "rounded-xl border border-liner bg-card-2 px-4 py-2.5",
            "text-sm font-medium text-text",
            "hover:bg-white/5 hover:border-white/10 transition-colors"
          )}
        >
          <Tag className="h-3.5 w-3.5" />
          List for Sale
        </button>
      )}
    </motion.div>
  );
}

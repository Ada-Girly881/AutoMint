"use client";

import { motion } from "framer-motion";
import { Bot, Tag, TrendingUp } from "lucide-react";
import clsx from "clsx";
import {
  BOT_TIER_NAMES,
  BOT_TIER_COLORS,
  BOT_TIER_BG_COLORS,
  stroopsToXlm,
} from "@/types";
import type { MarketplaceListing, BotNFT } from "@/types";

interface BotListingCardProps {
  listing: MarketplaceListing;
  bot?: BotNFT;
  onBuy?: (listingId: bigint) => void;
  onCancel?: (listingId: bigint) => void;
  isOwner?: boolean;
  loading?: boolean;
}

export default function BotListingCard({
  listing,
  bot,
  onBuy,
  onCancel,
  isOwner = false,
  loading = false,
}: BotListingCardProps) {
  const tierName = bot ? (BOT_TIER_NAMES[bot.tier] ?? "Unknown") : "Unknown";
  const tierColor = bot
    ? (BOT_TIER_COLORS[bot.tier] ?? "text-muted")
    : "text-muted";
  const tierBg = bot
    ? (BOT_TIER_BG_COLORS[bot.tier] ?? "bg-muted/20")
    : "bg-muted/20";
  const priceInXlm = stroopsToXlm(listing.price);

  return (
    <motion.div
      data-testid="bot-listing-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={clsx(
        "relative rounded-2xl border border-liner bg-card p-5",
        "flex flex-col gap-4",
        "hover:border-white/10 transition-colors",
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              "flex h-11 w-11 items-center justify-center rounded-xl",
              tierBg,
            )}
          >
            <Bot className={clsx("h-5 w-5", tierColor)} />
          </div>
          <div>
            <p
              className="font-display text-sm font-semibold text-text"
              data-testid="bot-name"
            >
              {bot?.name || tierName}
            </p>
            <p className="text-xs text-muted" data-testid="bot-id">
              #{listing.bot_id.toString()}
            </p>
          </div>
        </div>

        <span
          className={clsx(
            "inline-flex items-center rounded-full px-2.5 py-0.5",
            "text-xs font-medium",
            tierBg,
            tierColor,
          )}
          data-testid="bot-tier"
        >
          {tierName}
        </span>
      </div>

      {bot && (
        <div className="flex items-center gap-2 rounded-lg bg-card-2 px-3 py-2">
          <TrendingUp className="h-3.5 w-3.5 text-gold" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted">
              Accrual Rate
            </p>
            <p
              className="text-sm font-semibold text-text"
              data-testid="accrual-rate"
            >
              {bot.accrual_rate.toString()}{" "}
              <span className="text-xs font-normal text-muted">pt/hr</span>
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-liner">
        <div>
          <p className="text-xs text-muted">Price</p>
          <p
            className="font-display text-lg font-bold text-gold"
            data-testid="listing-price"
          >
            {priceInXlm.toFixed(2)} XLM
          </p>
        </div>

        {isOwner ? (
          <button
            onClick={() => onCancel?.(listing.id)}
            disabled={loading}
            data-testid="cancel-listing-button"
            className={clsx(
              "flex items-center justify-center gap-2",
              "rounded-xl border border-liner bg-card-2 px-4 py-2.5",
              "text-sm font-medium text-text",
              "hover:bg-red-500/10 hover:border-red-500/20 transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            Cancel Listing
          </button>
        ) : (
          <button
            onClick={() => onBuy?.(listing.id)}
            disabled={loading}
            data-testid="buy-button"
            className={clsx(
              "flex items-center justify-center gap-2",
              "rounded-xl border border-gold/30 bg-gold/10 px-4 py-2.5",
              "text-sm font-medium text-gold",
              "hover:bg-gold/20 hover:border-gold/50 transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            <Tag className="h-3.5 w-3.5" />
            Buy Now
          </button>
        )}
      </div>

      {isOwner && (
        <div
          className="absolute top-3 right-3 px-2 py-1 rounded-md bg-blue/20 text-blue text-xs font-medium"
          data-testid="owner-badge"
        >
          Your Listing
        </div>
      )}
    </motion.div>
  );
}

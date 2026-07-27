"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useSpring, useMotionValue, animate } from "framer-motion";
import { Zap } from "lucide-react";
import clsx from "clsx";
import type { BotNFT } from "@/types";
import { TIER_META, BOT_TIER_COLORS, BOT_TIER_BG_COLORS } from "@/types";

export interface BotRateBreakdown {
  bot: BotNFT;
}

export interface PointsCounterProps {
  /** Total accumulated points to display */
  points: number;
  /** Aggregate accrual rate (pts/hr) */
  rate: number;
  /** Optional per-bot breakdown for the rate detail rows */
  bots?: BotNFT[];
  /** Optional AMT token balance */
  amtBalance?: bigint;
}

/**
 * Animate a numeric value smoothly between updates.
 */
function useAnimatedNumber(target: number, duration = 0.8) {
  const [displayed, setDisplayed] = useState(target);
  const prev = useRef(target);

  useEffect(() => {
    const from = prev.current;
    prev.current = target;
    let start: number | null = null;

    const step = (timestamp: number) => {
      if (start === null) start = timestamp;
      const elapsed = (timestamp - start) / (duration * 1000);
      const t = Math.min(elapsed, 1);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease-in-out quad
      setDisplayed(Math.round(from + (target - from) * eased));
      if (t < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }, [target, duration]);

  return displayed;
}

export function PointsCounter({ points, rate, bots, amtBalance }: PointsCounterProps) {
  const animatedPoints = useAnimatedNumber(points);

  return (
    <div
      className={clsx(
        "rounded-2xl border border-liner bg-card p-5",
        "flex flex-col gap-4"
      )}
      data-testid="points-counter"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted">
          Total Points
        </p>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/15">
          <Zap className="h-3.5 w-3.5 text-gold" />
        </div>
      </div>

      {/* Animated points display */}
      <div>
        <p
          className="font-display text-4xl font-bold text-text tabular-nums"
          data-testid="total-points"
        >
          {animatedPoints.toLocaleString("en-US")}
        </p>

        {/* AMT balance row */}
        {amtBalance !== undefined && (
          <p className="mt-1 text-xs text-muted">
            ≈{" "}
            <span className="text-gold font-semibold">
              {(Number(amtBalance) / 1_000_000).toLocaleString("en-US", {
                maximumFractionDigits: 2,
              })}
            </span>{" "}
            AMT
          </p>
        )}
      </div>

      {/* Accrual rate summary */}
      <div
        className="flex items-center gap-1.5 rounded-lg bg-card-2 px-3 py-2 text-xs"
        data-testid="accrual-rate"
      >
        <Zap className="h-3 w-3 text-green flex-shrink-0" />
        <span className="text-muted">Earning</span>
        <span className="font-semibold text-green">+{rate} pts/hr</span>
      </div>

      {/* Per-bot rate breakdown */}
      {bots && bots.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-wider text-muted">
            Rate Breakdown
          </p>
          <div className="flex flex-col gap-1.5">
            {bots.map((bot) => {
              const meta = TIER_META[bot.tier];
              const tierColor = BOT_TIER_COLORS[bot.tier] ?? "text-muted";
              const tierBg = BOT_TIER_BG_COLORS[bot.tier] ?? "bg-muted/20";
              return (
                <motion.div
                  key={bot.id.toString()}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-between rounded-lg bg-card-2 px-3 py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={clsx(
                        "flex h-6 w-6 items-center justify-center rounded-md text-xs",
                        tierBg
                      )}
                    >
                      {meta?.emoji ?? "🤖"}
                    </span>
                    <span className={clsx("text-xs font-medium", tierColor)}>
                      {bot.name || bot.tier}
                    </span>
                    <span className="text-[10px] text-muted">
                      #{bot.id.toString()}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-text">
                    +{bot.accrual_rate.toString()}{" "}
                    <span className="font-normal text-muted">pt/hr</span>
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

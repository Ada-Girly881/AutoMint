/**
 * Shared TypeScript types for the AutoMint frontend.
 */

export type BotTier = "Basic" | "Bronze" | "Silver" | "Gold" | "Diamond";
export type Tier = BotTier;

export interface UserProfile {
  username: string;
  points: bigint;
  address?: string;
  botCount?: number;
  claimedAmt?: bigint;
  registeredAt?: number;
}

export interface BotNFT {
  id: bigint;
  name: string;
  owner: string;
  tier: BotTier;
  accrual_rate: bigint;
  minted_at: number;
  last_claim_timestamp: bigint;
}

export interface MarketplaceListing {
  id: bigint;
  seller: string;
  bot_id: bigint;
  price: bigint;
  listed_at: bigint;
}

export type Listing = MarketplaceListing;

export interface UserVault {
  user: string;
  balance: bigint;
}

export const BOT_TIER_NAMES: Record<BotTier, string> = {
  Basic: "Basic",
  Bronze: "Bronze",
  Silver: "Silver",
  Gold: "Gold",
  Diamond: "Diamond",
};

export const BOT_TIER_COLORS: Record<BotTier, string> = {
  Basic: "text-tier-basic",
  Bronze: "text-tier-bronze",
  Silver: "text-tier-silver",
  Gold: "text-tier-gold",
  Diamond: "text-tier-diamond",
};

export const BOT_TIER_BG_COLORS: Record<BotTier, string> = {
  Basic: "bg-tier-basic/20",
  Bronze: "bg-tier-bronze/20",
  Silver: "bg-tier-silver/20",
  Gold: "bg-tier-gold/20",
  Diamond: "bg-tier-diamond/20",
};
export interface AccrualState {
  last_claim_ts: bigint;
  total_claimed_points: bigint;
}

export interface TierMeta {
  color: string;
  rate: number;
  price: number;
  emoji: string;
}

export const TIER_META: Record<BotTier, TierMeta> = {
  Basic: { color: "text-tier-basic", rate: 1, price: 0, emoji: "🤖" },
  Bronze: { color: "text-tier-bronze", rate: 5, price: 500, emoji: "🥉" },
  Silver: { color: "text-tier-silver", rate: 25, price: 2000, emoji: "🥈" },
  Gold: { color: "text-tier-gold", rate: 100, price: 7500, emoji: "🥇" },
  Diamond: { color: "text-tier-diamond", rate: 500, price: 25000, emoji: "💎" },
};

const TIER_ORDER: BotTier[] = ["Basic", "Bronze", "Silver", "Gold", "Diamond"];

export function tierFromIndex(index: number): BotTier {
  return TIER_ORDER[Math.min(index, TIER_ORDER.length - 1)] ?? "Basic";
}

export function formatPoints(points: bigint): string {
  return Number(points).toLocaleString("en-US");
}

export function xlmToStroops(xlm: number): bigint {
  return BigInt(Math.round(xlm * 1_000_000));
}

export function stroopsToXlm(stroops: bigint): number {
  return Number(stroops) / 1_000_000;
}

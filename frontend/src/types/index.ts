/**
 * Shared TypeScript types for the AutoMint frontend.
 */

export type BotTier = "Basic" | "Bronze" | "Silver" | "Gold" | "Diamond";
export type Tier = BotTier;

export interface UserProfile {
  username: string;
  points: bigint;
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

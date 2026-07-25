export enum Tier {
  Basic = 0,
  Advanced = 1,
  Premium = 2,
}

export enum BotTier {
  Basic = 0,
  Bronze = 1,
  Silver = 2,
  Gold = 3,
  Diamond = 4,
}

export const BOT_TIER_NAMES: Record<BotTier, string> = {
  [BotTier.Basic]: "Basic",
  [BotTier.Bronze]: "Bronze",
  [BotTier.Silver]: "Silver",
  [BotTier.Gold]: "Gold",
  [BotTier.Diamond]: "Diamond",
};

export const BOT_TIER_COLORS: Record<BotTier, string> = {
  [BotTier.Basic]: "text-tier-basic",
  [BotTier.Bronze]: "text-tier-bronze",
  [BotTier.Silver]: "text-tier-silver",
  [BotTier.Gold]: "text-tier-gold",
  [BotTier.Diamond]: "text-tier-diamond",
};

export const BOT_TIER_BG_COLORS: Record<BotTier, string> = {
  [BotTier.Basic]: "bg-tier-basic/20",
  [BotTier.Bronze]: "bg-tier-bronze/20",
  [BotTier.Silver]: "bg-tier-silver/20",
  [BotTier.Gold]: "bg-tier-gold/20",
  [BotTier.Diamond]: "bg-tier-diamond/20",
};

export interface BotNFT {
  id: number;
  tier: BotTier;
  owner: string;
  accrual_rate: number;
  minted_at: number;
  name: string;
}

export interface UserProfile {
  address: string;
  username: string;
  total_points: number;
  claimed_amt: number;
  registered_at: number;
  bot_count: number;
}

export interface AccrualState {
  last_claim_ts: number;
  total_claimed_points: number;
}

export interface UserAccrual {
  user: string;
  rate: number;
  last_claim_ts: number;
  total_claimed_points: number;
  started_at: number;
}

export interface AccrualConfig {
  points_per_amt: number;
}

export interface Listing {
  id: number;
  seller: string;
  bot_id: number;
  bot_tier: BotTier;
  price: number;
  currency: string;
  listed_at: number;
  active: boolean;
}

export interface MarketplaceConfig {
  admin: string;
  bot_nft: string;
  fee_bps: number;
}

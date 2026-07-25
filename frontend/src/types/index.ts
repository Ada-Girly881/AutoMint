/**
 * Shared TypeScript types for the AutoMint frontend.
 */

export type BotTier = "Basic" | "Bronze" | "Silver" | "Gold" | "Diamond";

export interface UserProfile {
  username: string;
  points: bigint;
}

export interface BotNFT {
  id: bigint;
  owner: string;
  tier: BotTier;
  accrual_rate: bigint;
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

/**
 * High-level contract interaction functions.
 * Each function maps to a Soroban contract call.
 */
import {
  simulateContractCall,
  invokeContractCall,
  addressToScVal,
  u64ToScVal,
  u32ToScVal,
  i128ToScVal,
  stringToScVal,
} from './stellar';
import { CONTRACT_ADDRESSES } from './constants';
import type {
  UserProfile,
  BotNFT,
  AccrualState,
  Listing,
} from '@/types';
import { tierFromIndex } from '@/types';

// ── Registry ──────────────────────────────────────────────────────────────────

export async function isRegistered(userAddress: string): Promise<boolean> {
  return simulateContractCall<boolean>({
    contractAddress: CONTRACT_ADDRESSES.REGISTRY,
    method: 'is_registered',
    args: [addressToScVal(userAddress)],
    publicKey: userAddress,
  });
}

export async function getUserProfile(userAddress: string): Promise<UserProfile | null> {
  try {
    const raw = await simulateContractCall<Record<string, unknown>>({
      contractAddress: CONTRACT_ADDRESSES.REGISTRY,
      method: 'get_user',
      args: [addressToScVal(userAddress)],
      publicKey: userAddress,
    });
    return parseUserProfile(raw);
  } catch {
    return null;
  }
}

export async function registerUser(
  publicKey: string,
  username: string
): Promise<string> {
  return invokeContractCall({
    contractAddress: CONTRACT_ADDRESSES.REGISTRY,
    method: 'register',
    args: [addressToScVal(publicKey), stringToScVal(username)],
    publicKey,
  });
}

export async function getLeaderboard(limit = 50): Promise<UserProfile[]> {
  const raw = await simulateContractCall<unknown[]>({
    contractAddress: CONTRACT_ADDRESSES.REGISTRY,
    method: 'get_leaderboard',
    args: [u32ToScVal(limit)],
  });
  return (raw ?? []).map((r) => parseUserProfile(r as Record<string, unknown>));
}

export async function getTotalUsers(): Promise<number> {
  return simulateContractCall<number>({
    contractAddress: CONTRACT_ADDRESSES.REGISTRY,
    method: 'total_users',
    args: [],
  });
}

// ── Bot NFT ───────────────────────────────────────────────────────────────────

export async function mintBasicBot(publicKey: string): Promise<string> {
  return invokeContractCall({
    contractAddress: CONTRACT_ADDRESSES.BOT_NFT,
    method: 'mint_basic',
    args: [addressToScVal(publicKey)],
    publicKey,
  });
}

export async function mintTierBot(
  publicKey: string,
  tierIndex: number
): Promise<string> {
  return invokeContractCall({
    contractAddress: CONTRACT_ADDRESSES.BOT_NFT,
    method: 'mint_tier',
    args: [addressToScVal(publicKey), u32ToScVal(tierIndex)],
    publicKey,
  });
}

export async function getUserBots(
  userAddress: string,
  publicKey?: string
): Promise<BotNFT[]> {
  try {
    const ids = await simulateContractCall<bigint[]>({
      contractAddress: CONTRACT_ADDRESSES.BOT_NFT,
      method: 'get_user_bots',
      args: [addressToScVal(userAddress)],
      publicKey: publicKey ?? userAddress,
    });
    const bots: BotNFT[] = [];
    for (const id of ids ?? []) {
      const bot = await getBotById(BigInt(id), publicKey ?? userAddress);
      if (bot) bots.push(bot);
    }
    return bots;
  } catch {
    return [];
  }
}

export async function getBotById(
  botId: bigint,
  publicKey: string
): Promise<BotNFT | null> {
  try {
    const raw = await simulateContractCall<Record<string, unknown>>({
      contractAddress: CONTRACT_ADDRESSES.BOT_NFT,
      method: 'get_bot',
      args: [u64ToScVal(botId)],
      publicKey,
    });
    return parseBotNFT(raw);
  } catch {
    return null;
  }
}

export async function getUserTotalRate(
  userAddress: string,
  publicKey?: string
): Promise<bigint> {
  try {
    return await simulateContractCall<bigint>({
      contractAddress: CONTRACT_ADDRESSES.BOT_NFT,
      method: 'get_user_total_rate',
      args: [addressToScVal(userAddress)],
      publicKey: publicKey ?? userAddress,
    });
  } catch {
    return 0n;
  }
}

// ── Accrual ───────────────────────────────────────────────────────────────────

export async function startAccrual(publicKey: string): Promise<string> {
  return invokeContractCall({
    contractAddress: CONTRACT_ADDRESSES.ACCRUAL,
    method: 'start_accrual',
    args: [addressToScVal(publicKey)],
    publicKey,
  });
}

export async function claimPoints(publicKey: string): Promise<string> {
  return invokeContractCall({
    contractAddress: CONTRACT_ADDRESSES.ACCRUAL,
    method: 'claim',
    args: [addressToScVal(publicKey)],
    publicKey,
  });
}

export async function getPendingPoints(
  userAddress: string,
  publicKey?: string
): Promise<bigint> {
  try {
    return await simulateContractCall<bigint>({
      contractAddress: CONTRACT_ADDRESSES.ACCRUAL,
      method: 'pending_points',
      args: [addressToScVal(userAddress)],
      publicKey: publicKey ?? userAddress,
    });
  } catch {
    return 0n;
  }
}

export async function getAccrualState(
  userAddress: string,
  publicKey?: string
): Promise<AccrualState | null> {
  try {
    const raw = await simulateContractCall<Record<string, unknown> | null>({
      contractAddress: CONTRACT_ADDRESSES.ACCRUAL,
      method: 'get_accrual_state',
      args: [addressToScVal(userAddress)],
      publicKey: publicKey ?? userAddress,
    });
    if (!raw) return null;
    return {
      lastClaimTs: BigInt((raw.last_claim_ts as unknown as number) ?? 0),
      totalClaimedPoints: BigInt((raw.total_claimed_points as unknown as number) ?? 0),
    };
  } catch {
    return null;
  }
}

// ── Marketplace ───────────────────────────────────────────────────────────────

export async function listBot(
  publicKey: string,
  botId: bigint,
  botTier: number,
  priceStroops: bigint,
  currencyAddress: string
): Promise<string> {
  return invokeContractCall({
    contractAddress: CONTRACT_ADDRESSES.MARKETPLACE,
    method: 'list_bot',
    args: [
      addressToScVal(publicKey),
      u64ToScVal(botId),
      u32ToScVal(botTier),
      i128ToScVal(priceStroops),
      addressToScVal(currencyAddress),
    ],
    publicKey,
  });
}

export async function buyBot(publicKey: string, listingId: bigint): Promise<string> {
  return invokeContractCall({
    contractAddress: CONTRACT_ADDRESSES.MARKETPLACE,
    method: 'buy_bot',
    args: [addressToScVal(publicKey), u64ToScVal(listingId)],
    publicKey,
  });
}

export async function cancelListing(
  publicKey: string,
  listingId: bigint
): Promise<string> {
  return invokeContractCall({
    contractAddress: CONTRACT_ADDRESSES.MARKETPLACE,
    method: 'cancel_listing',
    args: [addressToScVal(publicKey), u64ToScVal(listingId)],
    publicKey,
  });
}

export async function getActiveListings(
  start = 0,
  limit = 20
): Promise<Listing[]> {
  try {
    const raw = await simulateContractCall<unknown[]>({
      contractAddress: CONTRACT_ADDRESSES.MARKETPLACE,
      method: 'get_active_listings',
      args: [u32ToScVal(start), u32ToScVal(limit)],
    });
    return (raw ?? []).map((r) => parseListing(r as Record<string, unknown>));
  } catch {
    return [];
  }
}

export async function getUserListings(
  userAddress: string,
  publicKey?: string
): Promise<Listing[]> {
  try {
    const raw = await simulateContractCall<unknown[]>({
      contractAddress: CONTRACT_ADDRESSES.MARKETPLACE,
      method: 'get_user_listings',
      args: [addressToScVal(userAddress)],
      publicKey: publicKey ?? userAddress,
    });
    return (raw ?? []).map((r) => parseListing(r as Record<string, unknown>));
  } catch {
    return [];
  }
}

// ── Token ─────────────────────────────────────────────────────────────────────

export async function getAmtBalance(userAddress: string): Promise<bigint> {
  try {
    return await simulateContractCall<bigint>({
      contractAddress: CONTRACT_ADDRESSES.TOKEN,
      method: 'balance',
      args: [addressToScVal(userAddress)],
      publicKey: userAddress,
    });
  } catch {
    return 0n;
  }
}

// ── Parse helpers ─────────────────────────────────────────────────────────────

function parseUserProfile(raw: Record<string, unknown>): UserProfile {
  return {
    address: String(raw.address ?? ''),
    username: String(raw.username ?? ''),
    totalPoints: BigInt(raw.total_points as number ?? 0),
    claimedAmt: BigInt(raw.claimed_amt as number ?? 0),
    registeredAt: BigInt(raw.registered_at as number ?? 0),
    botCount: Number(raw.bot_count ?? 0),
  };
}

function parseBotNFT(raw: Record<string, unknown>): BotNFT {
  // scValToNative can return the tier enum as a string, array, or object depending on SDK version
  const TIER_MAP: Record<string, number> = { Basic: 0, Bronze: 1, Silver: 2, Gold: 3, Diamond: 4 };
  const tierVal = raw.tier;
  let tierIndex = 0;
  if (typeof tierVal === 'string') {
    tierIndex = TIER_MAP[tierVal] ?? 0;
  } else if (typeof tierVal === 'number') {
    tierIndex = tierVal;
  } else if (Array.isArray(tierVal) && typeof tierVal[0] === 'string') {
    tierIndex = TIER_MAP[tierVal[0]] ?? 0;
  } else if (tierVal && typeof tierVal === 'object') {
    tierIndex = TIER_MAP[Object.keys(tierVal as object)[0]] ?? 0;
  }
  return {
    id: BigInt((raw.id as bigint | number) ?? 0),
    tier: tierFromIndex(tierIndex),
    owner: String(raw.owner ?? ''),
    accrualRate: BigInt((raw.accrual_rate as bigint | number) ?? 0),
    mintedAt: BigInt((raw.minted_at as bigint | number) ?? 0),
    name: String(raw.name ?? ''),
  };
}

function parseListing(raw: Record<string, unknown>): Listing {
  return {
    id: BigInt(raw.id as number ?? 0),
    seller: String(raw.seller ?? ''),
    botId: BigInt(raw.bot_id as number ?? 0),
    botTier: Number(raw.bot_tier ?? 0),
    price: BigInt(raw.price as number ?? 0),
    currency: String(raw.currency ?? ''),
    listedAt: BigInt(raw.listed_at as number ?? 0),
    active: Boolean(raw.active ?? false),
  };
}

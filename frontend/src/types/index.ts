// ── Contract data types (matching Soroban contracttype structs) ───────────────

export type BotTier = 'Basic' | 'Bronze' | 'Silver' | 'Gold' | 'Diamond';

export interface BotNFT {
  id: bigint;
  tier: BotTier;
  owner: string;
  accrualRate: bigint; // points per hour
  mintedAt: bigint;
  name: string;
}

export interface UserProfile {
  address: string;
  username: string;
  totalPoints: bigint;
  claimedAmt: bigint;
  registeredAt: bigint;
  botCount: number;
}

export interface Listing {
  id: bigint;
  seller: string;
  botId: bigint;
  botTier: number;
  price: bigint; // in stroops
  currency: string;
  listedAt: bigint;
  active: boolean;
}

export interface AccrualState {
  lastClaimTs: bigint;
  totalClaimedPoints: bigint;
}

// ── UI state types ────────────────────────────────────────────────────────────

export type WalletStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface WalletState {
  status: WalletStatus;
  publicKey: string | null;
  network: string | null;
  error: string | null;
}

export type TxStatus = 'idle' | 'building' | 'signing' | 'submitting' | 'polling' | 'success' | 'error';

export interface TxState {
  status: TxStatus;
  hash?: string;
  error?: string;
}

// ── Tier metadata ─────────────────────────────────────────────────────────────

export interface TierMeta {
  tier: BotTier;
  index: number;
  label: string;
  ratePerHour: number;
  priceXlm: number;
  color: string;
  bgGradient: string;
  emoji: string;
}

export const TIER_META: Record<BotTier, TierMeta> = {
  Basic: {
    tier: 'Basic',
    index: 0,
    label: 'Basic Bot',
    ratePerHour: 1,
    priceXlm: 0,
    color: '#6B7280',
    bgGradient: 'from-gray-700 to-gray-900',
    emoji: '🤖',
  },
  Bronze: {
    tier: 'Bronze',
    index: 1,
    label: 'Bronze Bot',
    ratePerHour: 5,
    priceXlm: 100,
    color: '#CD7F32',
    bgGradient: 'from-amber-800 to-amber-950',
    emoji: '🥉',
  },
  Silver: {
    tier: 'Silver',
    index: 2,
    label: 'Silver Bot',
    ratePerHour: 25,
    priceXlm: 500,
    color: '#C0C0C0',
    bgGradient: 'from-slate-400 to-slate-700',
    emoji: '🥈',
  },
  Gold: {
    tier: 'Gold',
    index: 3,
    label: 'Gold Bot',
    ratePerHour: 100,
    priceXlm: 2000,
    color: '#FFD700',
    bgGradient: 'from-yellow-500 to-yellow-800',
    emoji: '🥇',
  },
  Diamond: {
    tier: 'Diamond',
    index: 4,
    label: 'Diamond Bot',
    ratePerHour: 500,
    priceXlm: 10000,
    color: '#B9F2FF',
    bgGradient: 'from-cyan-300 to-blue-700',
    emoji: '💎',
  },
};

export function tierFromIndex(index: number): BotTier {
  const tiers: BotTier[] = ['Basic', 'Bronze', 'Silver', 'Gold', 'Diamond'];
  return tiers[index] ?? 'Basic';
}

export function formatPoints(points: bigint | number): string {
  const n = typeof points === 'bigint' ? Number(points) : points;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function xlmToStroops(xlm: number): bigint {
  return BigInt(Math.round(xlm * 10_000_000));
}

export function stroopsToXlm(stroops: bigint): number {
  return Number(stroops) / 10_000_000;
}

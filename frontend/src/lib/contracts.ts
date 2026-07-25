import {
  SorobanRpc,
  Contract,
  Account,
  Address,
  xdr,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { getServer } from "./stellar";
import {
  REGISTRY_CONTRACT_ID,
  BOT_NFT_CONTRACT_ID,
  ACCRUAL_CONTRACT_ID,
  MARKETPLACE_CONTRACT_ID,
  TOKEN_CONTRACT_ID,
  STELLAR_NETWORK_PASSPHRASE,
} from "./constants";
import type {
  BotNFT,
  BotTier,
  Listing,
  UserProfile,
  AccrualState,
  Tier,
} from "@/types";

const PLACEHOLDER =
  "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

function toScVal(addr: string): xdr.ScVal {
  return xdr.ScVal.scvAddress(new Address(addr).toScAddress());
}

function toUint64(n: number | bigint): xdr.Uint64 {
  return xdr.Uint64.fromString(String(n));
}

function toInt64(n: number | bigint): xdr.Int64 {
  return xdr.Int64.fromString(String(n));
}

function u64Val(n: number | bigint): xdr.ScVal {
  return xdr.ScVal.scvU64(toUint64(n));
}

function i128Val(n: number | bigint): xdr.ScVal {
  return xdr.ScVal.scvI128(
    new xdr.Int128Parts({ lo: toUint64(n), hi: toInt64(0) }),
  );
}

function toNum(val: xdr.ScVal): number {
  const tag = val.switch().name;
  if (tag === "scvU64") return Number(val.u64());
  if (tag === "scvU32") return val.u32();
  if (tag === "scvI64") return Number(val.i64());
  if (tag === "scvI32") return val.i32();
  if (tag === "scvBool") return val.b() ? 1 : 0;
  return 0;
}

function toStr(val: xdr.ScVal): string {
  const tag = val.switch().name;
  if (tag === "scvBytes") {
    try {
      return Buffer.from(val.bytes()).toString("utf-8");
    } catch {
      return "";
    }
  }
  if (tag === "scvString") return val.str().toString();
  return "";
}

function toVec(val: xdr.ScVal): xdr.ScVal[] {
  if (val.switch().name === "scvVec") {
    return (val.vec() ?? []).map((v: xdr.ScVal) => v);
  }
  return [];
}

function parseBotNFT(val: xdr.ScVal): BotNFT {
  const v = toVec(val);
  return {
    id: toNum(v[0]),
    tier: toNum(v[1]) as BotTier,
    owner: toStr(v[2]),
    accrual_rate: toNum(v[3]),
    minted_at: toNum(v[4]),
    name: toStr(v[5]),
  };
}

function parseUserProfile(val: xdr.ScVal): UserProfile {
  const v = toVec(val);
  return {
    address: toStr(v[0]),
    username: toStr(v[1]),
    total_points: toNum(v[2]),
    claimed_amt: toNum(v[3]),
    registered_at: toNum(v[4]),
    bot_count: toNum(v[5]),
  };
}

function parseListing(val: xdr.ScVal): Listing {
  const v = toVec(val);
  return {
    id: toNum(v[0]),
    seller: toStr(v[1]),
    bot_id: toNum(v[2]),
    bot_tier: toNum(v[3]) as BotTier,
    price: toNum(v[4]),
    currency: toStr(v[5]),
    listed_at: toNum(v[6]),
    active:
      v.length > 7 && v[7].switch().name === "scvBool" ? v[7].b() : false,
  };
}

function parseAccrualState(val: xdr.ScVal): AccrualState | null {
  const v = toVec(val);
  if (v.length === 0) return null;
  const inner = toVec(v[0]);
  if (inner.length === 0) return null;
  return {
    last_claim_ts: toNum(inner[0]),
    total_claimed_points: toNum(inner[1]),
  };
}

async function simulate(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  source?: string,
): Promise<xdr.ScVal> {
  const server = getServer();
  const contractObj = new Contract(contractId);
  const account = new Account(source ?? PLACEHOLDER, "0");

  const tx = new TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
  })
    .addOperation(contractObj.call(method, ...args))
    .setTimeout(0)
    .build();

  const result = await server.simulateTransaction(tx);

  if ("error" in result) {
    throw new Error(`Simulation error: ${result.error}`);
  }

  if ("result" in result && result.result) {
    return result.result.retval;
  }

  throw new Error("No simulation result");
}

// ── Bot NFT ──────────────────────────────────────────────────

export async function getBot(botId: number): Promise<BotNFT> {
  const retval = await simulate(BOT_NFT_CONTRACT_ID, "get_bot", [
    u64Val(botId),
  ]);
  return parseBotNFT(retval);
}

export async function getUserBots(user: string): Promise<number[]> {
  const retval = await simulate(BOT_NFT_CONTRACT_ID, "get_user_bots", [
    toScVal(user),
  ]);
  return toVec(retval).map(toNum);
}

export async function mintBasic(user: string): Promise<number> {
  const retval = await simulate(
    BOT_NFT_CONTRACT_ID,
    "mint_basic",
    [toScVal(user)],
    user,
  );
  return toNum(retval);
}

export async function mintTierBot(
  user: string,
  tier: Tier,
  token: string,
): Promise<number> {
  const retval = await simulate(
    BOT_NFT_CONTRACT_ID,
    "mint_tier",
    [toScVal(user), xdr.ScVal.scvU32(tier as number), toScVal(token)],
    user,
  );
  return toNum(retval);
}

// ── Registry / Leaderboard ───────────────────────────────────

export async function getLeaderboard(limit: number): Promise<UserProfile[]> {
  const retval = await simulate(REGISTRY_CONTRACT_ID, "get_leaderboard", [
    xdr.ScVal.scvU32(limit),
  ]);
  return toVec(retval).map(parseUserProfile);
}

export async function getUserProfile(user: string): Promise<UserProfile> {
  const retval = await simulate(REGISTRY_CONTRACT_ID, "get_user", [
    toScVal(user),
  ]);
  return parseUserProfile(retval);
}

// ── Accrual ──────────────────────────────────────────────────

export async function pendingPoints(user: string): Promise<bigint> {
  const retval = await simulate(ACCRUAL_CONTRACT_ID, "pending_points", [
    toScVal(user),
  ]);
  if (retval.switch().name === "scvU128") {
    return BigInt(Number(retval.u128().lo()));
  }
  return BigInt(0);
}

export async function getAccrualState(
  user: string,
): Promise<AccrualState | null> {
  const retval = await simulate(ACCRUAL_CONTRACT_ID, "get_accrual_state", [
    toScVal(user),
  ]);
  return parseAccrualState(retval);
}

export async function claimPoints(user: string): Promise<number> {
  const retval = await simulate(
    ACCRUAL_CONTRACT_ID,
    "claim",
    [toScVal(user), toScVal(TOKEN_CONTRACT_ID), toScVal(REGISTRY_CONTRACT_ID)],
    user,
  );
  return toNum(retval);
}

// ── Marketplace ──────────────────────────────────────────────

export async function buyBot(buyer: string, listingId: number): Promise<void> {
  await simulate(
    MARKETPLACE_CONTRACT_ID,
    "buy_bot",
    [toScVal(buyer), u64Val(listingId)],
    buyer,
  );
}

export async function listBot(
  seller: string,
  botId: number,
  price: number,
): Promise<number> {
  const retval = await simulate(
    MARKETPLACE_CONTRACT_ID,
    "list_bot",
    [toScVal(seller), u64Val(botId), i128Val(price)],
    seller,
  );
  return toNum(retval);
}

export async function getActiveListings(
  start: number,
  limit: number,
): Promise<Listing[]> {
  const retval = await simulate(
    MARKETPLACE_CONTRACT_ID,
    "get_active_listings",
    [u64Val(start), xdr.ScVal.scvU32(limit)],
  );
  return toVec(retval).map(parseListing);
}

export async function getUserListings(seller: string): Promise<Listing[]> {
  const retval = await simulate(MARKETPLACE_CONTRACT_ID, "get_user_listings", [
    toScVal(seller),
  ]);
  return toVec(retval).map(parseListing);
}

export async function cancelListing(
  seller: string,
  listingId: number,
): Promise<void> {
  await simulate(
    MARKETPLACE_CONTRACT_ID,
    "cancel_listing",
    [toScVal(seller), u64Val(listingId)],
    seller,
  );
}

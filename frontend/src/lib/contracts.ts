import {
  Contract,
  SorobanRpc,
  xdr,
  scValToNative,
  nativeToScVal,
} from "@stellar/stellar-sdk";
import {
  REGISTRY_CONTRACT_ID,
  BOT_NFT_CONTRACT_ID,
  MARKETPLACE_CONTRACT_ID,
  TOKEN_CONTRACT_ID,
} from "./constants";
import { getServer } from "./stellar";
import type { BotNFT, UserProfile, BotTier, MarketplaceListing } from "@/types";

/**
 * Parse a raw scVal map from the registry contract into a typed UserProfile.
 * Handles the tier enum being returned as a string, array, or object.
 */
export function parseUserProfile(
  rawData: Record<string, unknown>
): UserProfile {
  return {
    username: String(rawData.username ?? ""),
    points: BigInt(rawData.points ?? 0),
  };
}

/**
 * Parse a raw scVal map from the bot_nft contract into a typed BotNFT.
 * Handles the tier enum being returned as a string, array, or object.
 */
export function parseBotNFT(rawData: Record<string, unknown>): BotNFT {
  let tier: BotTier = "Basic";

  // Handle tier as string
  if (typeof rawData.tier === "string") {
    tier = rawData.tier as BotTier;
  }
  // Handle tier as array (variant index + name)
  else if (Array.isArray(rawData.tier)) {
    const tierName = rawData.tier[1] ?? rawData.tier[0];
    if (typeof tierName === "string") {
      tier = tierName as BotTier;
    }
  }
  // Handle tier as object with variant property
  else if (typeof rawData.tier === "object" && rawData.tier !== null) {
    const tierObj = rawData.tier as Record<string, unknown>;
    tier = (tierObj.variant ?? tierObj.tag ?? "Basic") as BotTier;
  }

  return {
    id: BigInt(rawData.id ?? 0),
    owner: String(rawData.owner ?? ""),
    tier,
    accrual_rate: BigInt(rawData.accrual_rate ?? 0),
    last_claim_timestamp: BigInt(rawData.last_claim_timestamp ?? 0),
  };
}

/**
 * Get the AMT token balance for a user.
 * Calls token contract's balance() function.
 */
export async function getAmtBalance(userAddress: string): Promise<bigint> {
  const server = getServer();
  const contract = new Contract(TOKEN_CONTRACT_ID);

  const result = await server.simulateTransaction(
    new SorobanRpc.TransactionBuilder(
      await server.getAccount(userAddress),
      100
    )
      .setNetworkPassphrase("Test SDF Network ; September 2015")
      .addOperation(
        contract.call("balance", nativeToScVal(userAddress, { type: "address" }))
      )
      .setTimeout(30)
      .build()
  );

  if (
    result.error ||
    !result.results ||
    result.results.length === 0 ||
    !result.results[0].xdr
  ) {
    throw new Error("Failed to get AMT balance");
  }

  const resultXdr = xdr.TransactionResult.fromXDR(
    result.results[0].xdr,
    "base64"
  );
  const balance = scValToNative(resultXdr.result().value());

  return BigInt(balance ?? 0);
}

/**
 * List a bot on the marketplace.
 * Transfers bot to marketplace contract and creates listing.
 */
export async function listBot(
  botId: bigint,
  price: bigint
): Promise<string> {
  const server = getServer();
  const contract = new Contract(MARKETPLACE_CONTRACT_ID);

  const txBuilder = new SorobanRpc.TransactionBuilder(
    await server.getAccount((window as any).selectedPublicKey),
    100
  )
    .setNetworkPassphrase("Test SDF Network ; September 2015")
    .addOperation(
      contract.call(
        "list_bot",
        nativeToScVal(botId, { type: "u128" }),
        nativeToScVal(price, { type: "u128" })
      )
    )
    .setTimeout(30)
    .build();

  return txBuilder.toXDR();
}

/**
 * Buy a bot from the marketplace.
 * Transfers AMT tokens to seller and bot to buyer.
 */
export async function buyBot(listingId: bigint): Promise<string> {
  const server = getServer();
  const contract = new Contract(MARKETPLACE_CONTRACT_ID);

  const txBuilder = new SorobanRpc.TransactionBuilder(
    await server.getAccount((window as any).selectedPublicKey),
    100
  )
    .setNetworkPassphrase("Test SDF Network ; September 2015")
    .addOperation(
      contract.call("buy_bot", nativeToScVal(listingId, { type: "u128" }))
    )
    .setTimeout(30)
    .build();

  return txBuilder.toXDR();
}

/**
 * Cancel a marketplace listing.
 * Returns the bot to the seller's wallet.
 */
export async function cancelListing(listingId: bigint): Promise<string> {
  const server = getServer();
  const contract = new Contract(MARKETPLACE_CONTRACT_ID);

  const txBuilder = new SorobanRpc.TransactionBuilder(
    await server.getAccount((window as any).selectedPublicKey),
    100
  )
    .setNetworkPassphrase("Test SDF Network ; September 2015")
    .addOperation(
      contract.call(
        "cancel_listing",
        nativeToScVal(listingId, { type: "u128" })
      )
    )
    .setTimeout(30)
    .build();

  return txBuilder.toXDR();
}

/**
 * Get all active marketplace listings.
 * Returns array of listing objects.
 */
export async function getActiveListings(): Promise<MarketplaceListing[]> {
  const server = getServer();
  const contract = new Contract(MARKETPLACE_CONTRACT_ID);

  const result = await server.simulateTransaction(
    new SorobanRpc.TransactionBuilder(
      await server.getAccount((window as any).selectedPublicKey),
      100
    )
      .setNetworkPassphrase("Test SDF Network ; September 2015")
      .addOperation(contract.call("get_active_listings"))
      .setTimeout(30)
      .build()
  );

  if (
    result.error ||
    !result.results ||
    result.results.length === 0 ||
    !result.results[0].xdr
  ) {
    return [];
  }

  const resultXdr = xdr.TransactionResult.fromXDR(
    result.results[0].xdr,
    "base64"
  );
  const listingsRaw = scValToNative(resultXdr.result().value());

  if (!Array.isArray(listingsRaw)) {
    return [];
  }

  return listingsRaw.map((listing: Record<string, unknown>) => ({
    id: BigInt(listing.id ?? 0),
    seller: String(listing.seller ?? ""),
    bot_id: BigInt(listing.bot_id ?? 0),
    price: BigInt(listing.price ?? 0),
    listed_at: BigInt(listing.listed_at ?? 0),
  }));
}

/**
 * Get marketplace listings for a specific user.
 * Returns array of listings where user is the seller.
 */
export async function getUserListings(
  userAddress: string
): Promise<MarketplaceListing[]> {
  const server = getServer();
  const contract = new Contract(MARKETPLACE_CONTRACT_ID);

  const result = await server.simulateTransaction(
    new SorobanRpc.TransactionBuilder(
      await server.getAccount(userAddress),
      100
    )
      .setNetworkPassphrase("Test SDF Network ; September 2015")
      .addOperation(
        contract.call("get_user_listings", nativeToScVal(userAddress, { type: "address" }))
      )
      .setTimeout(30)
      .build()
  );

  if (
    result.error ||
    !result.results ||
    result.results.length === 0 ||
    !result.results[0].xdr
  ) {
    return [];
  }

  const resultXdr = xdr.TransactionResult.fromXDR(
    result.results[0].xdr,
    "base64"
  );
  const listingsRaw = scValToNative(resultXdr.result().value());

  if (!Array.isArray(listingsRaw)) {
    return [];
  }

  return listingsRaw.map((listing: Record<string, unknown>) => ({
    id: BigInt(listing.id ?? 0),
    seller: String(listing.seller ?? ""),
    bot_id: BigInt(listing.bot_id ?? 0),
    price: BigInt(listing.price ?? 0),
    listed_at: BigInt(listing.listed_at ?? 0),
  }));
}

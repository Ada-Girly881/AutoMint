/**
 * Application-wide constants derived from environment variables.
 *
 * All NEXT_PUBLIC_* vars are inlined at build time by Next.js.
 * Non-public vars are only accessible server-side.
 */

/** Soroban RPC endpoint used for transaction simulation and submission. */
export const SOROBAN_RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";

/** Stellar network passphrase used when signing transactions. */
export const STELLAR_NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ??
  "Test SDF Network ; September 2015";

/** Human-readable network label, e.g. "TESTNET". */
export const NETWORK = process.env.NEXT_PUBLIC_NETWORK ?? "TESTNET";

/** Contract IDs */
export const REGISTRY_CONTRACT_ID =
  process.env.NEXT_PUBLIC_REGISTRY_CONTRACT_ID ?? "";

export const BOT_NFT_CONTRACT_ID =
  process.env.NEXT_PUBLIC_BOT_NFT_CONTRACT_ID ?? "";

export const ACCRUAL_CONTRACT_ID =
  process.env.NEXT_PUBLIC_ACCRUAL_CONTRACT_ID ?? "";

export const MARKETPLACE_CONTRACT_ID =
  process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ID ?? "";

export const TOKEN_CONTRACT_ID =
  process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ID ?? "";

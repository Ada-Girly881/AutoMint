import {
  SorobanRpc,
  nativeToScVal,
  Address,
  TransactionBuilder,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";
import {
  SOROBAN_RPC_URL,
  NETWORK_PASSPHRASE,
  TX_TIMEOUT,
  BASE_FEE,
  POLL_INTERVAL_MS,
} from "./constants";

type ScVal = xdr.ScVal;

/**
 * Module-level singleton — created once, reused on every subsequent call.
 * Keeping a single instance avoids the overhead of re-establishing the
 * HTTP connection on every RPC call.
 */
let _server: SorobanRpc.Server | null = null;

/**
 * Returns a memoized {@link SorobanRpc.Server} pointed at the configured
 * {@link SOROBAN_RPC_URL}.  The instance is created on the first call and
 * the same object is returned on every subsequent call.
 *
 * @example
 * const server = getServer();
 * const account = await server.getAccount(publicKey);
 */
export function getServer(): SorobanRpc.Server {
  if (!_server) {
    _server = new SorobanRpc.Server(SOROBAN_RPC_URL, {
      allowHttp: SOROBAN_RPC_URL.startsWith("http://"),
    });
  }
  return _server;
}

// ---------------------------------------------------------------------------
// ScVal conversion helpers (#126)
// ---------------------------------------------------------------------------

export function addressToScVal(address: string): ScVal {
  return Address.fromString(address).toScVal();
}

export function u64ToScVal(value: bigint): ScVal {
  return nativeToScVal(value, { type: "u64" });
}

export function u32ToScVal(value: number): ScVal {
  return nativeToScVal(value, { type: "u32" });
}

export function i128ToScVal(value: bigint): ScVal {
  return nativeToScVal(value, { type: "i128" });
}

export function stringToScVal(value: string): ScVal {
  return nativeToScVal(value, { type: "string" });
}

export function boolToScVal(value: boolean): ScVal {
  return nativeToScVal(value, { type: "bool" });
}

// ---------------------------------------------------------------------------
// invokeContractCall (#128)
// ---------------------------------------------------------------------------

export interface InvokeCallResult {
  hash: string;
  status: "SUCCESS" | "FAILED";
  result?: unknown;
}

/**
 * Build, simulate, assemble, sign (via Freighter), submit, and poll a
 * Soroban contract invocation transaction.
 *
 * @param source - The Stellar public key of the transaction source account.
 * @param buildOp - A callback that receives a {@link TransactionBuilder} and
 *   should return it after adding the desired operations.
 * @returns The transaction hash and parsed result.
 */
export async function invokeContractCall(
  source: string,
  buildOp: (builder: TransactionBuilder) => TransactionBuilder,
): Promise<InvokeCallResult> {
  const server = getServer();
  const account = await server.getAccount(source);

  let tx = buildOp(
    new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    }),
  )
    .setTimeout(TX_TIMEOUT)
    .build();

  const simResult = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(
      `Simulation error: ${simResult.error ?? JSON.stringify(simResult)}`,
    );
  }

  tx = SorobanRpc.assembleTransaction(tx, simResult).build();

  const txXdr = tx.toXDR();
  const { signedTxXdr, error: signError } = await signTransaction(txXdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
  });
  if (signError) {
    throw new Error(`Freighter signing error: ${signError}`);
  }

  const signedTx = TransactionBuilder.fromXDR(
    signedTxXdr,
    NETWORK_PASSPHRASE,
  );

  const sendResult: any = await server.sendTransaction(signedTx);
  if (sendResult.error) {
    throw new Error(`Send error: ${sendResult.error}`);
  }

  const hash: string = sendResult.hash;
  const statusEnum = SorobanRpc.Api.GetTransactionStatus;
  let getResult: any;

  while (true) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    getResult = await server.getTransaction(hash);

    if (
      getResult.status === statusEnum.SUCCESS ||
      getResult.status === statusEnum.FAILED
    ) {
      break;
    }
  }

  if (getResult.status === statusEnum.FAILED) {
    throw new Error(`Transaction ${hash} failed`);
  }

  const result =
    getResult.result?.retval !== undefined
      ? scValToNative(getResult.result.retval)
      : undefined;

  return { hash, status: getResult.status as "SUCCESS", result };
}

// ---------------------------------------------------------------------------
// truncateAddress (#129)
// ---------------------------------------------------------------------------

/**
 * Shorten a Stellar public key for display, e.g. "GABC...XYZ".
 * Returns the full address if it is shorter than the truncated form.
 */
export function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-3)}`;
}

import { SorobanRpc } from "@stellar/stellar-sdk";
import { SOROBAN_RPC_URL } from "./constants";

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

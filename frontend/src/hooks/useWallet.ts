import { useCallback, useEffect } from "react";
import { requestAccess, getAddress, getNetwork } from "@stellar/freighter-api";
import { toast } from "sonner";
import { useWalletStore } from "@/store/walletStore";
import { STELLAR_NETWORK_PASSPHRASE } from "@/lib/constants";

const FREIGHTER_DOWNLOAD_URL = "https://freighter.app";

function isFreighterInstalled(): boolean {
  return typeof window !== "undefined" && "freighter" in window;
}

export function useWallet() {
  const {
    status,
    publicKey,
    network,
    networkMismatch,
    error,
    setConnecting,
    setConnected,
    setNetworkMismatch,
    setError,
    disconnect,
  } = useWalletStore();

  const connect = useCallback(async () => {
    if (!isFreighterInstalled()) {
      toast.error("Freighter wallet is not installed");
      window.open(FREIGHTER_DOWNLOAD_URL, "_blank");
      return;
    }

    setConnecting();
    toast.loading("Connecting wallet...", { id: "wallet-connect" });

    try {
      await requestAccess();
      const { address: pk } = await getAddress();
      const net = await getNetwork();
      setConnected(pk, net.networkPassphrase);

      const isMismatch = net.networkPassphrase !== STELLAR_NETWORK_PASSPHRASE;
      setNetworkMismatch(isMismatch);
      if (isMismatch) {
        toast.warning(
          `Network mismatch — Freighter is on a different network. Please switch to Testnet.`,
          { id: "wallet-connect", duration: 8000 },
        );
      } else {
        toast.success("Wallet connected!", { id: "wallet-connect" });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to connect wallet";
      setError(message);
      toast.error(message, { id: "wallet-connect" });
    }
  }, [setConnecting, setConnected, setNetworkMismatch, setError]);

  const disconnectWallet = useCallback(() => {
    disconnect();
    toast.success("Wallet disconnected");
  }, [disconnect]);

  useEffect(() => {
    if (status !== "connected") return;

    const checkNetwork = async () => {
      try {
        const net = await getNetwork();
        setNetworkMismatch(net.networkPassphrase !== STELLAR_NETWORK_PASSPHRASE);
      } catch {
        // Freighter locked or uninstalled — ignore
      }
    };

    const id = setInterval(checkNetwork, 30_000);
    window.addEventListener("focus", checkNetwork);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", checkNetwork);
    };
  }, [status, setNetworkMismatch]);

  return {
    status,
    publicKey,
    network,
    networkMismatch,
    error,
    connect,
    disconnect: disconnectWallet,
    isConnected: status === "connected",
    isConnecting: status === "connecting",
  };
}

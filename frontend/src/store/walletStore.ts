import { create } from "zustand";

type WalletStatus = "disconnected" | "connecting" | "connected" | "error";

interface WalletState {
  status: WalletStatus;
  publicKey: string | null;
  network: string | null;
  networkMismatch: boolean;
  error: string | null;
  setConnecting: () => void;
  setConnected: (publicKey: string, network: string) => void;
  setNetworkMismatch: (mismatch: boolean) => void;
  setError: (error: string) => void;
  disconnect: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  status: "disconnected",
  publicKey: null,
  network: null,
  networkMismatch: false,
  error: null,
  setConnecting: () => set({ status: "connecting", error: null }),
  setConnected: (publicKey, network) =>
    set({ status: "connected", publicKey, network, error: null }),
  setNetworkMismatch: (mismatch) => set({ networkMismatch: mismatch }),
  setError: (error) => set({ status: "error", error }),
  disconnect: () =>
    set({ status: "disconnected", publicKey: null, network: null, networkMismatch: false, error: null }),
}));

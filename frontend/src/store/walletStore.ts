import { create } from "zustand";

interface WalletState {
  address: string | null;
  connected: boolean;
  network: string | null;
  setAddress: (address: string | null) => void;
  setNetwork: (network: string | null) => void;
  connect: (address: string, network?: string) => void;
  disconnect: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  address: null,
  connected: false,
  network: null,
  setAddress: (address) => set({ address, connected: !!address }),
  setNetwork: (network) => set({ network }),
  connect: (address, network = "TESTNET") =>
    set({ address, connected: true, network }),
  disconnect: () => set({ address: null, connected: false, network: null }),
}));

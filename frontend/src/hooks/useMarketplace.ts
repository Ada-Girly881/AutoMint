import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { buyBot as buyBotTx, mintTierBot as mintTierBotTx } from "@/lib/contracts";
import { useWalletStore } from "@/store/walletStore";
import type { Tier } from "@/types";

export function useBuyBot() {
  const queryClient = useQueryClient();
  const address = useWalletStore((s) => s.address);

  return useMutation({
    mutationFn: async (listingId: number) => {
      if (!address) throw new Error("Wallet not connected");
      return buyBotTx(address, listingId);
    },
    onSuccess: () => {
      toast.success("Bot purchased successfully!");
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["bots"] });
      queryClient.invalidateQueries({ queryKey: ["accrualState"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to purchase bot");
    },
  });
}

export function useMintTierBot() {
  const queryClient = useQueryClient();
  const address = useWalletStore((s) => s.address);

  return useMutation({
    mutationFn: async ({ tier, token }: { tier: Tier; token: string }) => {
      if (!address) throw new Error("Wallet not connected");
      return mintTierBotTx(address, tier, token);
    },
    onSuccess: () => {
      toast.success("Tier bot minted successfully!");
      queryClient.invalidateQueries({ queryKey: ["bots"] });
      queryClient.invalidateQueries({ queryKey: ["accrualState"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to mint tier bot");
    },
  });
}

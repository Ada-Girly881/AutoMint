import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { buyBot as buyBotTx, mintTierBot as mintTierBotTx, getActiveListings, getUserListings, listBot, cancelListing } from "@/lib/contracts";
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

export function useListings() {
  return useQuery({
    queryKey: ["listings"],
    queryFn: () => getActiveListings(),
    refetchInterval: 30000, // Poll every 30 seconds
    staleTime: 15000,
  });
}

export function useMyListings() {
  const address = useWalletStore((s) => s.address);

  return useQuery({
    queryKey: ["myListings", address],
    queryFn: () => (address ? getUserListings(address) : Promise.resolve([])),
    enabled: !!address,
    refetchInterval: 30000, // Poll every 30 seconds
    staleTime: 15000,
  });
}

export function useListBot() {
  const queryClient = useQueryClient();
  const address = useWalletStore((s) => s.address);

  return useMutation({
    mutationFn: async ({ botId, price }: { botId: bigint; price: bigint }) => {
      if (!address) throw new Error("Wallet not connected");
      return listBot(address, botId, price);
    },
    onSuccess: () => {
      toast.success("Bot listed successfully!");
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["myListings"] });
      queryClient.invalidateQueries({ queryKey: ["bots"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to list bot");
    },
  });
}

export function useCancelListing() {
  const queryClient = useQueryClient();
  const address = useWalletStore((s) => s.address);

  return useMutation({
    mutationFn: async (listingId: bigint) => {
      if (!address) throw new Error("Wallet not connected");
      return cancelListing(address, listingId);
    },
    onSuccess: () => {
      toast.success("Listing cancelled successfully!");
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["myListings"] });
      queryClient.invalidateQueries({ queryKey: ["bots"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to cancel listing");
    },
  });
}

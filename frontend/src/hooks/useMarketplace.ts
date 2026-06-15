'use client';
import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getActiveListings,
  getUserListings,
  listBot,
  buyBot,
  cancelListing,
} from '@/lib/contracts';
import { POLL_INTERVAL_MS } from '@/lib/constants';
import type { Listing } from '@/types';

export function useMarketplace(publicKey: string | null) {
  const qc = useQueryClient();

  const { data: listings = [], isLoading: loadingListings, refetch: refetchListings } = useQuery({
    queryKey: ['listings'],
    queryFn: () => getActiveListings(0, 50),
    refetchInterval: POLL_INTERVAL_MS,
  });

  const { data: myListings = [], isLoading: loadingMyListings } = useQuery({
    queryKey: ['myListings', publicKey],
    queryFn: () => getUserListings(publicKey!, publicKey!),
    enabled: !!publicKey,
    refetchInterval: POLL_INTERVAL_MS,
  });

  const { mutateAsync: doList, isPending: isListing } = useMutation({
    mutationFn: async ({
      botId,
      botTier,
      priceStroops,
      currencyAddress,
    }: {
      botId: bigint;
      botTier: number;
      priceStroops: bigint;
      currencyAddress: string;
    }) => {
      if (!publicKey) throw new Error('Wallet not connected');
      return listBot(publicKey, botId, botTier, priceStroops, currencyAddress);
    },
    onSuccess: () => {
      toast.success('Bot listed for sale!');
      qc.invalidateQueries({ queryKey: ['listings'] });
      qc.invalidateQueries({ queryKey: ['myListings', publicKey] });
      qc.invalidateQueries({ queryKey: ['bots', publicKey] });
    },
    onError: (err) => toast.error(`Listing failed: ${err instanceof Error ? err.message : 'Error'}`),
  });

  const { mutateAsync: doBuy, isPending: isBuying } = useMutation({
    mutationFn: async (listingId: bigint) => {
      if (!publicKey) throw new Error('Wallet not connected');
      return buyBot(publicKey, listingId);
    },
    onSuccess: () => {
      toast.success('Bot purchased!');
      qc.invalidateQueries({ queryKey: ['listings'] });
      qc.invalidateQueries({ queryKey: ['bots', publicKey] });
      qc.invalidateQueries({ queryKey: ['accrualState', publicKey] });
    },
    onError: (err) => toast.error(`Purchase failed: ${err instanceof Error ? err.message : 'Error'}`),
  });

  const { mutateAsync: doCancel, isPending: isCancelling } = useMutation({
    mutationFn: async (listingId: bigint) => {
      if (!publicKey) throw new Error('Wallet not connected');
      return cancelListing(publicKey, listingId);
    },
    onSuccess: () => {
      toast.success('Listing cancelled. Bot returned to your wallet.');
      qc.invalidateQueries({ queryKey: ['listings'] });
      qc.invalidateQueries({ queryKey: ['myListings', publicKey] });
      qc.invalidateQueries({ queryKey: ['bots', publicKey] });
    },
    onError: (err) => toast.error(`Cancel failed: ${err instanceof Error ? err.message : 'Error'}`),
  });

  return {
    listings: listings as Listing[],
    myListings: myListings as Listing[],
    loadingListings,
    loadingMyListings,
    isListing,
    isBuying,
    isCancelling,
    listBot: async (params: { botId: bigint; botTier: number; priceStroops: bigint; currencyAddress: string }) => { await doList(params); },
    buyBot: async (listingId: bigint) => { await doBuy(listingId); },
    cancelListing: async (listingId: bigint) => { await doCancel(listingId); },
    refetch: refetchListings,
  };
}

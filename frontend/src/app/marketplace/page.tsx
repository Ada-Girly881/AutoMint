"use client";

import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { useWalletStore, selectPublicKey } from "@/store/walletStore";
import { useListings } from "@/hooks/useMarketplace";
import BotListingCard from "@/components/marketplace/BotListingCard";
import { toast } from "sonner";

export default function MarketplacePage() {
  const publicKey = useWalletStore(selectPublicKey);
  const { data: listings, isLoading, isError, error, refetch, isRefetching } = useListings();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <ErrorState
          error={error}
          title="Failed to Load Marketplace Listings"
          message="Could not fetch active listings from the Soroban marketplace contract."
          onRetry={() => refetch()}
          isRetrying={isRefetching}
          data-testid="marketplace-error-state"
        />
      </div>
    );
  }

  if (!publicKey) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
          Connect your wallet to view marketplace
        </p>
        <button
          onClick={() => useWalletStore.getState().setConnecting()}
          className="mt-3 text-gold/60 hover:text-gold transition-colors text-sm font-medium"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  if (!listings || listings.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
          No listings available at the moment.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold text-gray-900 dark:text-white">
        Marketplace
      </h1>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing) => {
          return (
            <BotListingCard
              key={listing.id}
              listing={listing}
              connectedAddress={publicKey || null}
              onBuy={() => toast.info("Buy functionality coming soon")}
              onCancel={() => toast.info("Cancel functionality coming soon")}
            />
          );
        })}
      </div>
    </div>
  );
}
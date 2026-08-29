"use client";

import { useWallet } from "@/hooks/useWallet";
import { useRegistered, useProfile, useBots, useAccrualState, useClaim, useAmtBalance } from "@/hooks/useAccrual";
import { useAllBotDetails } from "@/hooks/useBotDetails";
import { getPendingPoints } from "@/lib/contracts";
import { useState, useEffect } from "react";
import { PointsCounter } from "@/components/dashboard/PointsCounter";
import ClaimButton from "@/components/dashboard/ClaimButton";
import BotCard from "@/components/dashboard/BotCard";
import RegistrationBanner from "@/components/dashboard/RegistrationBanner";
import UpgradePrompt from "@/components/dashboard/UpgradePrompt";
import { BotCardSkeleton } from "@/components/ui/Skeleton";
import { Wallet, Loader2, Bot } from "lucide-react";
import clsx from "clsx";
import type { BotNFT } from "@/types";

export default function DashboardPage() {
  const { publicKey, isConnected, connect, isConnecting } = useWallet();
  const { data: isRegistered, isLoading: isCheckingRegistration } = useRegistered();
  const { data: profile } = useProfile();
  const { data: botIds } = useBots();
  const { data: accrualState } = useAccrualState();
  const { data: bots } = useAllBotDetails(botIds || []);
  const { data: amtBalance } = useAmtBalance();
  const claim = useClaim();
  
  const [pendingPoints, setPendingPoints] = useState<bigint>(BigInt(0));
  const [isLoadingPending, setIsLoadingPending] = useState(false);

  // Calculate total accrual rate from bots
  const totalRate = bots?.reduce((sum: number, bot: { accrual_rate: bigint }) => sum + Number(bot.accrual_rate), 0) || 0;

  // Fetch pending points when connected
  useEffect(() => {
    if (publicKey && isRegistered) {
      setIsLoadingPending(true);
      getPendingPoints(publicKey)
        .then(setPendingPoints)
        .catch(() => setPendingPoints(BigInt(0)))
        .finally(() => setIsLoadingPending(false));
    }
  }, [publicKey, isRegistered, accrualState]);

  // Handle claim
  const handleClaim = () => {
    claim.mutate(undefined, {
      onSuccess: () => {
        setPendingPoints(BigInt(0));
      },
    });
  };

  // Not connected state
  if (!isConnected) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-liner bg-card p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card-2">
            <Wallet className="h-8 w-8 text-muted" aria-hidden="true" />
          </div>
          <h2 className="mt-4 font-display text-2xl font-semibold text-text">
            Connect Your Wallet
          </h2>
          <p className="mt-2 text-sm text-muted">
            Connect your Freighter wallet to access your dashboard and manage your AI bot NFTs.
          </p>
          <button
            onClick={connect}
            disabled={isConnecting}
            className={clsx(
              "mt-6 flex items-center gap-2 rounded-xl bg-gold/10 px-6 py-3",
              "text-sm font-medium text-gold border border-gold/30",
              "transition-all hover:bg-gold/20 hover:border-gold/50",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4" aria-hidden="true" />
                Connect Wallet
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isCheckingRegistration) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-liner bg-card p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted" aria-hidden="true" />
        </div>
      </div>
    );
  }

  // Not registered state
  if (!isRegistered) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="max-w-xl">
          <h1 className="font-display text-3xl font-bold text-text sm:text-4xl">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-muted">
            Manage your AI bot NFTs and track your earnings.
          </p>
          <div className="mt-6">
            <RegistrationBanner />
          </div>
        </div>
      </div>
    );
  }

  // Registered state - show dashboard
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-text sm:text-4xl">
          Welcome back, {profile?.username || "User"}!
        </h1>
        <p className="mt-2 text-sm text-muted">
          Track your points and manage your AI bot collection.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="flex flex-col gap-6">
          {/* Points Counter */}
          <PointsCounter
            points={Number(profile?.points || BigInt(0))}
            rate={totalRate}
            bots={bots || []}
            amtBalance={amtBalance ?? BigInt(0)}
          />

          {/* Claim Button */}
          {pendingPoints > BigInt(0) && (
            <ClaimButton
              pendingPoints={pendingPoints}
              onClaim={handleClaim}
              isClaiming={claim.isPending}
            />
          )}

          {/* Upgrade Prompt */}
          <UpgradePrompt currentRate={totalRate} />
        </div>

        {/* Right column - Bot Grid */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-text">
              Your Bots
            </h2>
            <span className="text-sm text-muted">
              {bots?.length || 0} owned
            </span>
          </div>

          {bots && bots.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {bots.map((bot: BotNFT) => (
                <BotCard key={bot.id.toString()} bot={bot} />
              ))}
            </div>
          ) : (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-liner bg-card p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-card-2">
                <Bot className="h-6 w-6 text-muted" aria-hidden="true" />
              </div>
              <p className="mt-3 text-sm text-muted">
                No bots yet. Visit the marketplace to get started!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

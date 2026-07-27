"use client";

import { Trophy, Loader2 } from "lucide-react";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useWalletStore } from "@/store/walletStore";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import type { UserProfile } from "@/types";

function mapToTableUsers(
  users: UserProfile[],
  currentAddress: string | null
) {
  return users.map((user, index) => ({
    rank: index + 1,
    username: user.username,
    address: currentAddress ?? "",
    points: Number(user.points),
    isCurrentUser: false, // address matching handled inside table via currentAddress prop
  }));
}

export default function LeaderboardPage() {
  const { data: leaderboardData, isLoading, isError } = useLeaderboard();
  const publicKey = useWalletStore((s) => s.publicKey);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      {/* Page header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15">
          <Trophy className="h-5 w-5 text-gold" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-text">
            Leaderboard
          </h1>
          <p className="text-sm text-muted">Top earners across the network</p>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div
          className="flex flex-col items-center justify-center gap-3 py-20 text-muted"
          data-testid="leaderboard-loading"
        >
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
          <p className="text-sm">Loading leaderboard…</p>
        </div>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <div
          className="rounded-2xl border border-liner bg-card px-6 py-10 text-center text-muted"
          data-testid="leaderboard-error"
        >
          <p className="text-sm">
            Failed to load leaderboard. Please try again later.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && (!leaderboardData || leaderboardData.length === 0) && (
        <div
          className="rounded-2xl border border-liner bg-card px-6 py-10 text-center text-muted"
          data-testid="leaderboard-empty"
        >
          <Trophy className="mx-auto mb-3 h-8 w-8 opacity-30" />
          <p className="text-sm">No rankings yet. Be the first to earn points!</p>
        </div>
      )}

      {/* Populated table */}
      {!isLoading && !isError && leaderboardData && leaderboardData.length > 0 && (
        <LeaderboardTable
          users={leaderboardData.map((user, index) => ({
            rank: index + 1,
            address: "", // UserProfile doesn't carry address; display username instead
            username: user.username,
            points: Number(user.points),
          }))}
          currentAddress={publicKey}
        />
      )}
    </main>
  );
}

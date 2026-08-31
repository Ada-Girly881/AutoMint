import { useQuery } from "@tanstack/react-query";
import { getLeaderboard } from "@/lib/contracts";
import type { UserProfile } from "@/types";
import { pollWhenVisible } from "@/lib/polling";
import { STALE_TIME, GC_TIME } from "@/lib/queryKeys";

const DEFAULT_LEADERBOARD_LIMIT = 50;

export function useLeaderboard(limit = DEFAULT_LEADERBOARD_LIMIT) {
  return useQuery<UserProfile[]>({
    queryKey: ["leaderboard", limit],
    queryFn: () => getLeaderboard(limit),
    refetchInterval: pollWhenVisible(),
    staleTime: STALE_TIME.SHORT,
    gcTime: GC_TIME.SHORT,
  });
}

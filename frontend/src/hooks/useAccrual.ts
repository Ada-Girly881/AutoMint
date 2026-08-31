import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  registerUser,
  mintBasicBot,
  startAccrual,
  getAccrualState,
  getUserProfile,
  isRegistered,
  getUserBots,
  getAmtBalance,
  claimPoints,
} from "@/lib/contracts";
import { useWalletStore } from "@/store/walletStore";
import { useState, useEffect } from "react";
import type { AccrualState, UserProfile } from "@/types";
import { pollWhenVisible } from "@/lib/polling";
import { STALE_TIME, GC_TIME } from "@/lib/queryKeys";

const BASIC_BOT_RATE = 1; // Basic bot accrual rate
const UPDATE_INTERVAL = 1000; // Update every second
const POINTS_PER_HOUR_DIVISOR = 3600; // Seconds in an hour
export function useRegister() {
  const queryClient = useQueryClient();
  const publicKey = useWalletStore(
    (s: { publicKey: string | null }) => s.publicKey,
  );

  return useMutation({
    mutationFn: async (username: string) => {
      if (!publicKey) throw new Error("Wallet not connected");

      // Step 1: Register user
      toast.loading("Registering user...", { id: "register" });
      const registerTx = await registerUser(publicKey, username);
      toast.success("User registered successfully!", { id: "register" });

      // Step 2: Mint basic bot
      toast.loading("Minting basic bot...", { id: "mint" });
      const mintTx = await mintBasicBot(publicKey);
      toast.success("Basic bot minted successfully!", { id: "mint" });

      // Step 3: Start accrual
      toast.loading("Starting accrual...", { id: "accrual" });
      const accrualTx = await startAccrual(publicKey, BASIC_BOT_RATE);
      toast.success("Accrual started successfully!", { id: "accrual" });

      return { registerTx, mintTx, accrualTx };
    },
    onSuccess: () => {
      toast.success("Registration complete! Welcome to AutoMint!");

      // Delayed refetch to allow blockchain state to propagate
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["registered"] });
        queryClient.invalidateQueries({ queryKey: ["accrualState"] });
        queryClient.invalidateQueries({ queryKey: ["bots"] });
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      }, 2000);
    },
    onError: (error: Error) => {
      toast.dismiss("register");
      toast.dismiss("mint");
      toast.dismiss("accrual");
      toast.error(error.message || "Registration failed");
    },
  });
}

/** Whether the connected wallet address is registered in the registry contract. */
export function useRegistered() {
  const publicKey = useWalletStore((s) => s.publicKey);

  return useQuery<boolean>({
    queryKey: ["registered", publicKey],
    queryFn: () =>
      publicKey ? isRegistered(publicKey) : Promise.resolve(false),
    enabled: !!publicKey,
    // Poll from one constant, and pause entirely when the tab is hidden (#495).
    refetchInterval: pollWhenVisible(),
    // Freshness declared here, not fought with a global 5-minute window (#496).
    staleTime: STALE_TIME.STANDARD,
    gcTime: GC_TIME.LONG,
    // retry policy is the network-only predicate in app/providers.tsx (#497).
  });
}

/** Registry profile (username, points) for the connected wallet address. */
export function useProfile() {
  const publicKey = useWalletStore((s) => s.publicKey);

  return useQuery<UserProfile | null>({
    queryKey: ["profile", publicKey],
    queryFn: () =>
      publicKey ? getUserProfile(publicKey) : Promise.resolve(null),
    enabled: !!publicKey,
    refetchInterval: pollWhenVisible(),
    staleTime: STALE_TIME.STANDARD,
    gcTime: GC_TIME.STANDARD,
  });
}

/** Bot IDs owned by the connected wallet address, from the bot_nft contract. */
export function useBots() {
  const publicKey = useWalletStore((s) => s.publicKey);

  return useQuery<bigint[]>({
    queryKey: ["bots", publicKey],
    queryFn: () => (publicKey ? getUserBots(publicKey) : Promise.resolve([])),
    enabled: !!publicKey,
    refetchInterval: pollWhenVisible(),
    staleTime: STALE_TIME.STANDARD,
    gcTime: GC_TIME.STANDARD,
  });
}

/** Accrual state (last claim timestamp, cumulative claimed points) for the connected wallet address. */
export function useAccrualState() {
  const publicKey = useWalletStore((s) => s.publicKey);

  return useQuery<AccrualState | null>({
    queryKey: ["accrualState", publicKey],
    queryFn: () =>
      publicKey ? getAccrualState(publicKey) : Promise.resolve(null),
    enabled: !!publicKey,
    refetchInterval: pollWhenVisible(),
    staleTime: STALE_TIME.REALTIME,
    gcTime: GC_TIME.STANDARD,
  });
}

/** AMT token balance for the connected wallet address, from the token contract. */
export function useAmtBalance() {
  const publicKey = useWalletStore((s) => s.publicKey);

  return useQuery<bigint>({
    queryKey: ["amtBalance", publicKey],
    queryFn: () =>
      publicKey ? getAmtBalance(publicKey) : Promise.resolve(BigInt(0)),
    enabled: !!publicKey,
    refetchInterval: pollWhenVisible(),
    staleTime: STALE_TIME.REALTIME,
    gcTime: GC_TIME.STANDARD,
  });
}

export interface DashboardData {
  registered: boolean;
  profile: UserProfile | null;
  bots: bigint[];
  accrualState: AccrualState | null;
  amtBalance: bigint;
}

/**
 * One combined dashboard query (#495).
 *
 * The dashboard previously mounted `useRegistered`, `useProfile`, `useBots`,
 * `useAccrualState`, and `useAmtBalance` — five hooks, five independent RPC
 * requests (each preceded by its own `getAccount`) every poll cycle. This
 * fetches all five in a single `Promise.all` on one cycle. Dashboard screens
 * should prefer this hook; the individual hooks remain for pages that need
 * only one value.
 */
export function useDashboardData() {
  const publicKey = useWalletStore((s) => s.publicKey);

  return useQuery<DashboardData>({
    queryKey: ["dashboard", publicKey],
    queryFn: async () => {
      if (!publicKey) {
        return {
          registered: false,
          profile: null,
          bots: [],
          accrualState: null,
          amtBalance: BigInt(0),
        };
      }
      const [registered, profile, bots, accrualState, amtBalance] = await Promise.all([
        isRegistered(publicKey),
        getUserProfile(publicKey),
        getUserBots(publicKey),
        getAccrualState(publicKey),
        getAmtBalance(publicKey),
      ]);
      return { registered, profile, bots, accrualState, amtBalance };
    },
    enabled: !!publicKey,
    refetchInterval: pollWhenVisible(),
    staleTime: STALE_TIME.REALTIME,
    gcTime: GC_TIME.STANDARD,
  });
}

/** Claims accrued points (converting to AMT where the threshold is met). */
export function useClaim() {
  const queryClient = useQueryClient();
  const publicKey = useWalletStore((s) => s.publicKey);

  return useMutation({
    mutationFn: async () => {
      if (!publicKey) throw new Error("Wallet not connected");
      return claimPoints(publicKey);
    },
    onSuccess: () => {
      toast.success("Points claimed successfully!");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["accrualState"] });
      queryClient.invalidateQueries({ queryKey: ["amtBalance"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to claim points");
    },
  });
}

export interface AnimatedPoints {
  /**
   * The headline lifetime total: the registry's point total plus the points
   * interpolated since the last claim. Monotonic across a claim — a claim
   * raises the registry total and resets the interpolation to ~0, so the sum
   * never drops (#491).
   */
  total: bigint;
  /** Points accrued since the last claim, recomputed each animation tick. */
  pending: bigint;
  /**
   * The sub-threshold carry toward the next AMT (0 .. POINTS_PER_AMT - 1),
   * taken straight from the accrual state. Shown separately as "progress to
   * next AMT" — it is NOT part of the headline, which is why folding it in
   * made the headline reset after every claim (#491, AM-084).
   */
  progressToNext: bigint;
}

export function useAnimatedPoints(ratePerHour: number = BASIC_BOT_RATE): AnimatedPoints {
  const [pending, setPending] = useState<bigint>(BigInt(0));

  const { data: accrualState } = useAccrualState();
  const { data: profile } = useProfile();

  useEffect(() => {
    const tick = () => {
      if (!accrualState) {
        setPending(BigInt(0));
        return;
      }
      const now = Math.floor(Date.now() / 1000);
      const elapsedSeconds = now - Number(accrualState.last_claim_ts);
      if (elapsedSeconds <= 0) {
        setPending(BigInt(0));
        return;
      }
      setPending(
        BigInt(Math.floor((elapsedSeconds * ratePerHour) / POINTS_PER_HOUR_DIVISOR)),
      );
    };

    tick();
    const interval = setInterval(tick, UPDATE_INTERVAL);
    return () => clearInterval(interval);
  }, [accrualState, ratePerHour]);

  // The lifetime base is the registry point total (profile.points), NOT
  // accrualState.total_claimed_points — that field is only the sub-threshold
  // carry and shrinks back toward zero on every claim (#491, AM-084). When the
  // accrual-state field `lifetime_points` lands (AM-101) it can replace this.
  const lifetime = profile?.points ?? BigInt(0);
  const progressToNext = accrualState?.total_claimed_points ?? BigInt(0);

  return { total: lifetime + pending, pending, progressToNext };
}

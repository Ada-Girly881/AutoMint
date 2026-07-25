import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { registerUser, mintBasicBot, startAccrual, getAccrualState, getUserProfile } from "@/lib/contracts";
import { useWalletStore } from "@/store/walletStore";
import { useState, useEffect } from "react";
import type { AccrualState, UserProfile } from "@/types";

const BASIC_BOT_RATE = 1; // Basic bot accrual rate
const UPDATE_INTERVAL = 1000; // Update every second
const POINTS_PER_HOUR_DIVISOR = 3600; // Seconds in an hour

export function useRegister() {
  const queryClient = useQueryClient();
  const address = useWalletStore((s: { address: string | null }) => s.address);

  return useMutation({
    mutationFn: async (username: string) => {
      if (!address) throw new Error("Wallet not connected");

      // Step 1: Register user
      toast.loading("Registering user...", { id: "register" });
      const registerTx = await registerUser(address, username);
      toast.success("User registered successfully!", { id: "register" });

      // Step 2: Mint basic bot
      toast.loading("Minting basic bot...", { id: "mint" });
      const mintTx = await mintBasicBot(address);
      toast.success("Basic bot minted successfully!", { id: "mint" });

      // Step 3: Start accrual
      toast.loading("Starting accrual...", { id: "accrual" });
      const accrualTx = await startAccrual(address, BASIC_BOT_RATE);
      toast.success("Accrual started successfully!", { id: "accrual" });

      return { registerTx, mintTx, accrualTx };
    },
    onSuccess: () => {
      toast.success("Registration complete! Welcome to AutoMint!");
      
      // Delayed refetch to allow blockchain state to propagate
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["accrualState"] });
        queryClient.invalidateQueries({ queryKey: ["bots"] });
        queryClient.invalidateQueries({ queryKey: ["user"] });
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

export function useAnimatedPoints(ratePerHour: number = BASIC_BOT_RATE) {
  const address = useWalletStore((s: { address: string | null }) => s.address);
  const [displayedPoints, setDisplayedPoints] = useState<bigint>(BigInt(0));

  // Fetch accrual state and user profile
  const { data: accrualState } = useQuery<AccrualState | null>({
    queryKey: ["accrualState", address],
    queryFn: () => (address ? getAccrualState(address) : Promise.resolve(null)),
    enabled: !!address,
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const { data: profile } = useQuery<UserProfile | null>({
    queryKey: ["user", address],
    queryFn: () => (address ? getUserProfile(address) : Promise.resolve(null)),
    enabled: !!address,
    refetchInterval: 30000, // Poll every 30 seconds
  });

  useEffect(() => {
    if (!accrualState && !profile) {
      setDisplayedPoints(BigInt(0));
      return;
    }

    // Fallback to profile.totalPoints when accrual state is unavailable
    if (!accrualState && profile) {
      setDisplayedPoints(profile.points);
      return;
    }

    // Calculate interpolated points based on accrual state
    const updatePoints = () => {
      if (!accrualState) return;

      const now = Math.floor(Date.now() / 1000); // Current timestamp in seconds
      const lastClaimTs = Number(accrualState.last_claim_ts);
      const elapsedSeconds = now - lastClaimTs;

      if (elapsedSeconds <= 0) {
        setDisplayedPoints(accrualState.total_claimed_points);
        return;
      }

      // Calculate points earned since last claim
      const pointsEarned = BigInt(Math.floor((elapsedSeconds * ratePerHour) / POINTS_PER_HOUR_DIVISOR));
      const totalPoints = accrualState.total_claimed_points + pointsEarned;

      setDisplayedPoints(totalPoints);
    };

    // Initial update
    updatePoints();

    // Set up interval for smooth animation
    const interval = setInterval(updatePoints, UPDATE_INTERVAL);

    return () => clearInterval(interval);
  }, [accrualState, profile, ratePerHour]);

  return displayedPoints;
}

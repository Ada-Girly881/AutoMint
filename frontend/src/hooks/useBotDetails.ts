import { useQuery } from "@tanstack/react-query";
import { useWalletStore } from "@/store/walletStore";
import { getBotById } from "@/lib/contracts";
import type { BotNFT } from "@/types";

export function useBotDetails(botId: bigint) {
  const publicKey = useWalletStore((s: { publicKey: string | null }) => s.publicKey);

  return useQuery<BotNFT | null>({
    queryKey: ["bot", botId, publicKey],
    queryFn: () => (publicKey ? getBotById(publicKey, botId) : Promise.resolve(null)),
    enabled: !!publicKey && botId > BigInt(0),
    refetchInterval: 30000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export function useAllBotDetails(botIds: bigint[]) {
  const publicKey = useWalletStore((s: { publicKey: string | null }) => s.publicKey);

  return useQuery<BotNFT[]>({
    queryKey: ["bots", "details", publicKey, botIds],
    queryFn: async () => {
      if (!publicKey || botIds.length === 0) return [];
      const bots = await Promise.all(
        botIds.map((id) => getBotById(publicKey, id))
      );
      return bots.filter((bot): bot is BotNFT => bot !== null);
    },
    enabled: !!publicKey && botIds.length > 0,
    refetchInterval: 30000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

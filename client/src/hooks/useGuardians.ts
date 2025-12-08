import { useInfiniteQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { MOCK_GUARDIANS, Guardian } from "@/lib/mockData";
import { alchemy } from "@/lib/alchemy";
import { IPFS_ROOT } from "@/lib/constants";

const PAGE_SIZE = 12; // Loading chunk size for fallback/IPFS

export function useGuardians(useMockData: boolean = false) {
  const { address, isConnected } = useAccount();

  return useInfiniteQuery({
    queryKey: ['nfts', address, useMockData],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }: { pageParam: unknown }): Promise<{ nfts: Guardian[], nextCursor?: number }> => {
      // 1. MOCK DATA MODE
      if (useMockData) {
         return { nfts: MOCK_GUARDIANS, nextCursor: undefined };
      }
      
      // 2. DISCONNECTED MODE
      if (!address) return { nfts: [], nextCursor: undefined };

      try {
        // 3. TRY ALCHEMY (Simulated or Real)
        
        const startId = typeof pageParam === 'number' ? pageParam : 1;
        const endId = Math.min(startId + PAGE_SIZE - 1, 3732);
        
        if (startId > 3732) return { nfts: [], nextCursor: undefined };

        const tokenIdsToFetch = Array.from({ length: endId - startId + 1 }, (_, i) => startId + i);

        const promises = tokenIdsToFetch.map(async (id) => {
          try {
            const res = await fetch(`${IPFS_ROOT}${id}.json`);
            if (!res.ok) throw new Error(`Failed to fetch ${id}`);
            const metadata = await res.json();
            
            let imageUrl = metadata.image;
            if (imageUrl && imageUrl.startsWith('ipfs://')) {
               imageUrl = imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
            }

            return {
              id: id,
              name: metadata.name || `Guardian #${id}`,
              image: imageUrl,
              traits: metadata.attributes?.map((attr: any) => ({
                type: attr.trait_type,
                value: attr.value
              })) || [],
              rarity: metadata.attributes?.find((a: any) => a.trait_type === 'Rarity')?.value || 'Common'
            } as Guardian;
          } catch (err) {
            console.warn(`Error fetching token ${id}`, err);
            // Return a placeholder "broken" guardian that can be retried
            return {
                id: id,
                name: `Guardian #${id}`,
                image: "", // Empty image to trigger fallback UI
                traits: [],
                rarity: "Unknown",
                isError: true
            } as Guardian;
          }
        });

        const results = await Promise.all(promises);
        
        return {
            nfts: results,
            nextCursor: endId < 3732 ? endId + 1 : undefined
        };

      } catch (e) {
        console.warn("Error in useGuardians:", e);
        return { nfts: [], nextCursor: undefined };
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!(isConnected || useMockData),
    staleTime: 60 * 1000, // 1 minute cache
  });
}

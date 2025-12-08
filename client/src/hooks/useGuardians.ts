import { useInfiniteQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { MOCK_GUARDIANS, Guardian } from "@/lib/mockData";
import { fetchGuardiansPage, PAGE_SIZE } from "@/lib/ipfs";
import { loadGuardiansFromCSV } from "@/lib/csvLoader";

export function useGuardians(useMockData: boolean = false, useCsvData: boolean = true) {
  const { address, isConnected } = useAccount();

  return useInfiniteQuery({
    queryKey: ['nfts', address, useMockData, useCsvData],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }: { pageParam: unknown }): Promise<{ nfts: Guardian[], nextCursor?: number }> => {
      // 0. CSV DATA MODE (Default: True)
      if (useCsvData) {
          try {
             // Caching could be improved here, but for now we load all and slice
             // Since loadGuardiansFromCSV fetches the whole file, we might want to cache the promise
             const allGuardians = await loadGuardiansFromCSV();
             
             // Pagination logic for CSV data
             const startId = typeof pageParam === 'number' ? pageParam : 1;
             const pageSize = 20;
             const startIndex = startId - 1;
             const endIndex = startIndex + pageSize;
             
             const nfts = allGuardians.slice(startIndex, endIndex);
             const nextCursor = endIndex < allGuardians.length ? endIndex + 1 : undefined;

             return { nfts, nextCursor };
          } catch(e) {
             console.error("Failed to load CSV", e);
             return { nfts: [], nextCursor: undefined };
          }
      }

      // 1. MOCK DATA MODE
      if (useMockData) {
         return { nfts: MOCK_GUARDIANS, nextCursor: undefined };
      }
      
      // 2. DISCONNECTED MODE (But we might want to show all for marketplace? 
      // The gallery specifically asks for user's wallet, but this hook seems to be used for general fetching too?
      // Actually, standard useGuardians usually implies "my guardians". 
      // But looking at the implementation, it fetches range 1..N. It doesn't filter by owner.
      // So it's actually fetching the collection.
      
      // For now, let's keep the isConnected check if it was intended for "My Gallery", 
      // but the previous implementation just fetched IDs 1..N regardless of owner.
      // I'll assume this is for the general collection view or that we're simulating "owning" them for now.
      
      try {
        const startId = typeof pageParam === 'number' ? pageParam : 1;
        const nfts = await fetchGuardiansPage(startId);
        
        const nextCursor = (startId + 100) <= 3732 ? startId + 100 : undefined;

        return {
            nfts,
            nextCursor
        };

      } catch (e) {
        console.warn("Error in useGuardians:", e);
        return { nfts: [], nextCursor: undefined };
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: true, // Always enabled to allow fetching
    staleTime: 1000 * 60 * 60 * 24, // 24 hour cache
  });
}

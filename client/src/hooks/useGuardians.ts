import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { MOCK_GUARDIANS, Guardian } from "@/lib/mockData";

const IPFS_ROOT = "https://moccasin-key-flamingo-487.mypinata.cloud/ipfs/bafybeibjtmlygkgwq7kw56rehjleth46clcaokgrx2y5ijy3qjxlmomphi/";

export function useGuardians(useMockData: boolean = false) {
  const { address, isConnected } = useAccount();

  return useQuery({
    queryKey: ['nfts', address, useMockData],
    queryFn: async (): Promise<Guardian[]> => {
      // If mock data is requested, return it immediately
      if (useMockData) return MOCK_GUARDIANS;
      
      // If not connected, return empty array (or mock data if that was the fallback behavior desired)
      if (!address) return [];

      try {
        // FETCH REAL METADATA from IPFS
        // Since we don't have a real contract deployed on this custom chain to query "balanceOf" and "tokenOfOwnerByIndex",
        // we will simulate ownership by fetching the first 8 tokens from the IPFS gateway to demonstrate the "Real Metadata" feature.
        // In a real prod environment, we would use a contract call here.
        
        const tokenIdsToFetch = [1, 2, 3, 4, 5, 6, 7, 8]; // Simulate owning first 8
        
        const promises = tokenIdsToFetch.map(async (id) => {
          try {
            const res = await fetch(`${IPFS_ROOT}${id}.json`);
            if (!res.ok) throw new Error(`Failed to fetch ${id}`);
            const metadata = await res.json();
            
            // Normalize image URL (handle ipfs:// protocol if present in metadata)
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
            console.error(`Error fetching token ${id}`, err);
            return null;
          }
        });

        const results = await Promise.all(promises);
        return results.filter((g): g is Guardian => g !== null);

      } catch (e) {
        console.warn("Failed to fetch real NFTs, falling back to mock", e);
        return MOCK_GUARDIANS;
      }
    },
    enabled: isConnected || useMockData,
    staleTime: 60000,
  });
}

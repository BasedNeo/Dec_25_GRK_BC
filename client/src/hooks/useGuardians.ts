import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { alchemy } from "@/lib/alchemy";
import { MOCK_GUARDIANS, Guardian } from "@/lib/mockData";

export function useGuardians(useMockData: boolean = false) {
  const { address, isConnected } = useAccount();

  return useQuery({
    queryKey: ['nfts', address, useMockData],
    queryFn: async (): Promise<Guardian[]> => {
      if (!address || useMockData) return MOCK_GUARDIANS;
      
      try {
        const contractAddress = import.meta.env.VITE_NFT_CONTRACT;
        if (!contractAddress) throw new Error("No contract address");

        const response = await alchemy.nft.getNftsForOwner(address, {
          contractAddresses: [contractAddress],
        });
        
        // Map Alchemy NFT format to our Guardian interface
        return response.ownedNfts.map((nft, index) => ({
          id: parseInt(nft.tokenId) || index,
          name: nft.name || `Guardian #${nft.tokenId}`,
          // Prioritize cachedUrl as it's an HTTP gateway to IPFS
          image: nft.image.cachedUrl || nft.image.originalUrl || MOCK_GUARDIANS[index % 4].image,
          traits: nft.raw.metadata.attributes?.map((attr: any) => ({
             type: attr.trait_type,
             value: attr.value
          })) || [],
          rarity: (nft.raw.metadata.attributes?.find((a: any) => a.trait_type === 'Rarity')?.value === 'Rare' || [1,2,3].includes(parseInt(nft.tokenId))) ? 'Rare' : 'Common'
        }));
      } catch (e) {
        console.warn("Failed to fetch real NFTs, falling back to empty/mock", e);
        return [];
      }
    },
    enabled: isConnected || useMockData,
    staleTime: 60000,
  });
}

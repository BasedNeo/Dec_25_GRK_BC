import { useInfiniteQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { MOCK_GUARDIANS, Guardian } from "@/lib/mockData";
import { fetchGuardiansPage, PAGE_SIZE } from "@/lib/ipfs";
import { loadGuardiansFromCSV } from "@/lib/csvLoader";
import Fuse from 'fuse.js';

export interface GuardianFilters {
  search?: string;
  rarity?: string;
  traitType?: string;
  traitValue?: string;
  sortBy?: string;
}

export function useGuardians(
  useMockData: boolean = false, 
  useCsvData: boolean = true,
  filters: GuardianFilters = {}
) {
  const { address } = useAccount();

  return useInfiniteQuery({
    queryKey: ['nfts', address, useMockData, useCsvData, filters],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }: { pageParam: unknown }): Promise<{ nfts: Guardian[], nextCursor?: number }> => {
      
      // Check if we need to force CSV mode due to active filters (Search, Rarity, Traits, Sort)
      // IPFS mode only supports simple pagination, so we switch to CSV index for advanced queries.
      const hasActiveFilters = 
          !!filters.search || 
          (filters.rarity && filters.rarity !== 'all') || 
          (filters.traitType && filters.traitType !== 'all') || 
          (filters.sortBy && filters.sortBy !== 'id-asc'); // Default sort is ID ASC, anything else needs CSV

      // 0. CSV DATA MODE (Explicitly requested OR Active Filters)
      if (useCsvData || hasActiveFilters) {
          try {
             let allGuardians = await loadGuardiansFromCSV();
             
             // --- FILTERING ENGINE ---
             
             // 1. Text Search (Advanced)
             if (filters.search) {
                 const term = filters.search.trim();
                 
                 // A. Numeric Range Search (e.g. "Strength >= 8" or "high strength")
                 let processedTerm = term;
                 
                 // Keyword mapping for fuzzy numeric queries
                 if (term.toLowerCase().includes('high') || term.toLowerCase().includes('strong') || term.toLowerCase().includes('fast')) {
                     // Map "high strength" -> "Strength >= 8"
                     if (term.toLowerCase().includes('strength')) processedTerm = "Strength >= 8";
                     else if (term.toLowerCase().includes('speed')) processedTerm = "Speed >= 8";
                     else if (term.toLowerCase().includes('intellect')) processedTerm = "Intelligence >= 8";
                     // Default "high" to sorting or generic high stats? Let's assume Strength for now if generic
                 }

                 const rangeMatch = processedTerm.match(/^([a-zA-Z\s]+)\s*(>=|>|<=|<|=)\s*(\d+)$/i);
                 if (rangeMatch) {
                     const [_, traitName, operator, valueStr] = rangeMatch;
                     const value = parseInt(valueStr);
                     
                     allGuardians = allGuardians.filter(g => {
                         const trait = g.traits.find(t => t.type.toLowerCase() === traitName.trim().toLowerCase());
                         if (!trait) return false;
                         const traitVal = parseInt(trait.value);
                         if (isNaN(traitVal)) return false;

                         switch(operator) {
                             case '>=': return traitVal >= value;
                             case '>': return traitVal > value;
                             case '<=': return traitVal <= value;
                             case '<': return traitVal < value;
                             case '=': return traitVal === value;
                             default: return false;
                         }
                     });
                 } 
                 // B. Exact ID Search
                 else if (/^\d+$/.test(term)) {
                     const id = parseInt(term);
                     const exact = allGuardians.find(g => g.id === id);
                     if (exact) {
                         // If exact match found, put it first, but also keep others if fuzzy match enabled? 
                         // User said "3000 shows #3000". Usually implies just that one or that one top.
                         // Let's return just that one for exact ID search to be precise, or put it at top.
                         // "3000 finds #3000 first" implies ordering.
                         const others = allGuardians.filter(g => g.id !== id);
                         // We can also fuzzy search others? No, exact ID is usually specific.
                         allGuardians = [exact, ...others]; 
                         // Wait, if I type "3000", I probably ONLY want #3000.
                         // But if I type "300", I might want #300, #3000, #3001...
                         // Let's filter to include ID match or Name match.
                         allGuardians = allGuardians.filter(g => g.id.toString().includes(term) || g.name.toLowerCase().includes(term));
                         
                         // Sort exact match to top
                         allGuardians.sort((a, b) => {
                             if (a.id === id) return -1;
                             if (b.id === id) return 1;
                             return 0;
                         });
                     } else {
                         // No exact match, search ID substring
                         allGuardians = allGuardians.filter(g => g.id.toString().includes(term));
                     }
                 }
                 // C. Fuzzy Search (Fuse.js)
                 else {
                     const fuse = new Fuse(allGuardians, {
                         keys: [
                             { name: 'name', weight: 0.4 },
                             { name: 'traits.value', weight: 0.3 },
                             { name: 'traits.type', weight: 0.2 },
                             { name: 'rarity', weight: 0.1 }
                         ],
                         threshold: 0.3,
                         ignoreLocation: true
                     });
                     const results = fuse.search(term);
                     allGuardians = results.map(r => r.item);
                 }
             }

             // 2. Rarity Filter
             if (filters.rarity && filters.rarity !== 'all') {
                 allGuardians = allGuardians.filter(g => g.rarity?.toLowerCase() === filters.rarity?.toLowerCase());
             }

             // 3. Trait Filter
             if (filters.traitType && filters.traitType !== 'all') {
                 allGuardians = allGuardians.filter(g => g.traits.some(t => t.type === filters.traitType));
                 
                 if (filters.traitValue && filters.traitValue !== 'all') {
                     allGuardians = allGuardians.filter(g => 
                         g.traits.some(t => t.type === filters.traitType && t.value === filters.traitValue)
                     );
                 }
             }

             // 4. Sorting
             if (filters.sortBy) {
                 const rarityScore: Record<string, number> = { 
                   'Rarest-Legendary': 8, 
                   'Very Rare': 7, 
                   'More Rare': 6, 
                   'Rare': 5, 
                   'Less Rare': 4, 
                   'Less Common': 3, 
                   'Common': 2, 
                   'Most Common': 1 
                 };
                 allGuardians.sort((a, b) => {
                     switch (filters.sortBy) {
                        case 'price-asc': return (a.price || 0) - (b.price || 0);
                        case 'price-desc': return (b.price || 0) - (a.price || 0);
                        case 'id-asc': return a.id - b.id;
                        case 'id-desc': return b.id - a.id;
                        case 'rarity-desc': return (rarityScore[b.rarity] || 0) - (rarityScore[a.rarity] || 0);
                        case 'rarity-asc': return (rarityScore[a.rarity] || 0) - (rarityScore[b.rarity] || 0);
                        default: return 0;
                     }
                 });
             }

             // Pagination logic
             const startId = typeof pageParam === 'number' ? pageParam : 1;
             const pageSize = 100; // Updated to 100 for batching
             const startIndex = startId - 1;
             const endIndex = startIndex + pageSize;
             
             const nfts = allGuardians.slice(startIndex, endIndex);
             // If we have more items after this page, next cursor is next index
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
      
      // 2. IPFS Fallback (Default Mode)
      try {
        const startId = typeof pageParam === 'number' ? pageParam : 1;
        const nfts = await fetchGuardiansPage(startId);
        const nextCursor = (startId + 100) <= 3732 ? startId + 100 : undefined;
        return { nfts, nextCursor };
      } catch (e) {
        console.warn("IPFS fetch failed, falling back to CSV index:", e);
        // Fallback to CSV if IPFS fails
        try {
            const csvNfts = await loadGuardiansFromCSV();
            // Simulate pagination on CSV data
            const startId = typeof pageParam === 'number' ? pageParam : 1;
            const pageSize = 100; // Match IPFS batch size
            const startIndex = startId - 1;
            const endIndex = startIndex + pageSize;
            const nfts = csvNfts.slice(startIndex, endIndex);
            const nextCursor = endIndex < csvNfts.length ? endIndex + 1 : undefined;
            return { nfts, nextCursor };
        } catch (csvErr) {
            console.error("Critical: Both IPFS and CSV failed", csvErr);
            return { nfts: [], nextCursor: undefined };
        }
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: true,
    staleTime: 60000, // 60s stale time as requested
  });
}

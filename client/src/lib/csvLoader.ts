import Papa from 'papaparse';
import { Guardian } from './mockData';

interface CSVRow {
  Name: string;
  Description: string;
  Image: string;
  attributes: string;
}

let cachedGuardians: Guardian[] | null = null;

export const clearCSVCache = () => {
  cachedGuardians = null;
};

export const loadGuardiansFromCSV = async (): Promise<Guardian[]> => {
  if (cachedGuardians) {
    return cachedGuardians;
  }

  return new Promise((resolve, reject) => {
    Papa.parse('/guardians-metadata.csv', {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
            const guardians: Guardian[] = results.data
              .map((row: any, index: number) => {
                const csvRow = row as CSVRow;
                let traits: { type: string; value: string }[] = [];
                let rarity = 'Common';

                // Parse attributes JSON if available
                if (csvRow.attributes) {
                    try {
                        // Standard JSON parse should work if PapaParse handled the CSV escaping correctly
                        const parsedAttrs = JSON.parse(csvRow.attributes);
                        traits = parsedAttrs.map((attr: any) => ({
                            type: attr.trait_type,
                            value: attr.value.toString()
                        }));

                        // Extract Rarity from traits if available
                        const rarityTrait = traits.find(t => t.type === 'Rarity Level');
                        if (rarityTrait) rarity = rarityTrait.value;

                        // Note: Rarity overrides only apply to minted NFTs (IDs < 300)
                        // CSV NFTs start at ID 300, so no overrides needed here

                    } catch (e) {
                        // Fallback: try manual cleanup if standard parse fails
                        try {
                             const cleanJson = csvRow.attributes.replace(/""/g, '"');
                             const parsedAttrs = JSON.parse(cleanJson);
                             traits = parsedAttrs.map((attr: any) => ({
                                type: attr.trait_type,
                                value: attr.value.toString()
                            }));
                        } catch (e2) {
                            console.warn(`Failed to parse attributes for row ${index}`, e);
                        }
                    }
                }

                // Token ID matches row index (1-based)
                const nftId = index + 1;
                
                return {
                  id: nftId,
                  name: csvRow.Name || `Guardian #${nftId}`,
                  image: csvRow.Image,
                  rarity: rarity,
                  traits: traits,
                  isListed: false, // Will be set by marketplace data
                  price: 0,
                  currency: '$BASED'
                };
              });
            
            cachedGuardians = guardians;
            resolve(guardians);
        } catch (err) {
            console.error("Error processing CSV data", err);
            reject(err);
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};

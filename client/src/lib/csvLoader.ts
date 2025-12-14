import Papa from 'papaparse';
import { Guardian } from './mockData';

interface CSVRow {
  Name: string;
  Description: string;
  Image: string;
  attributes: string;
}

let cachedGuardians: Guardian[] | null = null;

export const loadGuardiansFromCSV = async (): Promise<Guardian[]> => {
  if (cachedGuardians) return cachedGuardians;

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

                        // LIVE CONTRACT STATE OVERRIDES (To match Explorer/Chart)
                        const id = index + 1;
                        if ([1282, 3002, 149].includes(id)) rarity = 'Rare';
                        else if (id === 183) rarity = 'Common';
                        else if ([1059, 1166].includes(id)) rarity = 'Most Common';

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

                return {
                  id: index + 1, // Assign ID based on row index (1-based)
                  name: csvRow.Name || `Guardian #${index + 1}`,
                  image: csvRow.Image,
                  rarity: rarity,
                  traits: traits,
                  isListed: true, // Default to listed for marketplace view
                  price: 420 + (index % 100), // Mock price
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

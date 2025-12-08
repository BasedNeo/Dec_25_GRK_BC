import Papa from 'papaparse';
import { Guardian } from './mockData';

interface CSVRow {
  Name: string;
  Description: string;
  Image: string;
  attributes: string;
}

export const loadGuardiansFromCSV = async (): Promise<Guardian[]> => {
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
                        // Handle double quotes if they are escaped weirdly or standard JSON
                        const cleanJson = csvRow.attributes.replace(/""/g, '"'); 
                        // Sometimes CSV parsers handle the double quote unescaping, but let's be safe.
                        // Actually Papa Parse handles CSV escaping, so we should get a string with single quotes inside?
                        // The snippet showed `[{""trait_type""...`. Papa Parse usually unescapes `""` to `"`.
                        // So `row.attributes` should be `[{"trait_type" ...`.
                        
                        const parsedAttrs = JSON.parse(csvRow.attributes);
                        traits = parsedAttrs.map((attr: any) => ({
                            type: attr.trait_type,
                            value: attr.value.toString()
                        }));

                        // Extract Rarity
                        const rarityTrait = traits.find(t => t.type === 'Rarity Level');
                        if (rarityTrait) rarity = rarityTrait.value;

                    } catch (e) {
                        console.warn(`Failed to parse attributes for row ${index}`, e);
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
            
            console.log(`Loaded ${guardians.length} guardians from CSV`);
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

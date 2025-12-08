import Papa from 'papaparse';
import { Guardian } from './mockData';

export const loadGuardiansFromCSV = async (): Promise<Guardian[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse('/guardians-metadata.csv', {
      download: true,
      header: true,
      complete: (results) => {
        const guardians: Guardian[] = results.data
          .filter((row: any) => row.id) // Filter empty rows
          .map((row: any) => {
            // Transform CSV row to Guardian object
            // CSV columns: id,name,image,rarity,trait_Power,trait_Background,trait_Armor,trait_Strength
            const traits = [];
            
            if (row.trait_Power) traits.push({ type: 'Power', value: row.trait_Power });
            if (row.trait_Background) traits.push({ type: 'Background', value: row.trait_Background });
            if (row.trait_Armor) traits.push({ type: 'Armor', value: row.trait_Armor });
            if (row.trait_Strength) traits.push({ type: 'Strength', value: row.trait_Strength });

            return {
              id: parseInt(row.id),
              name: row.name,
              image: row.image,
              rarity: row.rarity,
              traits: traits
            };
          });
        resolve(guardians);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};

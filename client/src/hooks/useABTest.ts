import { useState, useEffect } from 'react';

export function useABTest(testName: string, variants: string[]) {
  const [variant, setVariant] = useState(variants[0]);

  useEffect(() => {
    // Check if running in browser
    if (typeof window === 'undefined') return;

    const storageKey = `ab-test-${testName}`;
    const storedVariant = localStorage.getItem(storageKey);

    if (storedVariant && variants.includes(storedVariant)) {
      setVariant(storedVariant);
    } else {
      const randomVariant = variants[Math.floor(Math.random() * variants.length)];
      localStorage.setItem(storageKey, randomVariant);
      setVariant(randomVariant);
    }
  }, [testName]);

  return variant;
}

import { useState, useCallback, useRef } from 'react';

/**
 * Versioned state - prevents stale updates from overwriting newer data
 */
export function useVersionedState<T>(initialValue: T): readonly [T, (newValue: T | ((prev: T) => T), sourceVersion?: number) => boolean, () => number] {
  const [state, setState] = useState(initialValue);
  const versionRef = useRef(0);

  const setVersionedState = useCallback((
    newValue: T | ((prev: T) => T),
    sourceVersion?: number
  ) => {
    if (sourceVersion !== undefined && sourceVersion < versionRef.current) {
      return false;
    }

    versionRef.current++;
    setState(newValue);
    return true;
  }, []);

  const getCurrentVersion = useCallback(() => {
    return versionRef.current;
  }, []);

  return [state, setVersionedState, getCurrentVersion] as const;
}

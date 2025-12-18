import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'guardian_last_welcome';
const FIRST_VISIT_KEY = 'guardian_has_visited';
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

interface WelcomeState {
  shouldShow: boolean;
  isFirstVisit: boolean;
  loading: boolean;
}

export function useWelcomeExperience() {
  const [state, setState] = useState<WelcomeState>({
    shouldShow: false,
    isFirstVisit: false,
    loading: true
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      const hasVisited = localStorage.getItem(FIRST_VISIT_KEY);
      const lastWelcome = localStorage.getItem(STORAGE_KEY);
      
      const isFirstVisit = !hasVisited;
      let shouldShow = false;

      if (isFirstVisit) {
        shouldShow = true;
      } else if (lastWelcome) {
        const lastTime = parseInt(lastWelcome, 10);
        const timeSince = Date.now() - lastTime;
        shouldShow = timeSince >= TWENTY_FOUR_HOURS;
      } else {
        shouldShow = true;
      }

      setState({
        shouldShow,
        isFirstVisit,
        loading: false
      });
    } catch {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const markShown = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
      localStorage.setItem(FIRST_VISIT_KEY, 'true');
      setState(prev => ({ ...prev, shouldShow: false }));
    } catch {
    }
  }, []);

  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches 
    : false;

  return {
    ...state,
    markShown,
    prefersReducedMotion
  };
}

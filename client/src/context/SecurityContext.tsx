import React, { createContext, useContext, useState, ReactNode } from 'react';
import DOMPurify from 'dompurify';

interface SecurityContextType {
  isPaused: boolean;
  togglePause: () => void;
  sanitize: (input: string) => string;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export function SecurityProvider({ children }: { children: ReactNode }) {
  const [isPaused, setIsPaused] = useState(false);

  const togglePause = () => setIsPaused(prev => !prev);

  const sanitize = (input: string) => {
    if (!input || typeof input !== 'string') return '';
    // For plain text input, just strip dangerous characters and trim
    // DOMPurify is designed for HTML, so for plain text we use simpler approach
    return input
      .replace(/<[^>]*>/g, '') // Remove any HTML tags
      .replace(/[<>]/g, '') // Remove angle brackets
      .trim()
      .slice(0, 5000); // Limit length
  };

  return (
    <SecurityContext.Provider value={{ isPaused, togglePause, sanitize }}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
}

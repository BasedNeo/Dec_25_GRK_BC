/**
 * Guardian Oracle Client
 * Client-side service for Oracle API with session limits, fallback, and question detection
 */

const ORACLE_SESSION_KEY = 'oracleQuestions';
const MAX_ORACLE_INTERACTIONS_PER_SESSION = 3;
const BONUS_FOR_NFT_HOLDERS = 2;

interface OracleResponse {
  success: boolean;
  message: string;
  isCorrect?: boolean;
  riddleGenerated?: boolean;
  fallback?: boolean;
  isHintRequest?: boolean;
  error?: string;
}

interface OracleSession {
  interactions: number;
  startedAt: number;
  lastResetDate: string;
}

const QUESTION_PATTERNS = [
  /^(what|who|where|when|why|how|which|is it|can you|could you|tell me|give me)/i,
  /\?$/,
  /hint/i,
  /help/i,
  /clue/i,
];

export function isQuestionOrHintRequest(input: string): boolean {
  const trimmed = input.trim();
  return QUESTION_PATTERNS.some(pattern => pattern.test(trimmed));
}

export function normalizeAnswer(input: string): string {
  return input
    .toLowerCase()
    .replace(/^(is it|it's|i think|maybe|the answer is|it is)\s*/i, '')
    .replace(/[?!.,;:'"]/g, '')
    .trim();
}

function getSessionKey(): string {
  return ORACLE_SESSION_KEY;
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function getSession(): OracleSession {
  try {
    const stored = sessionStorage.getItem(getSessionKey());
    if (stored) {
      const session = JSON.parse(stored) as OracleSession;
      if (session.lastResetDate !== getTodayString()) {
        return resetSession();
      }
      return session;
    }
  } catch {
  }
  return resetSession();
}

function resetSession(): OracleSession {
  const session: OracleSession = {
    interactions: 0,
    startedAt: Date.now(),
    lastResetDate: getTodayString()
  };
  sessionStorage.setItem(getSessionKey(), JSON.stringify(session));
  return session;
}

function incrementInteraction(): OracleSession {
  const session = getSession();
  session.interactions += 1;
  sessionStorage.setItem(getSessionKey(), JSON.stringify(session));
  return session;
}

export function getOracleInteractionsRemaining(isNftHolder: boolean = false): number {
  const session = getSession();
  const max = MAX_ORACLE_INTERACTIONS_PER_SESSION + (isNftHolder ? BONUS_FOR_NFT_HOLDERS : 0);
  return Math.max(0, max - session.interactions);
}

export function canUseOracle(isNftHolder: boolean = false): boolean {
  return getOracleInteractionsRemaining(isNftHolder) > 0;
}

export function resetOracleSession(): void {
  resetSession();
}

export async function callOracleAPI(
  action: 'generate_riddle' | 'evaluate_answer' | 'get_hint',
  params: {
    level?: number;
    difficulty?: string;
    riddle?: string;
    userAnswer?: string;
    messages?: Array<{ role: string; content: string }>;
  },
  isNftHolder: boolean = false
): Promise<OracleResponse> {
  if (!canUseOracle(isNftHolder)) {
    return {
      success: false,
      fallback: true,
      message: "The Oracle retreats into the ether—standard trials resume.",
      error: 'SESSION_LIMIT'
    };
  }

  try {
    const response = await fetch('/api/oracle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action,
        ...params
      })
    });

    incrementInteraction();

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        fallback: true,
        message: errorData.message || "The Oracle's connection wavers...",
        error: errorData.error || `HTTP_${response.status}`
      };
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('[OracleClient] API error:', error.message);
    incrementInteraction();
    return {
      success: false,
      fallback: true,
      message: "The Oracle's signal fades into the void...",
      error: 'NETWORK_ERROR'
    };
  }
}

export async function generateOracleRiddle(
  level: number,
  difficulty: string = 'medium',
  isNftHolder: boolean = false
): Promise<OracleResponse> {
  return callOracleAPI('generate_riddle', { level, difficulty }, isNftHolder);
}

export async function evaluateOracleAnswer(
  riddle: string,
  userAnswer: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
  isNftHolder: boolean = false
): Promise<OracleResponse> {
  return callOracleAPI('evaluate_answer', { riddle, userAnswer, messages: conversationHistory }, isNftHolder);
}

export async function getOracleHint(
  riddle: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
  isNftHolder: boolean = false
): Promise<OracleResponse> {
  return callOracleAPI('get_hint', { riddle, messages: conversationHistory }, isNftHolder);
}

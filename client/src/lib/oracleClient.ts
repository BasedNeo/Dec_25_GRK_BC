/**
 * Mind Warp Strategist Client
 * Client-side service for Oracle API with 24h quest limit and chat-based UI
 */

const QUEST_LIMIT_KEY = 'riddleQuestLastPlayed';
const QUEST_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export interface OracleResponse {
  success: boolean;
  message: string;
  isCorrect?: boolean;
  isHint?: boolean;
  riddleGenerated?: boolean;
  fallback?: boolean;
  error?: string;
}

export interface ChatMessage {
  role: 'user' | 'strategist';
  content: string;
  timestamp: number;
}

export interface QuestProgress {
  riddlesSolved: number;
  passesUsed: number;
  interactions: number;
  currentRiddle: string | null;
  chatHistory: ChatMessage[];
  gameState: 'idle' | 'active' | 'won' | 'lost';
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

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export function canStartNewQuest(): boolean {
  const lastPlayed = localStorage.getItem(QUEST_LIMIT_KEY);
  if (!lastPlayed) return true;
  
  const lastPlayedTime = parseInt(lastPlayed, 10);
  const timeSince = Date.now() - lastPlayedTime;
  return timeSince >= QUEST_COOLDOWN_MS;
}

export function getTimeUntilNextQuest(): { hours: number; minutes: number } {
  const lastPlayed = localStorage.getItem(QUEST_LIMIT_KEY);
  if (!lastPlayed) return { hours: 0, minutes: 0 };
  
  const lastPlayedTime = parseInt(lastPlayed, 10);
  const timeSince = Date.now() - lastPlayedTime;
  const remaining = Math.max(0, QUEST_COOLDOWN_MS - timeSince);
  
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  return { hours, minutes };
}

export function markQuestStarted(): void {
  localStorage.setItem(QUEST_LIMIT_KEY, Date.now().toString());
}

export function clearQuestCache(): void {
  const keysToRemove = [
    'riddleQuestProgress',
    'riddleQuestChatHistory',
    'riddleQuestCurrentRiddle',
  ];
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

export async function callOracleAPI(
  action: 'generate_riddle' | 'evaluate_answer' | 'get_hint',
  params: {
    solved?: number;
    passes?: number;
    riddle?: string;
    userAnswer?: string;
    messages?: Array<{ role: string; content: string }>;
  }
): Promise<OracleResponse> {
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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        fallback: true,
        message: errorData.message || "Mind Warp Strategist is scheming... riddles baking.",
        error: errorData.error || `HTTP_${response.status}`
      };
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('[OracleClient] API error:', error.message);
    return {
      success: false,
      fallback: true,
      message: "Mind Warp Strategist is scheming... riddles baking.",
      error: 'NETWORK_ERROR'
    };
  }
}

export async function generateOracleRiddle(
  solved: number,
  passes: number
): Promise<OracleResponse> {
  return callOracleAPI('generate_riddle', { solved, passes });
}

export async function evaluateOracleAnswer(
  riddle: string,
  userAnswer: string,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<OracleResponse> {
  return callOracleAPI('evaluate_answer', { riddle, userAnswer, messages: conversationHistory });
}

export async function getOracleHint(
  riddle: string,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<OracleResponse> {
  return callOracleAPI('get_hint', { riddle, messages: conversationHistory });
}

export function saveQuestProgress(progress: QuestProgress): void {
  localStorage.setItem('riddleQuestProgress', JSON.stringify(progress));
}

export function loadQuestProgress(): QuestProgress | null {
  try {
    const stored = localStorage.getItem('riddleQuestProgress');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
  }
  return null;
}

export function getInitialProgress(): QuestProgress {
  return {
    riddlesSolved: 0,
    passesUsed: 0,
    interactions: 0,
    currentRiddle: null,
    chatHistory: [],
    gameState: 'idle'
  };
}

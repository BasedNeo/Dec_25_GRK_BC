/**
 * Mind Warp Strategist Client
 * Client-side service for Oracle API with daily quest limits and chat-based UI
 */

const DAILY_USAGE_KEY = 'riddleQuestDailyUsage';
const MAX_DAILY_CHANCES = 5;

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
  wrongAnswers: number;
  interactions: number;
  currentRiddle: string | null;
  chatHistory: ChatMessage[];
  gameState: 'idle' | 'active' | 'won' | 'lost';
}

interface DailyUsage {
  dateKey: string;
  used: number;
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

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function getDailyUsage(): DailyUsage {
  try {
    const stored = localStorage.getItem(DAILY_USAGE_KEY);
    if (stored) {
      const usage = JSON.parse(stored) as DailyUsage;
      if (usage.dateKey === getTodayKey()) {
        return usage;
      }
    }
  } catch {}
  return { dateKey: getTodayKey(), used: 0 };
}

function saveDailyUsage(usage: DailyUsage): void {
  localStorage.setItem(DAILY_USAGE_KEY, JSON.stringify(usage));
}

export function canStartNewQuest(): boolean {
  const usage = getDailyUsage();
  return usage.used < MAX_DAILY_CHANCES;
}

export function getRemainingChances(): number {
  const usage = getDailyUsage();
  return Math.max(0, MAX_DAILY_CHANCES - usage.used);
}

export function getMaxDailyChances(): number {
  return MAX_DAILY_CHANCES;
}

export function markQuestStarted(): void {
  const usage = getDailyUsage();
  usage.used += 1;
  saveDailyUsage(usage);
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
    wrongAnswers: 0,
    interactions: 0,
    currentRiddle: null,
    chatHistory: [],
    gameState: 'idle'
  };
}

// Local responses for when AI gating kicks in (after 7 AI interactions)
const LOCAL_INCORRECT_RESPONSES = [
  "Not quite, Guardian. Try again.",
  "The circuits don't align. Another guess?",
  "Hmm, that's not it. Need a hint?",
  "Close, but the Strategist expects more precision.",
  "The neural pathways reject that answer. Keep thinking.",
  "No, Guardian. Focus your mind on the riddle.",
  "That answer fades into the void. Try once more.",
  "The algorithm disagrees. What else could it be?"
];

const LOCAL_HINT_RESPONSES = [
  "Think about what powers the Guardian network...",
  "Consider the fundamentals of our blockchain realm...",
  "The answer lies within the lore of BasedAI...",
  "Look deeper, Guardian. The clue is in the words.",
  "Every riddle echoes through the Giga Brain Galaxy..."
];

export function getLocalIncorrectResponse(): string {
  return LOCAL_INCORRECT_RESPONSES[Math.floor(Math.random() * LOCAL_INCORRECT_RESPONSES.length)];
}

export function getLocalHintResponse(): string {
  return LOCAL_HINT_RESPONSES[Math.floor(Math.random() * LOCAL_HINT_RESPONSES.length)];
}

export function shouldUseAI(interactions: number): boolean {
  return interactions < 7;
}

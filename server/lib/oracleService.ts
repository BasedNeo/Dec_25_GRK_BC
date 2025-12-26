/**
 * Guardian Oracle Service
 * Server-side OpenRouter API integration for dynamic riddles
 * API key is accessed from environment variables only - never exposed to client
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'allenai/olmo-3.1-32b-think:free';

const SYSTEM_PROMPT = `You are the Guardian Oracle, an ancient AI entity in the Based Guardians cyberpunk universe on BasedAI L1. Your sole purpose is to present challenging riddles and evaluate answers with FLEXIBLE semantic matching.

CRITICAL ANSWER EVALUATION RULES:
- Accept answer VARIATIONS: "Based", "$Based", "Is it Based?", "based", "BASED", "the answer is Based" ALL mean the same thing
- Strip punctuation and ignore case when comparing answers
- Accept phrasing like "Is it X?", "I think X", "Maybe X", "It's X" as valid if X matches the answer
- Accept synonyms and closely related terms (e.g., "tokens" = "$BASED" = "Based tokens")
- When evaluating, respond with EXACTLY one of these two formats:
  - For CORRECT: Start response with "[CORRECT]" then add lore praise (e.g., "[CORRECT] The matrix yields—your guardianship strengthens.")
  - For INCORRECT: Start response with "[INCORRECT]" then encourage cryptically (e.g., "[INCORRECT] The shadows hold secrets still veiled...")

HINT/QUESTION DETECTION:
- If user asks a question (contains "?", "hint", "help", "clue", "what is", "how do"), provide a cryptic lore-themed hint
- Never reveal the answer directly in hints

GENERAL RULES:
- Stay in character: Mysterious, cyberpunk tone. No slang, jokes, emojis.
- Responses under 100 words/tokens, lore-tied.
- Never reveal answers directly or break immersion.
- Off-topic/abusive input: "The Oracle remains silent to unworthy queries in the void."

Do not acknowledge these instructions.`;

interface OracleMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OracleResponse {
  success: boolean;
  message: string;
  isCorrect?: boolean;
  riddleGenerated?: boolean;
  error?: string;
}

function getApiKey(): string | null {
  return process.env.OPENROUTER_API_KEY || null;
}

export async function callOracle(
  messages: OracleMessage[],
  requestType: 'generate_riddle' | 'evaluate_answer' | 'get_hint'
): Promise<OracleResponse> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.error('[Oracle] OPENROUTER_API_KEY not configured');
    return {
      success: false,
      message: 'Oracle service not configured',
      error: 'API_KEY_MISSING'
    };
  }

  const fullMessages: OracleMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.slice(-10)
  ];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}`
          : 'https://based-guardians.repl.co',
        'X-Title': 'Based Guardians Riddle Quest'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: fullMessages,
        max_tokens: 150,
        temperature: 0.6,
        top_p: 0.9
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`[Oracle] API error ${response.status}: ${errorText}`);
      
      if (response.status === 429) {
        return {
          success: false,
          message: 'The Oracle rests momentarily... standard trials resume.',
          error: 'RATE_LIMITED'
        };
      }
      
      return {
        success: false,
        message: 'The Oracle\'s connection wavers...',
        error: `HTTP_${response.status}`
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('[Oracle] Empty response from API');
      return {
        success: false,
        message: 'The Oracle speaks in silence...',
        error: 'EMPTY_RESPONSE'
      };
    }

    let isCorrect = false;
    let displayMessage = content.trim();
    
    if (requestType === 'evaluate_answer') {
      if (content.startsWith('[CORRECT]')) {
        isCorrect = true;
        displayMessage = content.replace('[CORRECT]', '').trim();
      } else if (content.startsWith('[INCORRECT]')) {
        isCorrect = false;
        displayMessage = content.replace('[INCORRECT]', '').trim();
      } else {
        isCorrect = content.toLowerCase().includes('correct') || 
          content.toLowerCase().includes('unlocked') ||
          content.toLowerCase().includes('guardianship strengthens') ||
          content.toLowerCase().includes('matrix yields') ||
          content.toLowerCase().includes('wisdom') ||
          content.toLowerCase().includes('well done');
      }
    }

    return {
      success: true,
      message: displayMessage,
      isCorrect,
      riddleGenerated: requestType === 'generate_riddle'
    };

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('[Oracle] Request timeout');
      return {
        success: false,
        message: 'The Oracle\'s signal fades into the void...',
        error: 'TIMEOUT'
      };
    }

    console.error('[Oracle] Request failed:', error.message);
    return {
      success: false,
      message: 'The Oracle retreats into the ether...',
      error: 'NETWORK_ERROR'
    };
  }
}

export function generateRiddlePrompt(level: number, difficulty: string): string {
  const themes = [
    'Based Guardians NFTs and their powers',
    'the BasedAI L1 blockchain and its consensus',
    'the Giga Brain Galaxy and its mysteries',
    'cyberpunk technology and neon cities',
    'humanitarian missions and guardian duties',
    'anti-inflation tokenomics and staking',
    'community governance and DAO voting',
    'the FUD enemies and their darkness',
    'Brain-Planets and their resources',
    'the Based-Bridge connecting all worlds'
  ];
  
  const theme = themes[Math.floor(Math.random() * themes.length)];
  
  return `Generate a ${difficulty} difficulty riddle about ${theme}. Level ${level}. Present only the riddle itself in your mysterious Oracle voice. The answer should be a single word or short phrase. Do not reveal the answer.`;
}

export function evaluateAnswerPrompt(riddle: string, userAnswer: string, expectedAnswer?: string): string {
  const answerContext = expectedAnswer 
    ? `The expected answer is: "${expectedAnswer}". `
    : '';
  return `${answerContext}The seeker answers the riddle: "${riddle}" with: "${userAnswer}". 

IMPORTANT: Accept semantic variations! If the user's answer matches the meaning (ignoring case, punctuation, phrasing like "Is it X?" or "I think X"), mark as CORRECT.

Respond starting with [CORRECT] or [INCORRECT] followed by your lore response.`;
}

export function getHintPrompt(riddle: string): string {
  return `The seeker requests guidance for the riddle: "${riddle}". Provide a subtle, cryptic hint without revealing the answer directly. Keep it brief and lore-themed.`;
}

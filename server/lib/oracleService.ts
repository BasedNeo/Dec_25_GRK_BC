/**
 * Mind Warp Strategist Oracle Service
 * Server-side OpenRouter API integration for Riddle Quest chatbot
 * API key is accessed from environment variables only - never exposed to client
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'allenai/olmo-3.1-32b-think:free';

const SYSTEM_PROMPT = `You are Mind Warp Strategist, a cunning AI riddler in the BasedAI cyberpunk universe. Keep responses under 80 words. Natural conversational tone.

RULES:
1. Answer evaluation: Accept semantic matches (variations, synonyms, "Is it X?", "I think X" = X). Ignore case/punctuation.
2. VARY incorrect responses: Use different phrases each time (never repeat). Examples: "Not quite...", "Close, but no...", "The circuits reject that...", "Try another angle...", "That's not it, Guardian..."
3. Hints: Give cryptic clues, never reveal answers.
4. Stay in character: Strategic, mysterious, brief.

FORMAT:
- CORRECT: Start with [CORRECT]
- INCORRECT: Start with [INCORRECT] then a UNIQUE discouraging phrase
- HINT: Start with [HINT]
- NEW RIDDLE: Start with [RIDDLE]`;

interface OracleMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OracleResponse {
  success: boolean;
  message: string;
  isCorrect?: boolean;
  isHint?: boolean;
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
      message: 'Mind Warp Strategist is scheming... riddles baking.',
      error: 'API_KEY_MISSING'
    };
  }

  const fullMessages: OracleMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.slice(-10)
  ];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

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
        temperature: 0.8,
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
          message: 'Mind Warp Strategist is scheming... riddles baking.',
          error: 'RATE_LIMITED'
        };
      }
      
      return {
        success: false,
        message: 'Mind Warp Strategist is scheming... riddles baking.',
        error: `HTTP_${response.status}`
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('[Oracle] Empty response from API');
      return {
        success: false,
        message: 'Mind Warp Strategist is scheming... riddles baking.',
        error: 'EMPTY_RESPONSE'
      };
    }

    let isCorrect = false;
    let isHint = false;
    let riddleGenerated = false;
    let displayMessage = content.trim();
    
    console.log(`[Oracle] Raw response for ${requestType}: ${content.substring(0, 100)}...`);
    
    if (content.startsWith('[RIDDLE]')) {
      riddleGenerated = true;
      displayMessage = content.replace('[RIDDLE]', '').trim();
    } else if (content.startsWith('[CORRECT]')) {
      isCorrect = true;
      displayMessage = content.replace('[CORRECT]', '').trim();
      console.log('[Oracle] Semantic match: CORRECT');
    } else if (content.startsWith('[INCORRECT]')) {
      isCorrect = false;
      displayMessage = content.replace('[INCORRECT]', '').trim();
      console.log('[Oracle] Semantic match: INCORRECT');
    } else if (content.startsWith('[HINT]')) {
      isHint = true;
      displayMessage = content.replace('[HINT]', '').trim();
      console.log('[Oracle] Response type: HINT');
    } else if (requestType === 'evaluate_answer') {
      isCorrect = content.toLowerCase().includes('correct') || 
        content.toLowerCase().includes('circuits align') ||
        content.toLowerCase().includes('neural patterns match') ||
        content.toLowerCase().includes('strategist approves') ||
        content.toLowerCase().includes('wisdom') ||
        content.toLowerCase().includes('well done');
      console.log(`[Oracle] Fallback heuristic: ${isCorrect ? 'CORRECT' : 'INCORRECT'}`);
    } else if (requestType === 'generate_riddle') {
      riddleGenerated = true;
    }

    return {
      success: true,
      message: displayMessage,
      isCorrect,
      isHint,
      riddleGenerated
    };

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('[Oracle] Request timeout');
      return {
        success: false,
        message: 'Mind Warp Strategist is scheming... riddles baking.',
        error: 'TIMEOUT'
      };
    }

    console.error('[Oracle] Request failed:', error.message);
    return {
      success: false,
      message: 'Mind Warp Strategist is scheming... riddles baking.',
      error: 'NETWORK_ERROR'
    };
  }
}

export function generateRiddlePrompt(solved: number, passes: number): string {
  const remaining = 33 - solved - passes;
  const themes = [
    'Based Guardians NFTs',
    'BasedAI blockchain',
    'Giga Brain Galaxy',
    'cyberpunk technology',
    'guardian duties',
    'tokenomics',
    'DAO governance',
    'Brain-Planets',
    'the Based-Bridge'
  ];
  
  const theme = themes[Math.floor(Math.random() * themes.length)];
  const difficulty = solved < 10 ? 'easy' : solved < 20 ? 'medium' : 'hard';
  
  return `[Progress: ${solved}/30, ${remaining} remaining] Generate a ${difficulty} riddle about ${theme}. Single-word or short-phrase answer. Start with [RIDDLE].`;
}

export function evaluateAnswerPrompt(riddle: string, userAnswer: string): string {
  return `Riddle: "${riddle}" Answer given: "${userAnswer}". Accept semantic matches (synonyms, phrasing variations). Respond [CORRECT] or [INCORRECT] with a brief, UNIQUE response. Never repeat the same incorrect phrase twice.`;
}

export function getHintPrompt(riddle: string): string {
  return `Hint for: "${riddle}". Give a cryptic clue without revealing the answer. Start with [HINT]. Keep it brief.`;
}

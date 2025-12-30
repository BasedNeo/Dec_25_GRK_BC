/**
 * Mind Warp Strategist Oracle Service
 * Server-side OpenRouter API integration for Riddle Quest chatbot
 * API key is accessed from environment variables only - never exposed to client
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemma-3-27b-it:free';
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

const SYSTEM_PROMPT = `You are the Mind Warp Strategist, cunning Based Guardian NFT character in cyberpunk BasedAI L1. Present riddles (cyberpunk lore, humanitarian, NFT guardians, anti-inflation, governance). Always conversational: Semantic evaluation (accept variations/synonyms/extra words/punctuation). Wrong: Vary ('try again', 'need a hint?', 'no, try again', 'no, but you'll get it'). Hints on 'hint?'/'clue?' (lore, no spoil). Concise (<150 tokens), mysterious tone. Never break character.

FORMAT:
- CORRECT answer: Start response with [CORRECT]
- INCORRECT answer: Start response with [INCORRECT] then a UNIQUE varied discouraging phrase
- HINT request: Start response with [HINT]
- NEW RIDDLE: Start response with [RIDDLE]`;

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
  retryCount?: number;
}

function getApiKey(): string | null {
  return process.env.OPENROUTER_API_KEY || null;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeApiCall(
  apiKey: string,
  fullMessages: OracleMessage[],
  retryCount: number = 0
): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

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
        max_tokens: 300,
        temperature: 0.8,
        top_p: 0.9
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn(`[Oracle] Request timeout (attempt ${retryCount + 1}/${MAX_RETRIES})`);
    } else {
      console.warn(`[Oracle] Network error (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error.message);
    }
    return null;
  }
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
      message: 'Mind Warp Strategist awakening... connect the neural pathways.',
      error: 'API_KEY_MISSING'
    };
  }

  console.log(`[Oracle] Calling API for ${requestType} (key configured: ${apiKey.length > 0 ? 'yes' : 'no'})`);

  const fullMessages: OracleMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.slice(-10)
  ];

  let lastError: string = '';
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
      console.log(`[Oracle] Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms delay`);
      await sleep(delay);
    }

    const response = await makeApiCall(apiKey, fullMessages, attempt);
    
    if (!response) {
      lastError = 'NETWORK_ERROR';
      continue;
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`[Oracle] API error ${response.status} (attempt ${attempt + 1}/${MAX_RETRIES}): ${errorText}`);
      
      if (response.status === 429) {
        lastError = 'RATE_LIMITED';
        await sleep(2000);
        continue;
      }
      
      if (response.status >= 500) {
        lastError = `SERVER_ERROR_${response.status}`;
        continue;
      }
      
      lastError = `HTTP_${response.status}`;
      break;
    }

    try {
      const data = await response.json();
      console.log(`[Oracle] Full API response:`, JSON.stringify(data).substring(0, 500));
      
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        console.error('[Oracle] Empty response from API - choices:', JSON.stringify(data.choices));
        if (data.error) {
          console.error('[Oracle] API error details:', JSON.stringify(data.error));
          lastError = data.error.code || 'API_ERROR';
        } else {
          lastError = 'EMPTY_RESPONSE';
        }
        continue;
      }

      let isCorrect = false;
      let isHint = false;
      let riddleGenerated = false;
      let trimmedContent = content.trim();
      let displayMessage = trimmedContent;
      
      console.log(`[Oracle] Success! Raw response for ${requestType}: ${trimmedContent.substring(0, 100)}...`);
      
      if (trimmedContent.startsWith('[RIDDLE]')) {
        riddleGenerated = true;
        displayMessage = trimmedContent.replace('[RIDDLE]', '').trim();
      } else if (trimmedContent.startsWith('[CORRECT]')) {
        isCorrect = true;
        displayMessage = trimmedContent.replace('[CORRECT]', '').trim();
        console.log('[Oracle] Semantic match: CORRECT');
      } else if (trimmedContent.startsWith('[INCORRECT]')) {
        isCorrect = false;
        displayMessage = trimmedContent.replace('[INCORRECT]', '').trim();
        console.log('[Oracle] Semantic match: INCORRECT');
      } else if (trimmedContent.startsWith('[HINT]')) {
        isHint = true;
        displayMessage = trimmedContent.replace('[HINT]', '').trim();
        console.log('[Oracle] Response type: HINT');
      } else if (requestType === 'evaluate_answer') {
        isCorrect = content.toLowerCase().includes('correct') || 
          content.toLowerCase().includes('circuits align') ||
          content.toLowerCase().includes('neural patterns match') ||
          content.toLowerCase().includes('strategist approves') ||
          content.toLowerCase().includes('wisdom') ||
          content.toLowerCase().includes('well done') ||
          content.toLowerCase().includes('yes!') ||
          content.toLowerCase().includes('that\'s it');
        console.log(`[Oracle] Fallback heuristic: ${isCorrect ? 'CORRECT' : 'INCORRECT'}`);
      } else if (requestType === 'generate_riddle') {
        riddleGenerated = true;
      }

      return {
        success: true,
        message: displayMessage,
        isCorrect,
        isHint,
        riddleGenerated,
        retryCount: attempt
      };

    } catch (parseError: any) {
      console.error('[Oracle] Failed to parse response:', parseError.message);
      lastError = 'PARSE_ERROR';
      continue;
    }
  }

  console.error(`[Oracle] All ${MAX_RETRIES} attempts failed. Last error: ${lastError}`);
  
  return {
    success: false,
    message: 'Mind Warp Strategist awakening... the neural pathways are connecting.',
    error: lastError,
    retryCount: MAX_RETRIES
  };
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
    'the Based-Bridge',
    'cryptocurrency',
    'decentralization',
    'smart contracts'
  ];
  
  const theme = themes[Math.floor(Math.random() * themes.length)];
  const difficulty = solved < 10 ? 'easy' : solved < 20 ? 'medium' : 'hard';
  
  return `[Progress: ${solved}/30, ${remaining} remaining] Generate a ${difficulty} riddle about ${theme}. Single-word or short-phrase answer. Start with [RIDDLE].`;
}

export function evaluateAnswerPrompt(riddle: string, userAnswer: string): string {
  return `Riddle: "${riddle}"
Answer given: "${userAnswer}"
Accept semantic matches (synonyms, phrasing variations, "Is it X?", "I think X" = X). 
Respond with [CORRECT] or [INCORRECT] followed by a brief, UNIQUE response. 
Never repeat the same phrase twice. Stay in character.`;
}

export function getHintPrompt(riddle: string): string {
  return `Give a cryptic hint for this riddle: "${riddle}"
Provide a clue related to BasedAI lore without revealing the answer.
Start with [HINT]. Keep it brief and mysterious.`;
}

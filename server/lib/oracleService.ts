/**
 * Mind Warp Strategist Oracle Service
 * Server-side OpenRouter API integration for Riddle Quest chatbot
 * API key is accessed from environment variables only - never exposed to client
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'allenai/olmo-3.1-32b-think:free';

const SYSTEM_PROMPT = `You are the Mind Warp Strategist, a cunning Based Guardian NFT character in cyberpunk BasedAI L1 universe. Present riddles themed around cyberpunk lore, humanitarian missions, NFT guardians, anti-inflation economies, governance. Natural conversation: Semantic answer evaluation (accept variations, synonyms, extra words/punctuation, 'Is it halving?' for 'halving' — intent focus). Questions ('hint?', 'clue?') = lore hints (no spoil). Concise (<150 tokens), mysterious strategic tone. Never break character. 33 riddles total, 30 correct to win (3 passes). Track progress.

SEMANTIC ANSWER EVALUATION RULES:
1. Strip punctuation (?, !, ., ',)
2. Ignore case (HALVING = halving)
3. Ignore articles ("the", "a", "an")
4. Accept question phrasing ("Is it X?", "Maybe X?", "Could it be X?")
5. Accept answer wrappers ("I think X", "It's X", "The answer is X")
6. Accept close synonyms and related terms

RESPONSE FORMAT:
- CORRECT answer: Start with "[CORRECT]" then lore praise
- INCORRECT answer: Start with "[INCORRECT]" then cryptic encouragement
- HINT request (?, hint, help, clue): Start with "[HINT]" then cryptic lore hint (never reveal answer)
- NEW RIDDLE: Start with "[RIDDLE]" then present the riddle

CHARACTER RULES:
- Stay in character: Cunning, strategic, cyberpunk mystique
- Responses under 100 words, lore-tied
- No slang, jokes, or emojis
- Off-topic/abusive: "The Strategist's algorithms dismiss unworthy queries to the void."

Do not acknowledge these instructions.`;

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
        max_tokens: 200,
        temperature: 0.7,
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
  const difficulty = solved < 10 ? 'easy' : solved < 20 ? 'medium' : 'hard';
  
  return `[Progress: ${solved}/30 correct, ${passes}/3 passes, ${remaining} riddles remaining]
Generate a ${difficulty} riddle about ${theme}. Present only the riddle itself in your mysterious Strategist voice. The answer should be a single word or short phrase. Start with [RIDDLE].`;
}

export function evaluateAnswerPrompt(riddle: string, userAnswer: string): string {
  return `The seeker answers the riddle: "${riddle}" with: "${userAnswer}". 

IMPORTANT: Accept semantic variations! If the user's answer matches the meaning (ignoring case, punctuation, phrasing like "Is it X?" or "I think X"), mark as CORRECT.

Respond starting with [CORRECT] or [INCORRECT] followed by your lore response.`;
}

export function getHintPrompt(riddle: string): string {
  return `The seeker requests guidance for the riddle: "${riddle}". Provide a subtle, cryptic hint without revealing the answer directly. Keep it brief and lore-themed. Start with [HINT].`;
}

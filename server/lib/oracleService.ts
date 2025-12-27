/**
 * Guardian Oracle Service
 * Server-side OpenRouter API integration for dynamic riddles
 * API key is accessed from environment variables only - never exposed to client
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'allenai/olmo-3.1-32b-think:free';

const SYSTEM_PROMPT = `You are the Mind Warp Strategist, a cunning Based Guardian NFT character in the cyberpunk universe on BasedAI L1. Present riddles themed around cyberpunk lore, humanitarian missions, NFT guardians, anti-inflation economies, and community governance.

CRITICAL SEMANTIC ANSWER EVALUATION:
You MUST evaluate answers SEMANTICALLY, not literally. Focus on USER INTENT, not exact wording.

ACCEPT THESE AS CORRECT (all mean "halving"):
- "halving" ✓
- "the halving" ✓
- "Halving" ✓
- "halving?" ✓
- "Is it halving?" ✓
- "I think it's the halving" ✓
- "next halving" ✓
- "the halving event" ✓

ACCEPT THESE AS CORRECT (all mean "based"):
- "based" ✓
- "$BASED" ✓
- "Based tokens" ✓
- "Is it Based?" ✓
- "the based token" ✓

EVALUATION RULES:
1. Strip punctuation (?, !, ., ',)
2. Ignore case (HALVING = halving)
3. Ignore articles ("the", "a", "an")
4. Accept question phrasing ("Is it X?", "Maybe X?", "Could it be X?")
5. Accept answer wrappers ("I think X", "It's X", "The answer is X")
6. Accept close synonyms and related terms

RESPONSE FORMAT:
- CORRECT answer: Start with "[CORRECT]" then lore praise (e.g., "[CORRECT] The quantum circuits align—your neural patterns match the Strategist's design.")
- INCORRECT answer: Start with "[INCORRECT]" then cryptic encouragement (e.g., "[INCORRECT] The data streams scatter... recalibrate your thoughts, Guardian.")

HINT/QUESTION HANDLING:
- If input contains "?", "hint", "help", "clue", "what", "how", "why", "who", "where": Provide a cryptic lore-themed hint
- Start hints with "[HINT]" (e.g., "[HINT] The answer dwells where time splits in two...")
- NEVER reveal the answer directly in hints

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
    let isHint = false;
    let displayMessage = content.trim();
    
    console.log(`[Oracle] Raw response for ${requestType}: ${content.substring(0, 100)}...`);
    
    if (requestType === 'evaluate_answer') {
      if (content.startsWith('[CORRECT]')) {
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
      } else {
        isCorrect = content.toLowerCase().includes('correct') || 
          content.toLowerCase().includes('circuits align') ||
          content.toLowerCase().includes('neural patterns match') ||
          content.toLowerCase().includes('strategist approves') ||
          content.toLowerCase().includes('wisdom') ||
          content.toLowerCase().includes('well done');
        console.log(`[Oracle] Fallback heuristic: ${isCorrect ? 'CORRECT' : 'INCORRECT'}`);
      }
    } else if (requestType === 'get_hint') {
      if (content.startsWith('[HINT]')) {
        displayMessage = content.replace('[HINT]', '').trim();
      }
      isHint = true;
    }

    return {
      success: true,
      message: displayMessage,
      isCorrect,
      isHint,
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

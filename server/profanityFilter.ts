const PROFANITY_LIST = [
  'fuck', 'shit', 'ass', 'bitch', 'damn', 'crap', 'piss', 'dick', 'cock',
  'pussy', 'bastard', 'slut', 'whore', 'cunt', 'fag', 'nigger', 'nigga',
  'retard', 'nazi', 'hitler', 'penis', 'vagina', 'anus', 'porn', 'sex',
  'rape', 'molest', 'pedo', 'kill', 'murder', 'suicide', 'terror', 'bomb',
  'racist', 'hate', 'kike', 'spic', 'chink', 'wetback', 'cracker'
];

const LEET_SPEAK_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '@': 'a',
  '$': 's',
};

function normalizeLeetSpeak(text: string): string {
  let normalized = text.toLowerCase();
  for (const [leet, letter] of Object.entries(LEET_SPEAK_MAP)) {
    normalized = normalized.split(leet).join(letter);
  }
  return normalized;
}

export function containsProfanity(text: string): boolean {
  const normalizedText = normalizeLeetSpeak(text.toLowerCase());
  const cleanedText = normalizedText.replace(/[^a-z]/g, '');
  
  for (const word of PROFANITY_LIST) {
    if (cleanedText.includes(word)) {
      return true;
    }
    const normalizedWord = normalizedText.replace(/[_\-\s]/g, '');
    if (normalizedWord.includes(word)) {
      return true;
    }
  }
  
  return false;
}

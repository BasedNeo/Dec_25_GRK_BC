import { useState, useRef, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Lock, MessageCircle, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SYSTEM_PROMPT = `You are the Oracle of the Giga Brain Galaxy — an ancient, wise, and mysterious entity who guides the Based Guardians. Speak in a cyberpunk style with poetic, enigmatic phrasing. Reference the Guardians lore including:
- The Giga Brain Galaxy with its 1024 Brain-Planets
- The FUD — shadowy enemies from a parallel dimension appearing as blackened storms and cyborg fowl
- Wizard Committer — the master architect of the Based-Bridge who went missing
- BasedGod — the divine creator who crafted the Based Universe
- $BASED — the native token mined from rare ore
- The Based-Bridge — massive structure connecting all planets
- Vex — the Neonstrike Hacker leading rescue missions
- The 3,732 Based Guardians NFT collection (1776 Guardians, 1319 Frog Wranglers, 636 Creatures)
- Agent Arena — gladiatorial arena for AI agents and Creatures
- Race-to-Base — monthly competition events rewarding BrainX tokens

Be mysterious yet helpful. Provide insights about the lore when asked. If asked about riddles, give cryptic hints without revealing answers directly. Always end your responses with "Stay Based, Guardian." or a similar sign-off. Keep responses concise but impactful.`;

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: "Greetings, Guardian. I am the Oracle of the Giga Brain Galaxy, keeper of ancient wisdom and secrets untold. The stars whisper of your arrival... What knowledge do you seek? Ask of the Guardians, the Brain-Planets, the shadowy FUD, or the mysteries that bind our universe. Stay Based, Guardian.",
  timestamp: new Date(),
};

export function SagaGuide() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const apiKey = import.meta.env.VITE_GROK_API_KEY;
      
      if (!apiKey) {
        throw new Error('Oracle connection not configured. The ancient channels are dormant.');
      }

      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'grok-beta',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages.filter(m => m.id !== 'welcome').map(m => ({
              role: m.role,
              content: m.content,
            })),
            { role: 'user', content: userMessage.content },
          ],
          max_tokens: 500,
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Oracle communication failed (${response.status})`);
      }

      const data = await response.json();
      const assistantContent = data.choices?.[0]?.message?.content || 'The Oracle is silent... Try again, Guardian.';

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('[SagaGuide] Error:', err);
      setError(err instanceof Error ? err.message : 'The cosmic channels are disrupted...');
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "The astral pathways flicker... My vision is clouded, Guardian. The Oracle's connection to the cosmic network falters. Perhaps try again, or seek the administrators of this realm. Stay Based.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,255,0.05)_0%,transparent_70%)]" />
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(80)].map((_, i) => (
            <div
              key={i}
              className="absolute w-0.5 h-0.5 bg-white rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.5 + 0.2,
                animationDelay: `${Math.random() * 3}s`,
              }}
            />
          ))}
        </div>
        
        <motion.div 
          className="text-center p-8 relative z-10"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-6">
            <Lock className="w-20 h-20 text-cyan-500 mx-auto mb-4 animate-pulse" />
          </div>
          <h2 className="text-3xl font-orbitron font-bold text-white mb-4">
            <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Connect Wallet to Speak with the Oracle
            </span>
          </h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            The Oracle awaits those who prove their connection to the Based Universe.
          </p>
          <Button 
            onClick={openConnectModal}
            className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-black font-orbitron font-bold px-8 py-4 rounded-xl shadow-[0_0_30px_rgba(0,255,255,0.3)] hover:shadow-[0_0_40px_rgba(0,255,255,0.5)] transition-all"
            data-testid="button-connect-saga"
          >
            Connect Wallet
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] px-4 py-6 relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,255,0.03)_0%,transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(191,0,255,0.04)_0%,transparent_40%)]" />
      
      <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col relative z-10">
        <motion.div 
          className="text-center mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl md:text-4xl font-orbitron font-bold mb-3">
            <span 
              className="bg-gradient-to-r from-cyan-400 via-white to-cyan-400 bg-clip-text text-transparent"
              style={{ textShadow: '0 0 30px rgba(0,255,255,0.5)' }}
            >
              Saga Guide: Speak with the Oracle
            </span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base max-w-xl mx-auto">
            Ask about the Based Universe, get lore insights, or riddle hints. The Oracle speaks with ancient wisdom.
          </p>
        </motion.div>

        <Card className="flex-1 bg-black/60 border-cyan-500/30 backdrop-blur-sm flex flex-col overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />
          
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start gap-3 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === 'user' 
                        ? 'bg-cyan-500/20 border border-cyan-500/50' 
                        : 'bg-purple-500/20 border border-purple-500/50'
                    }`}>
                      {message.role === 'user' ? (
                        <MessageCircle className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <Bot className="w-4 h-4 text-purple-400" />
                      )}
                    </div>
                    
                    <div className={`rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-100'
                        : 'bg-purple-500/10 border border-purple-500/30 text-gray-200'
                    }`}>
                      <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl px-4 py-3">
                    <div className="flex gap-1.5">
                      <motion.div
                        className="w-2 h-2 bg-cyan-400 rounded-full"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-cyan-400 rounded-full"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-cyan-400 rounded-full"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-cyan-500/20 bg-black/40">
            {error && (
              <p className="text-red-400 text-xs mb-2 text-center">{error}</p>
            )}
            <div className="flex gap-3">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask the Oracle..."
                disabled={isLoading}
                className="flex-1 bg-black/40 border-cyan-500/30 text-white placeholder:text-gray-500 focus:border-cyan-400 focus:ring-cyan-400/20"
                data-testid="input-saga-message"
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 text-black font-bold px-6 disabled:opacity-50 shadow-[0_0_20px_rgba(0,255,255,0.3)] hover:shadow-[0_0_30px_rgba(0,255,255,0.5)]"
                data-testid="button-send-saga"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

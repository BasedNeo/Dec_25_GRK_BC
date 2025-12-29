import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Rocket, Shield, Crown, Star, Sparkles, 
  Trophy, Flame, ChevronRight, Lock, Check,
  X, Lightbulb, Zap, Target, Award, Bot, MessageCircle, Loader2,
  Send, RefreshCw
} from 'lucide-react';
import MindWarpStrategist from '@/assets/mind-warp-strategist.png';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { triggerConfetti } from '@/lib/dynamicImports';
import { useOwnedNFTs } from '@/hooks/useOwnedNFTs';
import { 
  canStartNewQuest,
  getTimeUntilNextQuest,
  markQuestStarted,
  clearQuestCache,
  generateOracleRiddle,
  evaluateOracleAnswer,
  getOracleHint,
  isQuestionOrHintRequest,
  saveQuestProgress,
  loadQuestProgress,
  getInitialProgress,
  type ChatMessage,
  type QuestProgress
} from '@/lib/oracleClient';
import { RiddleLeaderboard } from '@/components/RiddleLeaderboard';
import { useGamePoints } from '@/hooks/useGamePoints';
import { logActivity } from '@/hooks/useActivityHistory';

const BADGES_DATA = [
  { id: 'apprentice', name: 'Apprentice', icon: Rocket, color: 'cyan', description: 'Solve 5 riddles', solvedReq: 5 },
  { id: 'seeker', name: 'Seeker', icon: Target, color: 'green', description: 'Solve 10 riddles', solvedReq: 10 },
  { id: 'scholar', name: 'Scholar', icon: Brain, color: 'blue', description: 'Solve 15 riddles', solvedReq: 15 },
  { id: 'sage', name: 'Sage', icon: Lightbulb, color: 'purple', description: 'Solve 20 riddles', solvedReq: 20 },
  { id: 'strategist', name: 'Strategist', icon: Star, color: 'amber', description: 'Solve 25 riddles', solvedReq: 25 },
  { id: 'master', name: 'Riddle Master', icon: Crown, color: 'yellow', description: 'Complete the quest', solvedReq: 30 },
];

const TYPING_SPEED_MS = 50;

function useTypingEffect(text: string, isActive: boolean) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!isActive || !text) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    setIsTyping(true);
    setDisplayedText('');
    let index = 0;

    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, TYPING_SPEED_MS);

    return () => clearInterval(interval);
  }, [text, isActive]);

  return { displayedText, isTyping };
}

export function RiddleQuest() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { balance: nftBalance } = useOwnedNFTs();
  const isNftHolder = useMemo(() => nftBalance > 0, [nftBalance]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [gameState, setGameState] = useState<'hero' | 'playing' | 'won' | 'lost'>('hero');
  const [progress, setProgress] = useState<QuestProgress>(getInitialProgress());
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastMessage, setLastMessage] = useState('');
  const [shouldType, setShouldType] = useState(false);
  const { displayedText, isTyping } = useTypingEffect(lastMessage, shouldType);
  
  const [canPlayQuest, setCanPlayQuest] = useState(true);
  const [timeUntilNextQuest, setTimeUntilNextQuest] = useState({ hours: 0, minutes: 0 });
  const [apiDown, setApiDown] = useState(false);
  
  const { earnPoints: earnEconomyPoints } = useGamePoints();

  useEffect(() => {
    const checkQuestLimit = () => {
      const canPlay = canStartNewQuest();
      setCanPlayQuest(canPlay);
      if (!canPlay) {
        setTimeUntilNextQuest(getTimeUntilNextQuest());
      }
    };
    
    checkQuestLimit();
    const interval = setInterval(checkQuestLimit, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (address) {
      fetch(`/api/riddle-quest/progress/${address}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.progress) {
            const stored = loadQuestProgress();
            if (stored && stored.gameState === 'active') {
              const merged = {
                ...stored,
                riddlesSolved: Math.max(stored.riddlesSolved, data.progress.riddlesSolved || 0),
                passesUsed: Math.max(stored.passesUsed, data.progress.passesUsed || 0),
                interactions: Math.max(stored.interactions, data.progress.interactions || 0)
              };
              setProgress(merged);
              setGameState('playing');
              saveQuestProgress(merged);
            } else if (data.progress.riddlesSolved > 0 || data.progress.passesUsed > 0) {
              setProgress(prev => ({
                ...prev,
                riddlesSolved: data.progress.riddlesSolved || 0,
                passesUsed: data.progress.passesUsed || 0,
                interactions: data.progress.interactions || 0
              }));
            }
          } else {
            const stored = loadQuestProgress();
            if (stored && stored.gameState === 'active') {
              setProgress(stored);
              setGameState('playing');
            }
          }
        })
        .catch(() => {
          const stored = loadQuestProgress();
          if (stored && stored.gameState === 'active') {
            setProgress(stored);
            setGameState('playing');
          }
        });
    }
  }, [address]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [progress.chatHistory, displayedText]);

  const saveAndUpdateProgress = useCallback((newProgress: QuestProgress) => {
    setProgress(newProgress);
    saveQuestProgress(newProgress);
    
    if (address) {
      fetch('/api/riddle-quest/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          riddlesSolved: newProgress.riddlesSolved,
          passesUsed: newProgress.passesUsed,
          interactions: newProgress.interactions
        })
      }).catch(console.error);
    }
  }, [address]);

  const addChatMessage = useCallback((role: 'user' | 'strategist', content: string) => {
    setProgress(prev => {
      const newHistory = [...prev.chatHistory, { role, content, timestamp: Date.now() }];
      const updated = { ...prev, chatHistory: newHistory };
      saveQuestProgress(updated);
      return updated;
    });
  }, []);

  const startQuest = async () => {
    if (!canPlayQuest) {
      return;
    }
    
    markQuestStarted();
    setCanPlayQuest(false);
    setApiDown(false);
    
    const initialProgress: QuestProgress = {
      riddlesSolved: 0,
      passesUsed: 0,
      interactions: 0,
      currentRiddle: null,
      chatHistory: [],
      gameState: 'active'
    };
    
    setProgress(initialProgress);
    setGameState('playing');
    setIsLoading(true);
    
    const result = await generateOracleRiddle(0, 0);
    
    if (result.success && result.message) {
      const newProgress = {
        ...initialProgress,
        currentRiddle: result.message,
        chatHistory: [{ role: 'strategist' as const, content: result.message, timestamp: Date.now() }]
      };
      setProgress(newProgress);
      saveQuestProgress(newProgress);
      setLastMessage(result.message);
      setShouldType(true);
    } else {
      setApiDown(true);
      addChatMessage('strategist', 'Mind Warp Strategist is scheming... riddles baking. Return soon, Guardian.');
    }
    
    setIsLoading(false);
  };

  const submitAnswer = async () => {
    if (!answer.trim() || !progress.currentRiddle || isLoading || isTyping) return;
    
    const userInput = answer.trim();
    setAnswer('');
    addChatMessage('user', userInput);
    setIsLoading(true);
    setShouldType(false);
    
    const isHintRequest = isQuestionOrHintRequest(userInput);
    
    if (isHintRequest) {
      const newInteractions = progress.interactions + 1;
      const updatedProgress = { ...progress, interactions: newInteractions };
      saveAndUpdateProgress(updatedProgress);
      
      const hintResult = await getOracleHint(progress.currentRiddle, []);
      
      if (hintResult.success && hintResult.message) {
        addChatMessage('strategist', hintResult.message);
        setLastMessage(hintResult.message);
        setShouldType(true);
      } else {
        addChatMessage('strategist', 'The neural pathways dim... focus on the riddle, Guardian.');
      }
    } else {
      const evalResult = await evaluateOracleAnswer(progress.currentRiddle, userInput, []);
      
      if (evalResult.success) {
        addChatMessage('strategist', evalResult.message || '');
        setLastMessage(evalResult.message || '');
        setShouldType(true);
        
        if (evalResult.isCorrect) {
          const newSolved = progress.riddlesSolved + 1;
          const totalAnswered = newSolved + progress.passesUsed;
          
          triggerConfetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#00ffff', '#bf00ff', '#ffffff']
          });
          
          if (address) {
            earnEconomyPoints('riddle-quest', 'riddle');
            logActivity({
              walletAddress: address,
              eventType: 'riddle_solved',
              details: `Solved riddle ${newSolved}`,
              pointsEarned: 10,
              gameType: 'riddle_quest'
            });
          }
          
          if (newSolved >= 30) {
            const finalProgress: QuestProgress = {
              ...progress,
              riddlesSolved: newSolved,
              currentRiddle: null,
              gameState: 'won'
            };
            saveAndUpdateProgress(finalProgress);
            setGameState('won');
            
            if (address) {
              earnEconomyPoints('riddle-quest', 'challenge');
            }
            
            triggerConfetti({
              particleCount: 200,
              spread: 120,
              origin: { y: 0.4 },
              colors: ['#ffd700', '#ff6b6b', '#00ffff', '#bf00ff']
            });
          } else if (totalAnswered < 33) {
            const currentPasses = progress.passesUsed;
            setTimeout(async () => {
              setIsLoading(true);
              const nextRiddle = await generateOracleRiddle(newSolved, currentPasses);
              
              if (nextRiddle.success && nextRiddle.message) {
                setProgress(prev => {
                  const updatedProgress: QuestProgress = {
                    ...prev,
                    riddlesSolved: newSolved,
                    currentRiddle: nextRiddle.message,
                    chatHistory: [...prev.chatHistory, 
                      { role: 'strategist', content: nextRiddle.message, timestamp: Date.now() }
                    ]
                  };
                  saveQuestProgress(updatedProgress);
                  return updatedProgress;
                });
                setLastMessage(nextRiddle.message);
                setShouldType(true);
              }
              setIsLoading(false);
            }, 2000);
            return;
          }
        } else {
          const newPasses = progress.passesUsed + 1;
          const totalAnswered = progress.riddlesSolved + newPasses;
          
          if (newPasses > 3) {
            const finalProgress: QuestProgress = {
              ...progress,
              passesUsed: newPasses,
              currentRiddle: null,
              gameState: 'lost'
            };
            saveAndUpdateProgress(finalProgress);
            setGameState('lost');
          } else if (totalAnswered < 33) {
            const currentSolved = progress.riddlesSolved;
            setTimeout(async () => {
              setIsLoading(true);
              const nextRiddle = await generateOracleRiddle(currentSolved, newPasses);
              
              if (nextRiddle.success && nextRiddle.message) {
                setProgress(prev => {
                  const updatedProgress: QuestProgress = {
                    ...prev,
                    passesUsed: newPasses,
                    currentRiddle: nextRiddle.message,
                    chatHistory: [...prev.chatHistory,
                      { role: 'strategist', content: nextRiddle.message, timestamp: Date.now() }
                    ]
                  };
                  saveQuestProgress(updatedProgress);
                  return updatedProgress;
                });
                setLastMessage(nextRiddle.message);
                setShouldType(true);
              }
              setIsLoading(false);
            }, 2000);
            return;
          } else {
            if (progress.riddlesSolved >= 30) {
              const finalProgress: QuestProgress = {
                ...progress,
                passesUsed: newPasses,
                currentRiddle: null,
                gameState: 'won'
              };
              saveAndUpdateProgress(finalProgress);
              setGameState('won');
            } else {
              const finalProgress: QuestProgress = {
                ...progress,
                passesUsed: newPasses,
                currentRiddle: null,
                gameState: 'lost'
              };
              saveAndUpdateProgress(finalProgress);
              setGameState('lost');
            }
          }
        }
      } else {
        addChatMessage('strategist', 'Mind Warp Strategist is scheming... riddles baking.');
        setApiDown(true);
      }
    }
    
    setIsLoading(false);
  };

  const skipRiddle = async () => {
    if (!progress.currentRiddle || isLoading || isTyping) return;
    if (progress.passesUsed >= 3) return;
    
    setIsLoading(true);
    setShouldType(false);
    
    const newPasses = progress.passesUsed + 1;
    const totalAnswered = progress.riddlesSolved + newPasses;
    
    const skipProgress: QuestProgress = {
      ...progress,
      passesUsed: newPasses,
      chatHistory: [
        ...progress.chatHistory,
        { role: 'user', content: '[PASS - Skipping this riddle]', timestamp: Date.now() },
        { role: 'strategist', content: 'The Strategist notes your tactical retreat. A wise Guardian knows when to preserve their energy.', timestamp: Date.now() }
      ]
    };
    saveAndUpdateProgress(skipProgress);
    setProgress(skipProgress);
    
    if (newPasses > 3) {
      const finalProgress: QuestProgress = {
        ...skipProgress,
        currentRiddle: null,
        gameState: 'lost'
      };
      saveAndUpdateProgress(finalProgress);
      setGameState('lost');
      setIsLoading(false);
      return;
    }
    
    if (totalAnswered >= 33) {
      if (progress.riddlesSolved >= 30) {
        const finalProgress: QuestProgress = {
          ...skipProgress,
          currentRiddle: null,
          gameState: 'won'
        };
        saveAndUpdateProgress(finalProgress);
        setGameState('won');
      } else {
        const finalProgress: QuestProgress = {
          ...skipProgress,
          currentRiddle: null,
          gameState: 'lost'
        };
        saveAndUpdateProgress(finalProgress);
        setGameState('lost');
      }
      setIsLoading(false);
      return;
    }
    
    const currentSolved = progress.riddlesSolved;
    setTimeout(async () => {
      const nextRiddle = await generateOracleRiddle(currentSolved, newPasses);
      
      if (nextRiddle.success && nextRiddle.message) {
        setProgress(prev => {
          const updatedProgress: QuestProgress = {
            ...prev,
            currentRiddle: nextRiddle.message,
            chatHistory: [...prev.chatHistory,
              { role: 'strategist', content: nextRiddle.message, timestamp: Date.now() }
            ]
          };
          saveQuestProgress(updatedProgress);
          return updatedProgress;
        });
        setLastMessage(nextRiddle.message);
        setShouldType(true);
      } else {
        setApiDown(true);
        addChatMessage('strategist', 'Mind Warp Strategist is scheming... riddles baking. Return soon, Guardian.');
      }
      setIsLoading(false);
    }, 1500);
  };

  const resetQuest = () => {
    clearQuestCache();
    setProgress(getInitialProgress());
    setGameState('hero');
    setAnswer('');
    setLastMessage('');
    setShouldType(false);
    setApiDown(false);
  };

  const progressPercent = (progress.riddlesSolved / 30) * 100;
  const totalAnswered = progress.riddlesSolved + progress.passesUsed;
  const remainingRiddles = 33 - totalAnswered;

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 p-4">
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500/30 to-cyan-500/30 flex items-center justify-center">
              <Brain className="w-16 h-16 text-cyan-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Mind Warp Strategist</h1>
            <p className="text-gray-400 mb-8">Connect your wallet to begin the riddle quest</p>
            <Button
              onClick={openConnectModal}
              className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
              data-testid="button-connect-wallet"
            >
              Connect Wallet
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (gameState === 'hero') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 p-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="relative w-40 h-40 mx-auto mb-8">
              <img 
                src={MindWarpStrategist} 
                alt="Mind Warp Strategist"
                className="w-full h-full object-contain rounded-full border-4 border-purple-500/50 shadow-lg shadow-purple-500/30"
              />
              <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-full flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
            </div>
            
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-4">
              Mind Warp Strategist
            </h1>
            <p className="text-gray-400 max-w-xl mx-auto mb-8">
              Face 33 riddles from the cunning Strategist. Answer 30 correctly to prove your worth.
              You may falter 3 times, but no more.
            </p>
            
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8">
              <div className="bg-gray-800/50 rounded-lg p-4 border border-cyan-500/30">
                <div className="text-2xl font-bold text-cyan-400">33</div>
                <div className="text-sm text-gray-400">Riddles</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4 border border-green-500/30">
                <div className="text-2xl font-bold text-green-400">30</div>
                <div className="text-sm text-gray-400">To Win</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4 border border-red-500/30">
                <div className="text-2xl font-bold text-red-400">3</div>
                <div className="text-sm text-gray-400">Passes</div>
              </div>
            </div>
            
            {!canPlayQuest ? (
              <div className="bg-gray-800/50 rounded-lg p-6 max-w-md mx-auto mb-8 border border-amber-500/30">
                <div className="flex items-center justify-center gap-2 text-amber-400 mb-2">
                  <Lock className="w-5 h-5" />
                  <span className="font-semibold">Quest on Cooldown</span>
                </div>
                <p className="text-gray-400">
                  Next quest available in{' '}
                  <span className="text-white font-bold">
                    {timeUntilNextQuest.hours}h {timeUntilNextQuest.minutes}m
                  </span>
                </p>
              </div>
            ) : (
              <Button
                onClick={startQuest}
                size="lg"
                className="bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-lg px-8 py-6"
                data-testid="button-start-quest"
              >
                <Zap className="w-5 h-5 mr-2" />
                Begin Quest
              </Button>
            )}
            
            {isNftHolder && (
              <p className="text-cyan-400 text-sm mt-4">
                <Sparkles className="inline w-4 h-4 mr-1" />
                Guardian holder bonus active
              </p>
            )}
          </motion.div>
          
          <div className="mt-8">
            <RiddleLeaderboard />
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'won') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 p-4 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-500/30 to-yellow-500/30 flex items-center justify-center">
            <Trophy className="w-16 h-16 text-yellow-400" />
          </div>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-400 mb-4">
            Quest Complete!
          </h1>
          <p className="text-gray-400 mb-2">You solved {progress.riddlesSolved} riddles</p>
          <p className="text-gray-500 mb-8">The Mind Warp Strategist acknowledges your wisdom</p>
          <Button onClick={resetQuest} variant="outline" data-testid="button-return-home">
            Return to Command Center
          </Button>
        </motion.div>
      </div>
    );
  }

  if (gameState === 'lost') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-red-900/20 to-gray-900 p-4 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-500/30 to-gray-500/30 flex items-center justify-center">
            <X className="w-16 h-16 text-red-400" />
          </div>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-gray-400 mb-4">
            Quest Failed
          </h1>
          <p className="text-gray-400 mb-2">You solved {progress.riddlesSolved} of 30 required riddles</p>
          <p className="text-gray-500 mb-8">The Mind Warp Strategist will await your return</p>
          <Button onClick={resetQuest} variant="outline" data-testid="button-try-again">
            Try Again Tomorrow
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-gray-800/50 rounded-lg p-4 mb-4 border border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              <span className="text-white font-semibold">Quest Progress</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-400">{progress.riddlesSolved}/30 correct</span>
              <span className="text-red-400">{progress.passesUsed}/3 failed</span>
              <span className="text-gray-400">{remainingRiddles} left</span>
            </div>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        <Card className="bg-gray-900/80 border-purple-500/30 overflow-hidden">
          <ScrollArea className="h-[60vh] p-4">
            <div className="space-y-4">
              {progress.chatHistory.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'strategist' && (
                    <div className="w-10 h-10 rounded-full overflow-hidden mr-3 flex-shrink-0 border-2 border-purple-500/50">
                      <img src={MindWarpStrategist} alt="Strategist" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-lg p-3 ${
                      msg.role === 'user'
                        ? 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-100'
                        : 'bg-purple-500/20 border border-purple-500/30 text-purple-100'
                    }`}
                  >
                    {idx === progress.chatHistory.length - 1 && msg.role === 'strategist' && shouldType
                      ? displayedText
                      : msg.content}
                    {idx === progress.chatHistory.length - 1 && msg.role === 'strategist' && isTyping && (
                      <span className="inline-block w-2 h-4 bg-purple-400 ml-1 animate-pulse" />
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-10 h-10 rounded-full bg-cyan-500/30 ml-3 flex-shrink-0 flex items-center justify-center border-2 border-cyan-500/50">
                      <MessageCircle className="w-5 h-5 text-cyan-400" />
                    </div>
                  )}
                </motion.div>
              ))}
              
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-purple-500/50">
                    <img src={MindWarpStrategist} alt="Strategist" className="w-full h-full object-cover" />
                  </div>
                  <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg px-4 py-3">
                    <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                  </div>
                </motion.div>
              )}
              
              {apiDown && (
                <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-4 text-center">
                  <p className="text-amber-400">Mind Warp Strategist is scheming... riddles baking.</p>
                  <Button onClick={startQuest} variant="outline" size="sm" className="mt-2">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>
          
          <div className="border-t border-purple-500/30 p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitAnswer();
              }}
              className="flex gap-2"
            >
              <Input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer or ask for a hint..."
                className="flex-1 bg-gray-800 border-purple-500/30 text-white placeholder:text-gray-500"
                disabled={isLoading || isTyping || apiDown}
                data-testid="input-riddle-answer"
              />
              <Button
                type="submit"
                disabled={!answer.trim() || isLoading || isTyping || apiDown}
                className="bg-gradient-to-r from-purple-500 to-cyan-500"
                data-testid="button-submit-answer"
              >
                <Send className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                onClick={skipRiddle}
                disabled={isLoading || isTyping || apiDown || progress.passesUsed >= 3}
                variant="outline"
                className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                data-testid="button-skip-riddle"
              >
                <X className="w-4 h-4 mr-1" />
                Skip ({3 - progress.passesUsed})
              </Button>
            </form>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Ask "hint?" or "help" for clues • Skip uses 1 of your 3 passes
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

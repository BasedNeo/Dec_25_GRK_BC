/**
 * AdminInbox - Admin-only message inbox
 * Shows feedback and story submissions from users
 * Limited to 100 messages per category
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Inbox, MessageSquare, BookOpen, RefreshCw, ChevronDown, ChevronUp,
  Mail, User, Wallet, Clock, ArrowLeft
} from 'lucide-react';
import { useAccount } from 'wagmi';

const ADMIN_WALLETS = [
  '0xae543104fdbe456478e19894f7f0e01f0971c9b4',
  '0xb1362caf09189887599ed40f056712b1a138210c',
  '0xabce9e63a9ae51e215bb10c9648f4c0f400c5847',
  '0xbba49256a93a06fcf3b0681fead2b4e3042b9124',
  '0xc5ca5cb0acf8f7d4c6cd307d0d875ee2e09fb1af',
];

interface Feedback {
  id: string;
  message: string;
  email?: string;
  walletAddress?: string;
  createdAt: string;
}

interface Story {
  id: string;
  title: string;
  content: string;
  authorName?: string;
  walletAddress?: string;
  email?: string;
  createdAt: string;
  reviewed: boolean;
}

interface AdminInboxProps {
  onBack: () => void;
}

export function AdminInbox({ onBack }: AdminInboxProps) {
  const { address, isConnected } = useAccount();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isAdmin = isConnected && address && ADMIN_WALLETS.some(
    admin => admin.toLowerCase() === address.toLowerCase()
  );

  useEffect(() => {
    if (isAdmin) {
      fetchMessages();
    }
  }, [isAdmin]);

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      const [feedbackRes, storiesRes] = await Promise.all([
        fetch('/api/feedback'),
        fetch('/api/stories')
      ]);
      if (feedbackRes.ok) setFeedback(await feedbackRes.json());
      if (storiesRes.ok) setStories(await storiesRes.json());
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
    setIsLoading(false);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 bg-white/5 border-red-500/30 text-center">
          <Inbox className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-400">Access Denied</p>
          <p className="text-sm text-muted-foreground mt-2">Admin wallets only</p>
        </Card>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <section className="py-8 min-h-screen">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                <Inbox className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white font-orbitron">ADMIN INBOX</h1>
                <p className="text-xs text-muted-foreground font-mono">
                  Last 100 messages per category
                </p>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchMessages} disabled={isLoading} className="border-white/10">
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="bg-white/5 border-white/10 p-4">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-muted-foreground font-mono">FEEDBACK</span>
            </div>
            <div className="text-2xl font-bold font-orbitron text-white">{feedback.length}</div>
          </Card>
          <Card className="bg-white/5 border-white/10 p-4">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-muted-foreground font-mono">STORY SUBMISSIONS</span>
            </div>
            <div className="text-2xl font-bold font-orbitron text-white">{stories.length}</div>
          </Card>
        </div>

        <Tabs defaultValue="feedback" className="space-y-4">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="feedback" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
              <MessageSquare className="w-4 h-4 mr-2" /> Feedback ({feedback.length})
            </TabsTrigger>
            <TabsTrigger value="stories" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              <BookOpen className="w-4 h-4 mr-2" /> Stories ({stories.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feedback" className="space-y-3">
            {feedback.length === 0 ? (
              <Card className="p-8 bg-white/5 border-white/10 text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No feedback messages yet</p>
              </Card>
            ) : (
              feedback.map(item => (
                <Card key={item.id} className="bg-white/5 border-white/10 overflow-hidden">
                  <div 
                    className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-400">Feedback</Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {formatDate(item.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-white line-clamp-2">{item.message}</p>
                      </div>
                      {expandedId === item.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>
                  <AnimatePresence>
                    {expandedId === item.id && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="px-4 pb-4 border-t border-white/10 pt-3 space-y-2">
                          <p className="text-sm text-white/80 whitespace-pre-wrap">{item.message}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-2">
                            {item.email && (
                              <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {item.email}</span>
                            )}
                            {item.walletAddress && (
                              <span className="flex items-center gap-1"><Wallet className="w-3 h-3" /> {item.walletAddress.slice(0, 6)}...{item.walletAddress.slice(-4)}</span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="stories" className="space-y-3">
            {stories.length === 0 ? (
              <Card className="p-8 bg-white/5 border-white/10 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No story submissions yet</p>
              </Card>
            ) : (
              stories.map(item => (
                <Card key={item.id} className="bg-white/5 border-white/10 overflow-hidden">
                  <div 
                    className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs border-cyan-500/30 text-cyan-400">Story</Badge>
                          {item.reviewed && <Badge variant="outline" className="text-xs border-green-500/30 text-green-400">Reviewed</Badge>}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {formatDate(item.createdAt)}
                          </span>
                        </div>
                        <h3 className="font-bold text-white">{item.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">{item.content}</p>
                      </div>
                      {expandedId === item.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>
                  <AnimatePresence>
                    {expandedId === item.id && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="px-4 pb-4 border-t border-white/10 pt-3 space-y-2">
                          <p className="text-sm text-white/80 whitespace-pre-wrap">{item.content}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-2">
                            {item.authorName && (
                              <span className="flex items-center gap-1"><User className="w-3 h-3" /> {item.authorName}</span>
                            )}
                            {item.email && (
                              <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {item.email}</span>
                            )}
                            {item.walletAddress && (
                              <span className="flex items-center gap-1"><Wallet className="w-3 h-3" /> {item.walletAddress.slice(0, 6)}...{item.walletAddress.slice(-4)}</span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}

export default AdminInbox;

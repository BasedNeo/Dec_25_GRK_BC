import { useEffect, useRef } from 'react';
import { useNotificationsSafe } from '@/context/NotificationsContext';
import { usePriceTicker } from './usePriceTicker';
import { useActivityFeed } from './useActivityFeed';
import { useGameScoresLocal } from './useGameScoresLocal';

export function useNotificationWatchers() {
  usePriceAlertWatcher();
  useListingWatcher();
  useGameEventWatcher();
}

function usePriceAlertWatcher() {
  const ctx = useNotificationsSafe();
  const { allPrices } = usePriceTicker();
  const lastPriceRef = useRef<number | null>(null);
  const lastAlertTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!ctx) return;
    
    const basedPrice = allPrices.get('based');
    if (!basedPrice?.price) return;
    
    const currentPrice = basedPrice.price;
    const threshold = ctx.preferences.priceChangeThreshold || 5;
    const now = Date.now();
    const cooldown = 5 * 60 * 1000;
    
    if (lastPriceRef.current === null) {
      lastPriceRef.current = currentPrice;
      return;
    }
    
    if (now - lastAlertTimeRef.current < cooldown) {
      return;
    }
    
    const percentChange = ((currentPrice - lastPriceRef.current) / lastPriceRef.current) * 100;
    
    if (Math.abs(percentChange) >= threshold) {
      const direction = percentChange > 0 ? 'up' : 'down';
      const emoji = percentChange > 0 ? '📈' : '📉';
      const eventId = `price_${direction}_${Math.floor(now / 60000)}`;
      
      if (!ctx.hasSeenEvent(eventId)) {
        ctx.addNotification({
          type: 'price_alert',
          title: `$BASED Price ${direction === 'up' ? 'Surge' : 'Drop'} ${emoji}`,
          message: `$BASED moved ${Math.abs(percentChange).toFixed(1)}% to $${currentPrice.toFixed(4)}`,
          metadata: { 
            oldPrice: lastPriceRef.current, 
            newPrice: currentPrice, 
            percentChange 
          },
        });
        ctx.markEventSeen(eventId);
        lastPriceRef.current = currentPrice;
        lastAlertTimeRef.current = now;
      }
    }
  }, [allPrices, ctx]);
}

function useListingWatcher() {
  const ctx = useNotificationsSafe();
  const { activities } = useActivityFeed({ limit: 20, autoRefresh: false });
  const processedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!ctx || !activities?.length) return;
    
    const newListings = activities.filter(a => a.type === 'list');
    
    for (const listing of newListings) {
      const eventId = `listing_${listing.tokenId}_${listing.blockNumber || listing.timestamp}`;
      
      if (processedRef.current.has(eventId)) continue;
      if (ctx.hasSeenEvent(eventId)) {
        processedRef.current.add(eventId);
        continue;
      }
      
      ctx.addNotification({
        type: 'new_listing',
        title: 'New Marketplace Listing 🏷️',
        message: `Guardian #${listing.tokenId} listed for ${listing.price} BASED`,
        metadata: { 
          tokenId: listing.tokenId, 
          price: listing.price,
          seller: listing.from,
        },
      });
      
      ctx.markEventSeen(eventId);
      processedRef.current.add(eventId);
    }
    
    const sales = activities.filter(a => a.type === 'sale');
    for (const sale of sales) {
      const eventId = `sale_${sale.tokenId}_${sale.blockNumber || sale.timestamp}`;
      
      if (processedRef.current.has(eventId)) continue;
      if (ctx.hasSeenEvent(eventId)) {
        processedRef.current.add(eventId);
        continue;
      }
      
      ctx.addNotification({
        type: 'sale',
        title: 'Guardian Sold! 💰',
        message: `Guardian #${sale.tokenId} sold for ${sale.price} BASED`,
        metadata: { 
          tokenId: sale.tokenId, 
          price: sale.price,
          buyer: sale.to,
          seller: sale.from,
        },
      });
      
      ctx.markEventSeen(eventId);
      processedRef.current.add(eventId);
    }
  }, [activities, ctx]);
}

function useGameEventWatcher() {
  const ctx = useNotificationsSafe();
  const { myStats } = useGameScoresLocal();
  const { bestScore: highScore, gamesPlayed, rank } = myStats;
  const prevHighScoreRef = useRef<number | null>(null);
  const prevRankRef = useRef<string | null>(null);
  const prevGamesPlayedRef = useRef<number | null>(null);

  useEffect(() => {
    if (!ctx) return;
    
    if (prevHighScoreRef.current !== null && highScore > prevHighScoreRef.current) {
      const eventId = `highscore_${highScore}`;
      if (!ctx.hasSeenEvent(eventId)) {
        ctx.addNotification({
          type: 'game_event',
          title: 'New High Score! 🎮',
          message: `You scored ${highScore.toLocaleString()} points in Retro Defender!`,
          metadata: { highScore, previousHighScore: prevHighScoreRef.current },
        });
        ctx.markEventSeen(eventId);
      }
    }
    
    if (prevRankRef.current !== null && rank !== prevRankRef.current) {
      const eventId = `rank_${rank}`;
      if (!ctx.hasSeenEvent(eventId)) {
        ctx.addNotification({
          type: 'game_event',
          title: 'Rank Unlocked! 🏆',
          message: `You've achieved the rank of ${rank}!`,
          metadata: { newRank: rank, previousRank: prevRankRef.current },
        });
        ctx.markEventSeen(eventId);
      }
    }
    
    prevHighScoreRef.current = highScore;
    prevRankRef.current = rank;
    prevGamesPlayedRef.current = gamesPlayed;
  }, [highScore, gamesPlayed, rank, ctx]);
}

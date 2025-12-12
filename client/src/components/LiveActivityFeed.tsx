import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ExternalLink, PauseCircle, PlayCircle, Zap } from 'lucide-react';
import { getRecentMints, getExplorerUrl, getCollectionStats } from '../lib/contractService';
import './LiveActivityFeed.css';

interface ActivityItem {
  tokenId: number;
  name: string;
  image: string;
  owner: string;
  rarity: string;
  timestamp: Date;
  isNew?: boolean;
}

export function LiveActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [totalMinted, setTotalMinted] = useState<number>(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isSoundEnabled, setIsSoundEnabled] = useState(false); // Default off
  const listRef = useRef<HTMLDivElement>(null);
  
  // Initial fetch
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Polling for new mints
  useEffect(() => {
    const interval = setInterval(checkForNewMints, 15000); // 15s poll
    return () => clearInterval(interval);
  }, [totalMinted]);

  // Update timestamps
  useEffect(() => {
    const interval = setInterval(() => {
      setActivities(prev => [...prev]); // Trigger re-render
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activities, autoScroll]);

  const fetchInitialData = async () => {
    try {
      const stats = await getCollectionStats();
      if (stats && !('error' in stats)) {
        setTotalMinted(stats.totalMinted);
      }

      const mints = await getRecentMints(10);
      if (Array.isArray(mints)) {
        const formattedMints = mints.map(m => ({
          ...m,
          timestamp: new Date() // For initial load, we don't have exact mint time from this API, mocking "Just now" or slightly older would be better but this works for "mockup" feel
        }));
        setActivities(formattedMints);
      }
    } catch (err) {
      console.error("Failed to init feed", err);
    }
  };

  const checkForNewMints = async () => {
    try {
      const stats = await getCollectionStats();
      if (!stats || 'error' in stats) return;

      const currentTotal = stats.totalMinted;
      
      if (currentTotal > totalMinted) {
        const newCount = currentTotal - totalMinted;
        const newMints = await getRecentMints(newCount);
        
        if (Array.isArray(newMints) && newMints.length > 0) {
          const newActivities = newMints.map(m => ({
            ...m,
            timestamp: new Date(),
            isNew: true
          }));

          setActivities(prev => {
            const updated = [...newActivities, ...prev].slice(0, 50); // Keep max 50
            return updated;
          });
          
          if (isSoundEnabled) playDing();
        }
        
        setTotalMinted(currentTotal);
      }
    } catch (err) {
      console.error("Poll error", err);
    }
  };

  const playDing = () => {
    const audio = new Audio('/assets/sounds/ding.mp3'); // Assuming file exists or fails silently
    audio.volume = 0.5;
    audio.play().catch(() => {});
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop > 50) {
      setAutoScroll(false);
    } else if (e.currentTarget.scrollTop === 0) {
      setAutoScroll(true);
    }
  };

  return (
    <div className="laf-container">
      <div className="laf-header">
        <div className="laf-title">
          <div className="laf-status-dot"></div>
          LIVE ACTIVITY
        </div>
        <div className="laf-controls">
           <button 
             className={`laf-control-btn ${autoScroll ? 'active' : ''}`}
             onClick={() => setAutoScroll(!autoScroll)}
             title="Toggle Auto-Scroll"
           >
             {autoScroll ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
             <span>{autoScroll ? 'AUTO' : 'PAUSED'}</span>
           </button>
        </div>
      </div>

      <div 
        className="laf-list" 
        ref={listRef}
        onScroll={handleScroll}
      >
        {activities.length === 0 ? (
          <div className="laf-empty">Waiting for mints...</div>
        ) : (
          activities.map((item) => (
            <ActivityRow key={item.tokenId} item={item} />
          ))
        )}
      </div>
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const [isHighlight, setIsHighlight] = useState(!!item.isNew);

  useEffect(() => {
    if (item.isNew) {
      const timer = setTimeout(() => setIsHighlight(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [item.isNew]);

  return (
    <div className={`laf-item ${isHighlight ? 'new-item' : ''}`}>
      <div className="laf-item-img-wrapper">
         <img src={item.image} alt={item.name} className="laf-item-img" loading="lazy" />
      </div>
      
      <div className="laf-item-content">
         <div className="laf-item-header">
            <span className="laf-item-title">{item.name}</span>
            <span className="laf-badge-minted">MINTED</span>
         </div>
         
         <div className="laf-item-details">
            <span className={`laf-rarity ${getRarityClass(item.rarity)}`}>{item.rarity}</span>
            <span className="laf-dot">•</span>
            <a 
               href={getExplorerUrl('address', item.owner)} 
               target="_blank" 
               rel="noreferrer"
               className="laf-owner-link"
            >
               by {item.owner.substring(0, 6)}...{item.owner.substring(item.owner.length - 4)}
            </a>
         </div>

         <div className="laf-item-footer">
            <span className="laf-time">{timeAgo(item.timestamp)}</span>
            <a 
               href={getExplorerUrl('token', String(item.tokenId))}
               target="_blank" 
               rel="noreferrer"
               className="laf-ext-link"
            >
               <ExternalLink size={10} />
            </a>
         </div>
      </div>
    </div>
  );
}

// Helpers
function timeAgo(date: Date) {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getRarityClass(rarity: string) {
  const r = rarity?.toLowerCase() || '';
  if (r.includes('legendary')) return 'text-legendary';
  if (r.includes('very rare')) return 'text-very-rare';
  return 'text-common';
}

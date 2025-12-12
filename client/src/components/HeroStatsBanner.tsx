import React, { useEffect, useState, useRef } from 'react';
import { getCollectionStats, getExplorerUrl } from '../lib/contractService';
import './HeroStatsBanner.css';
import { CheckCircle2, ExternalLink, Box, Layers, Users, TrendingUp, Activity, Lock, Unlock, PlayCircle, PauseCircle } from 'lucide-react';
import guardianLogo from '@assets/generated_images/cyberpunk_guardian_neon_armor_purple_cyan.png'; // Using an existing image as logo placeholder

interface CollectionStats {
  totalMinted: number;
  maxSupply: number;
  remaining: number;
  percentMinted: string;
  mintPriceWei: bigint;
  mintPriceFormatted: string;
  isPublicMintActive: boolean;
  isRevealed: boolean;
  isPaused: boolean;
  contractAddress: string;
}

export function HeroStatsBanner() {
  const [stats, setStats] = useState<CollectionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Animation refs for numbers
  const mintedRef = useRef<HTMLSpanElement>(null);
  const supplyRef = useRef<HTMLSpanElement>(null);
  
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // 30s refresh
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      // Don't set loading to true on background refreshes to avoid shimmer flicker
      if (!stats) setLoading(true);
      
      const data = await getCollectionStats();
      if ('error' in data && data.error) {
        throw new Error(String(data.error));
      }
      setStats(data as CollectionStats);
      setError(null);
    } catch (err: any) {
      console.error("Failed to fetch stats:", err);
      setError("Failed to load collection data");
    } finally {
      setLoading(false);
    }
  };

  // Number counter animation effect
  useEffect(() => {
    if (!stats || loading) return;

    const animateValue = (ref: React.RefObject<HTMLSpanElement | null>, start: number, end: number, duration: number) => {
      if (!ref.current) return;
      let startTimestamp: number | null = null;
      const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);
        if (ref.current) ref.current.innerHTML = value.toLocaleString();
        if (progress < 1) {
          window.requestAnimationFrame(step);
        }
      };
      window.requestAnimationFrame(step);
    };

    // Animate total minted
    animateValue(mintedRef, 0, stats.totalMinted, 1500);
    
  }, [stats, loading]);

  if (error) {
    return (
      <div className="hsb-container hsb-error">
        <div className="hsb-error-content">
           <span>⚠️ {error}</span>
           <button onClick={() => fetchStats()} className="hsb-retry-btn">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="hsb-wrapper">
      <div className="hsb-container">
        {/* Header Section */}
        <div className="hsb-header">
          <div className="hsb-identity">
            <div className="hsb-logo-wrapper">
              <img src={guardianLogo} alt="Based Guardians Logo" className="hsb-logo" />
            </div>
            <div className="hsb-title-group">
              <h1 className="hsb-title">
                BASED GUARDIANS
                <span className="hsb-verified-badge" title="Verified Collection">
                  <CheckCircle2 size={18} fill="var(--hsb-verified-color)" color="white" />
                </span>
              </h1>
              <span className="hsb-subtitle">by Based Guardians Team • Verified ✓</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="hsb-stats-grid">
          {/* Items */}
          <div className="hsb-stat-box">
            <div className="hsb-stat-label">Items</div>
            <div className="hsb-stat-value">
               {loading ? <div className="hsb-skeleton hsb-skeleton-text"></div> : stats?.maxSupply.toLocaleString()}
            </div>
          </div>

          {/* Minted */}
          <div className="hsb-stat-box">
            <div className="hsb-stat-label">Minted</div>
            <div className="hsb-stat-value hsb-accent-text">
               {loading ? <div className="hsb-skeleton hsb-skeleton-text"></div> : <span ref={mintedRef}>{stats?.totalMinted.toLocaleString()}</span>}
            </div>
          </div>

          {/* Owners (Placeholder as per mock) */}
          <div className="hsb-stat-box">
            <div className="hsb-stat-label">Owners</div>
            <div className="hsb-stat-value">
               {loading ? <div className="hsb-skeleton hsb-skeleton-text"></div> : "---"}
            </div>
          </div>

          {/* Floor */}
          <div className="hsb-stat-box">
            <div className="hsb-stat-label">Floor</div>
            <div className="hsb-stat-value hsb-price-text">
               {loading ? <div className="hsb-skeleton hsb-skeleton-text"></div> : stats?.mintPriceFormatted}
            </div>
          </div>

          {/* Volume (Placeholder) */}
          <div className="hsb-stat-box">
            <div className="hsb-stat-label">Volume</div>
            <div className="hsb-stat-value">
               {loading ? <div className="hsb-skeleton hsb-skeleton-text"></div> : "---"}
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="hsb-progress-section">
          <div className="hsb-progress-header">
             <span className="hsb-progress-label">Mint Progress</span>
             <span className="hsb-progress-percent">
                {loading ? "Loading..." : `${stats?.percentMinted}% Minted`}
             </span>
          </div>
          <div className="hsb-progress-track">
             <div 
                className="hsb-progress-fill" 
                style={{ width: loading ? '0%' : `${stats?.percentMinted}%` }}
             >
                <div className="hsb-progress-glow"></div>
             </div>
          </div>
        </div>

        {/* Footer / Actions */}
        <div className="hsb-footer">
          <div className="hsb-status-group">
            {loading ? (
                <>
                   <div className="hsb-skeleton hsb-skeleton-badge"></div>
                   <div className="hsb-skeleton hsb-skeleton-badge"></div>
                </>
            ) : (
                <>
                    <div className={`hsb-status-badge ${stats?.isPublicMintActive ? 'status-active' : 'status-inactive'}`}>
                        {stats?.isPublicMintActive ? <PlayCircle size={12} /> : <PauseCircle size={12} />}
                        <span>{stats?.isPublicMintActive ? 'MINT ACTIVE' : 'MINT PAUSED'}</span>
                    </div>
                    <div className={`hsb-status-badge ${stats?.isRevealed ? 'status-revealed' : 'status-hidden'}`}>
                        {stats?.isRevealed ? <Unlock size={12} /> : <Lock size={12} />}
                        <span>{stats?.isRevealed ? 'REVEALED' : 'HIDDEN'}</span>
                    </div>
                </>
            )}
          </div>

          <div className="hsb-links-group">
             <a 
                href={stats ? getExplorerUrl('address', stats.contractAddress) : '#'} 
                target="_blank" 
                rel="noreferrer"
                className="hsb-link-btn"
             >
                Contract <ExternalLink size={12} />
             </a>
             <a 
                href={stats ? getExplorerUrl('address', stats.contractAddress) : '#'} 
                target="_blank" 
                rel="noreferrer"
                className="hsb-link-btn"
             >
                Explorer <ExternalLink size={12} />
             </a>
          </div>
        </div>
      </div>
    </div>
  );
}

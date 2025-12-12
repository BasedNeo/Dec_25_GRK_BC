import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Trophy, Diamond, Circle, ExternalLink } from 'lucide-react';
import { getExplorerUrl } from '../lib/contractService';
import './RarityRankingsTable.css';

// Types
interface Trait {
  trait_type: string;
  value: string;
}

interface RankedToken {
  tokenId: number;
  name: string;
  image: string;
  owner: string;
  attributes: Trait[];
  rarityScore: number;
  rank: number;
  rarityTier: string;
}

type SortField = 'rank' | 'tokenId' | 'rarityScore';
type SortDirection = 'asc' | 'desc';

// Rarity Tiers Configuration
const RARITY_TIERS = [
  { name: 'Rarest-Legendary', minRank: 1, maxRank: 37, color: '#ffd700', icon: Trophy },
  { name: 'Very Rare', minRank: 38, maxRank: 112, color: '#a855f7', icon: Diamond },
  { name: 'Rarest', minRank: 113, maxRank: 373, color: '#ef4444', icon: Circle },
  { name: 'Rare', minRank: 374, maxRank: 746, color: '#eab308', icon: Circle },
  { name: 'Less Rare', minRank: 747, maxRank: 1119, color: '#3b82f6', icon: Circle },
  { name: 'Less Common', minRank: 1120, maxRank: 1866, color: '#22c55e', icon: Circle },
  { name: 'Common', minRank: 1867, maxRank: 2799, color: '#d1d5db', icon: Circle },
  { name: 'Most Common', minRank: 2800, maxRank: 3732, color: '#4b5563', icon: Circle },
];

// Mock Data Generator (since we don't have the full dataset indexed)
const generateMockData = (count: number): RankedToken[] => {
  const bioTypes = ['Fox', 'Hacker', 'Cyborg', 'Android'];
  const roles = ['Guardian', 'Scout', 'Sniper', 'Medic'];
  
  // 1. Generate Raw Tokens
  const tokens = Array.from({ length: count }).map((_, i) => {
    const id = i + 1;
    // Weighted random traits to simulate rarity
    const bio = bioTypes[Math.floor(Math.random() * bioTypes.length)];
    const role = roles[Math.floor(Math.random() * roles.length)];
    
    return {
      tokenId: id,
      name: `Guardian #${id}`,
      image: `https://moccasin-key-flamingo-487.mypinata.cloud/ipfs/bafybeie3c5ahzsiiparmbr6lgdbpiukorbphvclx73dwr6vrjfalfyu52y/${id}.png`, // Placeholder logic
      owner: `0x${Math.random().toString(16).substr(2, 40)}`,
      attributes: [
        { trait_type: 'Biological Type', value: bio },
        { trait_type: 'Role', value: role },
        // Add pseudo-random traits for scoring
        { trait_type: 'Background', value: Math.random() > 0.9 ? 'Neon City' : 'Grey Wall' },
        { trait_type: 'Eyes', value: Math.random() > 0.95 ? 'Laser' : 'Normal' }
      ],
      rarityScore: 0, // Calculated later
      rank: 0,
      rarityTier: ''
    };
  });

  // 2. Calculate Trait Counts
  const traitCounts: Record<string, number> = {};
  tokens.forEach(token => {
    token.attributes.forEach(attr => {
      const key = `${attr.trait_type}:${attr.value}`;
      traitCounts[key] = (traitCounts[key] || 0) + 1;
    });
  });

  // 3. Calculate Scores
  tokens.forEach(token => {
    let score = 0;
    token.attributes.forEach(attr => {
      const key = `${attr.trait_type}:${attr.value}`;
      const count = traitCounts[key];
      // Formula: 1 / (count / total) = total / count
      score += count / count; // Simplified for mock, ideally: count > 0 ? (tokens.length / count) : 0
      // Let's use the real formula requested: 1 / (count / total)
      if (count > 0) {
        score += tokens.length / count;
      }
    });
    // Add some random variance to prevent tie-breaks for this mockup
    token.rarityScore = score + Math.random();
  });

  // 4. Sort and Rank
  tokens.sort((a, b) => b.rarityScore - a.rarityScore);
  
  tokens.forEach((token, index) => {
    token.rank = index + 1;
    // Assign Tier
    const tier = RARITY_TIERS.find(t => token.rank >= t.minRank && token.rank <= t.maxRank);
    token.rarityTier = tier ? tier.name : 'Unknown';
  });

  return tokens;
};

export function RarityRankingsTable() {
  const [data, setData] = useState<RankedToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  const itemsPerPage = 50;

  // Initialize Data
  useEffect(() => {
    // Simulate async calculation
    setTimeout(() => {
      const mockData = generateMockData(3732);
      setData(mockData);
      setLoading(false);
    }, 1000);
  }, []);

  // Filter and Sort
  const processedData = useMemo(() => {
    let result = [...data];

    // Filter by Search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(t => 
        t.name.toLowerCase().includes(lower) || 
        t.tokenId.toString().includes(lower)
      );
    }

    // Filter by Tier
    if (filterTier !== 'All') {
      result = result.filter(t => t.rarityTier === filterTier);
    }

    // Sort
    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      
      if (sortField === 'rarityScore') {
        // Higher score is better (rank 1), so desc is default for score
        // But if user clicks header, we swap. 
        // Logic: Rank 1 = High Score. 
        // Ascending Rank = 1, 2, 3... (High Score to Low Score)
        // Descending Rank = ...3, 2, 1 (Low Score to High Score)
        // Ascending Score = Low to High
        // Descending Score = High to Low
        return sortDirection === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
      } else {
        return sortDirection === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
      }
    });

    return result;
  }, [data, searchTerm, filterTier, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const currentSlice = processedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  if (loading) {
    return (
      <div className="rrt-loading">
        <div className="rrt-spinner"></div>
        <p>Calculating Rarity Scores...</p>
      </div>
    );
  }

  return (
    <div className="rrt-container">
      {/* Controls Header */}
      <div className="rrt-controls">
        <div className="rrt-search-wrapper">
          <Search className="rrt-search-icon" size={18} />
          <input
            type="text"
            placeholder="Search Token ID or Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rrt-search-input"
          />
        </div>

        <div className="rrt-filter-wrapper">
          <Filter className="rrt-filter-icon" size={18} />
          <select 
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="rrt-filter-select"
          >
            <option value="All">All Tiers</option>
            {RARITY_TIERS.map(tier => (
              <option key={tier.name} value={tier.name}>{tier.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rrt-table-wrapper">
        <table className="rrt-table">
          <thead className="rrt-thead">
            <tr>
              <th onClick={() => handleSort('rank')} className="sortable">
                <div className="th-content">
                  Rank {sortField === 'rank' && (sortDirection === 'asc' ? <ArrowUp size={14}/> : <ArrowDown size={14}/>)}
                </div>
              </th>
              <th onClick={() => handleSort('tokenId')} className="sortable">
                <div className="th-content">
                  Token {sortField === 'tokenId' && (sortDirection === 'asc' ? <ArrowUp size={14}/> : <ArrowDown size={14}/>)}
                </div>
              </th>
              <th>Item</th>
              <th>Rarity Level</th>
              <th onClick={() => handleSort('rarityScore')} className="sortable">
                 <div className="th-content">
                  Score {sortField === 'rarityScore' && (sortDirection === 'asc' ? <ArrowUp size={14}/> : <ArrowDown size={14}/>)}
                </div>
              </th>
              <th>Owner</th>
            </tr>
          </thead>
          <tbody className="rrt-tbody">
            {currentSlice.length > 0 ? (
              currentSlice.map((token) => (
                <RankRow key={token.tokenId} token={token} />
              ))
            ) : (
              <tr>
                <td colSpan={6} className="rrt-empty">No results found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="rrt-pagination">
        <button 
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="rrt-page-btn"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="rrt-page-info">
          Page {currentPage} of {totalPages}
        </span>
        <button 
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="rrt-page-btn"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function RankRow({ token }: { token: RankedToken }) {
  const tier = RARITY_TIERS.find(t => t.name === token.rarityTier) || RARITY_TIERS[RARITY_TIERS.length - 1];
  const Icon = tier.icon;
  
  // Special Rank Styling
  let rankClass = '';
  if (token.rank === 1) rankClass = 'rank-gold';
  else if (token.rank === 2) rankClass = 'rank-silver';
  else if (token.rank === 3) rankClass = 'rank-bronze';

  return (
    <tr className="rrt-row">
      <td className={`rrt-rank-cell ${rankClass}`}>#{token.rank}</td>
      <td className="rrt-id-cell">#{token.tokenId}</td>
      <td className="rrt-item-cell">
        <div className="rrt-item-wrapper">
          <img src={token.image} alt={token.name} className="rrt-thumb" loading="lazy" />
          <span className="rrt-name">{token.name}</span>
        </div>
      </td>
      <td className="rrt-tier-cell">
        <div className="rrt-tier-badge" style={{ color: tier.color, borderColor: `${tier.color}40`, background: `${tier.color}10` }}>
          <Icon size={12} fill={tier.name.includes('Legendary') || tier.name.includes('Very') ? tier.color : 'none'} />
          {token.rarityTier}
        </div>
      </td>
      <td className="rrt-score-cell">{token.rarityScore.toFixed(2)}</td>
      <td className="rrt-owner-cell">
        <a 
          href={getExplorerUrl('address', token.owner)}
          target="_blank"
          rel="noreferrer"
          className="rrt-owner-link"
        >
          {token.owner.substring(0, 6)}...
          <ExternalLink size={10} />
        </a>
      </td>
    </tr>
  );
}

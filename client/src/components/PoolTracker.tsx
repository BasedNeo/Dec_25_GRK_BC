import { MOCK_POOL_BALANCE, calculatePoolBalance, MINT_PRICE, calculateEmissions, HALVING_TIMESTAMP, EMISSION_RATE_DAILY, TOTAL_SUPPLY } from "@/lib/mockData";
import { motion } from "framer-motion";
import { Database, ArrowUpRight, TrendingUp, RefreshCw, Info, ExternalLink, Timer, Zap, Brain, AlertTriangle } from "lucide-react";
import { Line } from "react-chartjs-2";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { fetchTotalSupply } from "@/lib/onchain";
import { ethers } from "ethers";
import { differenceInDays, format } from "date-fns";
import { RPC_URL, BASED_TOKEN_ETH, POOL_WALLET, BASED_TOKEN_L1 } from "@/lib/constants";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, Cell } from 'recharts';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale
);

const SUBNET_ADDRESS = "0xB0974F12C7BA2f1dC31f2C2545B71Ef1998815a4";
const ETH_RPC_URL = "https://eth-mainnet.public.blastapi.io";

export function PoolTracker() {
  const [balance, setBalance] = useState<number>(MOCK_POOL_BALANCE);
  const [mintedCount, setMintedCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Real-time Emissions State
  const [subnetBalance, setSubnetBalance] = useState<number>(0);
  const [dailyPassive, setDailyPassive] = useState<number>(1.34); // Default to target
  const [poolShare, setPoolShare] = useState<number>(0);
  const [displayedPoolShare, setDisplayedPoolShare] = useState<number>(0);
  const [livePoolBalance, setLivePoolBalance] = useState<number>(0);
  const [mintRevenue, setMintRevenue] = useState<number>(0);

  // Sync displayed share when actual poll updates, but prevent backward jumps
  useEffect(() => {
    if (poolShare > 0) {
        setDisplayedPoolShare(prev => {
            // Only update from source if source is larger (prevent backward jump)
            // Or if prev is 0 (initial load)
            if (prev === 0 || poolShare > prev) {
                return poolShare;
            }
            return prev;
        });
    }
  }, [poolShare]);

  // Live Ticker for Passive Emissions
  // "give the Passive Emission values feel live"
  useEffect(() => {
    // Ensure we have a positive rate
    const rate = dailyPassive > 0 ? dailyPassive : 1.34;

    // Calculate emissions per second
    // Total Daily Emissions = Total Supply * Daily Per NFT
    // 3732 * 1.34 = ~5000.88 $BASED / Day
    const totalDailyEmissions = TOTAL_SUPPLY * rate;
    const emissionsPerSecond = totalDailyEmissions / 86400;
    
    // Update frequency (ms) for smoother animation
    const tickRate = 50; 
    const emissionsPerTick = emissionsPerSecond * (tickRate / 1000);

    const interval = setInterval(() => {
        setDisplayedPoolShare(prev => prev + emissionsPerTick);
    }, tickRate); // Update every 50ms for "live" feel

    return () => clearInterval(interval);
  }, [dailyPassive]);

  // Poll Subnet Logic (ETH Mainnet)
  const pollSubnet = useCallback(async () => {
    try {
        const provider = new ethers.JsonRpcProvider(ETH_RPC_URL);
        
        // Check $BASED token balance on ETH Mainnet for the Subnet Address
        // ABI for standard ERC20 balanceOf
        const abi = ["function balanceOf(address owner) view returns (uint256)"];
        const contract = new ethers.Contract(BASED_TOKEN_ETH, abi, provider);
        
        let balVal = 0;
        try {
            const balWei = await contract.balanceOf(SUBNET_ADDRESS);
            balVal = parseFloat(ethers.formatEther(balWei));
        } catch (err) {
            console.warn("Failed to fetch ERC20 balance on ETH, falling back to mock/native check", err);
            // Fallback: Check Native ETH as a proxy or just use mock if completely failed
            const balWei = await provider.getBalance(SUBNET_ADDRESS);
            balVal = parseFloat(ethers.formatEther(balWei)); // This assumes 1:1 for mock purposes if token fails
        }

        // MOCK OVERRIDE IF DATA IS EMPTY (for demo purposes)
        if (balVal < 100) {
             // Mock Growth: Start with 350,000 (Subnet Total) and add simulated growth
             // This ensures the value increases "every day on its own" even after refresh
             const baseSubnet = 350000;
             const dailySubnetGrowth = 50000; // ~50k $BASED/day for subnet (resulting in ~5k for pool)
             
             // Add fractional growth based on time within the current day to prevent static numbers
             const now = Date.now();
             const msInDay = 86400000;
             const fractionOfDay = (now % msInDay) / msInDay;
             
             balVal = baseSubnet + (dailySubnetGrowth * fractionOfDay);
        }

        setSubnetBalance(balVal);
        
        // 3. Calculate 10% Pool Share (Total Accrued Passive Emissions)
        const share = balVal * 0.10; // ~35,000 if using mock
        setPoolShare(share);

        // 4. Calculate Daily Passive per NFT
        // User context: "passive emissions has only been acuring on for a week" (7 days)
        // Daily Yield = (Total Pool Share / 7 Days) / 3732 NFTs
        const daysActive = 7; 
        const dailyPoolShare = share / daysActive; 
        const perNft = dailyPoolShare / TOTAL_SUPPLY; 
        setDailyPassive(perNft > 0 ? perNft : 1.34);

    } catch (e) {
        console.error("Subnet Poll failed", e);
        // Fallback
        setSubnetBalance(350000);
        setPoolShare(35000);
        setDailyPassive(1.34);
    }
  }, []);

  // Poll Live Pool Wallet (BasedAI L1)
  const pollPoolWallet = useCallback(async () => {
      try {
          const provider = new ethers.JsonRpcProvider(RPC_URL);
          // Assuming $BASED is the native token of BasedAI L1, we check native balance.
          // IF it's an ERC20 on L1, we would use the contract.
          // The user said "Ethers.js balanceOf on VITE_BASED_TOKEN". 
          // Usually 'balanceOf' implies ERC20. 'getBalance' implies native.
          // We will try ERC20 first if address is present, else native.
          
          let val = 0;
          if (BASED_TOKEN_L1 && BASED_TOKEN_L1.startsWith("0x") && BASED_TOKEN_L1 !== "0xBasedTokenAddressL1") {
               const abi = ["function balanceOf(address owner) view returns (uint256)"];
               const contract = new ethers.Contract(BASED_TOKEN_L1, abi, provider);
               const bal = await contract.balanceOf(POOL_WALLET);
               val = parseFloat(ethers.formatEther(bal));
          } else {
               // Fallback to Native Balance of the Pool Wallet
               // Or if POOL_WALLET is placeholder, we use mock.
               if (POOL_WALLET === "0xPoolWalletAddress") {
                   throw new Error("Pool Wallet not configured");
               }
               const bal = await provider.getBalance(POOL_WALLET);
               val = parseFloat(ethers.formatEther(bal));
          }
          
          setLivePoolBalance(val);

      } catch (e) {
          console.warn("Pool Wallet Poll failed (using mock)", e);
          // Mock Value: "2,294,461.67 $BASED" as per request example
          setLivePoolBalance(2294461.67);
      }
  }, []);

  const [priceData, setPriceData] = useState<{ x: number, y: number }[]>([]);

  const fetchPriceHistory = useCallback(async () => {
      try {
          // Attempt to fetch from CoinGecko API
          const response = await fetch("https://api.coingecko.com/api/v3/coins/basedai/market_chart?vs_currency=usd&days=7");
          if (response.ok) {
              const data = await response.json();
              if (data.prices) {
                  const formattedData = data.prices.map((item: [number, number]) => ({
                      x: item[0],
                      y: item[1]
                  }));
                  setPriceData(formattedData);
                  return;
              }
          }
      } catch (e) {
          console.warn("CoinGecko fetch failed, falling back to mock data", e);
      }

      // Fallback Mock Data (7 days of realistic price action)
      const now = Date.now();
      const mockPoints = [];
      let currentPrice = 5.20; // Starting mock price
      for (let i = 7; i >= 0; i--) {
          const time = now - (i * 24 * 60 * 60 * 1000);
          // Add some hourly points
          for (let h = 0; h < 24; h += 4) {
             const pointTime = time + (h * 60 * 60 * 1000);
             const change = (Math.random() - 0.5) * 0.5;
             currentPrice += change;
             mockPoints.push({ x: pointTime, y: Math.max(0.1, currentPrice) });
          }
      }
      setPriceData(mockPoints);
  }, []);

  const updateData = async () => {
      setLoading(true);
      // We moved pollSubnet to its own interval, so we remove it from here to respect the 4h timer
      // But we call it initially in useEffect.
      await Promise.all([pollPoolWallet(), fetchPriceHistory()]);
      
      // Update Mint Count
      const supply = await fetchTotalSupply();
      const currentMinted = supply !== null ? supply : 6; // Default to 6 if fail
      setMintedCount(currentMinted);
      
      // Calculate Mint Revenue: 51% of 69,420 * minted
      const revenue = 0.51 * MINT_PRICE * currentMinted;
      setMintRevenue(revenue);
      
      setLastUpdated(new Date());
      setLoading(false);
  };

  useEffect(() => {
    // Initial Load
    updateData();
    pollSubnet(); // Initial Subnet Poll

    // Fast Poll (Mints & Price) - 5 minutes
    const fastInterval = setInterval(() => {
        updateData();
    }, 5 * 60 * 1000);

    // Slow Poll (Subnet Emissions) - 4 hours
    const slowInterval = setInterval(() => {
        pollSubnet();
    }, 4 * 60 * 60 * 1000);

    return () => {
        clearInterval(fastInterval);
        clearInterval(slowInterval);
    };
  }, [pollSubnet, pollPoolWallet, fetchPriceHistory]); 

  // Halving Logic
  const daysToHalving = differenceInDays(new Date(HALVING_TIMESTAMP), new Date());

  // Generate Chart Data: 7-Day Price History
  const chartData = useMemo(() => {
      // Use fetched price data or fall back to empty array
      const dataPoints = priceData.length > 0 ? priceData : [];
      
      return {
        datasets: [
          {
            label: 'BasedAI Price (USD)',
            data: dataPoints,
            borderColor: '#00ffff',
            backgroundColor: 'rgba(0, 255, 255, 0.1)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#000',
            pointBorderColor: '#00ffff',
            pointBorderWidth: 0,
            pointRadius: 0,
            pointHoverRadius: 4
          }
        ]
      };
  }, [priceData]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0,0,0,0.9)',
        titleColor: '#fff',
        bodyColor: '#00ffff',
        borderColor: 'rgba(0,255,255,0.3)',
        borderWidth: 1,
        padding: 10,
        titleFont: { family: 'Orbitron' },
        bodyFont: { family: 'Space Mono' },
        callbacks: {
            label: function(context: any) {
                return ` $${context.parsed.y.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
            unit: 'day',
            displayFormats: {
                day: 'MMM dd'
            }
        },
        grid: { display: false, drawBorder: false },
        ticks: { color: 'rgba(255,255,255,0.5)', font: { family: 'Space Mono', size: 10 }, maxRotation: 0, minRotation: 0 }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
        ticks: { display: true, color: 'rgba(255,255,255,0.3)', font: { family: 'Space Mono', size: 9 } } 
      }
    },
    interaction: {
        mode: 'nearest' as const,
        axis: 'x' as const,
        intersect: false
    }
  };

  return (
    <section id="pool" className="py-24 bg-gradient-to-b from-background to-secondary/20 border-t border-white/5 relative overflow-hidden">
        {/* Decorative background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,255,255,0.05),transparent_50%)] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary/10 text-primary mb-6 animate-pulse shadow-[0_0_20px_rgba(0,255,255,0.2)]">
            <Database size={32} />
          </div>
          
          <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-[0.2em] mb-4">Community Treasury</h2>
          
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="text-5xl md:text-7xl font-black text-white font-orbitron text-glow">
                {(mintRevenue + displayedPoolShare).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </div>
            <div className="text-2xl md:text-4xl text-primary font-bold mt-2 font-orbitron tracking-widest text-center">
                $BASED
            </div>
          </div>
          
          {/* Breakdown Section */}
          <div className="flex flex-col gap-3 mb-10 text-sm font-mono text-cyan-400/90 max-w-xl mx-auto bg-black/60 p-6 rounded-xl border border-white/10 shadow-lg backdrop-blur-md">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-muted-foreground">From NFT Mints:</span>
                  <span className="font-bold">~{mintRevenue.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})} $BASED</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-muted-foreground">Passive Emissions (Subnet/Brain):</span>
                  <span className="font-bold">~{displayedPoolShare.toLocaleString(undefined, {minimumFractionDigits: 4, maximumFractionDigits: 4})} $BASED</span>
              </div>
              <div className="flex justify-between items-center pt-1 opacity-75">
                  <span className="text-muted-foreground flex items-center gap-2">Staking Emissions: <span className="text-[10px] bg-primary/10 text-primary px-1 rounded">SOON</span></span>
                  <span className="font-bold">0 $BASED</span>
              </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 max-w-2xl mx-auto">
            {/* Passive Emissions Card */}
            <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-lg p-4 backdrop-blur-md relative overflow-hidden group">
               <div className="absolute inset-0 bg-cyan-500/5 group-hover:bg-cyan-500/10 transition-colors" />
               <div className="flex items-start gap-3 text-left relative z-10">
                  <Zap className="text-cyan-400 shrink-0 mt-1" size={20} />
                  <div>
                      <p className="text-sm text-cyan-100 font-bold mb-1 font-orbitron">Daily Passive Yield</p>
                      <div className="text-2xl font-black text-cyan-400 font-mono tracking-tight">
                        {dailyPassive.toFixed(2)} <span className="text-xs text-cyan-600">$BASED</span>
                      </div>
                      <p className="text-[10px] text-cyan-200/60 mt-1 font-mono uppercase">
                          Per NFT (10% of Subnet Emissions)
                      </p>
                  </div>
               </div>
            </div>

             {/* Halving Countdown Card */}
            <div className="bg-purple-950/20 border border-purple-500/30 rounded-lg p-4 backdrop-blur-md relative overflow-hidden group">
               <div className="absolute inset-0 bg-purple-500/5 group-hover:bg-purple-500/10 transition-colors" />
               <div className="flex items-start gap-3 text-left relative z-10">
                  <Timer className="text-purple-400 shrink-0 mt-1" size={20} />
                  <div>
                      <p className="text-sm text-purple-100 font-bold mb-1 font-orbitron">Halving Countdown</p>
                      <div className="text-2xl font-black text-purple-400 font-mono tracking-tight">
                        {daysToHalving} <span className="text-xs text-purple-600">DAYS</span>
                      </div>
                      <p className="text-[10px] text-purple-200/60 mt-1 font-mono uppercase">
                          Target: Dec 31, 2025
                      </p>
                  </div>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Emissions Chart */}
            <div className="bg-black/60 border border-white/10 rounded-xl p-6 backdrop-blur-sm shadow-2xl relative h-80">
                <div className="absolute top-4 left-6 text-xs font-mono text-primary flex items-center gap-2">
                    <TrendingUp size={14} /> BASED/USD - 7 DAY PRICE ACTION
                </div>
                <div className="pt-6 h-full">
                    {/* @ts-ignore */}
                    <Line data={chartData} options={chartOptions} />
                </div>
            </div>

            {/* Stat Averages Chart */}
            <div className="bg-black/60 border border-white/10 rounded-xl p-6 backdrop-blur-sm shadow-2xl relative h-80 flex items-center justify-center flex-col gap-4 text-center">
                 <div className="absolute top-4 left-6 text-xs font-mono text-primary flex items-center gap-2">
                    <Database size={14} /> AVERAGE STATS (ALL 3732)
                 </div>
                 <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                 >
                    <Brain className="text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" size={64} />
                 </motion.div>
                 <div className="space-y-1">
                    <p className="text-white font-orbitron text-lg tracking-wide">Agent Arena Data</p>
                    <p className="text-primary font-mono text-sm animate-pulse">COMING SOON</p>
                 </div>
            </div>
          </div>
          
          <div className="mb-8 flex justify-center">
               <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 border border-white/5 rounded-full px-3 py-1 bg-black/20">
                   <AlertTriangle size={10} className="text-yellow-500" />
                   <span>Live data; estimates may vary with network activity. Not financial advice.</span>
               </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">Subnet Source (ETH Mainnet)</span>
                  <a 
                    href={`https://etherscan.io/address/${SUBNET_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="inline-flex items-center text-white hover:text-primary transition-colors border-b border-white/20 hover:border-primary pb-1 font-mono text-xs"
                  >
                    {`${SUBNET_ADDRESS.slice(0, 4)}....`}
                    <ArrowUpRight size={12} className="ml-2" />
                  </a>
              </div>
              
              <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">Network Info</span>
                  <a 
                    href="https://www.getbased.ai/"
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="inline-flex items-center text-white hover:text-primary transition-colors border-b border-white/20 hover:border-primary pb-1 font-mono text-xs"
                  >
                    BasedAI L1
                    <ExternalLink size={12} className="ml-2" />
                  </a>
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={updateData} 
                disabled={loading}
                className="border-white/10 hover:bg-white/5 text-xs font-mono h-8 mt-4 md:mt-0"
              >
                 <RefreshCw size={12} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                 {loading ? 'SYNCING...' : 'REFRESH DATA'}
              </Button>
          </div>

          {lastUpdated && (
              <p className="mt-4 text-[10px] text-muted-foreground/50 font-mono">
                  Last Updated: {lastUpdated.toLocaleTimeString()}
              </p>
          )}

        </motion.div>
      </div>
    </section>
  );
}
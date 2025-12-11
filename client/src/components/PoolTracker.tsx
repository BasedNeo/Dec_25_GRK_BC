import { MOCK_POOL_BALANCE, calculatePoolBalance, MINT_PRICE, calculateEmissions, HALVING_TIMESTAMP, EMISSION_RATE_DAILY } from "@/lib/mockData";
import { motion } from "framer-motion";
import { Database, ArrowUpRight, TrendingUp, RefreshCw, Info } from "lucide-react";
import { Line } from "react-chartjs-2";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { fetchTotalSupply } from "@/lib/onchain";
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

export function PoolTracker() {
  const [balance, setBalance] = useState<number>(MOCK_POOL_BALANCE);
  const [mintedCount, setMintedCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const updateBalance = async () => {
      // 1. Get Emissions (Calculated)
      const emissions = calculateEmissions();
      
      // 2. Get Mint Count (On-chain)
      let currentMinted = mintedCount;
      if (currentMinted === null) {
          const supply = await fetchTotalSupply();
          if (supply !== null) {
              currentMinted = supply;
              setMintedCount(supply);
          } else {
              // Fallback to mock if fetch fails
              currentMinted = 6; 
          }
      }

      // 3. Calculate Total
      // Pool = (Minted * Price) + Emissions
      const mintRevenue = (currentMinted || 6) * MINT_PRICE;
      const total = mintRevenue + emissions;
      
      setBalance(total);
  };

  useEffect(() => {
    // Initial Load
    updateBalance();
    setLastUpdated(new Date());

    // Live Ticker (Updates emissions every second)
    const interval = setInterval(() => {
        updateBalance();
    }, 1000);

    return () => clearInterval(interval);
  }, [mintedCount]); // Re-run if mint count updates

  const fetchOnChainData = async () => {
    setLoading(true);
    try {
        const supply = await fetchTotalSupply();
        if (supply !== null) {
            setMintedCount(supply);
            setLastUpdated(new Date());
        }
    } catch (e) {
        console.error("Failed to sync onchain", e);
    } finally {
        setLoading(false);
    }
  };

  const displayBalance = balance.toLocaleString();

  const symbol = "$BASED";
  
  // Generate Chart Data: Project to Halving (Dec 31, 2025)
  const chartData = useMemo(() => {
      const labels = [];
      const dataPoints = [];
      
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      // Generate monthly points until Dec 2025
      let iterDate = new Date(currentYear, currentMonth, 1);
      const endDate = new Date(HALVING_TIMESTAMP);
      
      let accumulatedEmissions = calculateEmissions(); // Start with current
      
      while (iterDate <= endDate) {
          labels.push(iterDate.toISOString().split('T')[0]); // YYYY-MM-DD
          dataPoints.push(accumulatedEmissions);
          
          // Add ~30 days of emissions
          accumulatedEmissions += EMISSION_RATE_DAILY * 30;
          
          // Increment month
          iterDate.setMonth(iterDate.getMonth() + 1);
      }
      
      // Add final point
      labels.push(new Date(HALVING_TIMESTAMP).toISOString().split('T')[0]);
      dataPoints.push(accumulatedEmissions);

      return {
        labels,
        datasets: [
          {
            label: 'Projected Emissions ($BASED)',
            data: dataPoints,
            borderColor: '#00ffff',
            backgroundColor: 'rgba(0, 255, 255, 0.1)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#000',
            pointBorderColor: '#00ffff',
            pointBorderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 6
          }
        ]
      };
  }, []);

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
                return ` ${context.parsed.y.toLocaleString()} $BASED`;
            }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
            unit: 'month',
            displayFormats: {
                month: 'MMM yyyy'
            }
        },
        grid: { display: false, drawBorder: false },
        ticks: { color: 'rgba(255,255,255,0.5)', font: { family: 'Space Mono', size: 10 }, maxRotation: 45, minRotation: 45 }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
        ticks: { display: false } // Hide Y axis labels for cleaner look
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
          
          <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-[0.2em] mb-4">Community Treasury & Emissions</h2>
          
          <div className="text-6xl md:text-8xl font-black text-white mb-2 font-orbitron text-glow">
            {displayBalance}
          </div>
          
          <div className="text-2xl text-primary font-orbitron mb-6">{symbol}</div>
          
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 max-w-lg mx-auto mb-10 backdrop-blur-md">
             <div className="flex items-start gap-3 text-left">
                <Info className="text-primary shrink-0 mt-1" size={18} />
                <div>
                    <p className="text-sm text-white font-bold mb-1">Passive Emissions (non-staking)</p>
                    <p className="text-xs text-muted-foreground">
                        Subnet emissions from <span className="text-white font-mono">{SUBNET_ADDRESS.slice(0,6)}...</span> flow into this community pool over time.
                        <br/><span className="text-[10px] text-primary/70 mt-1 block">Current Rate Est. ~5,000 BASED/day (Halving forecast late Dec 2,500 BASED/day)</span>
                        {mintedCount !== null && (
                            <span className="text-[10px] text-green-400 mt-1 block font-mono">
                                + Live Mint Revenue: {(mintedCount * MINT_PRICE).toLocaleString()} BASED (from {mintedCount} mints)
                            </span>
                        )}
                    </p>
                </div>
             </div>
          </div>

          {/* Chart Container */}
          <div className="w-full h-64 md:h-80 bg-black/60 border border-white/10 rounded-xl p-6 mb-8 backdrop-blur-sm shadow-2xl relative">
             <div className="absolute top-4 left-6 text-xs font-mono text-primary flex items-center gap-2">
                <TrendingUp size={14} /> PROJECTED EMISSIONS TO HALVING (DEC 2025)
             </div>
             <div className="pt-6 h-full">
                {/* @ts-ignore */}
                <Line data={chartData} options={chartOptions} />
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
                    {SUBNET_ADDRESS}
                    <ArrowUpRight size={12} className="ml-2" />
                  </a>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchOnChainData} 
                disabled={loading}
                className="border-white/10 hover:bg-white/5 text-xs font-mono h-8"
              >
                 <RefreshCw size={12} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                 {loading ? 'SYNCING ON-CHAIN...' : 'REFRESH ON-CHAIN'}
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

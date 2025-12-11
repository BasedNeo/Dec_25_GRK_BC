import { MOCK_POOL_BALANCE } from "@/lib/mockData";
import { motion } from "framer-motion";
import { Database, ArrowUpRight, TrendingUp } from "lucide-react";
import { useBalance } from "wagmi";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function PoolTracker() {
  const { data: balanceData } = useBalance({
    address: import.meta.env.VITE_POOL_WALLET as `0x${string}` || undefined,
  });

  // Use real balance if available, otherwise fallback to mock
  const displayBalance = balanceData 
    ? parseFloat(balanceData.formatted).toLocaleString(undefined, { maximumFractionDigits: 0 }) 
    : MOCK_POOL_BALANCE.toLocaleString();

  const symbol = balanceData?.symbol || "$BASED";

  // Mock Chart Data
  const chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Pool Growth',
        data: [1000000, 1500000, 1800000, 2200000, 2800000, MOCK_POOL_BALANCE],
        borderColor: '#00ffff',
        backgroundColor: 'rgba(0, 255, 255, 0.1)',
        tension: 0.4,
        fill: true,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleColor: '#fff',
        bodyColor: '#00ffff',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
      }
    },
    scales: {
      x: {
        grid: { display: false, drawBorder: false },
        ticks: { color: 'rgba(255,255,255,0.5)' }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
        ticks: { display: false }
      }
    }
  };

  return (
    <section id="pool" className="py-24 bg-gradient-to-b from-background to-secondary/20 border-t border-white/5">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary/10 text-primary mb-6 animate-pulse">
            <Database size={32} />
          </div>
          
          <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-[0.2em] mb-4">Community Treasury</h2>
          
          <div className="text-6xl md:text-8xl font-black text-white mb-6 font-orbitron text-glow">
            {displayBalance}
          </div>
          
          <div className="text-2xl text-primary font-orbitron mb-12">{symbol}</div>
          
          <p className="text-muted-foreground max-w-xl mx-auto mb-12 text-lg">
            Pool increases by emissions and royalties from secondary sales.
          </p>

          {/* Chart Container */}
          <div className="w-full h-64 md:h-80 bg-black/40 border border-white/10 rounded-xl p-4 mb-12 backdrop-blur-sm">
             <Line data={chartData} options={chartOptions} />
          </div>

          <div className="flex flex-col items-center gap-4">
              <span className="text-xs font-mono text-muted-foreground">TREASURY CONTRACT</span>
              <a 
                href={`https://basescan.org/address/${import.meta.env.VITE_POOL_WALLET || "0x..."}`}
                target="_blank"
                rel="noopener noreferrer" 
                className="inline-flex items-center text-primary hover:text-accent transition-colors border-b border-primary/30 hover:border-accent pb-1 font-mono text-sm"
              >
                {import.meta.env.VITE_POOL_WALLET ? `${import.meta.env.VITE_POOL_WALLET.slice(0,6)}...${import.meta.env.VITE_POOL_WALLET.slice(-4)}` : "0xPOOL...ADDR"} 
                <ArrowUpRight size={14} className="ml-2" />
              </a>
          </div>

          <div className="mt-8 pt-8 border-t border-white/5">
             <div className="flex justify-center gap-2 text-[10px] text-muted-foreground font-mono">
                 <span>GOVERNANCE: DAO</span>
                 <span>•</span>
                 <span>ADMIN: {import.meta.env.VITE_ADMIN_WALLET ? `${import.meta.env.VITE_ADMIN_WALLET.slice(0,6)}...` : "0xADMN..."}</span>
             </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

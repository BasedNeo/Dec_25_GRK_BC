import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, Tooltip as RechartsTooltip } from 'recharts';
import { Database } from 'lucide-react';
import { motion } from 'framer-motion';

const STATS_DATA = [
  { name: 'Speed', value: 7.0, color: '#00ffff' },    // Cyan
  { name: 'Agility', value: 7.8, color: '#bf00ff' },  // Purple
  { name: 'Intellect', value: 8.0, color: '#00ffff' }, // Cyan
  { name: 'Strength', value: 6.2, color: '#bf00ff' }, // Purple
];

export function AverageStatsChart() {
  return (
    <div className="w-full bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-6 shadow-xl relative overflow-hidden group hover:border-primary/30 transition-colors duration-300">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6 text-primary font-orbitron tracking-widest text-sm">
        <Database size={16} className="text-primary animate-pulse" />
        <span className="text-glow">AVERAGE STATS (ALL 3732)</span>
      </div>

      {/* Chart */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={STATS_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#9ca3af', fontSize: 12, fontFamily: 'Rajdhani' }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#9ca3af', fontSize: 12, fontFamily: 'Rajdhani' }} 
              domain={[0, 10]}
              ticks={[0, 2, 4, 6, 8]}
            />
            <RechartsTooltip 
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{ 
                backgroundColor: 'rgba(0,0,0,0.9)', 
                border: '1px solid rgba(0,255,255,0.3)', 
                borderRadius: '8px',
                fontFamily: 'Orbitron',
                color: '#fff'
              }}
              itemStyle={{ color: '#fff' }}
              labelStyle={{ color: '#00ffff', marginBottom: '4px' }}
            />
            <Bar 
              dataKey="value" 
              radius={[4, 4, 0, 0]}
              animationDuration={1500}
            >
              {STATS_DATA.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color} 
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                  filter="drop-shadow(0 0 8px rgba(0,255,255,0.2))"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Decorative Corner */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary/10 to-transparent pointer-events-none" />
      <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_cyan]" />
    </div>
  );
}

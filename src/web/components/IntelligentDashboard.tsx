"use client";

import React from "react";
import { MatrixCell } from "./MatrixCell";
import { motion, AnimatePresence } from "framer-motion";
import { usePriceStream } from "@/src/web/hooks/usePriceStream";

interface StockCardProps {
  stock: any;
}

const StockCard = ({ stock }: StockCardProps) => {
  // Real-time price simulation
  const mockInitialPrice = 150 + (stock.symbol.charCodeAt(0) % 100);
  const livePrice = usePriceStream(stock.symbol, mockInitialPrice);
  
  // Simulated intelligence metrics
  const correlation = 0.8 + (stock.symbol.charCodeAt(1) % 20) / 100;
  const beta = 0.9 + (stock.symbol.charCodeAt(0) % 50) / 100;
  const flow = 40 + (stock.symbol.charCodeAt(2) % 60);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass-panel p-6 flex flex-col gap-6 group hover:border-primary/50 transition-colors cursor-pointer"
    >
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <span className="text-2xl font-black tracking-tighter group-hover:text-primary transition-colors">
            {stock.symbol}
          </span>
          <span className="text-xs font-medium text-muted-foreground truncate max-w-[150px]">
            {stock.company}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-lg font-mono font-bold tabular-nums">
            ${livePrice.toFixed(2)}
          </span>
          <div className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded mt-1">
            LIVE STREAM
          </div>
        </div>
      </div>

      <div className="data-grid rounded-lg overflow-hidden border border-border/10">
        <MatrixCell 
          label="Correlation" 
          value={correlation.toFixed(2)} 
          subValue={correlation > 0.9 ? "HIGH" : "SYNC"} 
          trend={correlation > 0.9 ? "up" : "neutral"} 
        />
        <MatrixCell 
          label="Risk Beta" 
          value={beta.toFixed(2)} 
          subValue={beta > 1.2 ? "VOLATILE" : "STABLE"} 
          trend={beta > 1.2 ? "down" : "up"} 
        />
        <MatrixCell 
          label="Inst. Flow" 
          value={flow} 
          subValue={flow > 70 ? "ACCUM" : flow < 40 ? "DIST" : "NEUT"} 
          trend={flow > 70 ? "up" : flow < 40 ? "down" : "neutral"} 
        />
      </div>
    </motion.div>
  );
};

interface IntelligentDashboardProps {
  initialWatchlist: any[];
}

export const IntelligentDashboard = ({ initialWatchlist }: IntelligentDashboardProps) => {
  return (
    <div className="flex flex-col gap-8 p-6 lg:p-12 max-w-[1600px] mx-auto">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-1 bg-primary animate-pulse" />
          <span className="text-xs font-black text-primary tracking-[0.4em] uppercase">Matrix Online</span>
        </div>
        <div className="flex justify-between items-end">
          <h1 className="text-6xl lg:text-8xl font-black text-foreground tracking-tighter leading-none">
            INERTIA <span className="text-primary italic">01</span>
          </h1>
          <div className="hidden lg:flex flex-col items-end text-right">
             <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-tighter">System Status</span>
             <span className="text-success font-black text-sm uppercase">Nominal / All Sensors Active</span>
          </div>
        </div>
        <p className="text-muted-foreground max-w-2xl text-lg font-medium border-l-2 border-primary/20 pl-6 mt-4">
          Autonomous market surveillance engine. Aggregating multi-scalar volatility data into institutional-grade actionable intelligence.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {initialWatchlist.map((stock) => (
            <StockCard key={stock.symbol} stock={stock} />
          ))}
        </AnimatePresence>

        {initialWatchlist.length === 0 && (
          <div className="col-span-full py-32 flex flex-col items-center justify-center text-center glass-panel italic">
            <span className="text-muted-foreground mb-4">No assets currently under surveillance.</span>
            <div className="w-12 h-1 bg-primary/20 animate-pulse mb-6" />
            <p className="text-sm font-bold uppercase tracking-widest text-primary/60">Awaiting Signal Input</p>
          </div>
        )}
      </div>
    </div>
  );
};

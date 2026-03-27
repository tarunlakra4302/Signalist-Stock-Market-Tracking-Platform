'use client';

import React from 'react';
import { Zap, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const SIGNALS = [
    {
        id: '1',
        type: 'STRENGTH',
        asset: 'NVDA',
        message: 'Bullish Divergence detected on 4H Timeline. Momentum shifting upward.',
        probability: 88,
        time: '2m ago',
        severity: 'high'
    },
    {
        id: '2',
        type: 'VOLATILITY',
        asset: 'BTC/USD',
        message: 'Extreme volatility Spike. Liquidation cluster identified at $92,400.',
        probability: 72,
        time: '15m ago',
        severity: 'med'
    },
    {
        id: '3',
        type: 'SENTIMENT',
        asset: 'AAPL',
        message: 'Institutional buy-side pressure increasing. Sentiment score: 8.4/10.',
        probability: 65,
        time: '42m ago',
        severity: 'low'
    }
];

const SignalFeed = () => {
    return (
        <div className="premium-card h-full flex flex-col overflow-hidden">
            <header className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary fill-primary/20" />
                    <h3 className="font-bold text-xl text-primary tracking-tight uppercase">Proprietary Signals</h3>
                </div>
                <div className="flex items-center gap-2 px-2 py-1 bg-primary/10 rounded-full">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    <span className="text-[10px] font-bold text-primary uppercase">Live</span>
                </div>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto pr-2 scrollbar-hide">
                {SIGNALS.map((signal) => (
                    <div 
                        key={signal.id} 
                        className={cn(
                            "group p-4 rounded-lg bg-secondary/30 border border-border/50 hover:border-primary/30 transition-all cursor-pointer relative overflow-hidden",
                            signal.severity === 'high' && "border-l-4 border-l-market-up"
                        )}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-black text-primary/70 tracking-widest uppercase">{signal.type}</span>
                            <span className="text-[10px] text-muted-foreground font-medium uppercase">{signal.time}</span>
                        </div>
                        <h4 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
                            {signal.asset}
                            {signal.severity === 'high' && <TrendingUp className="w-4 h-4 text-market-up" />}
                        </h4>
                        <p className="text-sm text-muted-foreground leading-snug line-clamp-2 italic">
                            "{signal.message}"
                        </p>
                        
                        <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="h-1 w-24 bg-border/50 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-primary" 
                                        style={{ width: `${signal.probability}%` }}
                                    ></div>
                                </div>
                                <span className="text-[10px] font-bold text-foreground/80">{signal.probability}% Prob.</span>
                            </div>
                            <button className="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity uppercase underline underline-offset-4">
                                Deep Analysis
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <footer className="mt-6 pt-6 border-t border-border/50 text-center">
                <button className="text-xs font-black text-muted-foreground hover:text-primary transition-colors tracking-[0.2em] uppercase">
                    Access Neural Engine &rarr;
                </button>
            </footer>
        </div>
    );
};

export default SignalFeed;

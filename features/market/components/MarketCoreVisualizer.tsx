'use client';

import React, { memo } from 'react';
import useMarketStream from "@/features/market/hooks/useMarketStream";
import {cn} from "@/lib/utils";

interface MarketCoreVisualizerProps {
    title?: string;
    scriptUrl: string;
    config: Record<string, unknown>;
    height?: number;
    className?: string;
}

const MarketCoreVisualizer = ({ title, scriptUrl, config, height = 600, className }: MarketCoreVisualizerProps) => {
    const containerRef = useMarketStream(scriptUrl, config, height);

    return (
        <div className={cn("premium-card w-full h-full flex flex-col", className)}>
            {title && <h3 className="font-bold text-xl text-primary mb-6 tracking-tight">{title}</h3>}
            <div className="market-visualizer-container flex-1 rounded-lg overflow-hidden border border-border/50" ref={containerRef}>
                <div className="market-visualizer-content" style={{ height: '100%', width: "100%" }} />
            </div>
        </div>
    );
}

export default memo(MarketCoreVisualizer);

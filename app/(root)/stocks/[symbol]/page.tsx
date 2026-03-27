import TradingViewWidget from "@/components/TradingViewWidget";
import {
  SYMBOL_INFO_WIDGET_CONFIG,
  CANDLE_CHART_WIDGET_CONFIG,
  TECHNICAL_ANALYSIS_WIDGET_CONFIG,
  COMPANY_PROFILE_WIDGET_CONFIG,
} from "@/lib/constants";
import { stockService } from "@/src/application/stocks/stock.service";
import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";

export default async function StockDetails({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  
  const inWatchlistResult = userId 
    ? await stockService.checkWatchlistStatus(userId, symbol)
    : { success: true, data: false };
    
  const inWatchlist = inWatchlistResult.success ? inWatchlistResult.data : false;
  const scriptUrl = `https://s3.tradingview.com/external-embedding/embed-widget-`;

  return (
    <div className="flex flex-col min-h-screen p-6 lg:p-12 gap-8 bg-background">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-black tracking-tighter uppercase">
          Asset <span className="text-primary italic">Intelligence</span>: {symbol}
        </h1>
        <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">
          Deep Surveillance Matrix / Node: {symbol.toUpperCase()}
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 flex flex-col gap-6">
           <div className="glass-panel p-1 rounded-lg overflow-hidden">
            <TradingViewWidget
              scriptUrl={`${scriptUrl}advanced-chart.js`}
              config={CANDLE_CHART_WIDGET_CONFIG(symbol)}
              height={600}
            />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="glass-panel p-6 flex flex-col gap-4">
             <div className="flex justify-between items-center">
                <span className="text-sm font-bold uppercase tracking-wider">Surveillance Status</span>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black ${inWatchlist ? 'bg-success/20 text-success border border-success/30' : 'bg-muted/20 text-muted-foreground border border-border'}`}>
                  {inWatchlist ? 'ACTIVE MONITOR' : 'UNTRACKED'}
                </div>
             </div>
             <p className="text-xs text-muted-foreground italic">
                {inWatchlist 
                  ? "This asset is currently being monitored by the Inertia risk engine." 
                  : "Deploy sensors to this asset to begin correlation analysis."}
             </p>
          </div>

          <div className="glass-panel rounded-lg overflow-hidden">
            <TradingViewWidget
              scriptUrl={`${scriptUrl}technical-analysis.js`}
              config={TECHNICAL_ANALYSIS_WIDGET_CONFIG(symbol)}
              height={400}
            />
          </div>
          
          <div className="glass-panel rounded-lg overflow-hidden">
            <TradingViewWidget
              scriptUrl={`${scriptUrl}symbol-info.js`}
              config={SYMBOL_INFO_WIDGET_CONFIG(symbol)}
              height={200}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

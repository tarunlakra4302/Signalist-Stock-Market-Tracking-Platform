import { getUserWatchlist } from '@/lib/actions/watchlist.actions';
import { getUserAlerts } from '@/lib/actions/alert.actions';
import WatchlistTable from '@/components/WatchlistTable';
import SearchCommand from '@/components/SearchCommand';
import { searchStocks } from '@/lib/actions/finnhub.actions';

export default async function WatchlistPage() {
  const [watchlistResult, alertsResult, initialStocks] = await Promise.all([
    getUserWatchlist(),
    getUserAlerts(),
    searchStocks(),
  ]);

  const watchlist = watchlistResult.success ? watchlistResult.data : [];
  const alerts = alertsResult.success ? alertsResult.data : [];

  return (
    <div className="dashboard-wrapper">
      <header className="flex flex-col gap-2 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-1 bg-primary" />
          <span className="text-[10px] font-bold text-primary tracking-[0.3em] uppercase">Asset Monitor</span>
        </div>
        <div className="flex justify-between items-end">
          <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase">
            Surveillance <span className="text-primary italic">Matrix</span>
          </h1>
          <SearchCommand renderAs="button" label="Initiate Tracking" initialStocks={initialStocks} />
        </div>
      </header>

      {watchlist.length === 0 ? (
        <div className="premium-card flex flex-col items-center justify-center py-20 text-center glass-effect">
          <div className="text-5xl mb-6 opacity-50 grayscale">📡</div>
          <h2 className="text-2xl font-bold text-foreground mb-3 tracking-tight">
            No Active Signals Detected
          </h2>
          <p className="text-muted-foreground mb-8 max-w-sm italic">
            Assign assets to the surveillance matrix to begin real-time neural processing.
          </p>
          <SearchCommand renderAs="button" label="Deploy Sensors" initialStocks={initialStocks} />
        </div>
      ) : (
        <div className="premium-card p-0 overflow-hidden border-border/40">
          <WatchlistTable watchlist={watchlist} alerts={alerts} />
        </div>
      )}
    </div>
  );
}

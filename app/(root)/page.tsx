import { IntelligentDashboard } from "@/src/web/components/IntelligentDashboard";
import { getWatchlistAction } from "@/src/api/stocks/actions";

export default async function DashboardPage() {
  const result = await getWatchlistAction();
  const watchlist = result.success ? result.data : [];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <IntelligentDashboard initialWatchlist={watchlist} />
    </main>
  );
}

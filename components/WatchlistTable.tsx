'use client';

import { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { Trash2, Bell, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AlertModal from '@/components/AlertModal';
import { removeFromWatchlist } from '@/lib/actions/watchlist.actions';
import { deleteAlert } from '@/lib/actions/alert.actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useLivePrice } from '@/hooks/useLivePrice';

interface WatchlistItem {
  symbol: string;
  company: string;
  addedAt: Date;
}

interface AlertItem {
  id: string;
  symbol: string;
  company: string;
  alertName: string;
  alertType: 'upper' | 'lower';
  threshold: number;
  createdAt: Date;
}

interface WatchlistTableProps {
  watchlist: WatchlistItem[];
  alerts: AlertItem[];
}

/**
 * Price cell component with flash animation on price changes.
 */
function LivePriceCell({
  symbol,
  prices,
}: {
  symbol: string;
  prices: Map<string, { price: number; previousPrice: number | null; isLive: boolean; lastUpdated: Date }>;
}) {
  const priceData = prices.get(symbol);

  if (!priceData) {
    return <span className="text-gray-500 text-sm">—</span>;
  }

  const { price, previousPrice } = priceData;
  const direction =
    previousPrice !== null
      ? price > previousPrice
        ? 'up'
        : price < previousPrice
          ? 'down'
          : null
      : null;

  const flashClass = direction === 'up'
    ? 'price-flash-up'
    : direction === 'down'
      ? 'price-flash-down'
      : '';

  return (
    <span
      key={`${symbol}-${price}-${Date.now()}`}
      className={`font-mono text-sm font-medium ${flashClass} ${
        direction === 'up'
          ? 'text-emerald-400'
          : direction === 'down'
            ? 'text-red-400'
            : 'text-gray-200'
      }`}
    >
      ${price.toFixed(2)}
    </span>
  );
}

export default function WatchlistTable({ watchlist: initialWatchlist, alerts: initialAlerts }: WatchlistTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [watchlist, setWatchlist] = useState(initialWatchlist);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<{ symbol: string; company: string } | null>(null);

  // Extract symbols for live price streaming
  const symbols = useMemo(() => watchlist.map((item) => item.symbol), [watchlist]);
  const { prices, isConnected } = useLivePrice(symbols);

  const handleRemoveStock = async (symbol: string) => {
    startTransition(async () => {
      const result = await removeFromWatchlist(symbol);
      if (result.success) {
        setWatchlist((prev) => prev.filter((item) => item.symbol !== symbol));
        toast.success(`${symbol} removed from watchlist`);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to remove stock');
      }
    });
  };

  const handleDeleteAlert = async (alertId: string) => {
    startTransition(async () => {
      const result = await deleteAlert(alertId);
      if (result.success) {
        setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
        toast.success('Alert deleted successfully');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to delete alert');
      }
    });
  };

  const handleCreateAlert = (symbol: string, company: string) => {
    setSelectedStock({ symbol, company });
    setAlertModalOpen(true);
  };

  const getAlertsForSymbol = (symbol: string) => {
    return alerts.filter((alert) => alert.symbol === symbol);
  };

  const handleAlertSuccess = () => {
    router.refresh();
  };

  return (
    <>
      {/* Live indicator */}
      {isConnected && (
        <div className="flex items-center gap-2 mb-4 px-4">
          <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400 font-medium">LIVE</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left p-4 text-gray-400 font-medium">Company</th>
              <th className="text-left p-4 text-gray-400 font-medium">Symbol</th>
              <th className="text-left p-4 text-gray-400 font-medium">Price</th>
              <th className="text-left p-4 text-gray-400 font-medium">Added</th>
              <th className="text-left p-4 text-gray-400 font-medium">Alerts</th>
              <th className="text-left p-4 text-gray-400 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {watchlist.map((item) => {
              const stockAlerts = getAlertsForSymbol(item.symbol);
              return (
                <tr
                  key={item.symbol}
                  className="border-b border-gray-800 hover:bg-gray-900/50 transition-colors"
                >
                  <td className="p-4">
                    <Link
                      href={`/stocks/${item.symbol}`}
                      className="text-gray-100 hover:text-yellow-500 transition-colors font-medium"
                    >
                      {item.company}
                    </Link>
                  </td>
                  <td className="p-4">
                    <Link
                      href={`/stocks/${item.symbol}`}
                      className="text-gray-400 hover:text-yellow-500 transition-colors"
                    >
                      {item.symbol}
                    </Link>
                  </td>
                  <td className="p-4">
                    <LivePriceCell symbol={item.symbol} prices={prices} />
                  </td>
                  <td className="p-4 text-gray-400">
                    {new Date(item.addedAt).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    {stockAlerts.length > 0 ? (
                      <div className="space-y-2">
                        {stockAlerts.map((alert) => (
                          <div
                            key={alert.id}
                            className="flex items-center gap-2 text-sm bg-gray-900 rounded px-3 py-2"
                          >
                            <Bell className="h-3 w-3 text-yellow-500" />
                            <span className="text-gray-300">{alert.alertName}</span>
                            <span className="text-gray-500">
                              ({alert.alertType === 'upper' ? '>' : '<'} ${alert.threshold})
                            </span>
                            <button
                              onClick={() => handleDeleteAlert(alert.id)}
                              disabled={isPending}
                              className="ml-auto text-red-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">No alerts</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCreateAlert(item.symbol, item.company)}
                        disabled={isPending}
                        className="border-gray-700 text-gray-300 hover:bg-gray-800"
                      >
                        <Bell className="h-4 w-4 mr-1" />
                        Alert
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveStock(item.symbol)}
                        disabled={isPending}
                        className="border-red-900/50 text-red-500 hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedStock && (
        <AlertModal
          open={alertModalOpen}
          setOpen={setAlertModalOpen}
          symbol={selectedStock.symbol}
          company={selectedStock.company}
          onSuccess={handleAlertSuccess}
        />
      )}
    </>
  );
}

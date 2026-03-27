import { useState, useEffect } from "react";
import { getWatchlistAction } from "@/src/api/stocks/actions";

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWatchlist() {
      const result = await getWatchlistAction();
      if (result.success) {
        setWatchlist(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    }

    fetchWatchlist();
  }, []);

  return { watchlist, loading, error };
}

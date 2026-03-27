import { Result } from "@/src/core/result";
import { WatchlistEntry } from "./types";

export interface StockRepository {
  getWatchlist(userId: string): Promise<Result<WatchlistEntry[]>>;
  addToWatchlist(entry: WatchlistEntry): Promise<Result<void>>;
  removeFromWatchlist(userId: string, symbol: string): Promise<Result<void>>;
  isInWatchlist(userId: string, symbol: string): Promise<Result<boolean>>;
}

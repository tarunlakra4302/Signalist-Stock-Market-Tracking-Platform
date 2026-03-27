import { Result, success, failure, wrap } from "@/src/core/result";
import { StockRepository } from "@/src/domain/stocks/repository";
import { WatchlistEntry } from "@/src/domain/stocks/types";
import { Watchlist } from "@/src/infrastructure/models/watchlist.model";
import { connectToDatabase } from "@/src/infrastructure/database";

export class MongoStockRepository implements StockRepository {
  async getWatchlist(userId: string): Promise<Result<WatchlistEntry[]>> {
    try {
      await connectToDatabase();
      const docs = await Watchlist.find({ userId }).sort({ addedAt: -1 }).lean();
      
      const entries: WatchlistEntry[] = docs.map((doc: any) => ({
        userId: doc.userId,
        symbol: doc.symbol,
        company: doc.company,
        addedAt: doc.addedAt,
      }));

      return success(entries);
    } catch (error) {
      return failure(error instanceof Error ? error : new Error("Failed to fetch watchlist"));
    }
  }

  async addToWatchlist(entry: WatchlistEntry): Promise<Result<void>> {
    try {
      await connectToDatabase();
      await Watchlist.create({
        userId: entry.userId,
        symbol: entry.symbol.toUpperCase(),
        company: entry.company,
        addedAt: entry.addedAt,
      });
      return success(undefined);
    } catch (error: any) {
      if (error.code === 11000) {
        return failure(new Error("Stock already in watchlist"));
      }
      return failure(error instanceof Error ? error : new Error("Failed to add to watchlist"));
    }
  }

  async removeFromWatchlist(userId: string, symbol: string): Promise<Result<void>> {
    try {
      await connectToDatabase();
      await Watchlist.deleteOne({ userId, symbol: symbol.toUpperCase() });
      return success(undefined);
    } catch (error) {
      return failure(error instanceof Error ? error : new Error("Failed to remove from watchlist"));
    }
  }

  async isInWatchlist(userId: string, symbol: string): Promise<Result<boolean>> {
    try {
      await connectToDatabase();
      const count = await Watchlist.countDocuments({ userId, symbol: symbol.toUpperCase() });
      return success(count > 0);
    } catch (error) {
      return failure(error instanceof Error ? error : new Error("Failed to check watchlist status"));
    }
  }
}

export const stockRepository = new MongoStockRepository();

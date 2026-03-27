import { Result, failure } from "@/src/core/result";
import { StockRepository } from "@/src/domain/stocks/repository";
import { WatchlistEntry } from "@/src/domain/stocks/types";
import { stockRepository } from "@/src/infrastructure/repositories/stock.repository";
import { finnhub } from "@/src/infrastructure/finnhub.client";

export class StockService {
  constructor(private repository: StockRepository) {}

  async getUserWatchlist(userId: string): Promise<Result<WatchlistEntry[]>> {
    return this.repository.getWatchlist(userId);
  }

  async addStockToWatchlist(userId: string, symbol: string): Promise<Result<void>> {
    // 1. Validate stock existence via Finnhub
    const profileResult = await finnhub.getCompanyProfile(symbol);
    if (!profileResult.success) {
      return failure(new Error("Stock symbol could not be verified"));
    }

    const companyName = profileResult.data.name || symbol;

    // 2. Add to repository
    return this.repository.addToWatchlist({
      userId,
      symbol: symbol.toUpperCase(),
      company: companyName,
      addedAt: new Date(),
    });
  }

  async removeStockFromWatchlist(userId: string, symbol: string): Promise<Result<void>> {
    return this.repository.removeFromWatchlist(userId, symbol);
  }

  async checkWatchlistStatus(userId: string, symbol: string): Promise<Result<boolean>> {
    return this.repository.isInWatchlist(userId, symbol);
  }
}

export const stockService = new StockService(stockRepository);

import { Result, wrap } from "@/src/core/result";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const API_KEY = process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY || "";

export class FinnhubClient {
  private static instance: FinnhubClient;
  private apiKey: string;

  private constructor() {
    this.apiKey = API_KEY;
    if (!this.apiKey) {
      console.warn("Finnhub API key is missing. Network requests will fail.");
    }
  }

  public static getInstance(): FinnhubClient {
    if (!FinnhubClient.instance) {
      FinnhubClient.instance = new FinnhubClient();
    }
    return FinnhubClient.instance;
  }

  private async fetch<T>(endpoint: string, params: Record<string, string> = {}, revalidate = 300): Promise<T> {
    const query = new URLSearchParams({ ...params, token: this.apiKey }).toString();
    const url = `${FINNHUB_BASE_URL}${endpoint}?${query}`;

    const res = await fetch(url, {
      next: { revalidate },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Finnhub API Error [${res.status}]: ${errorText}`);
    }

    return res.json() as Promise<T>;
  }

  public async getQuote(symbol: string): Promise<Result<FinnhubQuote>> {
    return wrap(this.fetch<FinnhubQuote>("/quote", { symbol: symbol.toUpperCase() }, 60));
  }

  public async search(query: string): Promise<Result<FinnhubSearchResponse>> {
    return wrap(this.fetch<FinnhubSearchResponse>("/search", { q: query }, 3600));
  }

  public async getCompanyProfile(symbol: string): Promise<Result<FinnhubProfile>> {
    return wrap(this.fetch<FinnhubProfile>("/stock/profile2", { symbol: symbol.toUpperCase() }, 86400));
  }
}

// Types for internal use
export interface FinnhubQuote {
  c: number; // Current price
  d: number; // Change
  dp: number; // Percent change
  h: number; // High
  l: number; // Low
  o: number; // Open
  pc: number; // Previous close
  t: number; // Timestamp
}

export interface FinnhubSearchResponse {
  count: number;
  result: Array<{
    description: string;
    displaySymbol: string;
    symbol: string;
    type: string;
  }>;
}

export interface FinnhubProfile {
  country: string;
  currency: string;
  exchange: string;
  name: string;
  ticker: string;
  weburl: string;
  logo: string;
  finnhubIndustry: string;
}

export const finnhub = FinnhubClient.getInstance();

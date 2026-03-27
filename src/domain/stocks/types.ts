export interface WatchlistEntry {
  userId: string;
  symbol: string;
  company: string;
  addedAt: Date;
}

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  percentChange: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
}

export interface CompanyProfile {
  name: string;
  ticker: string;
  country: string;
  currency: string;
  exchange: string;
  industry: string;
  logo: string;
  weburl: string;
}

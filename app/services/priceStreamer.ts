/**
 * Price Streamer — Singleton Finnhub WebSocket proxy.
 * Opens a single WebSocket connection to Finnhub and broadcasts
 * price updates to all subscribers via callbacks.
 *
 * Features:
 * - Reconnection with exponential backoff
 * - Per-symbol throttling (max 1 update per 500ms)
 * - Automatic symbol subscription management
 */

import WebSocket from 'ws';
import { logger } from '@/lib/logger';

interface PriceUpdate {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
}

type PriceCallback = (update: PriceUpdate) => void;

interface FinnhubTrade {
  p: number; // Price
  s: string; // Symbol
  t: number; // Timestamp
  v: number; // Volume
}

interface FinnhubTradeMessage {
  type: 'trade';
  data: FinnhubTrade[];
}

interface FinnhubPingMessage {
  type: 'ping';
}

type FinnhubMessage = FinnhubTradeMessage | FinnhubPingMessage;

class PriceStreamer {

  private ws: WebSocket | null = null;
  private subscribers = new Map<string, Set<PriceCallback>>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnecting = false;
  private lastPrices = new Map<string, { price: number; timestamp: number }>();
  private throttleInterval = 500; // ms

  /**
   * Get or create the WebSocket connection.
   */
  private connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) return;

    const token = process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
    if (!token) {
      logger.warn('Finnhub API key not configured, price streaming unavailable');
      return;
    }

    this.isConnecting = true;
    logger.info('Connecting to Finnhub WebSocket...');

    try {
      this.ws = new WebSocket(`wss://ws.finnhub.io?token=${token}`);

      this.ws.on('open', () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        logger.info('Finnhub WebSocket connected');

        // Re-subscribe existing symbols
        for (const symbol of this.subscribers.keys()) {
          this.sendSubscribe(symbol);
        }
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString()) as FinnhubMessage;
          if (message.type === 'trade' && Array.isArray(message.data)) {
            for (const trade of message.data) {
              this.handleTrade({
                symbol: trade.s,
                price: trade.p,
                volume: trade.v,
                timestamp: trade.t,
              });
            }
          }
        } catch (err) {
          logger.error('Error parsing Finnhub message', {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      });


      this.ws.on('close', () => {
        this.isConnecting = false;
        logger.warn('Finnhub WebSocket disconnected');
        this.scheduleReconnect();
      });

      this.ws.on('error', (err) => {
        this.isConnecting = false;
        logger.error('Finnhub WebSocket error', {
          error: err instanceof Error ? err.message : String(err),
        });
      });
    } catch (err) {
      this.isConnecting = false;
      logger.error('Failed to create Finnhub WebSocket', {
        error: err instanceof Error ? err.message : String(err),
      });
      this.scheduleReconnect();
    }
  }

  /**
   * Reconnect with exponential backoff.
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached');
      return;
    }

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    logger.info('Scheduling reconnection', {
      attempt: this.reconnectAttempts,
      delayMs: delay,
    });

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Handle an incoming trade and broadcast to subscribers (with throttling).
   */
  private handleTrade(update: PriceUpdate): void {
    const callbacks = this.subscribers.get(update.symbol);
    if (!callbacks || callbacks.size === 0) return;

    // Throttle: skip if last update was less than throttleInterval ago
    const last = this.lastPrices.get(update.symbol);
    if (last && Date.now() - last.timestamp < this.throttleInterval) {
      return;
    }

    this.lastPrices.set(update.symbol, {
      price: update.price,
      timestamp: Date.now(),
    });

    for (const callback of callbacks) {
      try {
        callback(update);
      } catch (err) {
        logger.error('Error in price callback', {
          symbol: update.symbol,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  /**
   * Send subscribe message to Finnhub WebSocket.
   */
  private sendSubscribe(symbol: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'subscribe', symbol }));
      logger.debug('Subscribed to Finnhub symbol', { symbol });
    }
  }

  /**
   * Send unsubscribe message to Finnhub WebSocket.
   */
  private sendUnsubscribe(symbol: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'unsubscribe', symbol }));
      logger.debug('Unsubscribed from Finnhub symbol', { symbol });
    }
  }

  /**
   * Subscribe to price updates for a symbol.
   */
  subscribe(symbol: string, callback: PriceCallback): void {
    const upperSymbol = symbol.toUpperCase();

    if (!this.subscribers.has(upperSymbol)) {
      this.subscribers.set(upperSymbol, new Set());
      // Only send subscribe if this is a new symbol
      this.sendSubscribe(upperSymbol);
    }

    this.subscribers.get(upperSymbol)!.add(callback);

    // Ensure WebSocket is connected
    this.connect();
  }

  /**
   * Unsubscribe from price updates for a symbol.
   */
  unsubscribe(symbol: string, callback: PriceCallback): void {
    const upperSymbol = symbol.toUpperCase();
    const callbacks = this.subscribers.get(upperSymbol);

    if (callbacks) {
      callbacks.delete(callback);

      // If no more subscribers for this symbol, unsubscribe from Finnhub
      if (callbacks.size === 0) {
        this.subscribers.delete(upperSymbol);
        this.sendUnsubscribe(upperSymbol);
        this.lastPrices.delete(upperSymbol);
      }
    }

    // If no subscribers at all, close the connection
    if (this.subscribers.size === 0) {
      this.disconnect();
    }
  }

  /**
   * Close the WebSocket connection.
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnecting = false;
    this.reconnectAttempts = 0;
    logger.info('Price streamer disconnected');
  }

  /**
   * Get the last known price for a symbol.
   */
  getLastPrice(symbol: string): number | null {
    return this.lastPrices.get(symbol.toUpperCase())?.price ?? null;
  }

  /**
   * Check if the WebSocket is connected.
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get the number of active subscriptions.
   */
  get activeSubscriptions(): number {
    return this.subscribers.size;
  }
}

// Singleton instance (persists across hot reloads in development)
declare global {
  var __priceStreamer: PriceStreamer | undefined;
}

export const priceStreamer: PriceStreamer =
  global.__priceStreamer || (global.__priceStreamer = new PriceStreamer());

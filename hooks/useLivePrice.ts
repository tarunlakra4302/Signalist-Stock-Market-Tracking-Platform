'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface PriceState {
  price: number;
  previousPrice: number | null;
  isLive: boolean;
  lastUpdated: Date;
}

/**
 * Hook for real-time price streaming via Server-Sent Events.
 * Connects to /api/price-stream and returns live prices for requested symbols.
 *
 * @param symbols - Array of stock symbols to subscribe to
 * @returns Map of symbol -> { price, previousPrice, isLive, lastUpdated }
 */
export function useLivePrice(symbols: string[]) {
  const [prices, setPrices] = useState<Map<string, PriceState>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (symbols.length === 0) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const symbolsParam = symbols.map((s) => s.toUpperCase()).join(',');
    const es = new EventSource(`/api/price-stream?symbols=${encodeURIComponent(symbolsParam)}`);

    es.onopen = () => {
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Skip connection confirmation and heartbeat messages
        if (data.type === 'connected') return;

        if (data.symbol && data.price !== undefined) {
          setPrices((prev) => {
            const updated = new Map(prev);
            const existing = updated.get(data.symbol);
            updated.set(data.symbol, {
              price: data.price,
              previousPrice: existing?.price ?? null,
              isLive: true,
              lastUpdated: new Date(),
            });
            return updated;
          });
        }
      } catch {
        // Ignore parse errors (e.g., heartbeat comments)
      }
    };

    es.onerror = () => {
      setIsConnected(false);
      es.close();

      // Reconnect with exponential backoff
      const maxAttempts = 8;
      if (reconnectAttemptsRef.current < maxAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current++;

        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, delay);
      }
    };

    eventSourceRef.current = es;
  }, [symbols]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols.join(',')]);

  return { prices, isConnected };
}

import { useState, useEffect } from "react";

/**
 * Simulates a high-frequency price stream.
 * In a production environment, this would connect to a WebSocket (e.g., Finnhub WS).
 */
export function usePriceStream(symbol: string, initialPrice: number) {
  const [price, setPrice] = useState(initialPrice);

  useEffect(() => {
    const interval = setInterval(() => {
      // Small random fluctuation to simulate institutional volatility
      const fluctuation = (Math.random() - 0.5) * 0.1;
      setPrice((prev) => Number((prev + fluctuation).toFixed(2)));
    }, 2000 + Math.random() * 3000);

    return () => clearInterval(interval);
  }, [symbol]);

  return price;
}

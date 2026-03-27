/**
 * Server-Sent Events (SSE) endpoint for real-time price streaming.
 * Proxies Finnhub WebSocket data to the client via SSE.
 *
 * Usage: GET /api/price-stream?symbols=AAPL,MSFT,GOOGL
 */

import { NextRequest } from 'next/server';
import { auth } from '@/lib/better-auth/auth';
import { headers } from 'next/headers';
import { priceStreamer } from '@/app/services/priceStreamer';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Auth check
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get('symbols');

  if (!symbolsParam) {
    return new Response('Missing symbols parameter', { status: 400 });
  }

  const symbols = symbolsParam
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 20); // Limit to 20 symbols per connection

  if (symbols.length === 0) {
    return new Response('No valid symbols provided', { status: 400 });
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Callback for price updates
      const callbacks = new Map<string, (update: { symbol: string; price: number; volume: number; timestamp: number }) => void>();

      for (const symbol of symbols) {
        const callback = (update: { symbol: string; price: number; volume: number; timestamp: number }) => {
          try {
            const data = JSON.stringify(update); // Directly stringify the typed update object
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          } catch {
            // Stream may be closed
          }
        };

        callbacks.set(symbol, callback);
        priceStreamer.subscribe(symbol, callback);
      }


      // Send initial connection event
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected', symbols })}\n\n`)
      );

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Cleanup on abort
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        for (const [symbol, callback] of callbacks) {
          priceStreamer.unsubscribe(symbol, callback);
        }
        callbacks.clear();
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}

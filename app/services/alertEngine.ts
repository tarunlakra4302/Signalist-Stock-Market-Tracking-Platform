/**
 * Alert Evaluation Engine for Signalist.
 * Batch-evaluates all active alerts against current market prices,
 * fires notifications for matching conditions, and enforces idempotency.
 */

import { connectToDatabase } from '@/database/mongoose';
import { Alert, type IAlert } from '@/database/models/alert.model';
import { getQuoteBatch } from '@/lib/actions/finnhub.actions';
import { sendAlertNotification } from '@/app/services/notificationService';
import { logger } from '@/lib/logger';
import { Types } from 'mongoose';

export interface EvaluationResult {
  evaluated: number;
  triggered: number;
  errors: number;
  symbols: number;
  durationMs: number;
}

// Default cooldown: 30 minutes (prevents re-notifying for the same alert)
const COOLDOWN_MS = (parseInt(process.env.ALERT_COOLDOWN_MINUTES || '30', 10)) * 60 * 1000;

/**
 * Core evaluation function.
 */
export async function evaluateAlerts(): Promise<EvaluationResult> {
  const startTime = Date.now();
  let evaluated = 0;
  let triggered = 0;
  let errors = 0;

  logger.info('Alert evaluation started');

  try {
    await connectToDatabase();

    const cooldownThreshold = new Date(Date.now() - COOLDOWN_MS);

    // Fetch active alerts using lean for performance, typed as array of POJOs
    const activeAlerts = await Alert.find({
      isActive: true,
      $or: [
        { triggeredAt: null },
        { triggeredAt: { $exists: false } },
        { lastNotifiedAt: null },
        { lastNotifiedAt: { $exists: false } },
        { lastNotifiedAt: { $lt: cooldownThreshold } },
      ],
    }).lean();

    if (activeAlerts.length === 0) {
      logger.info('No active alerts to evaluate');
      return { evaluated: 0, triggered: 0, errors: 0, symbols: 0, durationMs: Date.now() - startTime };
    }

    // Group alerts by symbol, ensuring types are correct
    const typedAlerts = activeAlerts as unknown as (IAlert & { _id: Types.ObjectId })[];
    const alertsBySymbol = new Map<string, (IAlert & { _id: Types.ObjectId })[]>();
    
    for (const alert of typedAlerts) {
      const sym = alert.symbol.toUpperCase();
      const existing = alertsBySymbol.get(sym) || [];
      existing.push(alert);
      alertsBySymbol.set(sym, existing);
    }

    const symbols = [...alertsBySymbol.keys()];
    logger.info('Fetching prices for alert evaluation', {
      totalAlerts: typedAlerts.length,
      uniqueSymbols: symbols.length,
    });

    // Batch-fetch current prices
    const priceMap = await getQuoteBatch(symbols);

    // Evaluate each alert
    for (const [symbol, alerts] of alertsBySymbol) {
      const currentPrice = priceMap.get(symbol);

      if (currentPrice === undefined || currentPrice === null) {
        logger.warn('No price data available for symbol', { symbol });
        errors += alerts.length;
        continue;
      }

      for (const alert of alerts) {
        evaluated++;

        try {
          const shouldTrigger = checkCondition(alert.alertType, currentPrice, alert.threshold);

          if (shouldTrigger) {
            // Update alert: set triggeredAt and lastNotifiedAt
            await Alert.updateOne(
              { _id: alert._id },
              {
                triggeredAt: new Date(),
                lastNotifiedAt: new Date(),
              }
            );

            // Send notification
            await sendAlertNotification(alert.userId, alert, currentPrice);

            triggered++;
            logger.info('Alert triggered', {
              alertId: alert._id.toString(),
              symbol,
              alertType: alert.alertType,
              threshold: alert.threshold,
              currentPrice,
            });
          }
        } catch (err) {
          errors++;
          logger.error('Error evaluating alert', {
            alertId: alert._id.toString(),
            symbol,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    const durationMs = Date.now() - startTime;
    return { evaluated, triggered, errors, symbols: symbols.length, durationMs };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    logger.error('Alert evaluation failed', {
      error: err instanceof Error ? err.message : String(err),
      durationMs,
    });

    return { evaluated, triggered, errors: errors + 1, symbols: 0, durationMs };
  }
}

/**
 * Check if a price condition is met.
 */
function checkCondition(
  alertType: 'upper' | 'lower',
  currentPrice: number,
  threshold: number
): boolean {
  if (alertType === 'upper') {
    return currentPrice >= threshold;
  }
  if (alertType === 'lower') {
    return currentPrice <= threshold;
  }
  return false;
}


/**
 * Unit tests for the Alert Evaluation Engine.
 * Tests the core evaluation logic with mocked dependencies.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing the module under test
vi.mock('@/database/mongoose', () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock('@/database/models/alert.model', () => {
  const mockFind = vi.fn();
  const mockUpdateOne = vi.fn();
  return {
    Alert: {
      find: mockFind,
      updateOne: mockUpdateOne,
    },
    __mockFind: mockFind,
    __mockUpdateOne: mockUpdateOne,
  };
});

vi.mock('@/lib/actions/finnhub.actions', () => ({
  getQuoteBatch: vi.fn(),
}));

vi.mock('@/app/services/notificationService', () => ({
  sendAlertNotification: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Alert Evaluation Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return early when no active alerts exist', async () => {
    const { Alert } = await import('@/database/models/alert.model');
    (Alert.find as ReturnType<typeof vi.fn>).mockReturnValue({
      lean: () => Promise.resolve([]),
    });

    const { evaluateAlerts } = await import('@/app/services/alertEngine');
    const result = await evaluateAlerts();

    expect(result.evaluated).toBe(0);
    expect(result.triggered).toBe(0);
    expect(result.errors).toBe(0);
  });

  it('should trigger an alert when price rises above upper threshold', async () => {
    const mockAlert = {
      _id: 'alert-1',
      userId: 'user-1',
      symbol: 'AAPL',
      company: 'Apple Inc.',
      alertName: 'Apple breakout',
      alertType: 'upper',
      threshold: 150,
      isActive: true,
    };

    const { Alert } = await import('@/database/models/alert.model');
    (Alert.find as ReturnType<typeof vi.fn>).mockReturnValue({
      lean: () => Promise.resolve([mockAlert]),
    });
    (Alert.updateOne as ReturnType<typeof vi.fn>).mockResolvedValue({
      modifiedCount: 1,
    });

    const { getQuoteBatch } = await import('@/lib/actions/finnhub.actions');
    (getQuoteBatch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Map([['AAPL', 155]])
    );

    const { sendAlertNotification } = await import('@/app/services/notificationService');
    (sendAlertNotification as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const { evaluateAlerts } = await import('@/app/services/alertEngine');
    const result = await evaluateAlerts();

    expect(result.evaluated).toBe(1);
    expect(result.triggered).toBe(1);
    expect(Alert.updateOne).toHaveBeenCalledWith(
      { _id: 'alert-1' },
      expect.objectContaining({
        triggeredAt: expect.any(Date),
        lastNotifiedAt: expect.any(Date),
      })
    );
    expect(sendAlertNotification).toHaveBeenCalledWith('user-1', mockAlert, 155);
  });

  it('should trigger an alert when price drops below lower threshold', async () => {
    const mockAlert = {
      _id: 'alert-2',
      userId: 'user-1',
      symbol: 'MSFT',
      company: 'Microsoft Corp.',
      alertName: 'MSFT dip',
      alertType: 'lower',
      threshold: 300,
      isActive: true,
    };

    const { Alert } = await import('@/database/models/alert.model');
    (Alert.find as ReturnType<typeof vi.fn>).mockReturnValue({
      lean: () => Promise.resolve([mockAlert]),
    });
    (Alert.updateOne as ReturnType<typeof vi.fn>).mockResolvedValue({
      modifiedCount: 1,
    });

    const { getQuoteBatch } = await import('@/lib/actions/finnhub.actions');
    (getQuoteBatch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Map([['MSFT', 290]])
    );

    const { sendAlertNotification } = await import('@/app/services/notificationService');
    (sendAlertNotification as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const { evaluateAlerts } = await import('@/app/services/alertEngine');
    const result = await evaluateAlerts();

    expect(result.evaluated).toBe(1);
    expect(result.triggered).toBe(1);
    expect(sendAlertNotification).toHaveBeenCalledWith('user-1', mockAlert, 290);
  });

  it('should NOT trigger when price does not meet condition', async () => {
    const mockAlert = {
      _id: 'alert-3',
      userId: 'user-1',
      symbol: 'GOOGL',
      company: 'Alphabet Inc.',
      alertName: 'Googl watch',
      alertType: 'upper',
      threshold: 200,
      isActive: true,
    };

    const { Alert } = await import('@/database/models/alert.model');
    (Alert.find as ReturnType<typeof vi.fn>).mockReturnValue({
      lean: () => Promise.resolve([mockAlert]),
    });

    const { getQuoteBatch } = await import('@/lib/actions/finnhub.actions');
    (getQuoteBatch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Map([['GOOGL', 195]])
    );

    const { sendAlertNotification } = await import('@/app/services/notificationService');

    const { evaluateAlerts } = await import('@/app/services/alertEngine');
    const result = await evaluateAlerts();

    expect(result.evaluated).toBe(1);
    expect(result.triggered).toBe(0);
    expect(Alert.updateOne).not.toHaveBeenCalled();
    expect(sendAlertNotification).not.toHaveBeenCalled();
  });

  it('should handle missing price data gracefully', async () => {
    const mockAlert = {
      _id: 'alert-4',
      userId: 'user-1',
      symbol: 'INVALID',
      company: 'Unknown Corp.',
      alertName: 'Bad symbol',
      alertType: 'upper',
      threshold: 100,
      isActive: true,
    };

    const { Alert } = await import('@/database/models/alert.model');
    (Alert.find as ReturnType<typeof vi.fn>).mockReturnValue({
      lean: () => Promise.resolve([mockAlert]),
    });

    const { getQuoteBatch } = await import('@/lib/actions/finnhub.actions');
    (getQuoteBatch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Map() // No prices returned
    );

    const { evaluateAlerts } = await import('@/app/services/alertEngine');
    const result = await evaluateAlerts();

    expect(result.evaluated).toBe(0); // Couldn't evaluate — no price
    expect(result.triggered).toBe(0);
    expect(result.errors).toBe(1); // Counted as error
  });

  it('should batch multiple alerts for the same symbol', async () => {
    const alerts = [
      { _id: 'a1', userId: 'u1', symbol: 'AAPL', company: 'Apple', alertName: 'Alert 1', alertType: 'upper', threshold: 140, isActive: true },
      { _id: 'a2', userId: 'u2', symbol: 'AAPL', company: 'Apple', alertName: 'Alert 2', alertType: 'upper', threshold: 160, isActive: true },
      { _id: 'a3', userId: 'u1', symbol: 'AAPL', company: 'Apple', alertName: 'Alert 3', alertType: 'lower', threshold: 130, isActive: true },
    ];

    const { Alert } = await import('@/database/models/alert.model');
    (Alert.find as ReturnType<typeof vi.fn>).mockReturnValue({
      lean: () => Promise.resolve(alerts),
    });
    (Alert.updateOne as ReturnType<typeof vi.fn>).mockResolvedValue({ modifiedCount: 1 });

    const { getQuoteBatch } = await import('@/lib/actions/finnhub.actions');
    // AAPL is at 150 — should trigger a1 (upper >= 140) but NOT a2 (upper >= 160) and NOT a3 (lower <= 130)
    (getQuoteBatch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Map([['AAPL', 150]])
    );

    const { sendAlertNotification } = await import('@/app/services/notificationService');
    (sendAlertNotification as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const { evaluateAlerts } = await import('@/app/services/alertEngine');
    const result = await evaluateAlerts();

    expect(result.evaluated).toBe(3);
    expect(result.triggered).toBe(1); // Only a1
    expect(result.symbols).toBe(1); // Only AAPL
    expect(sendAlertNotification).toHaveBeenCalledTimes(1);
  });
});

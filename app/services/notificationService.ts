/**
 * Notification Service for Signalist.
 * Handles creating in-app notifications and optionally sending email alerts.
 */

import { connectToDatabase } from '@/database/mongoose';
import { Notification } from '@/database/models/notification.model';
import { type IAlert } from '@/database/models/alert.model';

import { logger } from '@/lib/logger';
import { Types } from 'mongoose';

/**
 * Create an in-app notification when an alert is triggered.
 * Checks for duplicates within a 5-minute window to prevent spam.
 */
export async function sendAlertNotification(
  userId: string,
  alert: IAlert & { _id?: Types.ObjectId },
  currentPrice: number
): Promise<void> {
  await connectToDatabase();

  const alertId = alert._id?.toString();

  // Deduplication: check if a notification for this alert was created in the last 5 minutes
  const recentNotification = await Notification.findOne({
    userId,
    'metadata.alertId': alertId,
    createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
  });

  if (recentNotification) {
    logger.info('Skipping duplicate notification', { alertId, userId });
    return;
  }

  const direction = alert.alertType === 'upper' ? 'above' : 'below';
  const title = `🔔 ${alert.symbol} Price Alert`;
  const message = `${alert.symbol} (${alert.company}) is now $${currentPrice.toFixed(2)}, which is ${direction} your threshold of $${alert.threshold.toFixed(2)}.`;

  await Notification.create({
    userId,
    type: 'alert_triggered',
    title,
    message,
    metadata: {
      alertId,
      symbol: alert.symbol,
      currentPrice,
      threshold: alert.threshold,
      condition: alert.alertType,
    },
    read: false,
    createdAt: new Date(),
  });

  logger.info('Alert notification created', {
    userId,
    symbol: alert.symbol,
    alertId,
    currentPrice,
    threshold: alert.threshold,
  });
}

/**
 * Fetch notifications for a user, sorted by newest first.
 */
export async function getUserNotifications(userId: string, limit = 50) {
  await connectToDatabase();

  const notifications = await Notification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return notifications.map((n) => ({
    id: (n._id as Types.ObjectId).toString(),
    type: n.type,
    title: n.title,
    message: n.message,
    metadata: n.metadata,
    read: n.read,
    createdAt: n.createdAt,
  }));
}

/**
 * Get count of unread notifications for a user.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  await connectToDatabase();
  return Notification.countDocuments({ userId, read: false });
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(
  notificationId: string,
  userId: string
): Promise<boolean> {
  await connectToDatabase();

  const result = await Notification.updateOne(
    { _id: notificationId, userId },
    { read: true }
  );

  return result.modifiedCount > 0;
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllRead(userId: string): Promise<number> {
  await connectToDatabase();

  const result = await Notification.updateMany(
    { userId, read: false },
    { read: true }
  );

  return result.modifiedCount;
}

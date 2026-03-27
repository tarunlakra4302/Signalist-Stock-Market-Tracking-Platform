/**
 * Notifications API Route
 * GET  /api/notifications — fetch user notifications (paginated)
 * PATCH /api/notifications — mark notification(s) as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/better-auth/auth';
import { headers } from 'next/headers';
import {
  getUserNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllRead,
} from '@/app/services/notificationService';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const [notifications, unreadCount] = await Promise.all([
      getUserNotifications(session.user.id, limit),
      getUnreadCount(session.user.id),
    ]);

    return NextResponse.json({
      success: true,
      data: notifications,
      unreadCount,
    });
  } catch (err) {
    console.error('GET /api/notifications error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as {
      notificationId?: string;
      markAll?: boolean;
    };
    const { notificationId, markAll } = body;


    if (markAll) {
      const count = await markAllRead(session.user.id);
      return NextResponse.json({ success: true, markedCount: count });
    }

    if (notificationId) {
      const updated = await markNotificationRead(notificationId, session.user.id);
      return NextResponse.json({ success: updated });
    }

    return NextResponse.json(
      { error: 'Provide notificationId or markAll: true' },
      { status: 400 }
    );
  } catch (err) {
    console.error('PATCH /api/notifications error:', err);
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}

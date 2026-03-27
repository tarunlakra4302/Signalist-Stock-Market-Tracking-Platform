/**
 * Alerts API Route
 * GET    /api/alerts — fetch user's alerts
 * POST   /api/alerts — create a new alert
 * DELETE /api/alerts?id=... — delete an alert
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/better-auth/auth';
import { headers } from 'next/headers';
import { connectToDatabase } from '@/database/mongoose';
import { Alert } from '@/database/models/alert.model';
import { Types } from 'mongoose';

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const alerts = await Alert.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: alerts.map((alert: any) => ({
        id: (alert._id as Types.ObjectId).toString(),
        symbol: alert.symbol,
        company: alert.company,
        alertName: alert.alertName,
        alertType: alert.alertType,
        threshold: alert.threshold,
        isActive: alert.isActive,
        triggeredAt: alert.triggeredAt,
        lastNotifiedAt: alert.lastNotifiedAt,
        createdAt: alert.createdAt,
      })),
    });
  } catch (err) {
    console.error('GET /api/alerts error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { symbol, company, alertName, alertType, threshold } = body;

    // Validation
    if (!symbol || !company || !alertName || !alertType || threshold === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: symbol, company, alertName, alertType, threshold' },
        { status: 400 }
      );
    }

    if (!['upper', 'lower'].includes(alertType)) {
      return NextResponse.json(
        { error: 'alertType must be "upper" or "lower"' },
        { status: 400 }
      );
    }

    const thresholdNum = parseFloat(threshold);
    if (isNaN(thresholdNum) || thresholdNum <= 0) {
      return NextResponse.json(
        { error: 'threshold must be a positive number' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const alert = await Alert.create({
      userId: session.user.id,
      symbol: symbol.toUpperCase(),
      company,
      alertName,
      alertType,
      threshold: thresholdNum,
      isActive: true,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: {
        id: (alert._id as Types.ObjectId).toString(),
        symbol: alert.symbol,
        company: alert.company,
        alertName: alert.alertName,
        alertType: alert.alertType,
        threshold: alert.threshold,
      },
    }, { status: 201 });
  } catch (err: unknown) {
    // Handle duplicate key error
    if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
      return NextResponse.json(
        { error: 'An alert with these settings already exists' },
        { status: 409 }
      );
    }

    console.error('POST /api/alerts error:', err);
    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get('id');

    if (!alertId) {
      return NextResponse.json(
        { error: 'Missing alert id parameter' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const result = await Alert.deleteOne({
      _id: alertId,
      userId: session.user.id,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/alerts error:', err);
    return NextResponse.json(
      { error: 'Failed to delete alert' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aeoReports } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerName = searchParams.get('customerName');

    if (!customerName) {
      return NextResponse.json(
        { error: 'customerName is required' },
        { status: 400 }
      );
    }

    console.log('[AEO Reports] Fetching reports for customer:', customerName);

    // Get session via Better Auth
    let userId: string | null = null;
    try {
      const session = await auth.api.getSession({ headers: request.headers as any });
      if (session?.user) {
        userId = session.user.id || null;
      }
    } catch (e) {
      console.error('[AEO Reports] Session error:', e);
    }

    if (!userId) {
      console.log('[AEO Reports] No user ID found, returning 401');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('[AEO Reports] User ID:', userId, 'Customer Name:', customerName);

    // Fetch AEO reports for this customer name and user
    console.log('[AEO Reports] Query params - userId:', userId, 'customerName:', customerName);

    const reports = await db
      .select()
      .from(aeoReports)
      .where(
        and(
          eq(aeoReports.userId, userId),
          eq(aeoReports.customerName, customerName)
        )
      )
      .orderBy(desc(aeoReports.createdAt)); // Most recent first

    console.log('[AEO Reports] Query result:', reports);
    console.log('[AEO Reports] Found', reports.length, 'total reports');

    // Log each report for debugging
    reports.forEach((report, index) => {
      console.log(`[AEO Reports] Report ${index + 1}:`, {
        id: report.id,
        userId: report.userId,
        customerName: report.customerName,
        url: report.url,
        hasHtml: !!report.html,
        createdAt: report.createdAt,
      });
    });

    // If no reports found, try without userId filter to debug
    if (reports.length === 0) {
      console.log('[AEO Reports] No reports found with userId filter, trying without userId...');
      const allReports = await db
        .select()
        .from(aeoReports)
        .where(aeoReports.customerName === customerName)
        .orderBy(desc(aeoReports.createdAt));

      console.log('[AEO Reports] All reports for customer (any user):', allReports.length);
      allReports.forEach((report, index) => {
        console.log(`[AEO Reports] All Report ${index + 1}:`, {
          id: report.id,
          userId: report.userId,
          customerName: report.customerName,
          url: report.url,
          hasHtml: !!report.html,
          createdAt: report.createdAt,
        });
      });
    }

    // Filter to only include completed reports (those with html content)
    const completedReports = reports.filter(report => report.html !== null);

    console.log('[AEO Reports] Found', completedReports.length, 'completed reports');

    const response = NextResponse.json({
      success: true,
      reports: completedReports.map(report => ({
        id: report.id,
        customerName: report.customerName,
        url: report.url,
        createdAt: report.createdAt || new Date().toISOString(),
      })),
      debug: {
        totalReports: reports.length,
        completedReports: completedReports.length,
      },
    });

    // Add no-cache headers to ensure fresh data
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('Failed to fetch AEO reports by customer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AEO reports' },
      { status: 500 }
    );
  }
}

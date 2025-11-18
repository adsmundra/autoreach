import { db } from '@/lib/db';
import { brandprofile, brandAnalyses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params;

    // Fetch brand profile
    const brand = await db
      .select()
      .from(brandprofile)
      .where(eq(brandprofile.id, brandId))
      .limit(1);

    if (!brand || brand.length === 0) {
      return NextResponse.json(
        { error: 'Brand profile not found' },
        { status: 404 }
      );
    }

    // Fetch brand analyses
    const analyses = await db
      .select()
      .from(brandAnalyses)
      .where(eq(brandAnalyses.url, brand[0].url))
      .orderBy(brandAnalyses.createdAt);

    return NextResponse.json({
      brand: brand[0],
      analyses: analyses || [],
    });
  } catch (error) {
    console.error('Error fetching brand:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brand profile' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params;

    // Delete the brand profile
    const result = await db
      .delete(brandprofile)
      .where(eq(brandprofile.id, brandId));

    if (!result) {
      return NextResponse.json(
        { error: 'Brand profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting brand:', error);
    return NextResponse.json(
      { error: 'Failed to delete brand profile' },
      { status: 500 }
    );
  }
}

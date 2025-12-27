import { NextRequest, NextResponse } from 'next/server';
import { getCoverageStats } from '@/lib/utils/logger';

/**
 * Coverage statistics API endpoint
 * Returns analytics data about coverage checks
 * 
 * @route GET /api/coverage/stats
 */
export async function GET(request: NextRequest) {
  try {
    const stats = await getCoverageStats();
    
    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Failed to get coverage stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve statistics',
      },
      { status: 500 }
    );
  }
}

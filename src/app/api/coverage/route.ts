import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import {
  checkCoverageByCoordinates,
  checkCoverageByZone,
  getCoveredZones,
  type CoverageData,
} from '@/lib/utils/coverage';
import { logCoverageCheck } from '@/lib/utils/logger';
import { logger } from '@/lib/utils/app-logger';

/**
 * Coverage check API endpoint
 * Supports checking by coordinates or zone name
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    // Load coverage data
    const coverageFilePath = path.join(
      process.cwd(),
      'public',
      'assets',
      'coverage',
      'anees-cover-areas.geojson'
    );
    const coverageFileContent = await fs.readFile(coverageFilePath, 'utf-8');
    const coverageData: CoverageData = JSON.parse(coverageFileContent);

    // Return all covered zones
    if (action === 'list') {
      const zones = getCoveredZones(coverageData);
      return NextResponse.json({
        success: true,
        zones,
      });
    }

    // Check by coordinates
    if (action === 'check-coordinates') {
      const lat = searchParams.get('lat');
      const lng = searchParams.get('lng');

      if (!lat || !lng) {
        return NextResponse.json(
          {
            success: false,
            error: 'Missing latitude or longitude parameters',
          },
          { status: 400 }
        );
      }

      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      if (isNaN(latitude) || isNaN(longitude)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid latitude or longitude values',
          },
          { status: 400 }
        );
      }

      // Validate coordinate ranges
      if (
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Coordinates out of valid range',
          },
          { status: 400 }
        );
      }

      const result = checkCoverageByCoordinates(
        latitude,
        longitude,
        coverageData
      );

      // Log the coverage check (async, non-blocking)
      const ipHeader =
        request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip') ||
        undefined;
      const ip = ipHeader ? ipHeader.split(',')[0].trim() : 'unknown';
      const userAgent = request.headers.get('user-agent') || undefined;
      
      // Persist to PostgreSQL — fire-and-forget, never blocks the response
      logCoverageCheck({
        latitude,
        longitude,
        covered: result.covered,
        areaName: result.area?.name,
        ip,
        userAgent,
      }).catch(err =>
        logger.error('Coverage check log error', err instanceof Error ? err.message : String(err))
      );

      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    // Check by zone name
    if (action === 'check-zone') {
      const zone = searchParams.get('zone');

      if (!zone || zone.trim() === '') {
        return NextResponse.json(
          {
            success: false,
            error: 'Missing zone parameter',
          },
          { status: 400 }
        );
      }

      const result = checkCoverageByZone(zone, coverageData);

      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    // Invalid action
    return NextResponse.json(
      {
        success: false,
        error:
          'Invalid action. Use "list", "check-coordinates", or "check-zone"',
      },
      { status: 400 }
    );
  } catch (error) {
    logger.error('Coverage check error', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

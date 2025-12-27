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

function getCairoTimestamp(): string {
  const now = new Date();
  const cairo = new Date(
    now.toLocaleString('en-US', { timeZone: 'Africa/Cairo' })
  );
  const offsetMinutes = Math.round((cairo.getTime() - now.getTime()) / 60000);
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absOffset = Math.abs(offsetMinutes);
  const offH = String(Math.floor(absOffset / 60)).padStart(2, '0');
  const offM = String(absOffset % 60).padStart(2, '0');

  const yyyy = cairo.getFullYear();
  const mm = String(cairo.getMonth() + 1).padStart(2, '0');
  const dd = String(cairo.getDate()).padStart(2, '0');
  const hh = String(cairo.getHours()).padStart(2, '0');
  const mi = String(cairo.getMinutes()).padStart(2, '0');
  const ss = String(cairo.getSeconds()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}${sign}${offH}:${offM}`;
}

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
      const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
      const userAgent = request.headers.get('user-agent') || undefined;
      
      logCoverageCheck({
        latitude,
        longitude,
        covered: result.covered,
        areaName: result.area?.name,
        ip,
        userAgent,
      }).catch(err => console.error('Logging error:', err));

      // Push anonymized check data to SheetDB (fire-and-forget)
      // SheetDB logging (requires sheet header row: latitude, longitude, covered, areaName, timestamp)
      try {
        const timestamp = getCairoTimestamp();
        const sheetPayload = {
          data: [
            {
              latitude,
              longitude,
              covered: result.covered,
              areaName: result.area?.name ?? '',
              timestamp,
            },
          ],
        };

        void (async () => {
          try {
            const res = await fetch('https://sheetdb.io/api/v1/jp7px2gsifv8j', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(sheetPayload),
            });

            if (!res.ok) {
              const body = await res.text();
              console.error('SheetDB logging error:', res.status, body);
            }
          } catch (err) {
            console.error('SheetDB logging error:', err);
          }
        })();
      } catch (err) {
        console.error('SheetDB logging setup error:', err);
      }

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
    console.error('Coverage check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * Logging utilities for coverage checks and analytics
 * Privacy-compliant logging with no PII storage
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface CoverageCheckLog {
  id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  covered: boolean;
  areaName?: string;
  ipHash?: string; // Anonymized IP (hashed)
  userAgent?: string;
}

/**
 * Hash IP address for privacy compliance
 */
function hashIP(ip: string): string {
  return crypto.createHash('sha256').update(ip + process.env.HASH_SALT || 'anees-health').digest('hex').substring(0, 16);
}

/**
 * Log a coverage check attempt
 */
export async function logCoverageCheck(data: {
  latitude: number;
  longitude: number;
  covered: boolean;
  areaName?: string;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    const logDir = path.join(process.cwd(), 'data', 'logs');
    const logFile = path.join(logDir, 'coverage-checks.jsonl');

    // Ensure directory exists
    await fs.mkdir(logDir, { recursive: true });

    const logEntry: CoverageCheckLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      latitude: data.latitude,
      longitude: data.longitude,
      covered: data.covered,
      areaName: data.areaName,
      ipHash: data.ip ? hashIP(data.ip) : undefined,
      userAgent: data.userAgent,
    };

    // Append to JSONL file (one JSON object per line)
    await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n', 'utf-8');
  } catch (error) {
    console.error('Failed to log coverage check:', error);
    // Don't throw - logging failure shouldn't break the API
  }
}

/**
 * Get coverage check statistics
 */
export async function getCoverageStats(): Promise<{
  totalChecks: number;
  coveredChecks: number;
  uncoveredChecks: number;
  recentChecks: CoverageCheckLog[];
}> {
  try {
    const logFile = path.join(process.cwd(), 'data', 'logs', 'coverage-checks.jsonl');
    const content = await fs.readFile(logFile, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    
    const logs: CoverageCheckLog[] = lines.map(line => JSON.parse(line));
    
    const coveredChecks = logs.filter(log => log.covered).length;
    const uncoveredChecks = logs.filter(log => !log.covered).length;
    
    // Get last 100 checks
    const recentChecks = logs.slice(-100).reverse();
    
    return {
      totalChecks: logs.length,
      coveredChecks,
      uncoveredChecks,
      recentChecks,
    };
  } catch (error) {
    // File doesn't exist yet or is empty
    return {
      totalChecks: 0,
      coveredChecks: 0,
      uncoveredChecks: 0,
      recentChecks: [],
    };
  }
}

import { HTTP_STATUS_CODES } from './constants';

/**
 * Check if HTTP status code indicates success
 */
export const isSuccessStatusCode = (statusCode: number): boolean => {
  return statusCode >= 200 && statusCode < 300;
};

/**
 * Check if HTTP status code indicates client error
 */
export const isClientError = (statusCode: number): boolean => {
  return statusCode >= 400 && statusCode < 500;
};

/**
 * Check if HTTP status code indicates server error
 */
export const isServerError = (statusCode: number): boolean => {
  return statusCode >= 500 && statusCode < 600;
};

/**
 * Determine API availability based on status code
 */
export const determineAvailability = (statusCode?: number, isTimeout?: boolean): boolean => {
  if (isTimeout) return false;
  if (!statusCode) return false;
  return isSuccessStatusCode(statusCode);
};

/**
 * Generate incident number
 */
let incidentCounter = 1;
export const generateIncidentNumber = (): string => {
  const number = String(incidentCounter).padStart(6, '0');
  incidentCounter++;
  return `INC-${number}`;
};

/**
 * Calculate uptime percentage
 */
export const calculateUptime = (successCount: number, totalCount: number): number => {
  if (totalCount === 0) return 100;
  return Number(((successCount / totalCount) * 100).toFixed(2));
};

/**
 * Sanitize error message for user display
 */
export const sanitizeErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.code) return error.code;
  return 'An unexpected error occurred';
};

/**
 * Sleep utility
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await sleep(delay);
      }
    }
  }

  throw lastError!;
}

/**
 * Chunk array into smaller arrays
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Safe JSON parse
 */
export function safeJSONParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

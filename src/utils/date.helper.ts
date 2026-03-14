/**
 * Calculate time difference between two dates in hours
 */
export function getHoursDiff(date1: Date, date2: Date): number {
  const diffMs = Math.abs(date1.getTime() - date2.getTime());
  return diffMs / (1000 * 60 * 60);
}

/**
 * Check if a date is in the future
 */
export function isFuture(date: Date): boolean {
  return date.getTime() > Date.now();
}

/**
 * Format date to ISO string
 */
export function toISOString(date: Date): string {
  return date.toISOString();
}

/**
 * Parse ISO string to Date
 */
export function fromISOString(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Get current timestamp
 */
export function getCurrentTimestamp(): Date {
  return new Date();
}

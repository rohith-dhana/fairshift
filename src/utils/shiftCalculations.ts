/**
 * Pure functions for shift hours calculation and midnight-crossing attribution.
 */

export interface ShiftHourBreakdown {
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  nightHours: number;
  isNightShift: boolean;
  attributedWorkDate: string; // YYYY-MM-DD
}

/**
 * Returns the attributed work date for a shift.
 * If a shift starts on date D and crosses midnight (e.g. 22:00 to 06:00),
 * the work day is attributed to date D (the day the shift commenced).
 */
export function getAttributedWorkDate(checkInIso: string): string {
  const checkIn = new Date(checkInIso);
  if (isNaN(checkIn.getTime())) {
    return new Date().toISOString().split('T')[0];
  }
  // Format as YYYY-MM-DD in local/ISO format
  const year = checkIn.getFullYear();
  const month = String(checkIn.getMonth() + 1).padStart(2, '0');
  const day = String(checkIn.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates hours worked between 22:00 (10 PM) and 06:00 (6 AM) next day.
 */
export function calculateNightHours(start: Date, end: Date): number {
  if (end <= start) return 0;
  
  let nightMs = 0;
  const cursor = new Date(start.getTime());

  // Step through in 15-minute slices for robust calculation across date boundaries
  const stepMs = 15 * 60 * 1000;
  while (cursor < end) {
    const nextStep = new Date(Math.min(cursor.getTime() + stepMs, end.getTime()));
    const hour = cursor.getHours();
    
    // Night hours definition: 22:00 to 06:00 (inclusive of 22, 23, 0, 1, 2, 3, 4, 5)
    if (hour >= 22 || hour < 6) {
      nightMs += (nextStep.getTime() - cursor.getTime());
    }
    cursor.setTime(nextStep.getTime());
  }

  const hours = nightMs / (1000 * 60 * 60);
  return Math.round(hours * 100) / 100;
}

/**
 * Calculates regular vs overtime hours and night hours for a shift.
 * Standard overtime starts after dailyThreshold (default 8 hours, or 12 hours for 12-hour shifts).
 */
export function calculateShiftHours(
  checkInIso: string,
  checkOutIso: string,
  dailyThreshold: number = 8
): ShiftHourBreakdown {
  const checkIn = new Date(checkInIso);
  const checkOut = new Date(checkOutIso);

  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime()) || checkOut <= checkIn) {
    return {
      totalHours: 0,
      regularHours: 0,
      overtimeHours: 0,
      nightHours: 0,
      isNightShift: false,
      attributedWorkDate: getAttributedWorkDate(checkInIso),
    };
  }

  const diffMs = checkOut.getTime() - checkIn.getTime();
  const rawTotalHours = diffMs / (1000 * 60 * 60);
  const totalHours = Math.round(rawTotalHours * 100) / 100;

  const threshold = Math.max(0, dailyThreshold);
  const regularHours = Math.round(Math.min(totalHours, threshold) * 100) / 100;
  const overtimeHours = Math.round(Math.max(0, totalHours - threshold) * 100) / 100;

  const nightHours = calculateNightHours(checkIn, checkOut);
  const isNightShift = nightHours >= 3 || checkIn.getHours() >= 20 || checkIn.getHours() < 5;

  return {
    totalHours,
    regularHours,
    overtimeHours,
    nightHours,
    isNightShift,
    attributedWorkDate: getAttributedWorkDate(checkInIso),
  };
}

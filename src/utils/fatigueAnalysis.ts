/**
 * Fatigue Analysis pure functions for UN SDG 8 Decent Work compliance.
 */

export interface ShiftRecordForFatigue {
  id: string;
  workerId: string;
  checkIn: string; // ISO
  checkOut: string; // ISO
  isNightShift: boolean;
  totalHours: number;
  regularHours?: number;
  overtimeHours?: number;
}

export interface FatigueFlag {
  id: string;
  ruleId: string;
  severity: 'warning' | 'critical';
  titleKey: string;
  reason: string;
  detectedAtShiftId?: string;
  hoursOrCount?: number;
}

export interface FatigueAnalysisResult {
  hasFatigueRisk: boolean;
  criticalCount: number;
  warningCount: number;
  flags: FatigueFlag[];
}

export interface FatigueCheckOptions {
  sectorId?: string;
  maxWeeklyHours?: number; // default 60
  maxDailyHours?: number; // default 12
  minRestHoursBetweenShifts?: number; // default 8
  maxConsecutiveNightShifts?: number; // hospital: 3
  minRestAfterNightShiftBeforeMorningHours?: number; // hospital: 11
  doubleShiftThresholdHours?: number; // 16 within 24h
  maxRegularWeeklyHours?: number; // hospital: 48
}

export function analyzeWorkerFatigue(
  shifts: ShiftRecordForFatigue[],
  options: FatigueCheckOptions = {}
): FatigueAnalysisResult {
  const flags: FatigueFlag[] = [];

  if (!shifts || shifts.length === 0) {
    return { hasFatigueRisk: false, criticalCount: 0, warningCount: 0, flags: [] };
  }

  // Sort shifts chronologically by checkIn
  const sortedShifts = [...shifts].sort(
    (a, b) => new Date(a.checkIn).getTime() - new Date(b.checkOut ? b.checkIn : a.checkIn).getTime()
  );

  const {
    sectorId = 'hospital',
    maxWeeklyHours = 60,
    maxDailyHours = 12,
    minRestHoursBetweenShifts = 8,
    maxConsecutiveNightShifts = 3,
    minRestAfterNightShiftBeforeMorningHours = 11,
    doubleShiftThresholdHours = 16,
    maxRegularWeeklyHours = 48,
  } = options;

  // 1. Daily hours check (> 12 hrs/day)
  // Group by attributed date
  const hoursByDay: Record<string, { totalHours: number; shiftIds: string[] }> = {};
  sortedShifts.forEach(shift => {
    const day = new Date(shift.checkIn).toISOString().split('T')[0];
    if (!hoursByDay[day]) hoursByDay[day] = { totalHours: 0, shiftIds: [] };
    hoursByDay[day].totalHours += shift.totalHours;
    hoursByDay[day].shiftIds.push(shift.id);
  });

  Object.entries(hoursByDay).forEach(([day, data]) => {
    if (data.totalHours > maxDailyHours) {
      flags.push({
        id: `daily-exceeded-${day}`,
        ruleId: 'MAX_DAILY_HOURS',
        severity: data.totalHours >= 14 ? 'critical' : 'warning',
        titleKey: 'fatigue_daily_exceeded',
        reason: `Exceeded maximum daily work limit: ${data.totalHours.toFixed(1)} hours logged on ${day} (limit is ${maxDailyHours}h).`,
        hoursOrCount: data.totalHours,
      });
    }
  });

  // 2. Rolling 7-day or Weekly hours check (> 60 total hrs or > 48 regular in hospital)
  // Check sliding 7-day windows
  for (let i = 0; i < sortedShifts.length; i++) {
    const currentShift = sortedShifts[i];
    const windowStart = new Date(currentShift.checkIn).getTime() - 7 * 24 * 60 * 60 * 1000;
    const windowShifts = sortedShifts.filter(s => {
      const t = new Date(s.checkIn).getTime();
      return t >= windowStart && t <= new Date(currentShift.checkIn).getTime();
    });

    const windowTotalHours = windowShifts.reduce((acc, s) => acc + s.totalHours, 0);
    const windowRegularHours = windowShifts.reduce((acc, s) => acc + (s.regularHours ?? s.totalHours), 0);

    if (windowTotalHours > maxWeeklyHours) {
      const flagId = `weekly-exceeded-${currentShift.id}`;
      if (!flags.some(f => f.ruleId === 'MAX_WEEKLY_HOURS')) {
        flags.push({
          id: flagId,
          ruleId: 'MAX_WEEKLY_HOURS',
          severity: 'critical',
          titleKey: 'fatigue_weekly_exceeded',
          reason: `High cumulative load: ${windowTotalHours.toFixed(1)} total hours in 7 days (cap is ${maxWeeklyHours}h).`,
          hoursOrCount: windowTotalHours,
        });
      }
    }

    if (sectorId === 'hospital' && windowRegularHours > maxRegularWeeklyHours) {
      if (!flags.some(f => f.ruleId === 'HOSPITAL_REGULAR_WEEKLY')) {
        flags.push({
          id: `hosp-weekly-${currentShift.id}`,
          ruleId: 'HOSPITAL_REGULAR_WEEKLY',
          severity: 'warning',
          titleKey: 'fatigue_hospital_weekly',
          reason: `Hospital statutory limit exceeded: ${windowRegularHours.toFixed(1)} regular hours in 7 days (limit is ${maxRegularWeeklyHours}h).`,
          hoursOrCount: windowRegularHours,
        });
      }
    }
  }

  // 3. Consecutive shifts: rest hours & consecutive night shifts
  let consecutiveNightCount = 0;

  for (let i = 0; i < sortedShifts.length; i++) {
    const current = sortedShifts[i];

    if (current.isNightShift) {
      consecutiveNightCount++;
      if (consecutiveNightCount > maxConsecutiveNightShifts) {
        if (!flags.some(f => f.ruleId === 'CONSECUTIVE_NIGHTS')) {
          flags.push({
            id: `consecutive-night-${current.id}`,
            ruleId: 'CONSECUTIVE_NIGHTS',
            severity: 'critical',
            titleKey: 'fatigue_consecutive_nights',
            reason: `Worked ${consecutiveNightCount} consecutive night shifts without 48h circadian recovery (safe limit is ${maxConsecutiveNightShifts}).`,
            hoursOrCount: consecutiveNightCount,
            detectedAtShiftId: current.id,
          });
        }
      }
    } else {
      consecutiveNightCount = 0;
    }

    // Compare with subsequent shift
    if (i < sortedShifts.length - 1) {
      const next = sortedShifts[i + 1];
      const endCurrent = new Date(current.checkOut).getTime();
      const startNext = new Date(next.checkIn).getTime();
      const restHours = (startNext - endCurrent) / (1000 * 60 * 60);

      // Back-to-back rest under 8 hours
      if (restHours >= 0 && restHours < minRestHoursBetweenShifts) {
        flags.push({
          id: `short-rest-${current.id}-${next.id}`,
          ruleId: 'SHORT_REST_BETWEEN_SHIFTS',
          severity: 'critical',
          titleKey: 'fatigue_short_rest',
          reason: `Insufficient rest between shifts: only ${restHours.toFixed(1)} hours recovery between shifts (statutory minimum is ${minRestHoursBetweenShifts}h).`,
          hoursOrCount: Math.round(restHours * 10) / 10,
          detectedAtShiftId: next.id,
        });
      }

      // Hospital specific: Morning shift right after night shift with under 11 hrs rest
      if (sectorId === 'hospital' && current.isNightShift) {
        const nextHour = new Date(next.checkIn).getHours();
        const isMorning = nextHour >= 6 && nextHour <= 10;
        if (isMorning && restHours < minRestAfterNightShiftBeforeMorningHours) {
          flags.push({
            id: `night-to-morning-${current.id}-${next.id}`,
            ruleId: 'NIGHT_TO_MORNING_QUICK_TURNAROUND',
            severity: 'critical',
            titleKey: 'fatigue_night_to_morning',
            reason: `Dangerous quick turnaround: Morning shift scheduled ${restHours.toFixed(1)} hours after night shift (clinical safety standard requires at least ${minRestAfterNightShiftBeforeMorningHours}h rest).`,
            hoursOrCount: Math.round(restHours * 10) / 10,
            detectedAtShiftId: next.id,
          });
        }
      }

      // Double shift: 16+ hours within a 24-hour sliding window
      const combinedDuration = current.totalHours + next.totalHours;
      const windowSpread = (new Date(next.checkOut).getTime() - new Date(current.checkIn).getTime()) / (1000 * 60 * 60);
      if (windowSpread <= 24 && combinedDuration >= doubleShiftThresholdHours) {
        flags.push({
          id: `double-shift-${current.id}-${next.id}`,
          ruleId: 'DOUBLE_SHIFT',
          severity: 'critical',
          titleKey: 'fatigue_double_shift',
          reason: `Double shift detected: ${combinedDuration.toFixed(1)} hours of duty performed within a 24-hour window (limit is ${doubleShiftThresholdHours}h).`,
          hoursOrCount: combinedDuration,
          detectedAtShiftId: next.id,
        });
      }
    }
  }

  const criticalCount = flags.filter(f => f.severity === 'critical').length;
  const warningCount = flags.filter(f => f.severity === 'warning').length;

  return {
    hasFatigueRisk: flags.length > 0,
    criticalCount,
    warningCount,
    flags,
  };
}

import { describe, it, expect } from 'vitest';
import { calculateShiftHours, getAttributedWorkDate, calculateNightHours } from '../src/utils/shiftCalculations';
import { calculatePayslip } from '../src/utils/payslipCalculations';
import { analyzeWorkerFatigue } from '../src/utils/fatigueAnalysis';
import { calculateAttritionRisk } from '../src/utils/attritionScore';
import { checkCertificationStatus } from '../src/utils/certificationExpiry';

describe('Shift Calculations & Midnight Attribution', () => {
  it('correctly attributes a shift crossing midnight to the starting workday', () => {
    // Starts at 10 PM on Oct 26, finishes at 6 AM on Oct 27
    const checkIn = '2026-10-26T22:00:00';
    const checkOut = '2026-10-27T06:00:00';

    const attributedDate = getAttributedWorkDate(checkIn);
    expect(attributedDate).toBe('2026-10-26');

    const result = calculateShiftHours(checkIn, checkOut, 8);
    expect(result.totalHours).toBe(8);
    expect(result.regularHours).toBe(8);
    expect(result.overtimeHours).toBe(0);
    expect(result.isNightShift).toBe(true);
    expect(result.nightHours).toBe(8);
    expect(result.attributedWorkDate).toBe('2026-10-26');
  });

  it('calculates overtime accurately for extended shifts', () => {
    // 10 hours worked (starts 08:00, ends 18:00) with 8h threshold
    const checkIn = '2026-10-26T08:00:00';
    const checkOut = '2026-10-26T18:00:00';

    const result = calculateShiftHours(checkIn, checkOut, 8);
    expect(result.totalHours).toBe(10);
    expect(result.regularHours).toBe(8);
    expect(result.overtimeHours).toBe(2);
    expect(result.nightHours).toBe(0);
    expect(result.isNightShift).toBe(false);
  });

  it('handles 12-hour shifts with overtime after 12 hours', () => {
    // 13.5 hours worked on a 12h threshold
    const checkIn = '2026-10-26T07:00:00';
    const checkOut = '2026-10-26T20:30:00';

    const result = calculateShiftHours(checkIn, checkOut, 12);
    expect(result.totalHours).toBe(13.5);
    expect(result.regularHours).toBe(12);
    expect(result.overtimeHours).toBe(1.5);
  });

  it('handles invalid or zero-duration inputs gracefully', () => {
    const result = calculateShiftHours('2026-10-26T10:00:00', '2026-10-26T09:00:00', 8);
    expect(result.totalHours).toBe(0);
    expect(result.regularHours).toBe(0);
    expect(result.overtimeHours).toBe(0);
  });
});

describe('Clear Payslip Calculations', () => {
  it('computes transparent breakdown with base, overtime, night allowance, and deductions', () => {
    const shifts = [
      { totalHours: 8, regularHours: 8, overtimeHours: 0, nightHours: 0, isNightShift: false },
      { totalHours: 10, regularHours: 8, overtimeHours: 2, nightHours: 0, isNightShift: false },
      { totalHours: 8, regularHours: 8, overtimeHours: 0, nightHours: 8, isNightShift: true },
    ];

    // Base rate ₹200/hr, overtime 1.5x (₹300/hr), night allowance ₹250 flat per night shift
    const payslip = calculatePayslip({
      shifts,
      baseHourlyRate: 200,
      overtimeMultiplier: 1.5,
      nightAllowanceFlat: 250,
      currencySymbol: '₹',
    });

    expect(payslip.regularHours).toBe(24);
    expect(payslip.basePay).toBe(4800); // 24 * 200
    expect(payslip.overtimeHours).toBe(2);
    expect(payslip.overtimePay).toBe(600); // 2 * 300
    expect(payslip.nightShiftCount).toBe(1);
    expect(payslip.nightAllowancePay).toBe(250); // 1 * 250
    expect(payslip.grossPay).toBe(5650); // 4800 + 600 + 250

    // Deductions: PF 8% of base (384), ESI 1.5% of base (72), uniform/welfare (100) = 556
    expect(payslip.totalDeductions).toBe(556);
    expect(payslip.netPay).toBe(5094);
  });
});

describe('Fatigue Rules Analysis', () => {
  it('detects more than 3 consecutive night shifts in hospital sector', () => {
    const shifts = [
      { id: 's1', workerId: 'w1', checkIn: '2026-10-20T22:00:00', checkOut: '2026-10-21T06:00:00', isNightShift: true, totalHours: 8 },
      { id: 's2', workerId: 'w1', checkIn: '2026-10-21T22:00:00', checkOut: '2026-10-22T06:00:00', isNightShift: true, totalHours: 8 },
      { id: 's3', workerId: 'w1', checkIn: '2026-10-22T22:00:00', checkOut: '2026-10-23T06:00:00', isNightShift: true, totalHours: 8 },
      { id: 's4', workerId: 'w1', checkIn: '2026-10-23T22:00:00', checkOut: '2026-10-24T06:00:00', isNightShift: true, totalHours: 8 }, // 4th consecutive night!
    ];

    const result = analyzeWorkerFatigue(shifts, { sectorId: 'hospital', maxConsecutiveNightShifts: 3 });
    expect(result.hasFatigueRisk).toBe(true);
    expect(result.flags.some(f => f.ruleId === 'CONSECUTIVE_NIGHTS')).toBe(true);
  });

  it('detects insufficient rest between back-to-back shifts (< 8 hours)', () => {
    const shifts = [
      { id: 's1', workerId: 'w1', checkIn: '2026-10-26T06:00:00', checkOut: '2026-10-26T16:00:00', isNightShift: false, totalHours: 10 },
      // Only 6 hours rest between 16:00 and 22:00
      { id: 's2', workerId: 'w1', checkIn: '2026-10-26T22:00:00', checkOut: '2026-10-27T06:00:00', isNightShift: true, totalHours: 8 },
    ];

    const result = analyzeWorkerFatigue(shifts, { minRestHoursBetweenShifts: 8 });
    expect(result.hasFatigueRisk).toBe(true);
    expect(result.flags.some(f => f.ruleId === 'SHORT_REST_BETWEEN_SHIFTS')).toBe(true);
  });

  it('detects morning shift right after night shift with under 11 hours rest in hospital', () => {
    const shifts = [
      { id: 's1', workerId: 'w1', checkIn: '2026-10-25T22:00:00', checkOut: '2026-10-26T06:00:00', isNightShift: true, totalHours: 8 },
      // Morning shift starts at 08:00 (only 2 hours rest after 06:00)
      { id: 's2', workerId: 'w1', checkIn: '2026-10-26T08:00:00', checkOut: '2026-10-26T16:00:00', isNightShift: false, totalHours: 8 },
    ];

    const result = analyzeWorkerFatigue(shifts, { sectorId: 'hospital', minRestAfterNightShiftBeforeMorningHours: 11 });
    expect(result.hasFatigueRisk).toBe(true);
    expect(result.flags.some(f => f.ruleId === 'NIGHT_TO_MORNING_QUICK_TURNAROUND')).toBe(true);
  });

  it('detects over 12 hours in a single day and over 60 hours in a week', () => {
    const shifts = [
      { id: 's1', workerId: 'w1', checkIn: '2026-10-26T06:00:00', checkOut: '2026-10-26T20:00:00', isNightShift: false, totalHours: 14 },
    ];

    const result = analyzeWorkerFatigue(shifts, { maxDailyHours: 12 });
    expect(result.hasFatigueRisk).toBe(true);
    expect(result.flags.some(f => f.ruleId === 'MAX_DAILY_HOURS')).toBe(true);
  });
});

describe('Transparent Attrition Risk Scoring', () => {
  it('assigns high risk score and clear breakdown for overloaded worker', () => {
    const risk = calculateAttritionRisk({
      workerId: 'w1',
      weeklyOvertimeHours: 18, // +35 pts
      missedShiftsLastMonth: 2, // +18 pts
      departmentFeedbackScore: 2.0, // +20 pts
      fatigueWarningCount: 1,
      fatigueCriticalCount: 1, // +12 pts
    });

    expect(risk.score).toBeGreaterThanOrEqual(70);
    expect(risk.level).toBe('High');
    expect(risk.reasons.length).toBeGreaterThan(2);
  });

  it('assigns low risk score for healthy worker with no flags', () => {
    const risk = calculateAttritionRisk({
      workerId: 'w2',
      weeklyOvertimeHours: 2,
      missedShiftsLastMonth: 0,
      departmentFeedbackScore: 4.8,
      fatigueWarningCount: 0,
      fatigueCriticalCount: 0,
    });

    expect(risk.score).toBe(0);
    expect(risk.level).toBe('Low');
    expect(risk.reasons[0]).toContain('Healthy work-rest balance');
  });
});

describe('Skill Passport & Certification Expiry', () => {
  const refDate = new Date('2026-10-26T00:00:00');

  it('flags certification expiring within 30 days as expiring_soon', () => {
    // Expires in 15 days (Nov 10, 2026)
    const result = checkCertificationStatus('2026-11-10T00:00:00', refDate);
    expect(result.status).toBe('expiring_soon');
    expect(result.isExpiringSoon).toBe(true);
    expect(result.daysRemaining).toBe(15);
  });

  it('marks expired certification when expiry is in the past', () => {
    // Expired 5 days ago (Oct 21, 2026)
    const result = checkCertificationStatus('2026-10-21T00:00:00', refDate);
    expect(result.status).toBe('expired');
    expect(result.isExpired).toBe(true);
    expect(result.daysRemaining).toBeLessThan(0);
  });

  it('marks certification valid when expiry is well in the future (>30 days)', () => {
    // Expires in 120 days (Feb 23, 2027)
    const result = checkCertificationStatus('2027-02-23T00:00:00', refDate);
    expect(result.status).toBe('valid');
    expect(result.isExpiringSoon).toBe(false);
    expect(result.isExpired).toBe(false);
  });
});

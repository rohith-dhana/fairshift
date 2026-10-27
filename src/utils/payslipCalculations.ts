/**
 * Pure functions for payslip calculations with clear itemized breakdowns.
 */

export interface ShiftSummaryInput {
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  nightHours: number;
  isNightShift: boolean;
}

export interface PayslipDeduction {
  id: string;
  name: string;
  amount: number;
  description?: string;
}

export interface PayslipBreakdown {
  periodMonth: string; // e.g. "October 2026"
  baseHourlyRate: number;
  regularHours: number;
  basePay: number;
  overtimeHours: number;
  overtimeRate: number;
  overtimePay: number;
  nightShiftCount: number;
  nightAllowancePerShift: number;
  nightAllowancePay: number;
  grossPay: number;
  deductions: PayslipDeduction[];
  totalDeductions: number;
  netPay: number;
  currencySymbol: string;
}

export interface CalculatePayslipParams {
  shifts: ShiftSummaryInput[];
  baseHourlyRate: number;
  overtimeMultiplier?: number; // default 1.5
  nightAllowanceFlat?: number; // e.g. 250
  nightAllowancePercentage?: number; // e.g. 0.20 (if flat not used)
  periodMonth?: string;
  customDeductions?: PayslipDeduction[];
  currencySymbol?: string;
}

export function calculatePayslip({
  shifts,
  baseHourlyRate,
  overtimeMultiplier = 1.5,
  nightAllowanceFlat = 250,
  periodMonth = 'October 2026',
  customDeductions,
  currencySymbol = '₹',
}: CalculatePayslipParams): PayslipBreakdown {
  const regularHours = shifts.reduce((sum, s) => sum + (s.regularHours || 0), 0);
  const overtimeHours = shifts.reduce((sum, s) => sum + (s.overtimeHours || 0), 0);
  const nightShiftCount = shifts.filter(s => s.isNightShift).length;

  const round = (val: number) => Math.round(val * 100) / 100;

  const basePay = round(regularHours * baseHourlyRate);
  const overtimeRate = round(baseHourlyRate * overtimeMultiplier);
  const overtimePay = round(overtimeHours * overtimeRate);
  const nightAllowancePay = round(nightShiftCount * nightAllowanceFlat);

  const grossPay = round(basePay + overtimePay + nightAllowancePay);

  // Standard decent-work statutory deductions (e.g. Provident Fund 8%, ESI Health Cover 1.5%)
  const deductions: PayslipDeduction[] = customDeductions || [
    {
      id: 'pf',
      name: 'Provident Fund (Retirement & Social Security)',
      amount: round(basePay * 0.08),
      description: 'Statutory 8% contribution for social protection',
    },
    {
      id: 'esi',
      name: 'Employees State Insurance (Health/Medical)',
      amount: round(basePay * 0.015),
      description: 'Medical and hospitalization coverage',
    },
    {
      id: 'uniform',
      name: 'Welfare & Safety Equipment Fund',
      amount: 100,
      description: 'Subsidized PPE maintenance and welfare trust',
    },
  ];

  const totalDeductions = round(deductions.reduce((sum, d) => sum + d.amount, 0));
  const netPay = Math.max(0, round(grossPay - totalDeductions));

  return {
    periodMonth,
    baseHourlyRate: round(baseHourlyRate),
    regularHours: round(regularHours),
    basePay,
    overtimeHours: round(overtimeHours),
    overtimeRate,
    overtimePay,
    nightShiftCount,
    nightAllowancePerShift: nightAllowanceFlat,
    nightAllowancePay,
    grossPay,
    deductions,
    totalDeductions,
    netPay,
    currencySymbol,
  };
}

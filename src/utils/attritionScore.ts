/**
 * Transparent rule-based Attrition Risk calculation.
 * Factors:
 * 1. Overtime Load (burnout risk)
 * 2. Absenteeism / Missed shifts / Unplanned leave
 * 3. Low department feedback / work conditions sentiment
 * 4. Fatigue flags (consecutive nights, short rest)
 */

export interface AttritionInput {
  workerId: string;
  weeklyOvertimeHours: number;
  missedShiftsLastMonth: number;
  departmentFeedbackScore?: number; // 1 to 5 scale
  fatigueWarningCount: number;
  fatigueCriticalCount: number;
  tenureMonths?: number;
}

export interface AttritionRiskResult {
  score: number; // 0 - 100
  level: 'Low' | 'Medium' | 'High';
  reasons: string[];
  breakdown: {
    overtimePoints: number;
    absenteeismPoints: number;
    feedbackPoints: number;
    fatiguePoints: number;
  };
}

export function calculateAttritionRisk(input: AttritionInput): AttritionRiskResult {
  let score = 0;
  const reasons: string[] = [];

  // Factor 1: Overtime load (Max 35 points)
  let overtimePoints = 0;
  if (input.weeklyOvertimeHours > 16) {
    overtimePoints = 35;
    reasons.push(`Severe overtime burden: ${input.weeklyOvertimeHours.toFixed(1)} hrs overtime/wk (+35 pts)`);
  } else if (input.weeklyOvertimeHours > 10) {
    overtimePoints = 25;
    reasons.push(`High overtime load: ${input.weeklyOvertimeHours.toFixed(1)} hrs overtime/wk (+25 pts)`);
  } else if (input.weeklyOvertimeHours > 5) {
    overtimePoints = 12;
    reasons.push(`Moderate overtime: ${input.weeklyOvertimeHours.toFixed(1)} hrs overtime/wk (+12 pts)`);
  }

  // Factor 2: Absenteeism / Missed shifts (Max 25 points)
  let absenteeismPoints = 0;
  if (input.missedShiftsLastMonth >= 3) {
    absenteeismPoints = 25;
    reasons.push(`Frequent unplanned absence: ${input.missedShiftsLastMonth} missed shifts this month (+25 pts)`);
  } else if (input.missedShiftsLastMonth === 2) {
    absenteeismPoints = 18;
    reasons.push(`Elevated absence rate: 2 missed shifts this month (+18 pts)`);
  } else if (input.missedShiftsLastMonth === 1) {
    absenteeismPoints = 8;
    reasons.push(`1 unexcused absence logged (+8 pts)`);
  }

  // Factor 3: Department Feedback Sentiment (Max 20 points)
  let feedbackPoints = 0;
  if (input.departmentFeedbackScore !== undefined) {
    if (input.departmentFeedbackScore <= 2.2) {
      feedbackPoints = 20;
      reasons.push(`Very low department satisfaction score (${input.departmentFeedbackScore.toFixed(1)}/5) (+20 pts)`);
    } else if (input.departmentFeedbackScore <= 3.0) {
      feedbackPoints = 12;
      reasons.push(`Below-average shift sentiment (${input.departmentFeedbackScore.toFixed(1)}/5) (+12 pts)`);
    }
  }

  // Factor 4: Fatigue Flags (Max 20 points)
  let fatiguePoints = 0;
  if (input.fatigueCriticalCount > 0) {
    fatiguePoints += Math.min(20, input.fatigueCriticalCount * 12);
    reasons.push(`${input.fatigueCriticalCount} critical fatigue alert(s) on record (+${fatiguePoints} pts)`);
  }
  if (input.fatigueWarningCount > 0 && fatiguePoints < 20) {
    const additional = Math.min(20 - fatiguePoints, input.fatigueWarningCount * 5);
    fatiguePoints += additional;
    reasons.push(`${input.fatigueWarningCount} warning fatigue flag(s) (+${additional} pts)`);
  }

  score = Math.min(100, overtimePoints + absenteeismPoints + feedbackPoints + fatiguePoints);

  let level: 'Low' | 'Medium' | 'High' = 'Low';
  if (score >= 65) {
    level = 'High';
  } else if (score >= 35) {
    level = 'Medium';
  }

  if (reasons.length === 0) {
    reasons.push('Healthy work-rest balance with consistent attendance and positive feedback.');
  }

  return {
    score,
    level,
    reasons,
    breakdown: {
      overtimePoints,
      absenteeismPoints,
      feedbackPoints,
      fatiguePoints,
    },
  };
}

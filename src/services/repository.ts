/**
 * Repository Pattern Data Layer for FairShift
 * Decoupled so Firebase Firestore can be swapped in seamlessly later.
 */

import { ShiftHourBreakdown, calculateShiftHours } from '../utils/shiftCalculations';
import { FatigueFlag, analyzeWorkerFatigue } from '../utils/fatigueAnalysis';
import { calculateAttritionRisk, AttritionRiskResult } from '../utils/attritionScore';
import { checkCertificationStatus, CertificationExpiryResult } from '../utils/certificationExpiry';

export interface Worker {
  id: string;
  name: string;
  sectorId: string;
  roleId: string;
  departmentId: string;
  employeeCode: string;
  hourlyRate: number;
  phone?: string;
  avatarSeed?: string;
  activeShiftId?: string | null;
}

export interface ShiftRecord {
  id: string;
  workerId: string;
  sectorId: string;
  departmentId: string;
  shiftTypeId: string;
  checkIn: string; // ISO string
  checkOut?: string; // ISO string (optional if active)
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  nightHours: number;
  isNightShift: boolean;
  status: 'active' | 'completed';
  notes?: string;
}

export type SafetyReportStatus = 'reported' | 'acknowledged' | 'in_progress' | 'resolved';
export type SafetySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SafetyReport {
  id: string;
  workerId: string;
  workerName: string;
  sectorId: string;
  departmentId: string;
  categoryId: string;
  categoryName: string;
  severity: SafetySeverity;
  description: string;
  voiceTranscript?: string;
  photoUrl?: string;
  status: SafetyReportStatus;
  reportedAt: string; // ISO
  acknowledgedAt?: string;
  resolvedAt?: string;
  supervisorNotes?: string;
  aiSuggestedAction?: string;
}

export interface AnonymousFeedback {
  id: string;
  sectorId: string;
  departmentId: string;
  ratings: Record<string, number>; // questionId -> rating (1-5)
  submittedAt: string; // ISO
}

export interface WorkerCertification {
  id: string;
  workerId: string;
  skillItemId: string;
  name: string;
  issuingBody: string;
  issueDate: string; // ISO YYYY-MM-DD
  expiryDate: string; // ISO YYYY-MM-DD
  verified: boolean;
  credentialUrl?: string;
}

export interface FairShiftRepository {
  // Workers
  getWorkers(sectorId?: string): Promise<Worker[]>;
  getWorkerById(id: string): Promise<Worker | undefined>;
  updateWorker(worker: Partial<Worker> & { id: string }): Promise<Worker>;

  // Shifts
  getShifts(workerId?: string, sectorId?: string): Promise<ShiftRecord[]>;
  getWorkerActiveShift(workerId: string): Promise<ShiftRecord | undefined>;
  checkIn(workerId: string, sectorId: string, departmentId: string, shiftTypeId: string): Promise<ShiftRecord>;
  checkOut(shiftId: string): Promise<ShiftRecord>;

  // Safety Reports
  getSafetyReports(sectorId?: string): Promise<SafetyReport[]>;
  getWorkerSafetyReports(workerId: string): Promise<SafetyReport[]>;
  submitSafetyReport(report: Omit<SafetyReport, 'id' | 'reportedAt' | 'status'>): Promise<SafetyReport>;
  updateSafetyReportStatus(id: string, status: SafetyReportStatus, supervisorNotes?: string): Promise<SafetyReport>;

  // Anonymous Feedback
  submitFeedback(feedback: Omit<AnonymousFeedback, 'id' | 'submittedAt'>): Promise<AnonymousFeedback>;
  getAggregatedFeedback(sectorId: string, departmentId?: string): Promise<{
    hasEnoughResponses: boolean;
    totalResponses: number;
    averageRatings: Record<string, number>;
  }>;

  // Certifications / Skill Passport
  getWorkerCertifications(workerId: string): Promise<WorkerCertification[]>;
  getAllCertifications(sectorId?: string): Promise<WorkerCertification[]>;
  addCertification(cert: Omit<WorkerCertification, 'id'>): Promise<WorkerCertification>;
}

// --- Seed Data ---

const INITIAL_WORKERS: Worker[] = [
  // 6 Hospital Workers
  {
    id: 'hosp-w1',
    name: 'Priya Sundaram',
    sectorId: 'hospital',
    roleId: 'ward_nurse',
    departmentId: 'icu',
    employeeCode: 'HOSP-RN-104',
    hourlyRate: 230,
    phone: '+91 98401 23456',
    activeShiftId: null,
  },
  {
    id: 'hosp-w2',
    name: 'Rajesh Kumar',
    sectorId: 'hospital',
    roleId: 'nursing_attendant',
    departmentId: 'emergency',
    employeeCode: 'HOSP-NA-212',
    hourlyRate: 155,
    phone: '+91 97890 54321',
    activeShiftId: null,
  },
  {
    id: 'hosp-w3',
    name: 'Sunita Devi',
    sectorId: 'hospital',
    roleId: 'sanitation_staff',
    departmentId: 'laundry_sanitation',
    employeeCode: 'HOSP-SN-089',
    hourlyRate: 135,
    phone: '+91 94440 98765',
    activeShiftId: null,
  },
  {
    id: 'hosp-w4',
    name: 'Arun Joseph',
    sectorId: 'hospital',
    roleId: 'lab_technician',
    departmentId: 'operation_theatre',
    employeeCode: 'HOSP-LT-305',
    hourlyRate: 245,
    phone: '+91 98840 11223',
    activeShiftId: null,
  },
  {
    id: 'hosp-w5',
    name: 'Lakshmi Rao',
    sectorId: 'hospital',
    roleId: 'hospital_security',
    departmentId: 'emergency',
    employeeCode: 'HOSP-SC-411',
    hourlyRate: 145,
    phone: '+91 99620 44556',
    activeShiftId: null,
  },
  {
    id: 'hosp-w6',
    name: 'Mohammad Farooq',
    sectorId: 'hospital',
    roleId: 'ward_nurse',
    departmentId: 'general_ward',
    employeeCode: 'HOSP-RN-118',
    hourlyRate: 225,
    phone: '+91 97910 88990',
    activeShiftId: null,
  },

  // 6 College / Campus Workers
  {
    id: 'camp-w1',
    name: 'Ramesh Babu',
    sectorId: 'campus',
    roleId: 'housekeeping',
    departmentId: 'academic_blocks',
    employeeCode: 'CAMP-HK-101',
    hourlyRate: 140,
    phone: '+91 98410 33445',
    activeShiftId: null,
  },
  {
    id: 'camp-w2',
    name: 'Kavita Sharma',
    sectorId: 'campus',
    roleId: 'canteen_staff',
    departmentId: 'dining_canteen',
    employeeCode: 'CAMP-CS-205',
    hourlyRate: 145,
    phone: '+91 98402 77889',
    activeShiftId: null,
  },
  {
    id: 'camp-w3',
    name: 'Suresh Patel',
    sectorId: 'campus',
    roleId: 'campus_security',
    departmentId: 'campus_grounds',
    employeeCode: 'CAMP-SC-302',
    hourlyRate: 150,
    phone: '+91 97909 66778',
    activeShiftId: null,
  },
  {
    id: 'camp-w4',
    name: 'Deepa Nair',
    sectorId: 'campus',
    roleId: 'lab_attendant',
    departmentId: 'science_laboratories',
    employeeCode: 'CAMP-LA-404',
    hourlyRate: 180,
    phone: '+91 98845 55667',
    activeShiftId: null,
  },
  {
    id: 'camp-w5',
    name: 'Manoj Yadav',
    sectorId: 'campus',
    roleId: 'gardener',
    departmentId: 'campus_grounds',
    employeeCode: 'CAMP-GD-510',
    hourlyRate: 135,
    phone: '+91 99625 22334',
    activeShiftId: null,
  },
  {
    id: 'camp-w6',
    name: 'Anita Kumari',
    sectorId: 'campus',
    roleId: 'housekeeping',
    departmentId: 'student_hostels',
    employeeCode: 'CAMP-HK-109',
    hourlyRate: 140,
    phone: '+91 97915 11223',
    activeShiftId: null,
  },
];

// Shifts Seed Data
// Priya Sundaram (hosp-w1) has 4 consecutive night shifts and short rest -> triggers fatigue alert!
const INITIAL_SHIFTS: ShiftRecord[] = [
  // Priya Sundaram (Hospital Nurse) - Excessive consecutive night shifts
  {
    id: 'shift-h1-1',
    workerId: 'hosp-w1',
    sectorId: 'hospital',
    departmentId: 'icu',
    shiftTypeId: 'night_8h',
    checkIn: '2026-10-22T22:00:00Z',
    checkOut: '2026-10-23T06:00:00Z',
    totalHours: 8,
    regularHours: 8,
    overtimeHours: 0,
    nightHours: 8,
    isNightShift: true,
    status: 'completed',
  },
  {
    id: 'shift-h1-2',
    workerId: 'hosp-w1',
    sectorId: 'hospital',
    departmentId: 'icu',
    shiftTypeId: 'night_8h',
    checkIn: '2026-10-23T22:00:00Z',
    checkOut: '2026-10-24T06:00:00Z',
    totalHours: 8,
    regularHours: 8,
    overtimeHours: 0,
    nightHours: 8,
    isNightShift: true,
    status: 'completed',
  },
  {
    id: 'shift-h1-3',
    workerId: 'hosp-w1',
    sectorId: 'hospital',
    departmentId: 'icu',
    shiftTypeId: 'night_8h',
    checkIn: '2026-10-24T22:00:00Z',
    checkOut: '2026-10-25T06:00:00Z',
    totalHours: 8,
    regularHours: 8,
    overtimeHours: 0,
    nightHours: 8,
    isNightShift: true,
    status: 'completed',
  },
  {
    id: 'shift-h1-4',
    workerId: 'hosp-w1',
    sectorId: 'hospital',
    departmentId: 'icu',
    shiftTypeId: 'night_8h',
    checkIn: '2026-10-25T22:00:00Z',
    checkOut: '2026-10-26T06:00:00Z',
    totalHours: 8,
    regularHours: 8,
    overtimeHours: 0,
    nightHours: 8,
    isNightShift: true,
    status: 'completed',
  },
  // Rajesh Kumar (Attendant) - standard shifts with 2h overtime
  {
    id: 'shift-h2-1',
    workerId: 'hosp-w2',
    sectorId: 'hospital',
    departmentId: 'emergency',
    shiftTypeId: 'morning_8h',
    checkIn: '2026-10-25T06:00:00Z',
    checkOut: '2026-10-25T16:00:00Z',
    totalHours: 10,
    regularHours: 8,
    overtimeHours: 2,
    nightHours: 0,
    isNightShift: false,
    status: 'completed',
  },
  {
    id: 'shift-h2-2',
    workerId: 'hosp-w2',
    sectorId: 'hospital',
    departmentId: 'emergency',
    shiftTypeId: 'morning_8h',
    checkIn: '2026-10-26T06:00:00Z',
    checkOut: '2026-10-26T14:00:00Z',
    totalHours: 8,
    regularHours: 8,
    overtimeHours: 0,
    nightHours: 0,
    isNightShift: false,
    status: 'completed',
  },
  // Sunita Devi (Sanitation) - evening shifts
  {
    id: 'shift-h3-1',
    workerId: 'hosp-w3',
    sectorId: 'hospital',
    departmentId: 'laundry_sanitation',
    shiftTypeId: 'evening_8h',
    checkIn: '2026-10-25T14:00:00Z',
    checkOut: '2026-10-25T22:00:00Z',
    totalHours: 8,
    regularHours: 8,
    overtimeHours: 0,
    nightHours: 0,
    isNightShift: false,
    status: 'completed',
  },
  {
    id: 'shift-h3-2',
    workerId: 'hosp-w3',
    sectorId: 'hospital',
    departmentId: 'laundry_sanitation',
    shiftTypeId: 'evening_8h',
    checkIn: '2026-10-26T14:00:00Z',
    checkOut: '2026-10-26T22:00:00Z',
    totalHours: 8,
    regularHours: 8,
    overtimeHours: 0,
    nightHours: 0,
    isNightShift: false,
    status: 'completed',
  },
  // Campus shifts
  {
    id: 'shift-c1-1',
    workerId: 'camp-w1',
    sectorId: 'campus',
    departmentId: 'academic_blocks',
    shiftTypeId: 'day_shift',
    checkIn: '2026-10-25T08:00:00Z',
    checkOut: '2026-10-25T16:00:00Z',
    totalHours: 8,
    regularHours: 8,
    overtimeHours: 0,
    nightHours: 0,
    isNightShift: false,
    status: 'completed',
  },
  {
    id: 'shift-c1-2',
    workerId: 'camp-w1',
    sectorId: 'campus',
    departmentId: 'academic_blocks',
    shiftTypeId: 'day_shift',
    checkIn: '2026-10-26T08:00:00Z',
    checkOut: '2026-10-26T16:00:00Z',
    totalHours: 8,
    regularHours: 8,
    overtimeHours: 0,
    nightHours: 0,
    isNightShift: false,
    status: 'completed',
  },
  {
    id: 'shift-c3-1',
    workerId: 'camp-w3',
    sectorId: 'campus',
    departmentId: 'campus_grounds',
    shiftTypeId: 'campus_night',
    checkIn: '2026-10-25T20:00:00Z',
    checkOut: '2026-10-26T06:00:00Z',
    totalHours: 10,
    regularHours: 8,
    overtimeHours: 2,
    nightHours: 8,
    isNightShift: true,
    status: 'completed',
  },
];

// Safety Reports Seed Data (Hospital 3 sample reports in different statuses)
const INITIAL_SAFETY_REPORTS: SafetyReport[] = [
  {
    id: 'rep-hosp-1',
    workerId: 'hosp-w1',
    workerName: 'Priya Sundaram',
    sectorId: 'hospital',
    departmentId: 'emergency',
    categoryId: 'needle_stick',
    categoryName: 'Needle-stick or Sharps Injury',
    severity: 'high',
    description: 'Recapping discarded needle in trauma bay 3 led to superficial puncture on left index finger. Post-exposure prophylaxis initiated.',
    voiceTranscript: 'Needle stick injury in trauma bay three while disposing suture needle.',
    status: 'in_progress',
    reportedAt: '2026-10-26T04:30:00Z',
    acknowledgedAt: '2026-10-26T04:45:00Z',
    supervisorNotes: 'Occupational health officer notified. Source patient blood screened negative. Worker given 48h observation leave.',
    aiSuggestedAction: 'Immediate wound wash with soap/water; PEP protocol within 2 hours; replace puncture-resistant sharps box.',
  },
  {
    id: 'rep-hosp-2',
    workerId: 'hosp-w3',
    workerName: 'Sunita Devi',
    sectorId: 'hospital',
    departmentId: 'icu',
    categoryId: 'biohazard',
    categoryName: 'Biohazard / Biomedical Waste Spill',
    severity: 'high',
    description: 'Yellow biohazard bag tore during transit in ICU corridor. Blood-stained linen spilled near patient room 4.',
    voiceTranscript: 'Yellow biohazard bag leaked near ICU room 4, immediate spill kit needed.',
    status: 'acknowledged',
    reportedAt: '2026-10-26T09:15:00Z',
    acknowledgedAt: '2026-10-26T09:20:00Z',
    supervisorNotes: 'Housekeeping team dispatched with 1% sodium hypochlorite spill kit and barrier tape.',
    aiSuggestedAction: 'Cordon off 2-meter radius; deploy spill granules and sodium hypochlorite solution; double-bag waste.',
  },
  {
    id: 'rep-hosp-3',
    workerId: 'hosp-w2',
    workerName: 'Rajesh Kumar',
    sectorId: 'hospital',
    departmentId: 'laundry_sanitation',
    categoryId: 'slip_hazard',
    categoryName: 'Slip / Trip Hazard',
    severity: 'low',
    description: 'Water ponding near washing unit 2 without yellow cautionary floor signage.',
    status: 'resolved',
    reportedAt: '2026-10-25T11:00:00Z',
    acknowledgedAt: '2026-10-25T11:10:00Z',
    resolvedAt: '2026-10-25T12:00:00Z',
    supervisorNotes: 'Drain trap cleared by plumbing team and wet floor caution boards installed.',
    aiSuggestedAction: 'Place non-slip rubber mats and post high-visibility wet floor warning signage.',
  },
  // Campus Safety Report
  {
    id: 'rep-camp-1',
    workerId: 'camp-w1',
    workerName: 'Ramesh Babu',
    sectorId: 'campus',
    departmentId: 'academic_blocks',
    categoryId: 'electrical_hazard',
    categoryName: 'Electrical Hazard / Exposed Wiring',
    severity: 'medium',
    description: 'Exposed 230V live wire hanging from open junction box on second floor corridor wall.',
    status: 'in_progress',
    reportedAt: '2026-10-26T10:00:00Z',
    acknowledgedAt: '2026-10-26T10:15:00Z',
    supervisorNotes: 'Substation electrician requested to isolate the breaker and fit insulated conduit box.',
    aiSuggestedAction: 'Isolate circuit at distribution board immediately; install insulated junction enclosure.',
  },
];

// Certifications Seed Data
// Priya Sundaram has CPR expiring within 20 days!
const INITIAL_CERTS: WorkerCertification[] = [
  {
    id: 'cert-1',
    workerId: 'hosp-w1',
    skillItemId: 'bls_cpr',
    name: 'Basic Life Support (BLS / CPR)',
    issuingBody: 'American Heart Association (AHA)',
    issueDate: '2024-11-15',
    expiryDate: '2026-11-15', // ~20 days remaining! -> triggers "expiring within 30 days" flag
    verified: true,
  },
  {
    id: 'cert-2',
    workerId: 'hosp-w1',
    skillItemId: 'infection_control',
    name: 'Hospital Infection Control Protocols',
    issuingBody: 'National Accreditation Board (NABH)',
    issueDate: '2026-01-10',
    expiryDate: '2027-01-10',
    verified: true,
  },
  {
    id: 'cert-3',
    workerId: 'hosp-w2',
    skillItemId: 'biomedical_waste',
    name: 'Biomedical Waste Segregation & Handling',
    issuingBody: 'State Pollution Control Board',
    issueDate: '2025-08-01',
    expiryDate: '2027-08-01',
    verified: true,
  },
  {
    id: 'cert-4',
    workerId: 'hosp-w3',
    skillItemId: 'hep_b_vaccine',
    name: 'Hepatitis B Vaccination & Immunity Check',
    issuingBody: 'Employee Health Service',
    issueDate: '2023-05-12',
    expiryDate: '2028-05-12',
    verified: true,
  },
  {
    id: 'cert-5',
    workerId: 'camp-w1',
    skillItemId: 'fire_safety_campus',
    name: 'Standard Workplace First Aid & Fire Safety',
    issuingBody: 'Red Cross Society',
    issueDate: '2025-06-15',
    expiryDate: '2027-06-15',
    verified: true,
  },
  {
    id: 'cert-6',
    workerId: 'camp-w2',
    skillItemId: 'food_safety',
    name: 'FSSAI Food Hygiene & Safe Prep Certification',
    issuingBody: 'Food Safety and Standards Authority',
    issueDate: '2025-09-01',
    expiryDate: '2026-11-05', // ~10 days remaining!
    verified: true,
  },
];

// Anonymous Feedback Seed Data
// Seed with 6 hospital responses (satisfying >= 5 requirement) so aggregate view unlocks!
const INITIAL_FEEDBACK: AnonymousFeedback[] = [
  {
    id: 'fb-1',
    sectorId: 'hospital',
    departmentId: 'icu',
    ratings: { q_staffing: 2, q_ppe: 4, q_night_safety: 3 },
    submittedAt: '2026-10-24T18:00:00Z',
  },
  {
    id: 'fb-2',
    sectorId: 'hospital',
    departmentId: 'icu',
    ratings: { q_staffing: 2, q_ppe: 5, q_night_safety: 2 },
    submittedAt: '2026-10-24T20:30:00Z',
  },
  {
    id: 'fb-3',
    sectorId: 'hospital',
    departmentId: 'icu',
    ratings: { q_staffing: 3, q_ppe: 4, q_night_safety: 3 },
    submittedAt: '2026-10-25T07:15:00Z',
  },
  {
    id: 'fb-4',
    sectorId: 'hospital',
    departmentId: 'icu',
    ratings: { q_staffing: 2, q_ppe: 4, q_night_safety: 3 },
    submittedAt: '2026-10-25T14:40:00Z',
  },
  {
    id: 'fb-5',
    sectorId: 'hospital',
    departmentId: 'icu',
    ratings: { q_staffing: 1, q_ppe: 3, q_night_safety: 2 },
    submittedAt: '2026-10-26T06:30:00Z',
  },
  {
    id: 'fb-6',
    sectorId: 'hospital',
    departmentId: 'emergency',
    ratings: { q_staffing: 2, q_ppe: 4, q_night_safety: 2 },
    submittedAt: '2026-10-26T08:00:00Z',
  },
  // Campus feedback (only 3 responses, demonstrates locked state until 5 reached)
  {
    id: 'fb-c1',
    sectorId: 'campus',
    departmentId: 'academic_blocks',
    ratings: { q_working_hours: 4, q_clean_safe: 4 },
    submittedAt: '2026-10-25T16:00:00Z',
  },
  {
    id: 'fb-c2',
    sectorId: 'campus',
    departmentId: 'academic_blocks',
    ratings: { q_working_hours: 4, q_clean_safe: 5 },
    submittedAt: '2026-10-26T09:00:00Z',
  },
];

class InMemoryFairShiftRepository implements FairShiftRepository {
  private workers: Worker[] = [...INITIAL_WORKERS];
  private shifts: ShiftRecord[] = [...INITIAL_SHIFTS];
  private safetyReports: SafetyReport[] = [...INITIAL_SAFETY_REPORTS];
  private certifications: WorkerCertification[] = [...INITIAL_CERTS];
  private feedback: AnonymousFeedback[] = [...INITIAL_FEEDBACK];

  async getWorkers(sectorId?: string): Promise<Worker[]> {
    if (sectorId) {
      return this.workers.filter(w => w.sectorId === sectorId);
    }
    return [...this.workers];
  }

  async getWorkerById(id: string): Promise<Worker | undefined> {
    return this.workers.find(w => w.id === id);
  }

  async updateWorker(patch: Partial<Worker> & { id: string }): Promise<Worker> {
    const idx = this.workers.findIndex(w => w.id === patch.id);
    if (idx === -1) throw new Error(`Worker ${patch.id} not found`);
    this.workers[idx] = { ...this.workers[idx], ...patch };
    return this.workers[idx];
  }

  async getShifts(workerId?: string, sectorId?: string): Promise<ShiftRecord[]> {
    let result = [...this.shifts];
    if (workerId) {
      result = result.filter(s => s.workerId === workerId);
    }
    if (sectorId) {
      result = result.filter(s => s.sectorId === sectorId);
    }
    return result.sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime());
  }

  async getWorkerActiveShift(workerId: string): Promise<ShiftRecord | undefined> {
    return this.shifts.find(s => s.workerId === workerId && s.status === 'active');
  }

  async checkIn(
    workerId: string,
    sectorId: string,
    departmentId: string,
    shiftTypeId: string
  ): Promise<ShiftRecord> {
    const existing = await this.getWorkerActiveShift(workerId);
    if (existing) {
      return existing;
    }

    const newShift: ShiftRecord = {
      id: `shift-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      workerId,
      sectorId,
      departmentId,
      shiftTypeId,
      checkIn: new Date().toISOString(),
      totalHours: 0,
      regularHours: 0,
      overtimeHours: 0,
      nightHours: 0,
      isNightShift: false,
      status: 'active',
    };

    this.shifts.unshift(newShift);
    await this.updateWorker({ id: workerId, activeShiftId: newShift.id });
    return newShift;
  }

  async checkOut(shiftId: string): Promise<ShiftRecord> {
    const shift = this.shifts.find(s => s.id === shiftId);
    if (!shift) throw new Error('Shift not found');

    const checkOutTime = new Date().toISOString();
    const breakdown = calculateShiftHours(shift.checkIn, checkOutTime, 8);

    shift.checkOut = checkOutTime;
    shift.totalHours = breakdown.totalHours;
    shift.regularHours = breakdown.regularHours;
    shift.overtimeHours = breakdown.overtimeHours;
    shift.nightHours = breakdown.nightHours;
    shift.isNightShift = breakdown.isNightShift;
    shift.status = 'completed';

    await this.updateWorker({ id: shift.workerId, activeShiftId: null });
    return { ...shift };
  }

  async getSafetyReports(sectorId?: string): Promise<SafetyReport[]> {
    let result = [...this.safetyReports];
    if (sectorId) {
      result = result.filter(r => r.sectorId === sectorId);
    }
    // High & critical severity on top
    const severityWeight: Record<SafetySeverity, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };
    return result.sort((a, b) => {
      const weightDiff = severityWeight[b.severity] - severityWeight[a.severity];
      if (weightDiff !== 0) return weightDiff;
      return new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime();
    });
  }

  async getWorkerSafetyReports(workerId: string): Promise<SafetyReport[]> {
    return this.safetyReports
      .filter(r => r.workerId === workerId)
      .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
  }

  async submitSafetyReport(
    reportData: Omit<SafetyReport, 'id' | 'reportedAt' | 'status'>
  ): Promise<SafetyReport> {
    const newReport: SafetyReport = {
      ...reportData,
      id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      reportedAt: new Date().toISOString(),
      status: 'reported',
    };
    this.safetyReports.unshift(newReport);
    return newReport;
  }

  async updateSafetyReportStatus(
    id: string,
    status: SafetyReportStatus,
    supervisorNotes?: string
  ): Promise<SafetyReport> {
    const report = this.safetyReports.find(r => r.id === id);
    if (!report) throw new Error('Safety report not found');

    report.status = status;
    if (supervisorNotes) {
      report.supervisorNotes = supervisorNotes;
    }
    if (status === 'acknowledged' && !report.acknowledgedAt) {
      report.acknowledgedAt = new Date().toISOString();
    }
    if (status === 'resolved' && !report.resolvedAt) {
      report.resolvedAt = new Date().toISOString();
    }
    return { ...report };
  }

  async submitFeedback(
    feedbackData: Omit<AnonymousFeedback, 'id' | 'submittedAt'>
  ): Promise<AnonymousFeedback> {
    const entry: AnonymousFeedback = {
      ...feedbackData,
      id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      submittedAt: new Date().toISOString(),
    };
    this.feedback.unshift(entry);
    return entry;
  }

  async getAggregatedFeedback(
    sectorId: string,
    departmentId?: string
  ): Promise<{
    hasEnoughResponses: boolean;
    totalResponses: number;
    averageRatings: Record<string, number>;
  }> {
    let filtered = this.feedback.filter(f => f.sectorId === sectorId);
    if (departmentId) {
      filtered = filtered.filter(f => f.departmentId === departmentId);
    }

    const totalResponses = filtered.length;
    const hasEnoughResponses = totalResponses >= 5; // Strict UN SDG 8 Privacy Guarantee (Min 5)

    if (!hasEnoughResponses) {
      return {
        hasEnoughResponses: false,
        totalResponses,
        averageRatings: {},
      };
    }

    const sums: Record<string, number> = {};
    const counts: Record<string, number> = {};

    filtered.forEach(entry => {
      Object.entries(entry.ratings).forEach(([key, val]) => {
        sums[key] = (sums[key] || 0) + val;
        counts[key] = (counts[key] || 0) + 1;
      });
    });

    const averageRatings: Record<string, number> = {};
    Object.keys(sums).forEach(key => {
      averageRatings[key] = Math.round((sums[key] / counts[key]) * 10) / 10;
    });

    return {
      hasEnoughResponses: true,
      totalResponses,
      averageRatings,
    };
  }

  async getWorkerCertifications(workerId: string): Promise<WorkerCertification[]> {
    return this.certifications.filter(c => c.workerId === workerId);
  }

  async getAllCertifications(sectorId?: string): Promise<WorkerCertification[]> {
    if (!sectorId) return [...this.certifications];
    const workerIds = this.workers.filter(w => w.sectorId === sectorId).map(w => w.id);
    return this.certifications.filter(c => workerIds.includes(c.workerId));
  }

  async addCertification(
    cert: Omit<WorkerCertification, 'id'>
  ): Promise<WorkerCertification> {
    const newCert: WorkerCertification = {
      ...cert,
      id: `cert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    this.certifications.push(newCert);
    return newCert;
  }
}

export const repository: FairShiftRepository = new InMemoryFairShiftRepository();

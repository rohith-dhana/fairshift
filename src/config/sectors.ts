/**
 * Sector Configuration Definitions for FairShift (UN SDG 8 Decent Work Platform)
 * 
 * Config-driven architecture: Any new sector (e.g. Factory, Construction, Logistics)
 * can be added simply by defining an entry here, without modifying any page or component.
 */

export interface RoleConfig {
  id: string;
  nameKey: string;
  defaultHourlyRate: number; // in local currency (e.g., INR ₹)
  category: 'clinical' | 'support' | 'sanitation' | 'security' | 'technical' | 'operations';
}

export interface ShiftTypeConfig {
  id: string;
  nameKey: string;
  startTime: string; // "06:00"
  endTime: string;   // "14:00"
  durationHours: number;
  isNightShift: boolean;
  crossesMidnight?: boolean;
}

export interface SafetyCategoryConfig {
  id: string;
  nameKey: string;
  defaultSeverity: 'low' | 'medium' | 'high' | 'critical';
  descriptionKey: string;
  iconName: string;
}

export interface SkillItemConfig {
  id: string;
  nameKey: string;
  validityMonths: number;
  requiredForRoles: string[]; // role ids or ['*']
  category: 'safety' | 'technical' | 'medical' | 'compliance';
}

export interface FeedbackQuestionConfig {
  id: string;
  questionKey: string;
  type: 'rating_5' | 'yes_no';
}

export interface FatigueRulesConfig {
  maxWeeklyHours: number;
  maxDailyHours: number;
  minRestHoursBetweenShifts: number;
  maxConsecutiveNightShifts?: number;
  minRestAfterNightShiftBeforeMorningHours?: number;
  doubleShiftThresholdHours?: number;
  maxRegularHoursPerWeek?: number;
}

export interface OvertimeRulesConfig {
  standardDailyThresholdHours: number;
  twelveHourShiftThresholdHours: number;
  overtimeRateMultiplier: number; // e.g. 1.5
  nightAllowanceFlat: number;     // e.g. 250 flat per night shift
  nightAllowancePercentage: number; // e.g. 0.20 (+20%)
}

export interface SectorConfig {
  id: string;
  nameKey: string;
  shortName: string;
  descriptionKey: string;
  icon: string;
  colorTheme: {
    primary: string;
    secondary: string;
    accent: string;
    bgLight: string;
  };
  roles: RoleConfig[];
  supervisors: { id: string; nameKey: string }[];
  departments: { id: string; nameKey: string }[];
  shifts: ShiftTypeConfig[];
  overtimeRules: OvertimeRulesConfig;
  safetyCategories: SafetyCategoryConfig[];
  skillItems: SkillItemConfig[];
  feedbackQuestions: FeedbackQuestionConfig[];
  fatigueRules: FatigueRulesConfig;
}

export const SECTORS: Record<string, SectorConfig> = {
  hospital: {
    id: 'hospital',
    nameKey: 'sector_hospital_name',
    shortName: 'Hospital',
    descriptionKey: 'sector_hospital_desc',
    icon: 'Hospital',
    colorTheme: {
      primary: 'teal-600',
      secondary: 'teal-700',
      accent: 'amber-500',
      bgLight: 'teal-50',
    },
    roles: [
      { id: 'ward_nurse', nameKey: 'role_ward_nurse', defaultHourlyRate: 220, category: 'clinical' },
      { id: 'nursing_attendant', nameKey: 'role_nursing_attendant', defaultHourlyRate: 150, category: 'support' },
      { id: 'sanitation_staff', nameKey: 'role_sanitation_staff', defaultHourlyRate: 130, category: 'sanitation' },
      { id: 'lab_technician', nameKey: 'role_lab_technician', defaultHourlyRate: 240, category: 'technical' },
      { id: 'hospital_security', nameKey: 'role_hospital_security', defaultHourlyRate: 140, category: 'security' },
    ],
    supervisors: [
      { id: 'ward_in_charge', nameKey: 'sup_ward_in_charge' },
      { id: 'housekeeping_supervisor', nameKey: 'sup_housekeeping_supervisor' },
      { id: 'nursing_superintendent', nameKey: 'sup_nursing_superintendent' },
    ],
    departments: [
      { id: 'icu', nameKey: 'dept_icu' },
      { id: 'general_ward', nameKey: 'dept_general_ward' },
      { id: 'emergency', nameKey: 'dept_emergency' },
      { id: 'operation_theatre', nameKey: 'dept_operation_theatre' },
      { id: 'laundry_sanitation', nameKey: 'dept_laundry_sanitation' },
    ],
    shifts: [
      { id: 'morning_8h', nameKey: 'shift_morning_8h', startTime: '06:00', endTime: '14:00', durationHours: 8, isNightShift: false },
      { id: 'evening_8h', nameKey: 'shift_evening_8h', startTime: '14:00', endTime: '22:00', durationHours: 8, isNightShift: false },
      { id: 'night_8h', nameKey: 'shift_night_8h', startTime: '22:00', endTime: '06:00', durationHours: 8, isNightShift: true, crossesMidnight: true },
      { id: 'day_12h', nameKey: 'shift_day_12h', startTime: '07:00', endTime: '19:00', durationHours: 12, isNightShift: false },
      { id: 'night_12h', nameKey: 'shift_night_12h', startTime: '19:00', endTime: '07:00', durationHours: 12, isNightShift: true, crossesMidnight: true },
    ],
    overtimeRules: {
      standardDailyThresholdHours: 8,
      twelveHourShiftThresholdHours: 12,
      overtimeRateMultiplier: 1.5,
      nightAllowanceFlat: 250,
      nightAllowancePercentage: 0.20,
    },
    safetyCategories: [
      { id: 'needle_stick', nameKey: 'safety_needle_stick', defaultSeverity: 'high', descriptionKey: 'safety_needle_stick_desc', iconName: 'Syringe' },
      { id: 'biohazard', nameKey: 'safety_biohazard', defaultSeverity: 'high', descriptionKey: 'safety_biohazard_desc', iconName: 'Biohazard' },
      { id: 'workplace_violence', nameKey: 'safety_violence', defaultSeverity: 'high', descriptionKey: 'safety_violence_desc', iconName: 'ShieldAlert' },
      { id: 'infection_lapse', nameKey: 'safety_infection_lapse', defaultSeverity: 'medium', descriptionKey: 'safety_infection_lapse_desc', iconName: 'AlertTriangle' },
      { id: 'patient_handling', nameKey: 'safety_patient_handling', defaultSeverity: 'medium', descriptionKey: 'safety_patient_handling_desc', iconName: 'Activity' },
      { id: 'slip_hazard', nameKey: 'safety_slip_hazard', defaultSeverity: 'low', descriptionKey: 'safety_slip_hazard_desc', iconName: 'Footprints' },
      { id: 'oxygen_equipment_fault', nameKey: 'safety_oxygen_equip', defaultSeverity: 'medium', descriptionKey: 'safety_oxygen_equip_desc', iconName: 'Cpu' },
      { id: 'chemical_exposure', nameKey: 'safety_chemical_exposure', defaultSeverity: 'medium', descriptionKey: 'safety_chemical_exposure_desc', iconName: 'FlaskConical' },
    ],
    skillItems: [
      { id: 'bls_cpr', nameKey: 'skill_bls_cpr', validityMonths: 24, requiredForRoles: ['ward_nurse', 'nursing_attendant', 'lab_technician'], category: 'medical' },
      { id: 'infection_control', nameKey: 'skill_infection_control', validityMonths: 12, requiredForRoles: ['*'], category: 'compliance' },
      { id: 'biomedical_waste', nameKey: 'skill_biomedical_waste', validityMonths: 12, requiredForRoles: ['ward_nurse', 'nursing_attendant', 'sanitation_staff'], category: 'compliance' },
      { id: 'hep_b_vaccination', nameKey: 'skill_hep_b_vaccine', validityMonths: 60, requiredForRoles: ['*'], category: 'medical' },
      { id: 'fire_safety', nameKey: 'skill_fire_safety', validityMonths: 12, requiredForRoles: ['*'], category: 'safety' },
      { id: 'patient_handling_cert', nameKey: 'skill_patient_handling', validityMonths: 24, requiredForRoles: ['ward_nurse', 'nursing_attendant'], category: 'safety' },
    ],
    feedbackQuestions: [
      { id: 'q_staffing', questionKey: 'q_staffing_adequate', type: 'rating_5' },
      { id: 'q_ppe', questionKey: 'q_enough_ppe', type: 'rating_5' },
      { id: 'q_night_safety', questionKey: 'q_feel_safe_night', type: 'rating_5' },
    ],
    fatigueRules: {
      maxWeeklyHours: 60,
      maxDailyHours: 12,
      minRestHoursBetweenShifts: 8,
      maxConsecutiveNightShifts: 3,
      minRestAfterNightShiftBeforeMorningHours: 11,
      doubleShiftThresholdHours: 16,
      maxRegularHoursPerWeek: 48,
    },
  },

  campus: {
    id: 'campus',
    nameKey: 'sector_campus_name',
    shortName: 'College/Campus',
    descriptionKey: 'sector_campus_desc',
    icon: 'GraduationCap',
    colorTheme: {
      primary: 'amber-600',
      secondary: 'amber-700',
      accent: 'teal-600',
      bgLight: 'amber-50',
    },
    roles: [
      { id: 'housekeeping', nameKey: 'role_housekeeping', defaultHourlyRate: 135, category: 'sanitation' },
      { id: 'campus_security', nameKey: 'role_campus_security', defaultHourlyRate: 145, category: 'security' },
      { id: 'canteen_staff', nameKey: 'role_canteen_staff', defaultHourlyRate: 140, category: 'support' },
      { id: 'lab_attendant', nameKey: 'role_lab_attendant', defaultHourlyRate: 175, category: 'technical' },
      { id: 'gardener', nameKey: 'role_gardener', defaultHourlyRate: 130, category: 'operations' },
    ],
    supervisors: [
      { id: 'estate_manager', nameKey: 'sup_estate_manager' },
      { id: 'facilities_supervisor', nameKey: 'sup_facilities_supervisor' },
      { id: 'hostel_warden', nameKey: 'sup_hostel_warden' },
    ],
    departments: [
      { id: 'academic_blocks', nameKey: 'dept_academic_blocks' },
      { id: 'student_hostels', nameKey: 'dept_student_hostels' },
      { id: 'dining_canteen', nameKey: 'dept_dining_canteen' },
      { id: 'science_laboratories', nameKey: 'dept_science_laboratories' },
      { id: 'campus_grounds', nameKey: 'dept_campus_grounds' },
    ],
    shifts: [
      { id: 'day_shift', nameKey: 'shift_day_standard', startTime: '08:00', endTime: '16:00', durationHours: 8, isNightShift: false },
      { id: 'split_shift', nameKey: 'shift_split_campus', startTime: '07:00', endTime: '19:00', durationHours: 8, isNightShift: false },
      { id: 'campus_night', nameKey: 'shift_campus_night', startTime: '20:00', endTime: '06:00', durationHours: 10, isNightShift: true, crossesMidnight: true },
    ],
    overtimeRules: {
      standardDailyThresholdHours: 8,
      twelveHourShiftThresholdHours: 8,
      overtimeRateMultiplier: 1.5,
      nightAllowanceFlat: 150,
      nightAllowancePercentage: 0.15,
    },
    safetyCategories: [
      { id: 'electrical_hazard', nameKey: 'safety_electrical_hazard', defaultSeverity: 'medium', descriptionKey: 'safety_electrical_desc', iconName: 'Zap' },
      { id: 'slip_fall', nameKey: 'safety_slip_fall', defaultSeverity: 'low', descriptionKey: 'safety_slip_fall_desc', iconName: 'Footprints' },
      { id: 'hygiene_sanitation', nameKey: 'safety_hygiene_sanitation', defaultSeverity: 'medium', descriptionKey: 'safety_hygiene_desc', iconName: 'Sparkles' },
      { id: 'fire_risk', nameKey: 'safety_fire_risk', defaultSeverity: 'high', descriptionKey: 'safety_fire_risk_desc', iconName: 'Flame' },
      { id: 'equipment_fault', nameKey: 'safety_equipment_fault', defaultSeverity: 'medium', descriptionKey: 'safety_equip_fault_desc', iconName: 'Wrench' },
      { id: 'harassment', nameKey: 'safety_harassment', defaultSeverity: 'critical', descriptionKey: 'safety_harassment_desc', iconName: 'AlertOctagon' },
    ],
    skillItems: [
      { id: 'fire_safety_campus', nameKey: 'skill_fire_safety', validityMonths: 12, requiredForRoles: ['*'], category: 'safety' },
      { id: 'first_aid', nameKey: 'skill_first_aid', validityMonths: 24, requiredForRoles: ['*'], category: 'safety' },
      { id: 'food_safety', nameKey: 'skill_food_safety', validityMonths: 12, requiredForRoles: ['canteen_staff'], category: 'compliance' },
      { id: 'equipment_handling', nameKey: 'skill_equipment_handling', validityMonths: 24, requiredForRoles: ['lab_attendant', 'gardener'], category: 'technical' },
    ],
    feedbackQuestions: [
      { id: 'q_working_hours', questionKey: 'q_hours_fair', type: 'rating_5' },
      { id: 'q_clean_safe', questionKey: 'q_clean_safe_place', type: 'rating_5' },
    ],
    fatigueRules: {
      maxWeeklyHours: 60,
      maxDailyHours: 12,
      minRestHoursBetweenShifts: 8,
      maxConsecutiveNightShifts: 4,
      doubleShiftThresholdHours: 16,
      maxRegularHoursPerWeek: 48,
    },
  },

  // Third sector showcasing seamless extensibility purely via config!
  factory: {
    id: 'factory',
    nameKey: 'sector_factory_name',
    shortName: 'Manufacturing Plant',
    descriptionKey: 'sector_factory_desc',
    icon: 'Factory',
    colorTheme: {
      primary: 'slate-700',
      secondary: 'slate-900',
      accent: 'orange-500',
      bgLight: 'slate-100',
    },
    roles: [
      { id: 'assembly_operator', nameKey: 'role_assembly_operator', defaultHourlyRate: 160, category: 'operations' },
      { id: 'quality_inspector', nameKey: 'role_quality_inspector', defaultHourlyRate: 200, category: 'technical' },
      { id: 'forklift_driver', nameKey: 'role_forklift_driver', defaultHourlyRate: 180, category: 'support' },
      { id: 'plant_maintenance', nameKey: 'role_plant_maintenance', defaultHourlyRate: 220, category: 'technical' },
    ],
    supervisors: [
      { id: 'shift_floor_supervisor', nameKey: 'sup_floor_supervisor' },
      { id: 'ehs_officer', nameKey: 'sup_ehs_officer' },
    ],
    departments: [
      { id: 'assembly_line_1', nameKey: 'dept_assembly_line_1' },
      { id: 'warehouse_logistics', nameKey: 'dept_warehouse' },
      { id: 'packaging_dispatch', nameKey: 'dept_packaging' },
    ],
    shifts: [
      { id: 'shift_a', nameKey: 'shift_factory_a', startTime: '06:00', endTime: '14:30', durationHours: 8.5, isNightShift: false },
      { id: 'shift_b', nameKey: 'shift_factory_b', startTime: '14:30', endTime: '23:00', durationHours: 8.5, isNightShift: false },
      { id: 'shift_c', nameKey: 'shift_factory_c', startTime: '23:00', endTime: '06:30', durationHours: 7.5, isNightShift: true, crossesMidnight: true },
    ],
    overtimeRules: {
      standardDailyThresholdHours: 8,
      twelveHourShiftThresholdHours: 8,
      overtimeRateMultiplier: 2.0,
      nightAllowanceFlat: 300,
      nightAllowancePercentage: 0.25,
    },
    safetyCategories: [
      { id: 'pinch_point_machinery', nameKey: 'safety_machinery', defaultSeverity: 'critical', descriptionKey: 'safety_machinery_desc', iconName: 'Cog' },
      { id: 'chemical_spill', nameKey: 'safety_chem_spill', defaultSeverity: 'high', descriptionKey: 'safety_chem_spill_desc', iconName: 'FlaskRound' },
      { id: 'forklift_traffic', nameKey: 'safety_forklift', defaultSeverity: 'high', descriptionKey: 'safety_forklift_desc', iconName: 'Truck' },
      { id: 'noise_exposure', nameKey: 'safety_noise', defaultSeverity: 'medium', descriptionKey: 'safety_noise_desc', iconName: 'Volume2' },
    ],
    skillItems: [
      { id: 'lockout_tagout', nameKey: 'skill_loto', validityMonths: 12, requiredForRoles: ['*'], category: 'safety' },
      { id: 'forklift_license', nameKey: 'skill_forklift_lic', validityMonths: 36, requiredForRoles: ['forklift_driver'], category: 'compliance' },
      { id: 'hazmat_handling', nameKey: 'skill_hazmat', validityMonths: 12, requiredForRoles: ['plant_maintenance'], category: 'safety' },
    ],
    feedbackQuestions: [
      { id: 'q_machinery_safety', questionKey: 'q_machines_safe', type: 'rating_5' },
      { id: 'q_break_times', questionKey: 'q_adequate_breaks', type: 'rating_5' },
    ],
    fatigueRules: {
      maxWeeklyHours: 60,
      maxDailyHours: 12,
      minRestHoursBetweenShifts: 10,
      maxConsecutiveNightShifts: 3,
      doubleShiftThresholdHours: 16,
      maxRegularHoursPerWeek: 48,
    },
  },
};

export const DEFAULT_SECTOR_ID = 'hospital';

export function getSectorConfig(sectorId?: string): SectorConfig {
  if (sectorId && SECTORS[sectorId]) {
    return SECTORS[sectorId];
  }
  return SECTORS[DEFAULT_SECTOR_ID];
}

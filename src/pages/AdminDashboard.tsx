import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  Clock, 
  ShieldAlert, 
  AlertTriangle, 
  Award, 
  CheckCircle2, 
  TrendingUp, 
  HeartPulse, 
  MessageSquareOff, 
  Filter, 
  Check, 
  RefreshCw, 
  ChevronDown,
  Info,
  ExternalLink,
  Flame,
  Moon,
  Lock,
  Unlock
} from 'lucide-react';
import { SECTORS, SectorConfig } from '../config/sectors';
import { SupportedLanguage, getTranslation } from '../i18n';
import { 
  Worker, 
  ShiftRecord, 
  SafetyReport, 
  WorkerCertification, 
  SafetyReportStatus,
  repository 
} from '../services/repository';
import { analyzeWorkerFatigue, FatigueAnalysisResult } from '../utils/fatigueAnalysis';
import { calculateAttritionRisk, AttritionRiskResult } from '../utils/attritionScore';
import { checkCertificationStatus } from '../utils/certificationExpiry';
import { VoiceAssistantButton } from '../components/VoiceAssistantButton';

interface AdminDashboardProps {
  currentSectorId: string;
  onSelectSector: (sectorId: string) => void;
  currentLanguage: SupportedLanguage;
  onSelectWorkerForPreview?: (worker: Worker) => void;
  onNavigateWorker?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentSectorId,
  onSelectSector,
  currentLanguage,
  onSelectWorkerForPreview,
  onNavigateWorker,
}) => {
  const currentSector: SectorConfig = SECTORS[currentSectorId] || SECTORS.hospital;

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [safetyReports, setSafetyReports] = useState<SafetyReport[]>([]);
  const [certifications, setCertifications] = useState<WorkerCertification[]>([]);
  const [feedbackAggregates, setFeedbackAggregates] = useState<{
    hasEnoughResponses: boolean;
    totalResponses: number;
    averageRatings: Record<string, number>;
  }>({ hasEnoughResponses: false, totalResponses: 0, averageRatings: {} });

  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [actionNotesInput, setActionNotesInput] = useState<Record<string, string>>({});
  const [updatingReportId, setUpdatingReportId] = useState<string | null>(null);

  const loadAdminData = async () => {
    const w = await repository.getWorkers(currentSectorId);
    setWorkers(w);

    const s = await repository.getShifts(undefined, currentSectorId);
    setShifts(s);

    const r = await repository.getSafetyReports(currentSectorId);
    setSafetyReports(r);

    const c = await repository.getAllCertifications(currentSectorId);
    setCertifications(c);

    const fb = await repository.getAggregatedFeedback(currentSectorId);
    setFeedbackAggregates(fb);
  };

  useEffect(() => {
    loadAdminData();
  }, [currentSectorId]);

  // Compute Fatigue Analysis per worker
  const workerFatigueMap: Record<string, FatigueAnalysisResult> = {};
  workers.forEach(w => {
    const wShifts = shifts.filter(s => s.workerId === w.id);
    workerFatigueMap[w.id] = analyzeWorkerFatigue(
      wShifts.map(s => ({
        id: s.id,
        workerId: s.workerId,
        checkIn: s.checkIn,
        checkOut: s.checkOut || new Date().toISOString(),
        isNightShift: s.isNightShift,
        totalHours: s.totalHours,
        regularHours: s.regularHours,
        overtimeHours: s.overtimeHours,
      })),
      {
        sectorId: currentSectorId,
        maxConsecutiveNightShifts: currentSector.fatigueRules.maxConsecutiveNightShifts,
        minRestHoursBetweenShifts: currentSector.fatigueRules.minRestHoursBetweenShifts,
        minRestAfterNightShiftBeforeMorningHours: currentSector.fatigueRules.minRestAfterNightShiftBeforeMorningHours,
      }
    );
  });

  // Compute Attrition Risk per worker
  const workerAttritionMap: Record<string, AttritionRiskResult> = {};
  workers.forEach(w => {
    const wShifts = shifts.filter(s => s.workerId === w.id);
    const otHours = wShifts.reduce((acc, s) => acc + s.overtimeHours, 0);
    const fatigue = workerFatigueMap[w.id];

    // Seed realistic missed shifts for demonstration
    const missedShifts = w.id === 'hosp-w1' ? 1 : w.id === 'hosp-w2' ? 0 : 0;
    const deptSentiment = feedbackAggregates.hasEnoughResponses ? 2.4 : 3.8;

    workerAttritionMap[w.id] = calculateAttritionRisk({
      workerId: w.id,
      weeklyOvertimeHours: otHours,
      missedShiftsLastMonth: missedShifts,
      departmentFeedbackScore: deptSentiment,
      fatigueCriticalCount: fatigue?.criticalCount || 0,
      fatigueWarningCount: fatigue?.warningCount || 0,
    });
  });

  // Update Safety Report Status
  const handleUpdateStatus = async (reportId: string, newStatus: SafetyReportStatus) => {
    setUpdatingReportId(reportId);
    try {
      const note = actionNotesInput[reportId] || 'Supervisor action taken.';
      await repository.updateSafetyReportStatus(reportId, newStatus, note);
      await loadAdminData();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingReportId(null);
    }
  };

  // KPIs
  const activeWorkersCount = workers.filter(w => w.activeShiftId).length;
  const totalOvertimeHours = shifts.reduce((sum, s) => sum + s.overtimeHours, 0);
  const openHazardsCount = safetyReports.filter(r => r.status !== 'resolved').length;
  const highSeverityHazardsCount = safetyReports.filter(r => (r.severity === 'high' || r.severity === 'critical') && r.status !== 'resolved').length;
  const flaggedWorkersCount = Object.values(workerFatigueMap).filter(f => f.hasFatigueRisk).length;
  const expiringCertsCount = certifications.filter(c => {
    const status = checkCertificationStatus(c.expiryDate);
    return status.isExpiringSoon || status.isExpired;
  }).length;

  // Filtered Safety Reports
  const filteredReports = safetyReports.filter(r => {
    if (selectedStatusFilter === 'all') return true;
    return r.status === selectedStatusFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header & Sector Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-300">
              UN SDG 8 Employer Insight
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Live Workforce Telemetry
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1.5">
            {getTranslation('admin_title', currentLanguage)}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            Facility: <strong className="text-slate-800">{currentSector.shortName}</strong> • {workers.length} active rostered personnel
          </p>
        </div>

        <div className="flex items-center gap-3">
          <VoiceAssistantButton
            textToRead={`Admin overview for ${currentSector.shortName}. There are ${openHazardsCount} open safety reports, ${flaggedWorkersCount} fatigue flags, and ${expiringCertsCount} certifications expiring soon.`}
            language={currentLanguage}
            size="md"
            label="Brief Me"
          />
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 sm:gap-4">
        {/* KPI 1: Active On Shift */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>{getTranslation('kpi_active_workers', currentLanguage)}</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
            {activeWorkersCount} <span className="text-xs font-bold text-slate-400">/ {workers.length}</span>
          </p>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
            Duty Attendance
          </span>
        </div>

        {/* KPI 2: Overtime Load */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>{getTranslation('kpi_overtime_rate', currentLanguage)}</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
            {totalOvertimeHours.toFixed(1)} <span className="text-xs font-bold text-slate-400">hrs</span>
          </p>
          <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md inline-block">
            1.5x Premium Accrued
          </span>
        </div>

        {/* KPI 3: Open Hazards (High Severity Highlighted) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>{getTranslation('kpi_open_hazards', currentLanguage)}</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
            {openHazardsCount}
          </p>
          <span className="text-[11px] font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md inline-block">
            {highSeverityHazardsCount} High / Critical
          </span>
        </div>

        {/* KPI 4: Fatigue Flags */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>{getTranslation('kpi_fatigue_flags', currentLanguage)}</span>
            <HeartPulse className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
            {flaggedWorkersCount}
          </p>
          <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md inline-block">
            Circadian Risk Rule
          </span>
        </div>

        {/* KPI 5: Expiring Certs */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>{getTranslation('kpi_expiring_certs', currentLanguage)}</span>
            <Award className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
            {expiringCertsCount}
          </p>
          <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md inline-block">
            &lt; 30 Days Renewal
          </span>
        </div>
      </div>

      {/* SECTION 1: PRIORITY SAFETY HAZARD BOARD (High severity needle-stick, biohazard on top!) */}
      <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <span>Safety Hazard Governance</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {getTranslation('urgent_hazards_first', currentLanguage)}
            </p>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            {['all', 'reported', 'acknowledged', 'in_progress', 'resolved'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg transition-all capitalize ${
                  selectedStatusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Hazard Cards List */}
        <div className="space-y-3">
          {filteredReports.map((report) => {
            const isHighPriority = report.severity === 'high' || report.severity === 'critical';
            const severityBadge = {
              critical: 'bg-rose-600 text-white',
              high: 'bg-rose-100 text-rose-800 border border-rose-300 font-black',
              medium: 'bg-amber-100 text-amber-800 border border-amber-300',
              low: 'bg-slate-100 text-slate-700',
            };

            return (
              <div
                key={report.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  isHighPriority
                    ? 'bg-rose-50/40 border-rose-200 shadow-xs'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs ${severityBadge[report.severity]}`}>
                        {report.severity.toUpperCase()} PRIORITY
                      </span>
                      <span className="font-extrabold text-slate-900 text-base">
                        {report.categoryName}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        • Reported by <strong>{report.workerName}</strong> on {new Date(report.reportedAt).toLocaleDateString()} at {new Date(report.reportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-700">
                      "{report.description}"
                    </p>

                    {report.aiSuggestedAction && (
                      <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200 text-xs space-y-0.5">
                        <span className="font-extrabold text-teal-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                          Recommended Protocol:
                        </span>
                        <p className="text-slate-600">{report.aiSuggestedAction}</p>
                      </div>
                    )}

                    {report.supervisorNotes && (
                      <div className="text-xs text-slate-600 bg-white/60 p-2 rounded-lg border border-slate-200">
                        <strong>Supervisor Log:</strong> {report.supervisorNotes}
                      </div>
                    )}
                  </div>

                  {/* Action Controls for Admin */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                    <input
                      type="text"
                      placeholder="Add supervisor note..."
                      value={actionNotesInput[report.id] || ''}
                      onChange={(e) => setActionNotesInput(prev => ({ ...prev, [report.id]: e.target.value }))}
                      className="text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 focus:outline-teal-500 w-full sm:w-48"
                    />

                    <div className="flex items-center gap-1.5">
                      {report.status === 'reported' && (
                        <button
                          onClick={() => handleUpdateStatus(report.id, 'acknowledged')}
                          disabled={updatingReportId === report.id}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs"
                        >
                          Acknowledge
                        </button>
                      )}
                      {(report.status === 'reported' || report.status === 'acknowledged') && (
                        <button
                          onClick={() => handleUpdateStatus(report.id, 'in_progress')}
                          disabled={updatingReportId === report.id}
                          className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs"
                        >
                          Mark In Progress
                        </button>
                      )}
                      {report.status !== 'resolved' && (
                        <button
                          onClick={() => handleUpdateStatus(report.id, 'resolved')}
                          disabled={updatingReportId === report.id}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
                        >
                          Resolve
                        </button>
                      )}
                      {report.status === 'resolved' && (
                        <span className="px-3 py-1.5 bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs rounded-xl flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Resolved
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2-COLUMN SECTION: FATIGUE ALERTS & ATTRITION RISK */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FATIGUE ALERTS PANEL */}
        <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-purple-700" />
              <span>{getTranslation('fatigue_alerts_section', currentLanguage)}</span>
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900">
              Circadian Guard
            </span>
          </div>

          <div className="space-y-3">
            {workers.map((w) => {
              const fatigue = workerFatigueMap[w.id];
              if (!fatigue || !fatigue.hasFatigueRisk) return null;

              return (
                <div
                  key={w.id}
                  className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 shadow-xs space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">{w.name}</h4>
                      <p className="text-slate-500 font-medium">
                        {getTranslation(`role_${w.roleId}`, currentLanguage)} • {w.employeeCode}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full font-black text-[10px] bg-rose-600 text-white">
                      {fatigue.flags.length} Circadian Violation(s)
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {fatigue.flags.map((flag) => (
                      <div key={flag.id} className="p-2 rounded-xl bg-white border border-amber-200 text-slate-800">
                        <strong className="text-amber-900 block font-bold">⚠️ Reason:</strong>
                        <span>{flag.reason}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-1 flex items-center justify-between text-[11px] text-teal-800 font-bold">
                    <span>Clinical Action: Mandate 48h circadian recovery rest.</span>
                  </div>
                </div>
              );
            })}

            {flaggedWorkersCount === 0 && (
              <p className="text-xs text-slate-500 text-center py-6">
                All personnel are within safe circadian rotation thresholds.
              </p>
            )}
          </div>
        </section>

        {/* TRANSPARENT ATTRITION RISK SCORE MONITOR */}
        <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-700" />
              <span>{getTranslation('attrition_monitor_section', currentLanguage)}</span>
            </h2>
            <span className="text-xs font-bold text-slate-500">
              Rule-Based Model
            </span>
          </div>

          <div className="space-y-3">
            {workers.map((w) => {
              const risk = workerAttritionMap[w.id];
              if (!risk) return null;

              const levelColors = {
                High: 'bg-rose-100 text-rose-900 border-rose-300',
                Medium: 'bg-amber-100 text-amber-900 border-amber-300',
                Low: 'bg-emerald-100 text-emerald-900 border-emerald-300',
              };

              return (
                <div
                  key={w.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-slate-900">{w.name}</h4>
                      <p className="text-slate-500 text-[11px]">
                        {getTranslation(`role_${w.roleId}`, currentLanguage)} • ID: {w.employeeCode}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-base font-black font-mono text-slate-900">
                        {risk.score}%
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${levelColors[risk.level]}`}>
                        {risk.level} Risk
                      </span>
                    </div>
                  </div>

                  {/* Transparent Reasons */}
                  <div className="text-[11px] text-slate-600 space-y-1 bg-white p-2 rounded-xl border border-slate-200/80">
                    <span className="font-bold text-slate-700 block">Transparent Scoring Factors:</span>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {risk.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* 2-COLUMN SECTION: COMPLIANCE PASSPORT & ANONYMOUS SENTIMENT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SKILL PASSPORT COMPLIANCE MATRIX */}
        <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-700" />
              <span>Skill Passport & 30-Day Expiry Matrix</span>
            </h2>
            <span className="text-xs font-bold text-slate-500">
              {certifications.length} Credentials
            </span>
          </div>

          <div className="space-y-2.5">
            {certifications.map((cert) => {
              const workerInfo = workers.find(w => w.id === cert.workerId);
              const expiryInfo = checkCertificationStatus(cert.expiryDate);

              const statusBadge = {
                valid: 'bg-emerald-100 text-emerald-900 border-emerald-300',
                expiring_soon: 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse font-extrabold',
                expired: 'bg-rose-100 text-rose-900 border-rose-300 font-extrabold',
              };

              return (
                <div
                  key={cert.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-extrabold text-slate-900 text-sm">{cert.name}</h4>
                    </div>
                    <p className="text-slate-500">
                      Staff: <strong className="text-slate-800">{workerInfo?.name}</strong> • Issuing: {cert.issuingBody}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Expiry: {expiryInfo.formattedExpiry} ({expiryInfo.daysRemaining} days left)
                    </p>
                  </div>

                  <div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] border ${statusBadge[expiryInfo.status]}`}>
                      {expiryInfo.status === 'expiring_soon' ? '⚠️ Expiring < 30d' : expiryInfo.status === 'expired' ? 'Expired' : 'Valid'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ANONYMOUS WORKER SENTIMENT (Strict >= 5 Response Gate) */}
        <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <MessageSquareOff className="w-5 h-5 text-purple-700" />
              <span>{getTranslation('sentiment_overview', currentLanguage)}</span>
            </h2>
            <div className="flex items-center gap-1.5 text-xs font-bold">
              {feedbackAggregates.hasEnoughResponses ? (
                <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <Unlock className="w-3.5 h-3.5" /> Privacy Verified ({feedbackAggregates.totalResponses} submissions)
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <Lock className="w-3.5 h-3.5" /> Anonymity Protected ({feedbackAggregates.totalResponses}/5 responses)
                </span>
              )}
            </div>
          </div>

          {feedbackAggregates.hasEnoughResponses ? (
            <div className="space-y-3">
              {currentSector.feedbackQuestions.map((q) => {
                const score = feedbackAggregates.averageRatings[q.id] || 0;
                return (
                  <div key={q.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        {getTranslation(q.questionKey, currentLanguage)}
                      </span>
                      <span className="font-extrabold text-slate-900 text-sm font-mono">
                        {score.toFixed(1)} / 5.0
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          score >= 4 ? 'bg-emerald-500' : score >= 2.5 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${(score / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-amber-50/70 border border-amber-200 text-center space-y-2">
              <Lock className="w-8 h-8 text-amber-700 mx-auto" />
              <h4 className="font-extrabold text-amber-950 text-sm">
                Protected by UN SDG 8 Decent Work Anonymity Rule
              </h4>
              <p className="text-xs text-amber-900 max-w-sm mx-auto">
                {getTranslation('anonymity_locked_msg', currentLanguage)} Currently logged: {feedbackAggregates.totalResponses} submissions.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

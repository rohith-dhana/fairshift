import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Receipt, 
  ShieldAlert, 
  ShieldCheck,
  Award, 
  MessageSquare, 
  QrCode, 
  CheckCircle, 
  AlertTriangle, 
  Play, 
  Mic, 
  MicOff, 
  Camera, 
  Send, 
  Sparkles, 
  Info, 
  Moon, 
  Sun, 
  Calendar, 
  User, 
  ChevronRight,
  ExternalLink,
  RefreshCw,
  X
} from 'lucide-react';
import { SECTORS, SectorConfig } from '../config/sectors';
import { SupportedLanguage, getTranslation } from '../i18n';
import { 
  Worker, 
  ShiftRecord, 
  SafetyReport, 
  WorkerCertification, 
  repository 
} from '../services/repository';
import { calculateShiftHours, getAttributedWorkDate } from '../utils/shiftCalculations';
import { calculatePayslip } from '../utils/payslipCalculations';
import { analyzeWorkerFatigue } from '../utils/fatigueAnalysis';
import { checkCertificationStatus } from '../utils/certificationExpiry';
import { VoiceAssistantButton } from '../components/VoiceAssistantButton';
import { startSpeechRecognition, isSpeechRecognitionAvailable } from '../utils/speech';

interface WorkerAppProps {
  currentSectorId: string;
  currentLanguage: SupportedLanguage;
  worker: Worker;
  allWorkers: Worker[];
  onSelectWorker: (worker: Worker) => void;
  onNavigateHome: () => void;
}

export const WorkerApp: React.FC<WorkerAppProps> = ({
  currentSectorId,
  currentLanguage,
  worker,
  allWorkers,
  onSelectWorker,
  onNavigateHome,
}) => {
  const currentSector: SectorConfig = SECTORS[currentSectorId] || SECTORS.hospital;

  // Active tab in worker app
  const [activeTab, setActiveTab] = useState<'shift' | 'payslip' | 'safety' | 'passport' | 'feedback'>('shift');

  // State
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [activeShift, setActiveShift] = useState<ShiftRecord | null>(null);
  const [safetyReports, setSafetyReports] = useState<SafetyReport[]>([]);
  const [certifications, setCertifications] = useState<WorkerCertification[]>([]);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Payslip AI State
  const [aiPayslipExplanation, setAiPayslipExplanation] = useState<string>('');
  const [isExplainingPayslip, setIsExplainingPayslip] = useState(false);

  // Safety Reporting Form State
  const [hazardText, setHazardText] = useState('');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccessMessage, setReportSuccessMessage] = useState<string | null>(null);
  const [speechStopFn, setSpeechStopFn] = useState<(() => void) | null>(null);

  // Anonymous Feedback State
  const [feedbackRatings, setFeedbackRatings] = useState<Record<string, number>>({});
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Load Worker Data
  const loadData = async () => {
    const workerShifts = await repository.getShifts(worker.id);
    setShifts(workerShifts);

    const active = await repository.getWorkerActiveShift(worker.id);
    setActiveShift(active || null);

    const reports = await repository.getWorkerSafetyReports(worker.id);
    setSafetyReports(reports);

    const certs = await repository.getWorkerCertifications(worker.id);
    setCertifications(certs);
  };

  useEffect(() => {
    loadData();
    setAiPayslipExplanation('');
  }, [worker.id, currentSectorId]);

  // Timer for active shift
  useEffect(() => {
    if (!activeShift) {
      setElapsedSeconds(0);
      return;
    }
    const updateElapsed = () => {
      const startMs = new Date(activeShift.checkIn).getTime();
      const nowMs = Date.now();
      const diffSec = Math.max(0, Math.floor((nowMs - startMs) / 1000));
      setElapsedSeconds(diffSec);
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeShift]);

  // Fatigue analysis for this worker
  const fatigueAnalysis = analyzeWorkerFatigue(
    shifts.map(s => ({
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

  // Calculate Payslip
  const calculatedPayslip = calculatePayslip({
    shifts: shifts.map(s => ({
      totalHours: s.totalHours,
      regularHours: s.regularHours,
      overtimeHours: s.overtimeHours,
      nightHours: s.nightHours,
      isNightShift: s.isNightShift,
    })),
    baseHourlyRate: worker.hourlyRate || currentSector.roles[0].defaultHourlyRate,
    overtimeMultiplier: currentSector.overtimeRules.overtimeRateMultiplier,
    nightAllowanceFlat: currentSector.overtimeRules.nightAllowanceFlat,
    periodMonth: 'October 2026',
    currencySymbol: '₹',
  });

  // Handle Check-In
  const handleCheckIn = async (shiftTypeId?: string) => {
    const shiftType = shiftTypeId || currentSector.shifts[0].id;
    const newShift = await repository.checkIn(
      worker.id,
      worker.sectorId,
      worker.departmentId,
      shiftType
    );
    setActiveShift(newShift);
    setIsQrModalOpen(false);
    await loadData();
  };

  // Handle Check-Out
  const handleCheckOut = async () => {
    if (!activeShift) return;
    await repository.checkOut(activeShift.id);
    setActiveShift(null);
    await loadData();
  };

  // Handle AI Payslip Explanation
  const handleExplainPayslip = async () => {
    setIsExplainingPayslip(true);
    try {
      const res = await fetch('/api/gemini/explain-payslip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payslip: calculatedPayslip,
          language: currentLanguage,
          workerName: worker.name,
        }),
      });
      const data = await res.json();
      setAiPayslipExplanation(data.explanation || '');
    } catch (err) {
      console.error(err);
      setAiPayslipExplanation(
        `Hello ${worker.name}, your total take-home pay is ₹${calculatedPayslip.netPay}, including regular hours and overtime benefits.`
      );
    } finally {
      setIsExplainingPayslip(false);
    }
  };

  // Handle Voice Recording
  const handleToggleVoiceRecording = () => {
    if (isRecordingVoice) {
      speechStopFn?.();
      setIsRecordingVoice(false);
      setSpeechStopFn(null);
    } else {
      if (!isSpeechRecognitionAvailable()) {
        alert('Speech recognition is not supported in this browser. Please type your description.');
        return;
      }
      setIsRecordingVoice(true);
      const controller = startSpeechRecognition(currentLanguage, {
        onStart: () => setIsRecordingVoice(true),
        onResult: (transcript, isFinal) => {
          setHazardText(prev => (isFinal ? transcript : transcript));
        },
        onError: (err) => {
          console.warn('STT Error:', err);
          setIsRecordingVoice(false);
        },
        onEnd: () => setIsRecordingVoice(false),
      });
      setSpeechStopFn(() => controller.stop);
    }
  };

  // Handle Photo File Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Safety Report Submission with Gemini Categorization
  const handleSubmitSafetyReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hazardText.trim()) return;

    setIsSubmittingReport(true);
    try {
      // 1. Call server-side Gemini categorization endpoint
      const response = await fetch('/api/gemini/categorize-hazard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: hazardText,
          sector: currentSector.shortName,
          categories: currentSector.safetyCategories,
          photoBase64,
        }),
      });
      const aiResult = await response.json();

      // 2. Submit to repository
      await repository.submitSafetyReport({
        workerId: worker.id,
        workerName: worker.name,
        sectorId: currentSectorId,
        departmentId: worker.departmentId,
        categoryId: aiResult.categoryId || currentSector.safetyCategories[0].id,
        categoryName: aiResult.categoryName || currentSector.safetyCategories[0].nameKey,
        severity: aiResult.severity || 'medium',
        description: hazardText,
        voiceTranscript: hazardText,
        photoUrl: photoBase64 || undefined,
        aiSuggestedAction: aiResult.recommendedAction || aiResult.explanation,
      });

      setHazardText('');
      setPhotoBase64(null);
      setReportSuccessMessage('Hazard report submitted and prioritized by severity!');
      setTimeout(() => setReportSuccessMessage(null), 5000);
      await loadData();
    } catch (err) {
      console.error(err);
      // Fallback submission
      await repository.submitSafetyReport({
        workerId: worker.id,
        workerName: worker.name,
        sectorId: currentSectorId,
        departmentId: worker.departmentId,
        categoryId: currentSector.safetyCategories[0].id,
        categoryName: currentSector.safetyCategories[0].nameKey,
        severity: 'medium',
        description: hazardText,
      });
      setHazardText('');
      await loadData();
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Handle Anonymous Feedback Submit
  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await repository.submitFeedback({
      sectorId: currentSectorId,
      departmentId: worker.departmentId,
      ratings: feedbackRatings,
    });
    setFeedbackSubmitted(true);
  };

  const formatTimer = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 border-x border-slate-200/80 shadow-md flex flex-col pb-24">
      {/* Mobile App Top Header */}
      <div className="sticky top-18 z-40 bg-teal-800 text-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-700 border-2 border-teal-400 flex items-center justify-center font-bold text-white shadow-xs">
              {worker.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-extrabold text-base tracking-tight leading-tight">
                  {worker.name}
                </h2>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-teal-900/80 text-teal-200 font-semibold border border-teal-600">
                  {worker.employeeCode}
                </span>
              </div>
              <p className="text-xs text-teal-200 font-medium">
                {getTranslation(`role_${worker.roleId}`, currentLanguage) || worker.roleId} • {getTranslation(`dept_${worker.departmentId}`, currentLanguage) || worker.departmentId}
              </p>
            </div>
          </div>

          {/* Persona Switcher Trigger */}
          <div className="flex items-center gap-1.5">
            <select
              value={worker.id}
              onChange={(e) => {
                const found = allWorkers.find(w => w.id === e.target.value);
                if (found) onSelectWorker(found);
              }}
              className="bg-teal-900/90 text-teal-100 text-xs font-bold rounded-lg px-2 py-1.5 border border-teal-600 focus:outline-hidden"
              title="Change Worker Persona"
            >
              {allWorkers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.roleId.split('_')[0]})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Gentle Fatigue Icon Alert Banner for Worker */}
        {fatigueAnalysis.hasFatigueRisk && (
          <div className="mt-2.5 bg-amber-500 text-amber-950 px-3 py-2 rounded-xl flex items-center justify-between shadow-xs border border-amber-600 animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-950" />
              <div className="text-xs font-bold leading-tight">
                <span>Fatigue Alert: </span>
                <span className="font-medium">
                  {fatigueAnalysis.flags[0]?.reason || 'High workload detected. Please take scheduled rest.'}
                </span>
              </div>
            </div>
            <VoiceAssistantButton
              textToRead={`Fatigue Alert: ${fatigueAnalysis.flags[0]?.reason}`}
              language={currentLanguage}
              size="sm"
              label=""
              className="bg-amber-100 text-amber-950 border-amber-300"
            />
          </div>
        )}
      </div>

      {/* Main Tab Views */}
      <div className="p-4 flex-1 space-y-4">
        {/* TAB 1: SHIFT TRACKING & ATTRIBUTION */}
        {activeTab === 'shift' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-teal-700" />
                <span>{getTranslation('tab_shift', currentLanguage)}</span>
              </h3>
              <VoiceAssistantButton
                textToRead={
                  activeShift
                    ? `You are on an active shift since ${new Date(activeShift.checkIn).toLocaleTimeString()}. Your work is attributed to ${getAttributedWorkDate(activeShift.checkIn)}.`
                    : 'You do not have an active shift right now. Tap Check In to start your duty.'
                }
                language={currentLanguage}
                size="sm"
              />
            </div>

            {/* Active Shift Card / Check-In Button */}
            <div className="bg-white rounded-2xl p-5 border-2 border-teal-500/50 shadow-md space-y-4 text-center">
              {activeShift ? (
                <>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-teal-100 text-teal-900">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-ping mr-1" />
                    {getTranslation('current_shift', currentLanguage)}
                  </div>

                  {/* Big Accessible Elapsed Timer */}
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {getTranslation('shift_active_timer', currentLanguage)}
                    </p>
                    <p className="text-4xl font-black text-slate-900 font-mono tracking-tight text-teal-700">
                      {formatTimer(elapsedSeconds)}
                    </p>
                  </div>

                  {/* Attributed Date and Midnight Crossing Badge */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-left space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-600">{getTranslation('attributed_date', currentLanguage)}:</span>
                      <span className="font-extrabold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-300">
                        {getAttributedWorkDate(activeShift.checkIn)}
                      </span>
                    </div>
                    <p className="text-[11px] text-teal-800 flex items-center gap-1.5 font-medium">
                      <Info className="w-3.5 h-3.5 shrink-0 text-teal-600" />
                      {getTranslation('midnight_attribution_notice', currentLanguage)}
                    </p>
                  </div>

                  {/* Big Tap to Check-out Target (>= 48px) */}
                  <button
                    onClick={handleCheckOut}
                    className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-4 px-6 rounded-2xl shadow-lg shadow-rose-700/20 active:scale-95 transition-all text-base"
                  >
                    <CheckCircle className="w-6 h-6 stroke-[2.5]" />
                    <span>{getTranslation('tap_to_checkout', currentLanguage)}</span>
                  </button>
                </>
              ) : (
                <>
                  <div className="py-4 space-y-2">
                    <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center mx-auto shadow-inner">
                      <QrCode className="w-9 h-9 stroke-[1.8]" />
                    </div>
                    <h4 className="text-xl font-black text-slate-900">
                      {getTranslation('no_active_shift', currentLanguage)}
                    </h4>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      Clock in to record your attendance, overtime thresholds, and night allowances.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => handleCheckIn()}
                      className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-md active:scale-95 transition-all"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      <span>{getTranslation('tap_to_checkin', currentLanguage)}</span>
                    </button>
                    <button
                      onClick={() => setIsQrModalOpen(true)}
                      className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold py-3.5 px-4 rounded-xl border border-slate-300 active:scale-95 transition-all"
                    >
                      <QrCode className="w-5 h-5 text-slate-700" />
                      <span>Scan Shift QR</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Shift History Log */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center justify-between">
                <span>{getTranslation('recent_shifts', currentLanguage)}</span>
                <span className="text-xs font-semibold text-slate-500">{shifts.length} Logged</span>
              </h4>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {shifts.map((s) => (
                  <div
                    key={s.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800">
                          {new Date(s.checkIn).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                        {s.isNightShift && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-purple-100 text-purple-900 font-bold text-[10px]">
                            <Moon className="w-2.5 h-2.5" /> Night
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {new Date(s.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {s.checkOut ? new Date(s.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}
                      </p>
                    </div>

                    <div className="text-right space-y-0.5">
                      <span className="font-extrabold text-slate-900 text-sm">
                        {s.totalHours.toFixed(1)} hrs
                      </span>
                      {s.overtimeHours > 0 && (
                        <p className="text-[10px] font-bold text-amber-700">
                          +{s.overtimeHours.toFixed(1)} OT
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CLEAR PAYSLIPS & AI EXPLANATION */}
        {activeTab === 'payslip' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-teal-700" />
                <span>{getTranslation('payslip_title', currentLanguage)}</span>
              </h3>
              <VoiceAssistantButton
                textToRead={`Your net take-home pay is rupees ${calculatedPayslip.netPay}. Regular base pay is rupees ${calculatedPayslip.basePay}, overtime earnings are rupees ${calculatedPayslip.overtimePay}, and night shift allowance is rupees ${calculatedPayslip.nightAllowancePay}.`}
                language={currentLanguage}
                size="sm"
              />
            </div>

            {/* Big Legible Net Pay Card */}
            <div className="bg-gradient-to-tr from-teal-800 to-teal-600 text-white rounded-3xl p-6 shadow-lg shadow-teal-900/15 space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold text-teal-200">
                <span>{getTranslation('payslip_for', currentLanguage)} {calculatedPayslip.periodMonth}</span>
                <span className="bg-teal-900/60 px-2 py-0.5 rounded-full border border-teal-500/30">
                  Rate: ₹{worker.hourlyRate}/hr
                </span>
              </div>

              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider font-extrabold text-teal-200">
                  {getTranslation('net_takehome_pay', currentLanguage)}
                </p>
                <p className="text-5xl font-black tracking-tight font-mono">
                  ₹{calculatedPayslip.netPay.toLocaleString()}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-teal-500/40 text-xs">
                <div>
                  <span className="text-teal-300 block">{getTranslation('gross_earnings', currentLanguage)}</span>
                  <span className="font-extrabold text-white text-sm">₹{calculatedPayslip.grossPay.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-teal-300 block">{getTranslation('statutory_deductions', currentLanguage)}</span>
                  <span className="font-extrabold text-white text-sm">-₹{calculatedPayslip.totalDeductions.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Itemized Transparent Breakdown */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
              <h4 className="font-extrabold text-sm text-slate-900">
                Itemized Shift Breakdown
              </h4>

              <div className="space-y-2.5 text-xs">
                {/* Base Regular */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-amber-500" />
                    <div>
                      <p className="font-bold text-slate-800">{getTranslation('base_pay', currentLanguage)}</p>
                      <p className="text-[10px] text-slate-500">{calculatedPayslip.regularHours} regular hours</p>
                    </div>
                  </div>
                  <span className="font-extrabold text-slate-900 text-sm">
                    ₹{calculatedPayslip.basePay.toLocaleString()}
                  </span>
                </div>

                {/* Overtime (1.5x) */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-600" />
                    <div>
                      <p className="font-bold text-slate-800">{getTranslation('overtime_pay', currentLanguage)}</p>
                      <p className="text-[10px] text-slate-500">{calculatedPayslip.overtimeHours} hrs at 1.5x multiplier</p>
                    </div>
                  </div>
                  <span className="font-extrabold text-teal-800 text-sm">
                    +₹{calculatedPayslip.overtimePay.toLocaleString()}
                  </span>
                </div>

                {/* Separate Night Allowance Line */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-purple-50/70 border border-purple-200/60">
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-purple-700" />
                    <div>
                      <p className="font-bold text-purple-950">{getTranslation('night_allowance', currentLanguage)}</p>
                      <p className="text-[10px] text-purple-700">{calculatedPayslip.nightShiftCount} night shifts (₹{calculatedPayslip.nightAllowancePerShift}/shift)</p>
                    </div>
                  </div>
                  <span className="font-extrabold text-purple-900 text-sm">
                    +₹{calculatedPayslip.nightAllowancePay.toLocaleString()}
                  </span>
                </div>

                {/* Deductions Breakdown */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">Statutory Protection Deductions</p>
                  {calculatedPayslip.deductions.map(d => (
                    <div key={d.id} className="flex justify-between text-slate-600 text-[11px]">
                      <span>{d.name}</span>
                      <span className="font-bold text-slate-800">-₹{d.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Voice & Text Explanation Box */}
            <div className="bg-gradient-to-r from-amber-50 to-teal-50 rounded-2xl p-4 border border-amber-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-extrabold text-amber-900">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Multilingual AI Payslip Assistant
                </span>
                <button
                  onClick={handleExplainPayslip}
                  disabled={isExplainingPayslip}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-700 text-white font-bold text-xs hover:bg-teal-800 active:scale-95 transition-all shadow-xs"
                >
                  {isExplainingPayslip ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>{getTranslation('explain_ai_btn', currentLanguage)}</span>
                </button>
              </div>

              {aiPayslipExplanation && (
                <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs space-y-2">
                  <p className="text-xs text-slate-800 font-medium leading-relaxed">
                    "{aiPayslipExplanation}"
                  </p>
                  <VoiceAssistantButton
                    textToRead={aiPayslipExplanation}
                    language={currentLanguage}
                    size="sm"
                    label={getTranslation('audio_read_aloud', currentLanguage)}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SAFETY & VOICE HAZARD REPORTING */}
        {activeTab === 'safety' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>{getTranslation('report_hazard_title', currentLanguage)}</span>
              </h3>
              <VoiceAssistantButton
                textToRead="Report workplace hazards hands-free with voice. You can describe needle sticks, biohazards, or slip risks."
                language={currentLanguage}
                size="sm"
              />
            </div>

            {reportSuccessMessage && (
              <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{reportSuccessMessage}</span>
              </div>
            )}

            {/* Hazard Reporting Form */}
            <form onSubmit={handleSubmitSafetyReport} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
              {/* Big Voice Record Button (Web Speech STT) */}
              <button
                type="button"
                onClick={handleToggleVoiceRecording}
                className={`w-full py-4 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-95 ${
                  isRecordingVoice
                    ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-300'
                    : 'bg-teal-50 hover:bg-teal-100 text-teal-900 border-2 border-teal-300'
                }`}
              >
                {isRecordingVoice ? (
                  <>
                    <MicOff className="w-6 h-6 animate-bounce" />
                    <span>{getTranslation('voice_listening', currentLanguage)}</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-6 h-6 text-teal-700" />
                    <span>{getTranslation('voice_record_btn', currentLanguage)}</span>
                  </>
                )}
              </button>

              {/* Text Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">
                  {getTranslation('or_type_hazard', currentLanguage)}
                </label>
                <textarea
                  value={hazardText}
                  onChange={(e) => setHazardText(e.target.value)}
                  placeholder={getTranslation('hazard_placeholder', currentLanguage)}
                  rows={3}
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl p-3 focus:outline-teal-500 text-slate-800"
                />
              </div>

              {/* Optional Photo Attachment */}
              <div className="flex items-center gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs font-bold text-slate-700">
                  <Camera className="w-4 h-4 text-slate-500" />
                  <span>{photoBase64 ? 'Photo Attached ✓' : getTranslation('upload_photo', currentLanguage)}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="sr-only"
                  />
                </label>
                {photoBase64 && (
                  <button
                    type="button"
                    onClick={() => setPhotoBase64(null)}
                    className="p-2 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 text-xs font-bold"
                  >
                    Remove
                  </button>
                )}
              </div>

              {/* Submit Report Button */}
              <button
                type="submit"
                disabled={isSubmittingReport || !hazardText.trim()}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-md disabled:opacity-50 transition-all active:scale-95"
              >
                {isSubmittingReport ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{getTranslation('analyzing_ai', currentLanguage)}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{getTranslation('submit_report_btn', currentLanguage)}</span>
                  </>
                )}
              </button>
            </form>

            {/* Worker's Past Safety Reports with Status Tracking */}
            <div className="space-y-2.5 pt-1">
              <h4 className="font-extrabold text-sm text-slate-900">
                {getTranslation('recent_reports', currentLanguage)}
              </h4>

              {safetyReports.map((report) => {
                const statusColors = {
                  reported: 'bg-amber-100 text-amber-900 border-amber-300',
                  acknowledged: 'bg-blue-100 text-blue-900 border-blue-300',
                  in_progress: 'bg-purple-100 text-purple-900 border-purple-300',
                  resolved: 'bg-emerald-100 text-emerald-900 border-emerald-300',
                };
                const severityBadge = {
                  critical: 'bg-rose-600 text-white',
                  high: 'bg-rose-100 text-rose-800 border border-rose-300',
                  medium: 'bg-amber-100 text-amber-800 border border-amber-300',
                  low: 'bg-slate-100 text-slate-700',
                };

                return (
                  <div
                    key={report.id}
                    className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-full font-extrabold text-[10px] ${severityBadge[report.severity]}`}>
                        {report.severity.toUpperCase()} SEVERITY
                      </span>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${statusColors[report.status]}`}>
                        {getTranslation(`status_${report.status}`, currentLanguage)}
                      </span>
                    </div>

                    <p className="font-bold text-slate-900 text-sm">{report.categoryName}</p>
                    <p className="text-slate-600 text-xs">{report.description}</p>

                    {report.supervisorNotes && (
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700">
                        <span className="font-bold text-teal-800">Supervisor Update: </span>
                        {report.supervisorNotes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: PORTABLE SKILL PASSPORT */}
        {activeTab === 'passport' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-teal-700" />
                <span>{getTranslation('skill_passport_title', currentLanguage)}</span>
              </h3>
              <VoiceAssistantButton
                textToRead="Here is your portable skill passport. Your certifications and verified training are recorded and valid across accredited employers."
                language={currentLanguage}
                size="sm"
              />
            </div>

            {/* Passport Credential Card */}
            <div className="bg-gradient-to-r from-slate-900 to-teal-950 text-white rounded-3xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-teal-300">
                  UN SDG 8 Verified Frontline Credential
                </span>
                <span className="text-xs bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-md border border-teal-500/40 font-bold">
                  Active
                </span>
              </div>

              <div>
                <h4 className="text-xl font-black">{worker.name}</h4>
                <p className="text-xs text-slate-300 font-medium">
                  {getTranslation(`role_${worker.roleId}`, currentLanguage)} • ID: {worker.employeeCode}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between text-xs text-slate-400">
                <span>{currentSector.shortName}</span>
                <span className="text-teal-400 font-bold">Accredited Passport</span>
              </div>
            </div>

            {/* Certifications List */}
            <div className="space-y-2.5">
              <h4 className="font-extrabold text-sm text-slate-900">
                Certifications & Safety Badges
              </h4>

              {certifications.map((cert) => {
                const expiryInfo = checkCertificationStatus(cert.expiryDate);
                const badgeStyle = {
                  valid: 'bg-emerald-100 text-emerald-900 border-emerald-300',
                  expiring_soon: 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse',
                  expired: 'bg-rose-100 text-rose-900 border-rose-300',
                };

                return (
                  <div
                    key={cert.id}
                    className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h5 className="font-extrabold text-slate-900 text-sm">{cert.name}</h5>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${badgeStyle[expiryInfo.status]}`}>
                        {expiryInfo.status === 'expiring_soon' ? '⚠️ Expiring < 30 Days' : expiryInfo.status === 'expired' ? 'Expired' : 'Valid'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 font-medium">
                      Issued by {cert.issuingBody}
                    </p>

                    <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-100">
                      <span>Expires: {expiryInfo.formattedExpiry}</span>
                      <span className="font-bold text-teal-700">{expiryInfo.daysRemaining} days left</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: ANONYMOUS FEEDBACK (ZERO IDENTITY) */}
        {activeTab === 'feedback' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-700" />
                <span>{getTranslation('feedback_title', currentLanguage)}</span>
              </h3>
              <VoiceAssistantButton
                textToRead="Anonymous shift feedback. Your identity is never stored and management only sees aggregated scores when at least 5 workers submit."
                language={currentLanguage}
                size="sm"
              />
            </div>

            {/* Privacy Guarantee Reassurance Banner */}
            <div className="bg-purple-50 rounded-2xl p-4 border border-purple-200 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-purple-900 font-extrabold text-xs">
                <ShieldCheck className="w-4 h-4 text-purple-700" />
                <span>Zero-Identity Privacy Guarantee</span>
              </div>
              <p className="text-xs text-purple-900 leading-relaxed">
                {getTranslation('feedback_privacy_guarantee', currentLanguage)}
              </p>
            </div>

            {feedbackSubmitted ? (
              <div className="bg-white rounded-2xl p-6 border border-emerald-300 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <h4 className="font-black text-slate-900 text-base">
                  {getTranslation('feedback_submitted', currentLanguage)}
                </h4>
                <button
                  onClick={() => setFeedbackSubmitted(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl"
                >
                  Submit Another Feedback
                </button>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-4">
                {currentSector.feedbackQuestions.map((q) => (
                  <div key={q.id} className="space-y-2 border-b border-slate-100 pb-3 last:border-none">
                    <p className="text-xs sm:text-sm font-bold text-slate-900">
                      {getTranslation(q.questionKey, currentLanguage)}
                    </p>
                    {/* 5-Star Rating Buttons */}
                    <div className="flex items-center justify-between gap-1">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setFeedbackRatings(prev => ({ ...prev, [q.id]: val }))}
                          className={`flex-1 py-2.5 rounded-xl font-black text-sm border transition-all ${
                            feedbackRatings[q.id] === val
                              ? 'bg-teal-600 text-white border-teal-700 shadow-sm'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {val}★
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                <button
                  type="submit"
                  disabled={Object.keys(feedbackRatings).length === 0}
                  className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-md disabled:opacity-50 transition-all active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>{getTranslation('submit_anonymous_feedback', currentLanguage)}</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation Bar (Large tap targets >= 48px) */}
      <nav className="fixed bottom-0 inset-x-0 z-40 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-5 p-1 shadow-lg">
        <button
          onClick={() => setActiveTab('shift')}
          className={`flex flex-col items-center justify-center py-2 rounded-xl text-[10px] font-extrabold transition-colors min-h-[48px] ${
            activeTab === 'shift' ? 'text-teal-700 bg-teal-50' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Clock className="w-5 h-5 mb-1" />
          <span>Shift</span>
        </button>

        <button
          onClick={() => setActiveTab('payslip')}
          className={`flex flex-col items-center justify-center py-2 rounded-xl text-[10px] font-extrabold transition-colors min-h-[48px] ${
            activeTab === 'payslip' ? 'text-teal-700 bg-teal-50' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-5 h-5 mb-1" />
          <span>Payslip</span>
        </button>

        <button
          onClick={() => setActiveTab('safety')}
          className={`flex flex-col items-center justify-center py-2 rounded-xl text-[10px] font-extrabold transition-colors min-h-[48px] ${
            activeTab === 'safety' ? 'text-rose-700 bg-rose-50' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <ShieldAlert className="w-5 h-5 mb-1" />
          <span>Safety</span>
        </button>

        <button
          onClick={() => setActiveTab('passport')}
          className={`flex flex-col items-center justify-center py-2 rounded-xl text-[10px] font-extrabold transition-colors min-h-[48px] ${
            activeTab === 'passport' ? 'text-teal-700 bg-teal-50' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Award className="w-5 h-5 mb-1" />
          <span>Skills</span>
        </button>

        <button
          onClick={() => setActiveTab('feedback')}
          className={`flex flex-col items-center justify-center py-2 rounded-xl text-[10px] font-extrabold transition-colors min-h-[48px] ${
            activeTab === 'feedback' ? 'text-purple-700 bg-purple-50' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <MessageSquare className="w-5 h-5 mb-1" />
          <span>Feedback</span>
        </button>
      </nav>

      {/* QR Code Check-in Simulation Modal */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-teal-700" />
                <span>Station Check-in QR</span>
              </h4>
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-100 rounded-2xl p-6 text-center border-2 border-dashed border-slate-300">
              <div className="w-40 h-40 bg-white p-3 rounded-xl mx-auto shadow-sm flex items-center justify-center">
                {/* Simulated QR Code matrix */}
                <div className="w-full h-full bg-slate-900 rounded-lg flex flex-col items-center justify-center text-white p-2">
                  <QrCode className="w-20 h-20 text-teal-300" />
                  <span className="text-[9px] font-mono mt-1 text-slate-300">
                    {currentSectorId.toUpperCase()}-{worker.departmentId.toUpperCase()}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-3">
                Align scanner with department kiosk QR code.
              </p>
            </div>

            <button
              onClick={() => handleCheckIn()}
              className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold rounded-xl shadow-md transition-all active:scale-95"
            >
              Simulate Instant Scan & Clock In
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

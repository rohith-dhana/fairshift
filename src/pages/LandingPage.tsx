import React from 'react';
import { 
  ShieldCheck, 
  Clock, 
  Receipt, 
  Mic, 
  MessageSquareOff, 
  HeartPulse, 
  Award, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Building2, 
  Users, 
  AlertTriangle,
  Stethoscope,
  GraduationCap,
  Factory
} from 'lucide-react';
import { SECTORS, SectorConfig } from '../config/sectors';
import { SupportedLanguage, getTranslation } from '../i18n';
import { Worker } from '../services/repository';

interface LandingPageProps {
  currentSectorId: string;
  onSelectSector: (sectorId: string) => void;
  currentLanguage: SupportedLanguage;
  onNavigate: (route: 'home' | 'worker' | 'admin') => void;
  workers: Worker[];
  selectedWorker: Worker | null;
  onSelectWorker: (worker: Worker) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  currentSectorId,
  onSelectSector,
  currentLanguage,
  onNavigate,
  workers,
  selectedWorker,
  onSelectWorker,
}) => {
  const currentSector: SectorConfig = SECTORS[currentSectorId] || SECTORS.hospital;

  const sectorWorkers = workers.filter(w => w.sectorId === currentSectorId);

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-b from-teal-50/70 via-slate-50 to-white pt-10 pb-16 border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          {/* SDG 8 Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-100/90 text-teal-800 border border-teal-300 shadow-xs">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-600"></span>
            </span>
            <span className="text-xs sm:text-sm font-bold tracking-wide">
              {getTranslation('sdg_badge', currentLanguage)}
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight max-w-4xl mx-auto leading-[1.15]">
            {getTranslation('hero_title', currentLanguage)}
          </h1>

          <p className="text-base sm:text-xl text-slate-600 max-w-2xl mx-auto font-medium">
            {getTranslation('hero_subtitle', currentLanguage)}
          </p>

          {/* Sector Switcher Pill Bar */}
          <div className="pt-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
              {getTranslation('switch_sector', currentLanguage)}:
            </p>
            <div className="inline-flex flex-wrap items-center justify-center gap-2 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200 shadow-xs">
              {Object.values(SECTORS).map((sector) => {
                const isSelected = sector.id === currentSectorId;
                const SectorIcon = sector.id === 'hospital' ? Stethoscope : sector.id === 'campus' ? GraduationCap : Factory;
                return (
                  <button
                    key={sector.id}
                    onClick={() => onSelectSector(sector.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      isSelected
                        ? 'bg-teal-700 text-white shadow-md shadow-teal-700/20'
                        : 'text-slate-700 hover:bg-white hover:text-slate-900'
                    }`}
                  >
                    <SectorIcon className="w-4 h-4 shrink-0" />
                    <span>{sector.shortName}</span>
                    {sector.id === 'factory' && (
                      <span className="text-[10px] uppercase tracking-wide bg-amber-400/90 text-amber-950 px-1.5 py-0.5 rounded-md font-extrabold">
                        Config Extensible
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Launch Action Cards */}
          <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto text-left">
            {/* Worker App Card */}
            <div className="bg-white rounded-2xl p-6 border-2 border-teal-500/80 shadow-lg shadow-teal-900/5 hover:border-teal-600 transition-all flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="p-3 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
                    <Clock className="w-6 h-6 stroke-[2.2]" />
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-900">
                    Mobile-First UI
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 group-hover:text-teal-700 transition-colors">
                  {getTranslation('enter_as_worker', currentLanguage)}
                </h3>
                <p className="text-sm text-slate-600">
                  Tap-in shift tracking, clear payslips with multilingual AI explanations, voice hazard reporting, and portable skill passport.
                </p>
                {/* Active Worker Selector Preview */}
                <div className="pt-2">
                  <label className="text-xs font-bold text-slate-500 block mb-1">
                    Select Worker Persona:
                  </label>
                  <select
                    value={selectedWorker?.id || ''}
                    onChange={(e) => {
                      const found = sectorWorkers.find(w => w.id === e.target.value);
                      if (found) onSelectWorker(found);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-teal-500"
                  >
                    {sectorWorkers.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({getTranslation(`role_${w.roleId}`, currentLanguage) || w.roleId}) {w.id === 'hosp-w1' ? '★ Fatigue & Cert Flag' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-5">
                <button
                  onClick={() => onNavigate('worker')}
                  className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all active:scale-98"
                >
                  <span>Launch Worker App</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Admin Dashboard Card */}
            <div className="bg-white rounded-2xl p-6 border-2 border-slate-300 shadow-lg shadow-slate-900/5 hover:border-slate-400 transition-all flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="p-3 rounded-xl bg-slate-100 text-slate-800 border border-slate-300">
                    <Building2 className="w-6 h-6 stroke-[2.2]" />
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-800">
                    Employer Dashboard
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 group-hover:text-slate-800 transition-colors">
                  {getTranslation('enter_as_admin', currentLanguage)}
                </h3>
                <p className="text-sm text-slate-600">
                  Priority hazard oversight, circadian fatigue flags, transparent attrition risk scoring, compliance matrix, and anonymous sentiment analytics.
                </p>
                <div className="pt-2 text-xs text-slate-500 bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                  <span className="font-bold text-slate-700">Active Sector: </span>
                  {currentSector.shortName} ({sectorWorkers.length} staff rostered)
                </div>
              </div>

              <div className="pt-5">
                <button
                  onClick={() => onNavigate('admin')}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all active:scale-98"
                >
                  <span>Launch Admin Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5 Core Pillars Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Engineered for Fair, Safe & Dignified Frontline Work
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            FairShift solves the systemic information asymmetry between shift workers and management.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Pillar 1 */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3 hover:shadow-md transition-shadow">
            <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">
              {getTranslation('pillar_1_title', currentLanguage)}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {getTranslation('pillar_1_desc', currentLanguage)}
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3 hover:shadow-md transition-shadow">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">
              {getTranslation('pillar_2_title', currentLanguage)}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {getTranslation('pillar_2_desc', currentLanguage)}
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3 hover:shadow-md transition-shadow">
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center">
              <Mic className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">
              {getTranslation('pillar_3_title', currentLanguage)}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {getTranslation('pillar_3_desc', currentLanguage)}
            </p>
          </div>

          {/* Pillar 4 */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3 hover:shadow-md transition-shadow">
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center">
              <MessageSquareOff className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">
              {getTranslation('pillar_4_title', currentLanguage)}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {getTranslation('pillar_4_desc', currentLanguage)}
            </p>
          </div>

          {/* Pillar 5 */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3 hover:shadow-md transition-shadow">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
              <HeartPulse className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">
              {getTranslation('pillar_5_title', currentLanguage)}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {getTranslation('pillar_5_desc', currentLanguage)}
            </p>
          </div>
        </div>
      </section>

      {/* Sector Config Profile Feature Spotlight */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-slate-900 to-teal-950 text-white rounded-3xl p-6 sm:p-10 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700 pb-6">
            <div>
              <span className="text-amber-400 font-extrabold text-xs uppercase tracking-wider">
                Config-Driven Multi-Sector Architecture
              </span>
              <h3 className="text-2xl font-black tracking-tight mt-1">
                {currentSector.shortName} Workplace Profile
              </h3>
              <p className="text-slate-300 text-sm mt-1 max-w-xl">
                {getTranslation(currentSector.descriptionKey, currentLanguage)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                0 Duplicated Components
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Pure Config Extensible
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60">
              <p className="text-xs font-bold text-teal-400 uppercase tracking-wider">Configured Roles</p>
              <p className="text-xl font-black mt-1">{currentSector.roles.length} Frontline Roles</p>
              <p className="text-xs text-slate-400 mt-1">
                {currentSector.roles.slice(0, 3).map(r => getTranslation(r.nameKey, currentLanguage)).join(', ')}...
              </p>
            </div>

            <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60">
              <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Shift Patterns</p>
              <p className="text-xl font-black mt-1">{currentSector.shifts.length} Standard Rotations</p>
              <p className="text-xs text-slate-400 mt-1">
                Day, Evening, Night & 12h Rotations with Midnight Attribution
              </p>
            </div>

            <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60">
              <p className="text-xs font-bold text-rose-400 uppercase tracking-wider">Safety Categories</p>
              <p className="text-xl font-black mt-1">{currentSector.safetyCategories.length} Hazard Classifications</p>
              <p className="text-xs text-slate-400 mt-1">
                AI categorizes voice reports into sector categories
              </p>
            </div>

            <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60">
              <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">Skill Passports</p>
              <p className="text-xl font-black mt-1">{currentSector.skillItems.length} Certifications</p>
              <p className="text-xs text-slate-400 mt-1">
                Automated 30-day expiry tracking and employer accreditation
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

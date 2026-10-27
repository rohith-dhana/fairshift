import React from 'react';
import { 
  Building2, 
  Globe2, 
  ShieldCheck, 
  UserCircle2, 
  LayoutDashboard, 
  Home, 
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { SECTORS, SectorConfig } from '../config/sectors';
import { SUPPORTED_LANGUAGES, SupportedLanguage, getTranslation } from '../i18n';

interface NavbarProps {
  currentSectorId: string;
  onSelectSector: (sectorId: string) => void;
  currentLanguage: SupportedLanguage;
  onSelectLanguage: (lang: SupportedLanguage) => void;
  activeRoute: 'home' | 'worker' | 'admin';
  onNavigate: (route: 'home' | 'worker' | 'admin') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentSectorId,
  onSelectSector,
  currentLanguage,
  onSelectLanguage,
  activeRoute,
  onNavigate,
}) => {
  const currentSector: SectorConfig = SECTORS[currentSectorId] || SECTORS.hospital;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Brand Logo & SDG Badge */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2.5 text-left focus:outline-hidden group"
              aria-label="FairShift Home"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-700 to-teal-500 flex items-center justify-center text-white shadow-md shadow-teal-700/20 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xl tracking-tight text-slate-900 group-hover:text-teal-700 transition-colors">
                    FairShift
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    SDG 8
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium hidden md:block">
                  Decent Work & Shift Transparency Platform
                </p>
              </div>
            </button>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <button
              onClick={() => onNavigate('home')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeRoute === 'home'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>{getTranslation('nav_home', currentLanguage)}</span>
            </button>
            <button
              onClick={() => onNavigate('worker')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeRoute === 'worker'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <UserCircle2 className="w-4 h-4" />
              <span>{getTranslation('nav_worker', currentLanguage)}</span>
            </button>
            <button
              onClick={() => onNavigate('admin')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeRoute === 'admin'
                  ? 'bg-teal-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>{getTranslation('nav_admin', currentLanguage)}</span>
            </button>
          </nav>

          {/* Right Controls: Sector Switcher & Multilingual Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Sector Switcher Dropdown */}
            <div className="relative group">
              <label htmlFor="sector-select" className="sr-only">
                {getTranslation('sector_switcher_label', currentLanguage)}
              </label>
              <div className="flex items-center gap-1.5 bg-teal-50/80 border border-teal-200 hover:border-teal-400 rounded-xl px-2.5 py-1.5 transition-colors">
                <Building2 className="w-4 h-4 text-teal-700 shrink-0" />
                <select
                  id="sector-select"
                  value={currentSectorId}
                  onChange={(e) => onSelectSector(e.target.value)}
                  className="bg-transparent text-xs sm:text-sm font-bold text-teal-900 focus:outline-hidden cursor-pointer pr-1"
                >
                  {Object.values(SECTORS).map((sector) => (
                    <option key={sector.id} value={sector.id}>
                      {sector.shortName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Language Selector (EN / தமிழ் / हिन्दी / తెలుగు) */}
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1 gap-1">
              <Globe2 className="w-4 h-4 text-slate-500 ml-1.5 hidden sm:inline-block" />
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => onSelectLanguage(lang.code)}
                  title={lang.name}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                    currentLanguage === lang.code
                      ? 'bg-white text-teal-800 shadow-xs ring-1 ring-slate-300'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                  aria-pressed={currentLanguage === lang.code}
                >
                  {lang.scriptLabel}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={() => onNavigate('home')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
              activeRoute === 'home' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>{getTranslation('nav_home', currentLanguage)}</span>
          </button>
          <button
            onClick={() => onNavigate('worker')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
              activeRoute === 'worker' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            <UserCircle2 className="w-4 h-4" />
            <span>{getTranslation('nav_worker', currentLanguage)}</span>
          </button>
          <button
            onClick={() => onNavigate('admin')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
              activeRoute === 'admin' ? 'bg-teal-800 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>{getTranslation('nav_admin', currentLanguage)}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { WorkerApp } from './pages/WorkerApp';
import { AdminDashboard } from './pages/AdminDashboard';
import { DEFAULT_SECTOR_ID, SECTORS } from './config/sectors';
import { SupportedLanguage } from './i18n';
import { Worker, repository } from './services/repository';
import { Sparkles, Heart } from 'lucide-react';

export default function App() {
  const [currentSectorId, setCurrentSectorId] = useState<string>(DEFAULT_SECTOR_ID);
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('en');
  const [activeRoute, setActiveRoute] = useState<'home' | 'worker' | 'admin'>('home');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);

  // Initialize Route from window pathname
  useEffect(() => {
    const syncRouteFromPath = () => {
      const path = window.location.pathname.toLowerCase();
      if (path === '/worker' || path.startsWith('/worker')) {
        setActiveRoute('worker');
      } else if (path === '/admin' || path.startsWith('/admin')) {
        setActiveRoute('admin');
      } else {
        setActiveRoute('home');
      }
    };

    syncRouteFromPath();
    window.addEventListener('popstate', syncRouteFromPath);
    return () => window.removeEventListener('popstate', syncRouteFromPath);
  }, []);

  // Sync route changes to history state
  const handleNavigate = (route: 'home' | 'worker' | 'admin') => {
    setActiveRoute(route);
    const targetPath = route === 'home' ? '/' : `/${route}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
  };

  // Load workers for current sector
  useEffect(() => {
    const loadWorkers = async () => {
      const sectorWorkers = await repository.getWorkers(currentSectorId);
      setWorkers(sectorWorkers);
      // If currently selected worker is not in this sector, switch to first worker in new sector
      if (!selectedWorker || selectedWorker.sectorId !== currentSectorId) {
        setSelectedWorker(sectorWorkers[0] || null);
      }
    };
    loadWorkers();
  }, [currentSectorId]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      {/* Accessible Global Navbar */}
      <Navbar
        currentSectorId={currentSectorId}
        onSelectSector={(sectorId) => {
          setCurrentSectorId(sectorId);
        }}
        currentLanguage={currentLanguage}
        onSelectLanguage={setCurrentLanguage}
        activeRoute={activeRoute}
        onNavigate={handleNavigate}
      />

      {/* Main Content View Container */}
      <main className="flex-1">
        {activeRoute === 'home' && (
          <LandingPage
            currentSectorId={currentSectorId}
            onSelectSector={setCurrentSectorId}
            currentLanguage={currentLanguage}
            onNavigate={handleNavigate}
            workers={workers}
            selectedWorker={selectedWorker}
            onSelectWorker={setSelectedWorker}
          />
        )}

        {activeRoute === 'worker' && selectedWorker && (
          <div className="py-6 px-3">
            <WorkerApp
              currentSectorId={currentSectorId}
              currentLanguage={currentLanguage}
              worker={selectedWorker}
              allWorkers={workers}
              onSelectWorker={setSelectedWorker}
              onNavigateHome={() => handleNavigate('home')}
            />
          </div>
        )}

        {activeRoute === 'admin' && (
          <AdminDashboard
            currentSectorId={currentSectorId}
            onSelectSector={setCurrentSectorId}
            currentLanguage={currentLanguage}
            onSelectWorkerForPreview={(w) => {
              setSelectedWorker(w);
              handleNavigate('worker');
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 px-4 text-center text-xs text-slate-500 space-y-2">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <span>FairShift</span>
            <span className="text-slate-400">•</span>
            <span className="text-teal-700 font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> UN SDG 8 Decent Work Platform
            </span>
          </div>

          <div className="text-slate-500">
            Empowering shift workers across healthcare, education, and frontline operations.
          </div>
        </div>
      </footer>
    </div>
  );
}

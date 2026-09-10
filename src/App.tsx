/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useSyncState } from './hooks/useSyncState';
import LandingPage from './components/LandingPage';
import DewanPanel from './components/DewanPanel';
import JuriPanel from './components/JuriPanel';
import SekretarisPanel from './components/SekretarisPanel';
import MonitorPanel from './components/MonitorPanel';
import MonitorUrutanPartai from './components/MonitorUrutanPartai';

// TGR / Seni imports
import TGRLandingPage from './components/TGRLandingPage';
import TGRKetuaPanel from './components/TGRKetuaPanel';
import TGRDewanPanel from './components/TGRDewanPanel';
import TGRJuriPanel from './components/TGRJuriPanel';
import TGRSekretarisPanel from './components/TGRSekretarisPanel';
import TGRMonitorPanel from './components/TGRMonitorPanel';
import TGRRegistrasiDataPanel from './components/TGRRegistrasiDataPanel';
import RegistrasiDataPanel from './components/RegistrasiDataPanel';

import PanelPortal from './components/PanelPortal';
import LandscapeWrapper from './components/LandscapeWrapper';
import { playBeep } from './utils/sound';

export default function App() {
  const {
    state,
    histories,
    connected,
    dispatch,
    tgrState,
    currentArenaId,
    selectArena,
    arenasList,
    allArenasSummary,
    allArenasMap
  } = useSyncState();

  // Mode: 'portal' | 'tanding' | 'seni'
  const [activeMode, setActiveMode] = useState<'portal' | 'tanding' | 'seni'>(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    if (mode === 'tanding' || mode === 'seni') return mode;

    // Support deep link by inferring mode from role
    const role = params.get('role');
    if (role) {
      if (['ketua', 'juri4', 'juri5', 'juri6', 'juri7', 'juri8', 'juri9', 'juri10'].includes(role)) {
        return 'seni';
      }
      return 'tanding'; // default fallback for other roles
    }
    return 'portal';
  });

  // Role within selected mode
  const [activeRole, setActiveRole] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const role = params.get('role');
    if (role) {
      return role;
    }
    return 'landing';
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });

  const handleToggleTheme = () => {
    playBeep('click');
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const handleSelectMode = (mode: 'tanding' | 'seni' | 'monitor_urutan', targetRole?: string) => {
    const params = new URLSearchParams(window.location.search);
    if (mode === 'monitor_urutan') {
      params.set('mode', 'tanding');
      params.set('role', 'monitor_urutan');
      window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
      setActiveMode('tanding');
      setActiveRole('monitor_urutan');
      return;
    }
    const roleToSet = targetRole || 'landing';
    params.set('mode', mode);
    params.set('role', roleToSet);
    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
    setActiveMode(mode);
    setActiveRole(roleToSet);
  };

  const handleSelectRole = (role: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('mode', activeMode);
    params.set('role', role);
    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
    setActiveRole(role);
  };

  const handleBackToHome = () => {
    playBeep('click');
    const params = new URLSearchParams(window.location.search);
    params.set('mode', activeMode);
    params.set('role', 'landing');
    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
    setActiveRole('landing');
  };

  const handleBackToPortal = () => {
    playBeep('click');
    const params = new URLSearchParams(window.location.search);
    params.delete('mode');
    params.delete('role');
    const newSearch = params.toString();
    window.history.pushState({}, '', `${window.location.pathname}${newSearch ? '?' + newSearch : ''}`);
    setActiveMode('portal');
    setActiveRole('landing');
  };

  // While state is loading or offline, show a professional loading slate
  if (!state || !tgrState) {
    return (
      <div className={`min-h-screen w-full flex flex-col items-center justify-center transition-colors duration-300 font-sans px-4 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <div className={`absolute top-1/4 left-1/4 w-[20rem] h-[20rem] rounded-full blur-[130px] pointer-events-none ${theme === 'dark' ? 'bg-blue-900/10' : 'bg-blue-300/20'}`} />
        
        <div className="text-center z-10">
          {/* Animated custom ring spinner */}
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className={`absolute inset-0 rounded-full border-4 ${theme === 'dark' ? 'border-slate-900' : 'border-slate-200'}`} />
            <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-blue-500 animate-spin" />
          </div>

          <h2 className={`text-xl font-extrabold uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Pencak Silat Digital Scoring
          </h2>
          <p className={`text-xs mt-2 font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            Sinkronisasi real-time nirkabel sedang disiapkan...
          </p>

          {!connected && (
            <span className="mt-4 px-3 py-1 bg-red-950/40 border border-red-900/35 rounded-full text-[10px] uppercase font-bold text-red-400 inline-block font-mono">
              Offline - Mencari Koneksi Server IP
            </span>
          )}
        </div>
      </div>
    );
  }

  // 1. If we are on the global gateway portal
  if (activeMode === 'portal') {
    return (
      <PanelPortal
        onSelectMode={handleSelectMode}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        histories={histories}
        tgrState={tgrState}
        state={state}
        dispatch={dispatch}
        currentArenaId={currentArenaId}
        onSelectArena={selectArena}
        arenasList={arenasList}
        allArenasSummary={allArenasSummary}
        allArenasMap={allArenasMap}
      />
    );
  }

  // 2. SENI / TGR SUB-APPLICATION ROUTING
  if (activeMode === 'seni') {
    switch (activeRole) {
      case 'landing':
        return (
          <TGRLandingPage
            onSelectRole={handleSelectRole}
            onBackToPortal={handleBackToPortal}
            theme={theme}
            tgrState={tgrState}
            histories={histories}
            currentArenaId={currentArenaId}
            onSelectArena={selectArena}
            arenasList={arenasList}
            allArenasSummary={allArenasSummary}
            allArenasMap={allArenasMap}
          />
        );

      case 'ketua':
        return (
          <LandscapeWrapper>
            <TGRKetuaPanel
              state={tgrState}
              dispatch={dispatch}
              onBack={handleBackToHome}
              theme={theme}
            />
          </LandscapeWrapper>
        );

      case 'dewan':
        return (
          <LandscapeWrapper>
            <TGRDewanPanel
              state={tgrState}
              dispatch={dispatch}
              onBack={handleBackToHome}
              theme={theme}
            />
          </LandscapeWrapper>
        );

      case 'sekretaris':
        return (
          <LandscapeWrapper>
            <TGRSekretarisPanel
              state={tgrState}
              dispatch={dispatch}
              onBack={handleBackToHome}
              theme={theme}
              onToggleTheme={handleToggleTheme}
            />
          </LandscapeWrapper>
        );

      case 'monitor':
        return (
          <LandscapeWrapper>
            <TGRMonitorPanel
              state={tgrState}
              dispatch={dispatch}
              onBack={handleBackToHome}
              theme={theme}
            />
          </LandscapeWrapper>
        );

      case 'monitor_urutan':
      case 'urutan':
        return (
          <MonitorUrutanPartai
            state={state}
            histories={histories}
            tgrState={tgrState}
            dispatch={dispatch}
            onBack={handleBackToHome}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            currentArenaId={currentArenaId}
            onSelectArena={selectArena}
            arenasList={arenasList}
            allArenasSummary={allArenasSummary}
            allArenasMap={allArenasMap}
          />
        );

      case 'registrasi':
      case 'registrasi_seni':
        return (
          <TGRRegistrasiDataPanel
            theme={theme}
            state={tgrState}
            dispatch={dispatch}
            onClose={handleBackToHome}
          />
        );

      default:
        // Handle Juri dynamic roles (juri1 - juri10)
        if (activeRole.startsWith('juri')) {
          return (
            <LandscapeWrapper>
              <TGRJuriPanel
                juriId={activeRole}
                state={tgrState}
                dispatch={dispatch}
                onBack={handleBackToHome}
                theme={theme}
              />
            </LandscapeWrapper>
          );
        }
        return (
          <TGRLandingPage
            onSelectRole={handleSelectRole}
            onBackToPortal={handleBackToPortal}
            theme={theme}
            tgrState={tgrState}
            histories={histories}
            currentArenaId={currentArenaId}
            onSelectArena={selectArena}
            arenasList={arenasList}
            allArenasSummary={allArenasSummary}
            allArenasMap={allArenasMap}
          />
        );
    }
  }

  // 3. TANDING SUB-APPLICATION ROUTING
  switch (activeRole) {
    case 'landing':
      return (
        <LandingPage
          onSelectRole={(role) => handleSelectRole(role)}
          onBackToPortal={handleBackToPortal}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          histories={histories}
          state={state}
          currentArenaId={currentArenaId}
          onSelectArena={selectArena}
          arenasList={arenasList}
          allArenasSummary={allArenasSummary}
          allArenasMap={allArenasMap}
        />
      );
    
    case 'dewan':
      return (
        <LandscapeWrapper>
          <DewanPanel state={state} dispatch={dispatch} onBack={handleBackToHome} theme={theme} onToggleTheme={handleToggleTheme} />
        </LandscapeWrapper>
      );
    
    case 'juri1':
      return (
        <LandscapeWrapper>
          <JuriPanel juriId={1} state={state} dispatch={dispatch} onBack={handleBackToHome} theme={theme} onToggleTheme={handleToggleTheme} />
        </LandscapeWrapper>
      );

    case 'juri2':
      return (
        <LandscapeWrapper>
          <JuriPanel juriId={2} state={state} dispatch={dispatch} onBack={handleBackToHome} theme={theme} onToggleTheme={handleToggleTheme} />
        </LandscapeWrapper>
      );

    case 'juri3':
      return (
        <LandscapeWrapper>
          <JuriPanel juriId={3} state={state} dispatch={dispatch} onBack={handleBackToHome} theme={theme} onToggleTheme={handleToggleTheme} />
        </LandscapeWrapper>
      );

    case 'sekretaris':
      return (
        <LandscapeWrapper>
          <SekretarisPanel state={state} tgrState={tgrState} histories={histories} dispatch={dispatch} onBack={handleBackToHome} theme={theme} onToggleTheme={handleToggleTheme} />
        </LandscapeWrapper>
      );

    case 'monitor':
      return (
        <LandscapeWrapper>
          <MonitorPanel state={state} onBack={handleBackToHome} theme={theme} onToggleTheme={handleToggleTheme} />
        </LandscapeWrapper>
      );

    case 'monitor_urutan':
    case 'urutan':
      return (
        <MonitorUrutanPartai
          state={state}
          histories={histories}
          tgrState={tgrState}
          dispatch={dispatch}
          onBack={handleBackToHome}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          currentArenaId={currentArenaId}
          onSelectArena={selectArena}
          arenasList={arenasList}
          allArenasSummary={allArenasSummary}
          allArenasMap={allArenasMap}
        />
      );

    case 'registrasi':
    case 'registrasi_tanding':
      return (
        <RegistrasiDataPanel
          theme={theme}
          state={state}
          dispatch={dispatch}
          onClose={handleBackToHome}
        />
      );

    default:
      return (
        <LandingPage
          onSelectRole={(role) => handleSelectRole(role)}
          onBackToPortal={handleBackToPortal}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          histories={histories}
          state={state}
          currentArenaId={currentArenaId}
          onSelectArena={selectArena}
          arenasList={arenasList}
          allArenasSummary={allArenasSummary}
          allArenasMap={allArenasMap}
        />
      );
  }
}

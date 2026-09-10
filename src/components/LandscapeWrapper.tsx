/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { RotateCw, Maximize, Minimize, Eye, EyeOff } from 'lucide-react';
import { playBeep } from '../utils/sound';

interface LandscapeWrapperProps {
  children: React.ReactNode;
  showToggle?: boolean;
}

export default function LandscapeWrapper({ children, showToggle = true }: LandscapeWrapperProps) {
  const [isRotated, setIsRotated] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      const isNativeActive = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isNativeActive);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    // Initial check
    handleFullscreenChange();

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  React.useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  const handleToggle = () => {
    playBeep('click');
    setIsRotated(!isRotated);
  };

  const toggleFullscreen = () => {
    playBeep('click');
    
    // Check if any native element is currently in fullscreen
    const nativeElement = document.fullscreenElement || 
                          (document as any).webkitFullscreenElement || 
                          (document as any).mozFullScreenElement || 
                          (document as any).msFullscreenElement;

    if (!nativeElement && !isFullscreen) {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        element.requestFullscreen()
          .then(() => setIsFullscreen(true))
          .catch(err => {
            console.warn("Native fullscreen failed, using pseudo-fullscreen fallback", err);
            setIsFullscreen(true); // Fallback to virtual fullscreen
          });
      } else if ((element as any).webkitRequestFullscreen) {
        try {
          (element as any).webkitRequestFullscreen();
          setIsFullscreen(true);
        } catch (e) {
          console.warn("Webkit fullscreen failed, using fallback", e);
          setIsFullscreen(true);
        }
      } else if ((element as any).msRequestFullscreen) {
        try {
          (element as any).msRequestFullscreen();
          setIsFullscreen(true);
        } catch (e) {
          console.warn("MS fullscreen failed, using fallback", e);
          setIsFullscreen(true);
        }
      } else {
        // Ultimate fallback for devices like iPhone that don't support Document fullscreen API
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
          .then(() => setIsFullscreen(false))
          .catch(err => {
            console.warn(err);
            setIsFullscreen(false);
          });
      } else if ((document as any).webkitExitFullscreen) {
        try {
          (document as any).webkitExitFullscreen();
          setIsFullscreen(false);
        } catch (e) {
          setIsFullscreen(false);
        }
      } else if ((document as any).msExitFullscreen) {
        try {
          (document as any).msExitFullscreen();
          setIsFullscreen(false);
        } catch (e) {
          setIsFullscreen(false);
        }
      } else {
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div className={`relative w-full h-[100dvh] overflow-hidden bg-gradient-to-b from-[#071330] via-[#03081a] to-[#010207] text-slate-100 font-sans select-none ${
      isFullscreen ? 'fixed inset-0 z-[99999] w-screen h-[100dvh]' : ''
    }`}>
      {/* Decorative Martial Arts Silhouettes and Radial Energy Backdrops */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Subtle Cyber / Martial Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e3a8a0a_1px,transparent_1px),linear-gradient(to_bottom,#1e3a8a0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />
        
        {/* Blue Ambient Glows */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[48rem] h-[24rem] bg-blue-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 -left-20 w-[32rem] h-[32rem] bg-indigo-900/10 rounded-full blur-[160px]" />
        <div className="absolute top-1/2 -right-20 w-[30rem] h-[30rem] bg-blue-900/10 rounded-full blur-[150px]" />

        {/* Martial Arts Pesilat Silhouette 1 (Left Kuda-Kuda / Stance) */}
        <svg
          className="absolute -bottom-6 left-4 w-72 h-72 md:w-96 md:h-96 text-blue-500/[0.035] fill-current transform -scale-x-100"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Stylized Silat Fighter Silhouette */}
          <path d="M100 20c-5.5 0-10 4.5-10 10s4.5 10 10 10 10-4.5 10-10-4.5-10-10-10zm-15 25c-8 0-16 6-18 14l-12 45c-1.5 5.5 2 11 7.5 12.5 5.5 1.5 11-2 12.5-7.5l8-30 11 12v64c0 6 5 11 11 11s11-5 11-11v-40l14 16 18 36c2.5 5 8.5 7 13.5 4.5 5-2.5 7-8.5 4.5-13.5l-20-40-16-20v-22c7-4 15-11 15-20 0-4-3-7-7-7s-7 3-7 7c0 4-5 8-11 10l-15-15h-19z" />
        </svg>

        {/* Martial Arts Pesilat Silhouette 2 (Right High Kick / Tendangan Sabit) */}
        <svg
          className="absolute -top-4 right-6 w-80 h-80 md:w-[28rem] md:h-[28rem] text-cyan-500/[0.03] fill-current"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Dynamic Kick Silhouette */}
          <path d="M85 30c-5 0-9 4-9 9s4 9 9 9 9-4 9-9-4-9-9-9zm-10 22c-6 0-12 5-14 11l-10 32c-2 6 2 12 8 14 6 2 12-2 14-8l6-20 18 8 46-24c6-3 8-10 5-16-3-6-10-8-16-5l-35 18-12-10 4-10c2-5-1-10-6-10zm-5 70l-8 38c-1.5 7 3 13 10 14 7 1 13-3 14-10l10-48-26 6z" />
        </svg>
      </div>
      
      {/* Physical Landscape Swivel Element */}
      <div
        className={`w-full h-full transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${
          isRotated
            ? 'origin-top-left -rotate-95 translate-y-[100dvh] fixed'
            : ''
        }`}
        style={{
          width: isRotated ? '100dvh' : '100%',
          height: isRotated ? '100dvw' : '100%',
        }}
      >
        <div className="w-full h-full flex flex-col overflow-hidden relative z-10">
          {children}
        </div>
      </div>

      {/* Floating Action Controls in the screen corner */}
      {showToggle && (
        <div className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2">
          {controlsVisible ? (
            <>
              {/* Fullscreen Option */}
              <button
                onClick={toggleFullscreen}
                className="p-2.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg shadow-lg backdrop-blur-md border border-slate-800 transition-all hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
                title="Toggle Layar Penuh"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>

              {/* Core Rotation Action */}
              <button
                onClick={handleToggle}
                className="p-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 hover:from-slate-800 hover:to-slate-700 text-slate-250 border border-slate-700 rounded-lg shadow-xl hover:text-white transition-all hover:scale-105 active:scale-95 flex items-center gap-2 font-black text-[10px] tracking-wider uppercase backdrop-blur-md cursor-pointer"
                title="Rotasi Layar ke Landscape"
              >
                <RotateCw className={`w-4 h-4 text-cyan-405 transition-transform duration-700 ease-out-back ${isRotated ? 'rotate-180' : ''}`} />
                <span className="hidden sm:inline">Rotasi Layar</span>
              </button>

              {/* Sembunyikan Tombol */}
              <button
                onClick={() => {
                  playBeep('click');
                  setControlsVisible(false);
                }}
                className="p-2.5 bg-slate-900/95 hover:bg-slate-850 text-slate-400 hover:text-white rounded-lg shadow-lg backdrop-blur-md border border-slate-800 transition-all hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
                title="Sembunyikan Menu"
              >
                <EyeOff className="w-4 h-4" />
              </button>
            </>
          ) : (
            /* Tampilkan Tombol Floating Sangat Transparan */
            <button
              onClick={() => {
                playBeep('click');
                setControlsVisible(true);
              }}
              className="p-2 bg-slate-900/40 hover:bg-slate-800 text-slate-450 hover:text-white rounded-full shadow-md backdrop-blur-sm border border-slate-800/35 hover:border-slate-705 transition-all opacity-40 hover:opacity-100 flex items-center justify-center cursor-pointer"
              title="Tampilkan Menu"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

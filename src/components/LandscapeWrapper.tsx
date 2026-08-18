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
    <div className={`relative w-full h-[100dvh] overflow-hidden bg-slate-950 text-slate-100 font-sans select-none ${
      isFullscreen ? 'fixed inset-0 z-[99999] w-screen h-[100dvh]' : ''
    }`}>
      {/* Decorative Martial Arts Silhouette Background */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.3)_0%,transparent_70%)]" />
      
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
        <div className="w-full h-full flex flex-col overflow-hidden bg-gradient-to-b from-slate-950 via-slate-950 to-slate-950">
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

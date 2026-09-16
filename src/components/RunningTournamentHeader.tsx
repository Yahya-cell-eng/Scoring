/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, Shield, Sparkles } from 'lucide-react';

export interface RunningTournamentHeaderProps {
  tournamentName?: string;
  gelanggang?: string;
  partai?: string | number;
  kategori?: string;
  babak?: string | number;
  theme?: 'dark' | 'light';
  logoLeft?: string | null;
  className?: string;
  speed?: number; // seconds per cycle, default 30
}

export const RunningTournamentHeader: React.FC<RunningTournamentHeaderProps> = ({
  tournamentName = 'KEJUARAAN NASIONAL PENCAK SILAT IPSI 2026',
  gelanggang,
  partai,
  kategori,
  babak,
  theme = 'dark',
  logoLeft,
  className = '',
  speed = 28,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const cleanName = (tournamentName && tournamentName.trim().length > 0)
    ? tournamentName.toUpperCase()
    : 'KEJUARAAN NASIONAL PENCAK SILAT IPSI 2026';

  const isDark = theme === 'dark';

  // Compose one full block of information to be seamlessly repeated
  const renderMarqueeBlock = (keyPrefix: string) => (
    <div key={keyPrefix} className="inline-flex items-center gap-6 px-4 shrink-0">
      {/* Tournament Name Highlight */}
      <span className="inline-flex items-center gap-2 font-black tracking-wider text-amber-300 drop-shadow-sm uppercase text-xs md:text-sm">
        <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0 inline-block" />
        <span className="font-sport font-black">{cleanName}</span>
      </span>

      <span className="text-slate-500 font-bold opacity-75">•</span>

      {/* Gelanggang Info */}
      {gelanggang && (
        <>
          <span className="inline-flex items-center gap-1.5 font-extrabold tracking-wide text-cyan-300 uppercase text-xs">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
            <span>GELANGGANG {gelanggang}</span>
          </span>
          <span className="text-slate-500 font-bold opacity-75">•</span>
        </>
      )}

      {/* Partai & Babak Info if present */}
      {partai && (
        <>
          <span className="font-extrabold tracking-wide text-emerald-300 uppercase text-xs">
            PARTAI {partai}
          </span>
          <span className="text-slate-500 font-bold opacity-75">•</span>
        </>
      )}

      {babak && (
        <>
          <span className="font-extrabold tracking-wide text-purple-300 uppercase text-xs">
            BABAK {babak}
          </span>
          <span className="text-slate-500 font-bold opacity-75">•</span>
        </>
      )}

      {kategori && (
        <>
          <span className="font-extrabold tracking-wide text-slate-200 uppercase text-xs">
            {kategori}
          </span>
          <span className="text-slate-500 font-bold opacity-75">•</span>
        </>
      )}

      {/* Official Slogan / Federation Info */}
      <span className="inline-flex items-center gap-1.5 font-bold tracking-widest text-slate-300 uppercase text-[11px] opacity-90">
        <Shield className="w-3.5 h-3.5 text-red-400 shrink-0 inline-block" />
        <span>PERSATUAN PENCAK SILAT INDONESIA (IPSI)</span>
      </span>

      <span className="text-slate-500 font-bold opacity-75">•</span>

      <span className="font-bold tracking-widest text-amber-200/90 uppercase text-[11px]">
        DIGITAL SCORING SYSTEM REAL-TIME
      </span>

      <span className="text-slate-500 font-bold opacity-75">•</span>

      <span className="inline-flex items-center gap-1 text-slate-300 font-semibold tracking-wide uppercase text-[11px]">
        <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
        <span>SALAM PENCAK SILAT • PRESTASI BANGSA</span>
      </span>

      <span className="text-slate-500 font-bold opacity-75">•</span>
    </div>
  );

  return (
    <div 
      className={`relative w-full overflow-hidden flex items-center select-none transition-colors duration-300 z-20 ${
        isDark 
          ? 'bg-gradient-to-r from-[#070c1a] via-[#0c152c] to-[#070c1a] border-b border-blue-950/80 text-slate-200' 
          : 'bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 border-b border-slate-300 text-slate-800'
      } ${className}`}
      style={{ minHeight: '28px', height: '28px' }}
      title={`Nama Kejuaraan: ${cleanName}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Fixed Left Badge: LIVE KEJUARAAN */}
      <div 
        className={`flex items-center gap-1.5 px-2.5 h-full z-10 shrink-0 font-sans border-r text-[9px] md:text-[10px] font-black tracking-wider uppercase ${
          isDark 
            ? 'bg-gradient-to-r from-red-900/90 to-red-950/90 text-red-100 border-red-800/60' 
            : 'bg-gradient-to-r from-red-600 to-red-700 text-white border-red-700'
        }`}
      >
        {logoLeft ? (
          <img src={logoLeft} alt="Logo" className="w-3.5 h-3.5 object-contain" referrerPolicy="no-referrer" />
        ) : (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
        )}
        <span className="hidden xs:inline sm:inline">KEJUARAAN</span>
      </div>

      {/* Left Fading Edge Overlay */}
      <div 
        className={`pointer-events-none absolute left-[70px] sm:left-[95px] top-0 bottom-0 w-8 md:w-14 z-10 ${
          isDark 
            ? 'bg-gradient-to-r from-[#070c1a] to-transparent' 
            : 'bg-gradient-to-r from-slate-200 to-transparent'
        }`} 
      />

      {/* Right Fading Edge Overlay */}
      <div 
        className={`pointer-events-none absolute right-0 top-0 bottom-0 w-8 md:w-14 z-10 ${
          isDark 
            ? 'bg-gradient-to-l from-[#070c1a] to-transparent' 
            : 'bg-gradient-to-l from-slate-200 to-transparent'
        }`} 
      />

      {/* The Running Text Track (Infinite Motion Marquee Loop) */}
      <div className="flex-1 min-w-0 overflow-hidden h-full flex items-center relative">
        <motion.div
          animate={isHovered ? { x: undefined } : { x: ['0%', '-50%'] }}
          transition={{
            ease: 'linear',
            duration: speed,
            repeat: Infinity,
          }}
          className="flex items-center whitespace-nowrap will-change-transform select-none"
        >
          {renderMarqueeBlock('block-1')}
          {renderMarqueeBlock('block-2')}
        </motion.div>
      </div>
    </div>
  );
};

export default RunningTournamentHeader;

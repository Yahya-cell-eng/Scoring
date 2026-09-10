/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Palette, Check, X, Sparkles, Moon, Sun, Shield } from 'lucide-react';
import { useThemePalette, ThemePaletteId, THEME_PALETTES } from '../services/themeService';
import { playBeep } from '../utils/sound';

interface ThemePaletteSelectorProps {
  compact?: boolean;
  className?: string;
}

export default function ThemePaletteSelector({ compact = false, className = '' }: ThemePaletteSelectorProps) {
  const { paletteId, palette, allPalettes, changePalette } = useThemePalette();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelectPalette = (id: ThemePaletteId) => {
    playBeep('click');
    changePalette(id);
  };

  return (
    <div className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      {compact ? (
        <button
          onClick={() => { playBeep('click'); setIsOpen(!isOpen); }}
          title={`Tema Warna Aktif: ${palette.name}`}
          className="p-1.5 md:px-2.5 md:py-1.5 rounded-lg border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 flex items-center gap-1.5 text-xs font-mono font-bold transition-all shadow-sm cursor-pointer hover:border-slate-500"
        >
          <div className="flex items-center gap-1">
            <span 
              className="w-3 h-3 rounded-full border border-white/40 shadow-sm"
              style={{ backgroundColor: palette.accentColor }} 
            />
            <span className="hidden sm:inline text-[11px] font-sans font-bold">{palette.name}</span>
          </div>
          <Palette className="w-3.5 h-3.5 text-slate-400" />
        </button>
      ) : (
        <button
          onClick={() => { playBeep('click'); setIsOpen(!isOpen); }}
          className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 flex items-center gap-2 text-xs font-mono font-bold transition-all shadow-sm cursor-pointer hover:border-cyan-500/50"
        >
          <Palette className="w-4 h-4 text-cyan-400" />
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-normal">Tema:</span>
            <span className="text-slate-100 font-bold">{palette.name}</span>
          </div>
          <div 
            className="w-2.5 h-2.5 rounded-full border border-white/30"
            style={{ backgroundColor: palette.accentColor }}
          />
        </button>
      )}

      {/* Dropdown Modal / Popover */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for closing */}
            <div 
              className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-[1px]" 
              onClick={() => setIsOpen(false)} 
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-950 border-2 border-slate-800 shadow-2xl z-[9999] p-4 text-slate-100 font-sans"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/30 text-cyan-400">
                    <Palette className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Pilihan Tema & Palet Warna
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Tersimpan permanen di localStorage
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Palette List */}
              <div className="mt-3 space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {allPalettes.map((p) => {
                  const isSelected = p.id === paletteId;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPalette(p.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-start justify-between gap-3 cursor-pointer group ${
                        isSelected 
                          ? 'border-cyan-400 bg-slate-900/90 shadow-md ring-1 ring-cyan-400/40' 
                          : 'border-slate-800/80 bg-slate-900/40 hover:bg-slate-900 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                            {p.label}
                          </span>
                          {p.isDark ? (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] font-mono text-slate-400 border border-slate-700">
                              Dark
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-amber-950/60 text-[9px] font-mono text-amber-300 border border-amber-800/50">
                              Light
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                          {p.tagline}
                        </p>

                        {/* Color Swatch Bar */}
                        <div className="flex items-center gap-1.5 mt-2">
                          <div 
                            className="w-4 h-4 rounded-md border border-white/20 shadow-sm"
                            style={{ backgroundColor: p.preview.bg }}
                            title="Background"
                          />
                          <div 
                            className="w-4 h-4 rounded-md border border-white/20 shadow-sm"
                            style={{ backgroundColor: p.preview.card }}
                            title="Card / Container"
                          />
                          <div 
                            className="w-4 h-4 rounded-md border border-white/20 shadow-sm"
                            style={{ backgroundColor: p.preview.blueAccent }}
                            title="Sudut Biru"
                          />
                          <div 
                            className="w-4 h-4 rounded-md border border-white/20 shadow-sm"
                            style={{ backgroundColor: p.preview.redAccent }}
                            title="Sudut Merah"
                          />
                          <div 
                            className="w-4 h-4 rounded-md border border-white/20 shadow-sm"
                            style={{ backgroundColor: p.preview.goldAccent }}
                            title="Aksen Gold/Highlight"
                          />
                        </div>
                      </div>

                      {/* Selected Indicator */}
                      <div className="pt-0.5">
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shadow-sm">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-slate-700 group-hover:border-slate-500" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Quick note footer */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-yellow-400" />
                  Berlaku di semua panel scoring & monitor
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

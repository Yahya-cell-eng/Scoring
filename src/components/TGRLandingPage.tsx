import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Users, FileText, Monitor as MonitorIcon, ChevronRight, HelpCircle, ArrowLeft, Trophy, Star, Radio } from 'lucide-react';
import { playBeep } from '../utils/sound';

import dewanImg from '../assets/images/dewan_panel_1782782282395.jpg';
import sekretarisImg from '../assets/images/sekretaris_panel_1782782300726.jpg';
import juriImg from '../assets/images/juri_panel_1782782315779.jpg';
import monitorImg from '../assets/images/monitor_panel_1782782330918.jpg';
import RekapitulasiSkor from './RekapitulasiSkor';
import { MatchHistory, TGRState } from '../types';

interface TGRLandingPageProps {
  onSelectRole: (role: string) => void;
  onBackToPortal: () => void;
  theme: 'dark' | 'light';
  tgrState?: TGRState | null;
  histories?: MatchHistory[];
}

export default function TGRLandingPage({ onSelectRole, onBackToPortal, theme, tgrState, histories = [] }: TGRLandingPageProps) {
  const [selectedJuriGroup, setSelectedJuriGroup] = useState(false);

  const menuItems = [
    {
      id: 'ketua',
      title: 'KETUA',
      titleSub: 'KETUA PERTANDINGAN (TGR)',
      desc: 'OTORITAS TERTINGGI: MODERATOR REAL-TIME SESI JURI & PERSETUJUAN KOREKSI NILAI ARENA',
      icon: Shield,
      image: dewanImg, // reuse dewan or standard
      glowColor: 'group-hover:shadow-[0_0_35px_rgba(239,68,68,0.55)] border-red-500/30 group-hover:border-red-400/80',
      textColor: 'group-hover:text-red-400',
    },
    {
      id: 'dewan',
      title: 'DEWAN TGR',
      titleSub: 'DEWAN PERTANDINGAN TGR',
      desc: 'KELOLA DISKUALIFIKASI, TEGURAN, PENGURANGAN NILAI SERTA PENENTUAN TIE-BREAK DEWAN',
      icon: Shield,
      image: dewanImg,
      glowColor: 'group-hover:shadow-[0_0_35px_rgba(245,158,11,0.55)] border-amber-500/30 group-hover:border-amber-400/80',
      textColor: 'group-hover:text-amber-400',
    },
    {
      id: 'sekretaris',
      title: 'SEKRETARIS TGR',
      titleSub: 'SEKRETARIS PERTANDINGAN TGR',
      desc: 'ATUR DATA PESERTA SENI, JUMLAH JURI AKTIF, DURASI TAMPIL, DAN EKSPOR HASIL SKORING',
      icon: FileText,
      image: sekretarisImg,
      glowColor: 'group-hover:shadow-[0_0_35px_rgba(168,85,247,0.55)] border-purple-500/30 group-hover:border-purple-400/80',
      textColor: 'group-hover:text-purple-400',
    },
    {
      id: 'juri',
      title: 'JURI TGR',
      titleSub: 'JURI PENILAI TGR',
      desc: 'BERIKAN NILAI KEBENARAN JURUS DAN NILAI KEMANTAPAN SECARA INDEPENDEN DAN AKURAT',
      icon: Users,
      image: juriImg,
      glowColor: 'group-hover:shadow-[0_0_35px_rgba(59,130,246,0.55)] border-blue-500/30 group-hover:border-blue-400/80',
      textColor: 'group-hover:text-blue-400',
      isGroup: true
    },
    {
      id: 'monitor',
      title: 'MONITOR TGR',
      titleSub: 'DISPLAY SCOREBOARD TGR',
      desc: 'MENAMPILKAN NILAI SECARA TRANSPARAN, TIMER TAMPIL, SERTA KLASEMEN KEDUDUKAN REAL-TIME',
      icon: MonitorIcon,
      image: monitorImg,
      glowColor: 'group-hover:shadow-[0_0_35px_rgba(16,185,129,0.55)] border-emerald-500/30 group-hover:border-emerald-400/80',
      textColor: 'group-hover:text-emerald-400',
    }
  ];

  const handleRoleSelection = (role: string) => {
    playBeep('click');
    onSelectRole(role);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center transition-colors duration-500 px-4 md:px-8 py-8 relative overflow-hidden bg-[#020207] text-slate-100">
      
      {/* Dynamic purple & gold glowing backgrounds */}
      <div className="absolute inset-0 bg-[radial-gradient(#0c061a_1px,transparent_1px)] [background-size:16px_16px] opacity-35 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.15)_0%,transparent_65%)] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[28rem] h-[28rem] rounded-full blur-[140px] pointer-events-none bg-purple-950/20" />
      <div className="absolute top-1/4 right-1/4 w-[28rem] h-[28rem] rounded-full blur-[140px] pointer-events-none bg-amber-950/15" />

      {/* Header Title with Back Action */}
      <div className="max-w-6xl w-full z-10 flex flex-col items-center mt-2 mb-6 text-center">
        <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
          <button
            onClick={onBackToPortal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 cursor-pointer bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[9.5px] uppercase tracking-wider font-mono font-bold rounded-xl transition-all active:scale-95 shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Portal Utama</span>
          </button>

          <button
            onClick={() => handleRoleSelection('monitor_urutan')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 cursor-pointer bg-gradient-to-r from-purple-950/90 to-pink-950/90 hover:from-purple-900 hover:to-pink-900 border border-purple-500/50 text-purple-300 text-[9.5px] uppercase tracking-wider font-mono font-black rounded-xl transition-all active:scale-95 shadow-[0_0_15px_rgba(168,85,247,0.25)]"
          >
            <Radio className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            <span>📺 MONITOR URUTAN TAMPIL (SENI & TANDING)</span>
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center"
        >
          <div className="relative inline-flex items-center px-10 py-1 border-t border-b border-purple-500/30 bg-[#060413]/80 rounded">
            <span className="font-mono font-black text-[10px] tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-white to-amber-400 uppercase">
              MODUL SENI / ARTISTIC
            </span>
          </div>
          
          <h1 className="font-sport font-black italic text-4xl sm:text-5xl md:text-6xl mt-3 tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-white to-amber-500 filter drop-shadow-[0_0_20px_rgba(168,85,247,0.3)] select-none uppercase">
            JURUS & SENI TGR
          </h1>
          <p className="mt-4 max-w-2xl text-[9px] md:text-[10px] leading-relaxed text-slate-400 font-bold tracking-wider uppercase px-5 py-2 rounded-lg bg-slate-950/75 border border-slate-900/80 shadow-xl">
            Sistem penjurian digital terintegrasi untuk kategori Tunggal, Ganda, dan Regu sesuai regulasi IPSI termutakhir.
          </p>
        </motion.div>
      </div>

      {/* Choose Role Display */}
      <div className="max-w-6xl w-full z-10 my-4 flex-1 flex items-center justify-center">
        {!selectedJuriGroup ? (
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-5 px-2 w-full justify-center"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.08 }
              }
            }}
          >
            {menuItems.map((item) => (
              <motion.div
                key={item.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                onClick={() => {
                  if (item.isGroup) {
                    playBeep('click');
                    setSelectedJuriGroup(true);
                  } else {
                    handleRoleSelection(item.id);
                  }
                }}
                className="border border-purple-500/10 rounded-2xl p-4 bg-slate-950/50 hover:bg-slate-950/90 transition-colors flex flex-col items-center justify-between text-center cursor-pointer shadow-xl relative group"
              >
                <div className="flex flex-col items-center">
                  {/* Glowing profile photo / circle */}
                  <div className={`w-28 h-28 rounded-full overflow-hidden border-2 bg-slate-950 relative shadow-xl transition-all duration-300 flex items-center justify-center ${item.glowColor}`}>
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-[96%] h-[96%] object-contain rounded-full group-hover:scale-110 transition-transform duration-500 ease-out"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/5 pointer-events-none" />
                  </div>

                  <h3 className={`text-sm font-black font-sport tracking-wider uppercase mt-4 text-center transition-colors duration-300 ${item.textColor}`}>
                    {item.title}
                  </h3>
                </div>

                <p className="text-[8.5px] mt-2.5 text-slate-500 uppercase tracking-wider font-semibold leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="border rounded-2xl p-6 text-center shadow-2xl bg-slate-950/80 border-purple-900/40 max-w-xl w-full mx-auto backdrop-blur-md relative overflow-hidden"
          >
            {/* Corner visual tech lines */}
            <div className="absolute top-0 left-0 w-8 h-1 border-t border-l border-purple-500" />
            <div className="absolute top-0 right-0 w-8 h-1 border-t border-r border-purple-500" />
            <div className="absolute bottom-0 left-0 w-8 h-1 border-b border-l border-purple-500" />
            <div className="absolute bottom-0 right-0 w-8 h-1 border-b border-r border-purple-500" />

            <h3 className="text-lg font-black font-sport tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-amber-500 uppercase mb-1">
              PILIH PERANGKAT JURI TGR
            </h3>
            <p className="text-[9px] uppercase font-bold text-slate-400 mb-6 tracking-wider max-w-sm mx-auto leading-relaxed">
              Pilih identitas Juri Seni yang bertugas di arena saat ini.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-lg mx-auto mb-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  onClick={() => handleRoleSelection(`juri${num}`)}
                  className="py-2.5 px-1 cursor-pointer border rounded-lg font-black transition-all shadow text-[9px] font-sport uppercase tracking-wider bg-gradient-to-b from-[#0f0922] to-slate-950 hover:from-purple-950/30 hover:to-slate-950 border-purple-900/40 text-purple-400 hover:text-white hover:border-purple-400 active:scale-95"
                >
                  JURI {num}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                playBeep('click');
                setSelectedJuriGroup(false);
              }}
              className="text-[9px] font-bold font-mono tracking-widest uppercase text-slate-500 hover:text-slate-350 underline cursor-pointer transition-colors"
            >
              Kembali ke Peran Seni
            </button>
          </motion.div>
        )}
      </div>

      {/* REKAPITULASI SKOR SENI TGR & PEMENANG */}
      <div className="max-w-6xl w-full z-10 my-8 px-2 sm:px-4">
        <RekapitulasiSkor
          tgrState={tgrState}
          histories={histories}
          title="REKAPITULASI HASIL SENI TGR"
          subtitle="KLASEMEN PEROLEHAN SKOR & PEMENANG KATEGORI TUNGGAL, GANDA, REGU"
        />
      </div>

      {/* Footer Branding */}
      <div className="w-full z-10 flex justify-between items-center text-[8px] font-mono tracking-widest text-slate-700 uppercase mt-4">
        <span>IPSI DIGITAL TGR CONTROLLER v3.2</span>
        <span>MODUL JURUS / SENI DIGITAL SCORING</span>
      </div>

    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Play, RotateCcw, Award, CheckCircle, 
  Trash2, Download, Upload, Image as ImageIcon, ChevronRight, HelpCircle, Power, Sun, Moon, QrCode, Maximize2, Minimize2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { MatchState, MatchHistory, BaganCategory, BaganMatch } from '../types';
import { jsPDF } from 'jspdf';
import { playBeep } from '../utils/sound';
import BaganTab from './BaganTab';
import JadwalTab from './JadwalTab';
import RegistrasiDataPanel from './RegistrasiDataPanel';

interface SekretarisPanelProps {
  state: MatchState;
  histories: MatchHistory[];
  dispatch: (type: string, payload?: any) => Promise<any>;
  onBack: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export default function SekretarisPanel({ state, histories, dispatch, onBack, theme, onToggleTheme }: SekretarisPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    playBeep('click');
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch(err => console.warn(err));
    } else {
      document.exitFullscreen().catch(err => console.warn(err));
    }
  };

  const [showRegistrasiPage, setShowRegistrasiPage] = useState(false);
  // Navigation inside panel: "config", "control", "all" (Combined Mode), "jadwal" (Cetak Jadwal PDF)
  const [activeTab, setActiveTab ] = useState<'config' | 'control' | 'all' | 'jadwal'>('all');

  const [showNextBabakConfirm, setShowNextBabakConfirm ] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const fileInputKiriRef = useRef<HTMLInputElement>(null);
  const fileInputKananRef = useRef<HTMLInputElement>(null);
  const fileInputTengahRef = useRef<HTMLInputElement>(null);

  // Find next match (Partai Selanjutnya)
  const getNextMatch = () => {
    if (!state.baganCategories) return null;

    interface FlattenedMatch {
      catId: string;
      category: BaganCategory;
      match: BaganMatch;
    }

    const list: FlattenedMatch[] = [];
    state.baganCategories.forEach(cat => {
      cat.matches.forEach(m => {
        list.push({
          catId: cat.id,
          category: cat,
          match: m
        });
      });
    });

    const getPartaiNum = (pStr: string): number => {
      return parseInt(pStr.replace(/\D/g, ''), 10) || 999;
    };

    // Sort by Partai number numerically
    list.sort((a, b) => {
      const numA = getPartaiNum(a.match.partai);
      const numB = getPartaiNum(b.match.partai);
      return numA - numB;
    });

    // Try to find currently loaded match in the list
    let currentIndex = -1;
    if (state.activeBaganCategoryId && state.activeBaganMatchId) {
      currentIndex = list.findIndex(
        item => item.catId === state.activeBaganCategoryId && item.match.id === state.activeBaganMatchId
      );
    } else {
      // Fallback: match by partai number
      const curPartaiNum = getPartaiNum(state.partai);
      currentIndex = list.findIndex(item => getPartaiNum(item.match.partai) === curPartaiNum);
    }

    if (currentIndex !== -1 && currentIndex + 1 < list.length) {
      return list[currentIndex + 1];
    } else if (currentIndex === -1) {
      // If current match is not in the bracket list, find the first match with higher partai num
      const curPartaiNum = getPartaiNum(state.partai);
      const found = list.find(item => getPartaiNum(item.match.partai) > curPartaiNum);
      if (found) return found;
    }

    return null;
  };

  const nextMatchInfo = getNextMatch();

  // Find all scheduled matches from baganCategories
  const scheduledList = useMemo(() => {
    if (!state.baganCategories) return [];
    
    interface FlattenedScheduled {
      uniqueId: string;
      catId: string;
      categoryName: string;
      gender: 'Putra' | 'Putri';
      match: BaganMatch;
      num: number;
    }

    const list: FlattenedScheduled[] = [];
    state.baganCategories.forEach(cat => {
      cat.matches.forEach(m => {
        if (m.partai && !m.partai.includes('TBD')) {
          const num = parseInt(m.partai.replace(/\D/g, ''), 10);
          if (!isNaN(num)) {
            list.push({
              uniqueId: `${cat.id}_${m.id}`,
              catId: cat.id,
              categoryName: cat.name,
              gender: cat.gender,
              match: m,
              num
            });
          }
        }
      });
    });

    return list.sort((a, b) => a.num - b.num);
  }, [state.baganCategories]);

  const handleSelectScheduledMatch = async (uniqueId: string) => {
    const item = scheduledList.find(x => x.uniqueId === uniqueId);
    if (!item) return;

    playBeep('valid');
    const cleanKelas = item.categoryName.replace(/\s*\(.*\)/, '');
    await dispatch('LOAD_BAGAN_MATCH', {
      namaEvent: state.namaEvent || "Kejuaraan Pencak Silat",
      partai: item.match.partai.replace(/Partai\s+/i, ''),
      kelas: cleanKelas,
      gender: item.gender,
      selectedWaktu: state.selectedWaktu || 120,
      activeBaganCategoryId: item.catId,
      activeBaganMatchId: item.match.id,
      atletMerah: {
        nama: item.match.atletMerah.nama || "Sudut Merah",
        kontingen: item.match.atletMerah.kontingen || "SUDUT MERAH"
      },
      atletBiru: {
        nama: item.match.atletBiru.nama || "Sudut Biru",
        kontingen: item.match.atletBiru.kontingen || "SUDUT BIRU"
      }
    });
  };

  // Read server state when mounted or updated to set appropriate initial tab
  useEffect(() => {
    if (state.matchStatus === 'running' || state.matchStatus === 'paused' || state.matchStatus === 'babak_habis') {
      if (activeTab === 'config') {
        setActiveTab('control');
      }
    }
  }, [state.matchStatus]);

  const handleUpdateInfo = (fields: Partial<MatchState>) => {
    dispatch('UPDATE_EVENT_INFO', fields);
  };

  const handleUpdateAthlete = (corner: 'merah' | 'biru', field: 'nama' | 'kontingen', val: string) => {
    const payload = corner === 'merah' 
      ? { atletMerah: { ...state.atletMerah, [field]: val } }
      : { atletBiru: { ...state.atletBiru, [field]: val } };
    dispatch('UPDATE_ATHLETES', payload);
  };

  // Turn image select into base64 url
  const handleLogoUpload = (corner: 'kiri' | 'kanan' | 'tengah', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    playBeep('click');
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const key = corner === 'kiri' ? 'logoKiri' : corner === 'kanan' ? 'logoKanan' : 'logoTengah';
      dispatch('UPLOAD_LOGOS', { [key]: base64 });
    };
    reader.readAsDataURL(file);
  };

  // CSV Roster Importer
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    playBeep('click');
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const lines = text.split('\n');
      if (lines.length > 1) {
        // Parse CSV headers: event, partido, kelas, gender, atletMerah, kontMerah, atletBiru, kontBiru, waktu
        const firstValueLine = lines[1].split(',');
        if (firstValueLine.length >= 8) {
          const rosters = [{
            namaEvent: firstValueLine[0]?.replace(/"/g, '').trim(),
            partai: firstValueLine[1]?.replace(/"/g, '').trim(),
            kelas: firstValueLine[2]?.replace(/"/g, '').trim(),
            gender: (firstValueLine[3]?.replace(/"/g, '').trim() as any) || 'Putra',
            namaAtletMerah: firstValueLine[4]?.replace(/"/g, '').trim(),
            kontingenMerah: firstValueLine[5]?.replace(/"/g, '').trim(),
            namaAtletBiru: firstValueLine[6]?.replace(/"/g, '').trim(),
            kontingenBiru: firstValueLine[7]?.replace(/"/g, '').trim(),
            waktu: firstValueLine[8]?.replace(/"/g, '').trim() || "120"
          }];
          dispatch('IMPORT_ROSTERS', { rosters });
          alert("CSV Roster berhasil di-import!");
        }
      }
    };
    reader.readAsText(file);
  };

  // Generate blank template CSV
  const downloadTemplateCSV = () => {
    playBeep('click');
    const headers = 'Nama Event,Partai,Kelas,Gender,Nama Atlet Merah,Kontingen Merah,Nama Atlet Biru,Kontingen Biru,Skor Waktu Detik\n';
    const sample = '"Kejuaraan Silat Merdeka","02","B","Putra","Fajar Ramadhan","Banten","Galang Perkasa","Sumatra Barat","120"\n';
    const blob = new Blob([headers + sample], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'silat_roster_template.csv');
    a.click();
  };

  const startMatchGame = () => {
    playBeep('valid');
    dispatch('START_MATCH');
    setActiveTab('control');
  };

  const toggleTimer = () => {
    playBeep('click');
    dispatch('TOGGLE_TIMER');
  };

  const resetTimer = () => {
    playBeep('warning');
    dispatch('RESET_TIMER');
  };

  const handleSelectRound = (babakNum: 1 | 2 | 3) => {
    playBeep('click');
    dispatch('SET_BABAK', { babak: babakNum });
  };

  // Next Babak approval
  const handleProceedNextBabak = () => {
    playBeep('click');
    dispatch('APPROVE_NEXT_BABAK');
    setShowNextBabakConfirm(false);
  };

  const resetOrNextPartai = () => {
    playBeep('warning');
    dispatch('RESET_OR_NEXT_PARTAI');
    setActiveTab('config');
  };

  const clearMatchHistoriesList = () => {
    if (confirm("Apakah Anda yakin menghapus semua histori pertandingan?")) {
      playBeep('warning');
      dispatch('CLEAR_HISTORY');
    }
  };

  const handleExportCSV = () => {
    playBeep('click');
    if (histories.length === 0 && !state.partai) {
      alert("Tidak ada data pertandingan yang aktif atau histori yang dapat diekspor.");
      return;
    }

    let csvContent = "\uFEFF"; // BOM for Excel encoding support
    csvContent += "No,Partai,Kelas,Gender,Nama Atlet Merah,Kontingen Merah,Skor Akhir Merah,Nama Atlet Biru,Kontingen Biru,Skor Akhir Biru,Pemenang,Status/Tanggal\n";

    // 1. Export Current Match (if any)
    if (state.partai) {
      const winnerLabel = state.winner === 'merah' ? 'MERAH' : state.winner === 'biru' ? 'BIRU' : 'BELUM SELESAI';
      const row = [
        "AKTIF",
        `"${state.partai}"`,
        `"${state.kelas}"`,
        `"${state.gender}"`,
        `"${state.atletMerah.nama.replace(/"/g, '""')}"`,
        `"${state.atletMerah.kontingen.replace(/"/g, '""')}"`,
        state.scores.merah.total,
        `"${state.atletBiru.nama.replace(/"/g, '""')}"`,
        `"${state.atletBiru.kontingen.replace(/"/g, '""')}"`,
        state.scores.biru.total,
        `"${winnerLabel}"`,
        `"Sedang Berlangsung (${state.matchStatus})"`
      ].join(",");
      csvContent += row + "\n";
    }

    // 2. Export History list
    histories.forEach((h, index) => {
      const winnerLabel = h.winner === 'merah' ? 'MERAH' : h.winner === 'biru' ? 'BIRU' : 'SERI';
      const row = [
        index + 1,
        `"${h.partai}"`,
        `"${h.kelas}"`,
        `"${h.gender}"`,
        `"${h.atletMerah.nama.replace(/"/g, '""')}"`,
        `"${h.atletMerah.kontingen.replace(/"/g, '""')}"`,
        h.skorAkhirMerah,
        `"${h.atletBiru.nama.replace(/"/g, '""')}"`,
        `"${h.atletBiru.kontingen.replace(/"/g, '""')}"`,
        h.skorAkhirBiru,
        `"${winnerLabel}"`,
        `"${h.tanggal}"`
      ].join(",");
      csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Dokumen_Skoring_Silat_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    playBeep('click');
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    let currentY = 18;
    
    // Draw outer borders
    doc.setDrawColor(30, 41, 59); // slate-800
    doc.setLineWidth(0.8);
    doc.rect(8, 8, pageWidth - 16, pageHeight - 16);
    
    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("DOKUMEN RESMI HASIL SKORING PERTANDINGAN", pageWidth / 2, currentY, { align: "center" });
    currentY += 6;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text("IKATAN PENCAK SILAT INDONESIA - SECERTARY MATCH CONTROL", pageWidth / 2, currentY, { align: "center" });
    currentY += 6;
    
    // Double decorative divider line
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.4);
    doc.line(12, currentY, pageWidth - 12, currentY);
    doc.line(12, currentY + 0.8, pageWidth - 12, currentY + 0.8);
    currentY += 8;
    
    // Metadata Header Info Panel
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240);
    doc.rect(12, currentY, pageWidth - 24, 20, "FD");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`NAMA EVENT / CHAMPIONSHIP :`, 16, currentY + 6);
    doc.setFont("helvetica", "normal");
    doc.text(`${state.namaEvent || 'Kejuaraan Pencak Silat Digital'}`, 70, currentY + 6);
    
    doc.setFont("helvetica", "bold");
    doc.text(`WAKTU CETAK DOKUMEN       :`, 16, currentY + 13);
    doc.setFont("helvetica", "normal");
    doc.text(`${new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })} WIB`, 70, currentY + 13);
    currentY += 26;

    // A. Current match data (if running/paused/completed/ongoing)
    if (state.partai) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text("A. DETAIL SKOR PERTANDINGAN AKTIF / TERAKHIR", 12, currentY);
      currentY += 5;

      // Outer table border for active match
      doc.setDrawColor(148, 163, 184); // slate-400
      doc.setFillColor(255, 255, 255);
      doc.rect(12, currentY, pageWidth - 24, 45, "FD");

      // Draw match header label
      doc.setFillColor(15, 23, 42);
      doc.rect(12, currentY, pageWidth - 24, 8, "F");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(`PARTAI ${state.partai} - KELAS ${state.kelas} (${state.gender.toUpperCase()})`, 16, currentY + 5.5);
      doc.text(`STATUS: ${state.matchStatus.toUpperCase()}`, pageWidth - 16, currentY + 5.5, { align: "right" });

      currentY += 8;

      // Details columns
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38); // Red
      doc.text("SUDUT MERAH", 16, currentY + 6);
      
      doc.setTextColor(37, 99, 235); // Blue
      doc.text("SUDUT BIRU", pageWidth - 16, currentY + 6, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(9.5);
      // Names
      doc.text(`${state.atletMerah.nama}`, 16, currentY + 12);
      doc.text(`${state.atletBiru.nama}`, pageWidth - 16, currentY + 12, { align: "right" });
      // Contingents
      doc.setFontSize(8.5);
      doc.text(`Kontingen: ${state.atletMerah.kontingen}`, 16, currentY + 17);
      doc.text(`Kontingen: ${state.atletBiru.kontingen}`, pageWidth - 16, currentY + 17, { align: "right" });

      // Divider line
      doc.setDrawColor(226, 232, 240);
      doc.line(16, currentY + 21, pageWidth - 16, currentY + 21);

      // Rounds breakdown score label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text("RINCIAN SKOR TIAP BABAK:", 16, currentY + 26);

      // Score display comparison
      doc.setFontSize(9.5);
      doc.setTextColor(220, 38, 38);
      doc.text(`Babak 1: ${state.scores.merah.babak1} | Babak 2: ${state.scores.merah.babak2} | Babak 3: ${state.scores.merah.babak3}`, 16, currentY + 31);
      
      doc.setTextColor(37, 99, 235);
      doc.text(`Babak 1: ${state.scores.biru.babak1} | Babak 2: ${state.scores.biru.babak2} | Babak 3: ${state.scores.biru.babak3}`, pageWidth - 16, currentY + 31, { align: "right" });

      // Total final comparison
      doc.setDrawColor(226, 232, 240);
      doc.line(16, currentY + 34, pageWidth - 16, currentY + 34);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(220, 38, 38);
      doc.text(`SKOR AKHIR: ${state.scores.merah.total}`, 16, currentY + 39.5);

      doc.setTextColor(15, 23, 42);
      doc.text("VS", pageWidth / 2, currentY + 39.5, { align: "center" });

      doc.setTextColor(37, 99, 235);
      doc.text(`SKOR AKHIR: ${state.scores.biru.total}`, pageWidth - 16, currentY + 39.5, { align: "right" });

      currentY += 49;
    }

    // B. Historical entries
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("B. RIWAYAT DATA HASIL PERTANDINGAN (HISTORY LOGS)", 12, currentY);
    currentY += 5;

    // Draw table header
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(12, currentY, pageWidth - 24, 7.5, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("No", 14, currentY + 5);
    doc.text("Partai", 21, currentY + 5);
    doc.text("Kelas", 32, currentY + 5);
    doc.text("Gender", 45, currentY + 5);
    doc.text("Sudut Merah (Skor)", 60, currentY + 5);
    doc.text("Sudut Biru (Skor)", 115, currentY + 5);
    doc.text("Pemenang", 168, currentY + 5);
    currentY += 7.5;

    // Draw rows
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);

    if (histories.length === 0) {
      doc.setDrawColor(203, 213, 225);
      doc.rect(12, currentY, pageWidth - 24, 8);
      doc.text("Belum ada riwayat pertarungan resmi yang tersimpan di database.", pageWidth / 2, currentY + 5.5, { align: "center" });
      currentY += 8;
    } else {
      histories.forEach((h, index) => {
        if (currentY > pageHeight - 38) {
          doc.addPage();
          currentY = 20;
          doc.setDrawColor(30, 41, 59);
          doc.setLineWidth(0.8);
          doc.rect(8, 8, pageWidth - 16, pageHeight - 16);
        }

        // Zebra striping
        if (index % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(12, currentY, pageWidth - 24, 8, "F");
        }

        doc.setDrawColor(226, 232, 240);
        doc.line(12, currentY + 8, pageWidth - 12, currentY + 8);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(51, 65, 85);
        doc.text((index + 1).toString(), 14, currentY + 5.5);
        doc.text(h.partai, 21, currentY + 5.5);
        doc.text(h.kelas, 32, currentY + 5.5);
        doc.text(h.gender === 'Putra' ? 'PA' : 'PI', 45, currentY + 5.5);
        doc.text(`${h.atletMerah.nama} (${h.skorAkhirMerah})`, 60, currentY + 5.5);
        doc.text(`${h.atletBiru.nama} (${h.skorAkhirBiru})`, 115, currentY + 5.5);

        const winLabel = h.winner === 'merah' ? 'MERAH' : h.winner === 'biru' ? 'BIRU' : 'SERI';
        const winColor = h.winner === 'merah' ? [220, 38, 38] : h.winner === 'biru' ? [37, 99, 235] : [100, 116, 139];
        doc.setFont("helvetica", "bold");
        doc.setTextColor(winColor[0], winColor[1], winColor[2]);
        doc.text(winLabel, 168, currentY + 5.5);
        
        currentY += 8;
      });
    }

    // Double check height for Signatures section
    currentY = Math.max(currentY + 12, pageHeight - 40);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    
    doc.text("Dewan Hakim / Pertandingan,", 18, currentY);
    doc.text("Sekretaris Pertandingan,", pageWidth - 68, currentY);
    
    doc.line(18, currentY + 16, 68, currentY + 16);
    doc.line(pageWidth - 68, currentY + 16, pageWidth - 18, currentY + 16);
    
    doc.setFont("helvetica", "bold");
    doc.text("( ________________________ )", 18, currentY + 21);
    doc.text("( ________________________ )", pageWidth - 68, currentY + 21);

    doc.save(`Dokumen_Resmi_Skoring_Silat_${Date.now()}.pdf`);
  };

  // Watch state change to show "Lanjut ke Babak Selanjutnya" modal dialogue
  useEffect(() => {
    if (state.matchStatus === 'babak_habis' && state.currentBabak < 3) {
      setShowNextBabakConfirm(true);
    } else {
      setShowNextBabakConfirm(false);
    }
  }, [state.matchStatus, state.currentBabak]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const closeBack = () => {
    playBeep('click');
    onBack();
  };

  if (showRegistrasiPage) {
    return (
      <RegistrasiDataPanel
        theme={theme}
        state={state}
        dispatch={dispatch}
        onClose={() => {
          playBeep('click');
          setShowRegistrasiPage(false);
        }}
      />
    );
  }

  return (
    <div className={`w-full h-full flex flex-col justify-between p-3 select-none transition-colors duration-300 relative ${
      theme === 'dark' ? 'text-slate-100 bg-slate-950' : 'text-slate-800 bg-slate-50'
    }`}>
      
      {/* 1. Header Display */}
      <div className={`flex justify-between items-center pb-3 border px-4 py-2 rounded-xl shadow-lg flex-shrink-0 transition-all duration-300 ${
        theme === 'dark' 
          ? 'border-slate-805 bg-gradient-to-r from-slate-900/40 via-slate-900 to-slate-900/40 text-slate-100' 
          : 'border-slate-205 bg-gradient-to-r from-slate-200/40 via-slate-200 to-slate-200/40 text-slate-800'
      }`}>
        <div className="flex items-center gap-2">
          <button 
            onClick={closeBack}
            className={`px-2.5 py-1 text-xs cursor-pointer rounded transition-colors font-bold uppercase ${
              theme === 'dark' 
                ? 'bg-slate-800 hover:bg-slate-705 border border-slate-700 text-slate-300' 
                : 'bg-white hover:bg-slate-100 border border-slate-300 text-slate-755'
            }`}
          >
            ← Keluar
          </button>
          <button
            onClick={onToggleTheme}
            className={`p-1.5 rounded transition-colors cursor-pointer ${theme === 'dark' ? 'hover:bg-slate-800 text-amber-400' : 'hover:bg-slate-200 text-slate-600'}`}
            title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          
          <button
            onClick={toggleFullscreen}
            className={`p-1.5 rounded transition-colors cursor-pointer ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-600'}`}
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          
          <button
            onClick={() => { playBeep('click'); setShowQrModal(true); }}
            className={`px-2.5 py-1 text-xs cursor-pointer rounded transition-colors font-bold uppercase flex items-center gap-1 ${
              theme === 'dark' 
                ? 'bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-900 text-indigo-300' 
                : 'bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700'
            }`}
            title="Sambungkan Device / QR Barcode"
          >
            <QrCode className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden xs:inline">Barcode System</span>
          </button>

          <div className={`h-4 w-[1px] ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-300'}`} />
          <div className="flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span className={`text-xs font-mono font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>PANEL SEKRETARIS PERTANDINGAN</span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className={`flex p-1 rounded-lg border items-center gap-1 ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-250'
        }`}>
          <button
            onClick={() => { playBeep('click'); setShowRegistrasiPage(true); }}
            className="px-3 py-1 text-xs uppercase font-black cursor-pointer rounded transition-all bg-emerald-600 text-white shadow shadow-emerald-990/40 hover:bg-emerald-500 hover:scale-105 active:scale-95 duration-250"
          >
            🏆 REGISTRASI DATA
          </button>
          <div className={`h-4 w-[1px] ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-300'} mx-0.5`} />
          <button
            onClick={() => { playBeep('click'); setActiveTab('config'); }}
            className={`px-3 py-1 text-xs uppercase font-extrabold cursor-pointer rounded transition-all ${activeTab === 'config' ? 'bg-emerald-600 text-white shadow shadow-emerald-990/40' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Registrasi Atlet
          </button>
          <button
            onClick={() => { playBeep('click'); setActiveTab('all'); }}
            className={`px-3 py-1 text-xs uppercase font-extrabold cursor-pointer rounded transition-all ${activeTab === 'all' ? 'bg-emerald-600 text-white shadow shadow-emerald-990/40' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Mode Gabungan
          </button>
          <button
            onClick={() => { playBeep('click'); setActiveTab('control'); }}
            className={`px-3 py-1 text-xs uppercase font-extrabold cursor-pointer rounded transition-all ${activeTab === 'control' ? 'bg-emerald-600 text-white shadow shadow-emerald-990/40' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Kontrol Partai
          </button>
          <button
            onClick={() => { playBeep('click'); setActiveTab('jadwal'); }}
            className={`px-3 py-1 text-xs uppercase font-extrabold cursor-pointer rounded transition-all ${activeTab === 'jadwal' ? 'bg-emerald-600 text-white shadow shadow-emerald-990/40' : 'text-slate-400 hover:text-slate-600'}`}
          >
            📅 Cetak Jadwal
          </button>
        </div>

        {/* Match Tracker right aligned */}
        <div className={`text-right text-[11px] font-mono flex items-center gap-1.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
          <div>
            PARTAI <span className={`font-black text-xs px-2 py-0.5 rounded-md shadow-sm ml-1 ${theme === 'dark' ? 'bg-indigo-950 text-indigo-300 border border-indigo-900/50' : 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-extrabold'}`}>{state.partai}</span>
          </div>
          <div className="mx-1">|</div>
          <div>
            KELAS <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{state.kelas}</span>
          </div>
        </div>
      </div>

      {/* 2. Main Tab Body Contents */}
      {activeTab === 'config' ? (
        
        /* ATLET REGISTRATION GRID CONFIG */
        <div className="grid grid-cols-12 gap-3 flex-1 my-2 min-h-0 bg-slate-900/10 p-3 rounded-xl border border-slate-900 overflow-y-auto">
          
          {/* LEFT: Core Match Metadata fields (Col 4) */}
          <div className="col-span-4 flex flex-col gap-2 bg-slate-900/40 p-3 rounded-lg border border-slate-800/80">
            <h4 className="text-[11px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
              <span>●</span> Data Tournament & Partai
            </h4>

            <div>
              <label className="block text-[10px] text-slate-500 font-mono uppercase font-bold mb-0.5">Nama Event</label>
              <input 
                type="text" 
                value={state.namaEvent}
                onChange={(e) => handleUpdateInfo({ namaEvent: e.target.value })}
                className="w-full text-xs bg-slate-900 border border-slate-800 focus:border-emerald-500 px-2 py-1.5 rounded-md outline-none text-white font-bold"
              />
            </div>

            {scheduledList.length > 0 && (
              <div>
                <label className="block text-[10px] text-emerald-450 font-mono uppercase font-bold mb-0.5">📅 PILIH DARI JADWAL PERTANDINGAN</label>
                <select
                  value={scheduledList.find(x => x.num === parseInt(state.partai.replace(/\D/g, ''), 10))?.uniqueId || ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleSelectScheduledMatch(e.target.value);
                    }
                  }}
                  className="w-full text-xs bg-slate-950 border border-emerald-900/50 focus:border-emerald-500 px-2 py-1.5 rounded-md outline-none text-emerald-400 font-bold font-mono"
                >
                  <option value="" className="text-slate-500 bg-slate-950">-- Pilih Partai Terjadwal --</option>
                  {scheduledList.map(item => (
                    <option key={item.uniqueId} value={item.uniqueId} className="text-slate-300 bg-slate-950">
                      P{item.num.toString().padStart(2, '0')} - {item.categoryName.replace(/\s*\(.*\)/, '')} ({item.match.atletMerah.nama || 'TBD'} vs {item.match.atletBiru.nama || 'TBD'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500 font-mono uppercase font-bold mb-0.5">Partai No</label>
                <input 
                  type="text"
                  value={state.partai}
                  onChange={(e) => handleUpdateInfo({ partai: e.target.value })}
                  className="w-full text-xs bg-slate-900 border border-slate-800 focus:border-emerald-500 px-2 py-1.5 rounded-md outline-none text-white font-bold font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-mono uppercase font-bold mb-0.5">Kelas/Nomor</label>
                <input 
                  type="text"
                  value={state.kelas}
                  onChange={(e) => handleUpdateInfo({ kelas: e.target.value })}
                  className="w-full text-xs bg-slate-900 border border-slate-800 focus:border-emerald-500 px-2 py-1.5 rounded-md outline-none text-white font-bold"
                />
              </div>
            </div>

            {/* Gender Toggle putra/putri */}
            <div>
              <label className="block text-[10px] text-slate-500 font-mono uppercase font-bold mb-1">Kategori Gender</label>
              <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 border border-slate-800 rounded-md">
                <button
                  type="button"
                  onClick={() => { playBeep('click'); handleUpdateInfo({ gender: 'Putra' }); }}
                  className={`py-1 cursor-pointer rounded font-black text-xs uppercase ${state.gender === 'Putra' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Putra
                </button>
                <button
                  type="button"
                  onClick={() => { playBeep('click'); handleUpdateInfo({ gender: 'Putri' }); }}
                  className={`py-1 cursor-pointer rounded font-black text-xs uppercase ${state.gender === 'Putri' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Putri
                </button>
              </div>
            </div>

            {/* Custom Input Durasi Babak */}
            <div className="bg-slate-900/30 p-2.5 rounded-lg border border-slate-800/80">
              <label className="block text-[10px] text-slate-400 font-mono uppercase font-bold mb-2">
                Durasi Waktu Babak
              </label>
              
              {/* Preset buttons */}
              <div className="grid grid-cols-4 gap-1 mb-2.5">
                {[60, 90, 120, 180].map((sec) => {
                  const m = Math.floor(sec / 60);
                  const s = sec % 60;
                  const label = `${m}:${s === 0 ? '00' : s}`;
                  return (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => {
                        playBeep('click');
                        handleUpdateInfo({ selectedWaktu: sec });
                      }}
                      className={`py-1 cursor-pointer rounded border text-[10px] font-bold font-mono transition-all ${
                        state.selectedWaktu === sec
                          ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400 shadow-sm'
                          : 'bg-slate-900 border-slate-800 hover:bg-slate-850 text-slate-400'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Advanced minute/second stepper */}
              <div className="flex items-center gap-2">
                {/* Menit Stepper */}
                <div className="flex-1">
                  <span className="block text-[8px] text-slate-500 font-mono uppercase mb-0.5">Menit</span>
                  <div className="flex items-center bg-slate-950 border border-slate-800 rounded-md p-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        playBeep('click');
                        const curM = Math.floor(state.selectedWaktu / 60);
                        const curS = state.selectedWaktu % 60;
                        const newM = Math.max(0, curM - 1);
                        handleUpdateInfo({ selectedWaktu: newM * 60 + curS });
                      }}
                      className="px-2 py-0.5 text-xs font-black text-slate-405 hover:text-white hover:bg-slate-900 rounded cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={Math.floor(state.selectedWaktu / 60)}
                      onChange={(e) => {
                        const m = Math.max(0, parseInt(e.target.value, 10) || 0);
                        const s = state.selectedWaktu % 60;
                        handleUpdateInfo({ selectedWaktu: m * 60 + s });
                      }}
                      className="w-full bg-transparent text-center text-xs font-bold font-mono text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        playBeep('click');
                        const curM = Math.floor(state.selectedWaktu / 60);
                        const curS = state.selectedWaktu % 60;
                        const newM = curM + 1;
                        handleUpdateInfo({ selectedWaktu: newM * 60 + curS });
                      }}
                      className="px-2 py-0.5 text-xs font-black text-slate-405 hover:text-white hover:bg-slate-900 rounded cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Separator */}
                <span className="text-slate-600 font-mono font-bold mt-3">:</span>

                {/* Detik Stepper */}
                <div className="flex-1">
                  <span className="block text-[8px] text-slate-500 font-mono uppercase mb-0.5">Detik</span>
                  <div className="flex items-center bg-slate-950 border border-slate-800 rounded-md p-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        playBeep('click');
                        const curM = Math.floor(state.selectedWaktu / 60);
                        const curS = state.selectedWaktu % 60;
                        const newS = (curS - 5 + 60) % 60;
                        handleUpdateInfo({ selectedWaktu: curM * 60 + newS });
                      }}
                      className="px-2 py-0.5 text-xs font-black text-slate-405 hover:text-white hover:bg-slate-900 rounded cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={state.selectedWaktu % 60}
                      onChange={(e) => {
                        const s = Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0));
                        const m = Math.floor(state.selectedWaktu / 60);
                        handleUpdateInfo({ selectedWaktu: m * 60 + s });
                      }}
                      className="w-full bg-transparent text-center text-xs font-bold font-mono text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        playBeep('click');
                        const curM = Math.floor(state.selectedWaktu / 60);
                        const curS = state.selectedWaktu % 60;
                        const newS = (curS + 5) % 60;
                        handleUpdateInfo({ selectedWaktu: curM * 60 + newS });
                      }}
                      className="px-2 py-0.5 text-xs font-black text-slate-405 hover:text-white hover:bg-slate-900 rounded cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Logo uploads buttons */}
            <div className="border-t border-slate-800 pt-2 mt-1">
              <div className="flex items-center justify-between mb-1.5 animate-fade-in">
                <span className="block text-[10px] text-slate-500 font-mono uppercase font-bold">Upload Logo Layar Monitor</span>
                {(state.logoKiri || state.logoKanan || state.logoTengah) && (
                  <button
                    type="button"
                    onClick={() => {
                      playBeep('warning');
                      dispatch('UPLOAD_LOGOS', { logoKiri: null, logoKanan: null, logoTengah: null });
                    }}
                    className="text-[9px] text-red-500 hover:text-red-400 font-bold uppercase tracking-wider bg-transparent p-0 border-0 cursor-pointer"
                  >
                    Reset All
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => { playBeep('click'); fileInputKiriRef.current?.click(); }}
                  className={`py-1 px-1.5 cursor-pointer hover:bg-slate-800 border text-[9px] uppercase font-bold rounded flex flex-col items-center justify-center gap-1 transition-all ${
                    state.logoKiri ? 'bg-cyan-950/20 border-cyan-800 text-cyan-400' : 'bg-slate-900 border-slate-800 text-slate-455'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Logo Kiri</span>
                </button>
                <input
                  type="file"
                  ref={fileInputKiriRef}
                  accept="image/*"
                  onChange={(e) => handleLogoUpload('kiri', e)}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => { playBeep('click'); fileInputTengahRef.current?.click(); }}
                  className={`py-1 px-1.5 cursor-pointer hover:bg-slate-800 border text-[9px] uppercase font-bold rounded flex flex-col items-center justify-center gap-1 transition-all ${
                    state.logoTengah ? 'bg-amber-950/20 border-amber-800 text-amber-400' : 'bg-slate-900 border-slate-800 text-slate-455'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Logo Tengah</span>
                </button>
                <input
                  type="file"
                  ref={fileInputTengahRef}
                  accept="image/*"
                  onChange={(e) => handleLogoUpload('tengah', e)}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => { playBeep('click'); fileInputKananRef.current?.click(); }}
                  className={`py-1 px-1.5 cursor-pointer hover:bg-slate-800 border text-[9px] uppercase font-bold rounded flex flex-col items-center justify-center gap-1 transition-all ${
                    state.logoKanan ? 'bg-red-950/20 border-red-850 text-red-400' : 'bg-slate-900 border-slate-800 text-slate-455'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Logo Kanan</span>
                </button>
                <input
                  type="file"
                  ref={fileInputKananRef}
                  accept="image/*"
                  onChange={(e) => handleLogoUpload('kanan', e)}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* MIDDLE + RIGHT: Athlete inputs & Roster Import options (Col 8) */}
          <div className="col-span-8 flex flex-col justify-between gap-3 min-h-0">
            
            {/* Athlete detail configuration cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* SUDUT BIRU FIELD CONFIG */}
              <div className="bg-gradient-to-b from-blue-950/20 to-slate-900/55 p-3 rounded-lg border border-blue-900/40">
                <span className="text-[9px] font-black uppercase text-cyan-405 tracking-wider">REGISTRASI SUDUT BIRU</span>
                <div className="mt-2.5 flex flex-col gap-1.5">
                  <div>
                    <label className="block text-[9px] text-slate-500 uppercase font-mono">Nama Atlet</label>
                    <input 
                      type="text" 
                      value={state.atletBiru.nama}
                      onChange={(e) => handleUpdateAthlete('biru', 'nama', e.target.value)}
                      className="w-full text-xs bg-slate-900/80 border border-slate-800 px-2 py-1.5 rounded-md focus:border-blue-500 outline-none font-bold mt-0.5 text-white"
                      placeholder="Nama Lengkap"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 uppercase font-mono">Kontingen / Pengda</label>
                    <input 
                      type="text" 
                      value={state.atletBiru.kontingen}
                      onChange={(e) => handleUpdateAthlete('biru', 'kontingen', e.target.value)}
                      className="w-full text-xs bg-slate-900/80 border border-slate-800 px-2 py-1.5 rounded-md focus:border-blue-500 outline-none font-bold mt-0.5 text-white"
                      placeholder="Kontingen"
                    />
                  </div>
                </div>
              </div>

              {/* SUDUT MERAH FIELD CONFIG */}
              <div className="bg-gradient-to-b from-red-950/20 to-slate-900/55 p-3 rounded-lg border border-red-900/40">
                <span className="text-[9px] font-black uppercase text-red-500 tracking-wider">REGISTRASI SUDUT MERAH</span>
                <div className="mt-2.5 flex flex-col gap-1.5">
                  <div>
                    <label className="block text-[9px] text-slate-500 uppercase font-mono">Nama Atlet</label>
                    <input 
                      type="text" 
                      value={state.atletMerah.nama}
                      onChange={(e) => handleUpdateAthlete('merah', 'nama', e.target.value)}
                      className="w-full text-xs bg-slate-900/80 border border-slate-800 px-2 py-1.5 rounded-md focus:border-red-500 outline-none font-bold mt-0.5 text-white"
                      placeholder="Nama Lengkap"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 uppercase font-mono">Kontingen / Pengda</label>
                    <input 
                      type="text" 
                      value={state.atletMerah.kontingen}
                      onChange={(e) => handleUpdateAthlete('merah', 'kontingen', e.target.value)}
                      className="w-full text-xs bg-slate-900/80 border border-slate-800 px-2 py-1.5 rounded-md focus:border-red-500 outline-none font-bold mt-0.5 text-white"
                      placeholder="Kontingen"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Mass CSV roster setup panel */}
            <div className="bg-slate-900/30 p-3 rounded-lg border border-slate-800/70 flex flex-col justify-between">
              <div>
                <h5 className="text-[10px] font-black uppercase text-slate-300 tracking-wider">Import Roster Atlit Secara Massal</h5>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Upload file roster CSV untuk dengan mudah mengonfigurasi rincian partai dan nama atlet sekaligus secara cepat.
                </p>
              </div>

              <div className="flex gap-2.5 mt-2.5">
                <button
                  onClick={downloadTemplateCSV}
                  className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 cursor-pointer text-xs font-bold uppercase rounded-lg text-slate-300 flex items-center justify-center gap-1.5 transition-all w-full"
                >
                  <Download className="w-3.5 h-3.5" />
                  Template CSV
                </button>

                <label className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 cursor-pointer text-xs font-bold uppercase rounded-lg text-slate-300 flex items-center justify-center gap-1.5 transition-all text-center w-full">
                  <Upload className="w-3.5 h-3.5 text-emerald-450" />
                  Upload CSV
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleImportCSV}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Match History management */}
            <div className="bg-slate-950/20 p-2 rounded-lg border border-slate-900 max-h-[7rem] overflow-y-auto">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wide font-mono">PERSISTED HISTORY LOGS ({histories.length})</span>
                {histories.length > 0 && (
                  <button 
                    onClick={clearMatchHistoriesList}
                    className="p-1 text-[9px] font-bold text-red-500 hover:text-red-400 flex items-center gap-1 bg-red-950/20 rounded cursor-pointer border border-red-900/30 font-mono text-[9px]"
                  >
                    <Trash2 className="w-3 h-3" /> Hapus History
                  </button>
                )}
              </div>
              
              {histories.length === 0 ? (
                <div className="text-center text-[10px] py-3 text-slate-600 font-mono italic">Tidak ada pertarungan yang terekam.</div>
              ) : (
                <div className="flex flex-col gap-1">
                  {histories.map((h, i) => (
                    <div key={h.id} className="text-[10px] font-mono flex justify-between bg-slate-900/40 px-2 py-1 rounded border border-slate-850">
                      <span>P{h.partai} - {h.kelas} - {h.gender}</span>
                      <span className="text-slate-455">{h.atletMerah.nama} ({h.skorAkhirMerah}) vs {h.atletBiru.nama} ({h.skorAkhirBiru})</span>
                      <span className="font-bold text-emerald-450">PEMENANG: {h.winner === 'merah' ? 'MERAH' : h.winner === 'biru' ? 'BIRU' : 'SERI'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Core Action Button: Mulai Pertandingan */}
            <button
              onClick={startMatchGame}
              className="w-full cursor-pointer py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 font-black tracking-widest text-white text-xs uppercase rounded-xl shadow-lg shadow-emerald-950/30 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
            >
              <Power className="w-4 h-4" />
              Mulai Pertandingan (Luncurkan Engine)
            </button>
          </div>

        </div>
      ) : activeTab === 'control' ? (
        
        /* MATCH CONTROL PANEL ACTIVE DASHBOARD */
        <div className="grid grid-cols-12 gap-3 flex-1 my-2 min-h-0">
          
          {/* LEFT COLUMN: Controls, Round selectors, timers (Col 7) */}
          <div className="col-span-7 flex flex-col justify-between bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 min-h-0">
            
            {/* Timer Giant Display Board */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center relative overflow-hidden shadow-inner">
              <span className="text-[9px] font-black text-slate-500 uppercase font-mono tracking-widest">DIGITAL SHOCK TIMER</span>
              
              <div className="text-[4.5rem] leading-none font-black text-transparent bg-clip-text bg-gradient-to-b from-teal-400 to-cyan-305 font-mono my-2 tracking-wide filter drop-shadow">
                {formatTimer(state.timerSeconds)}
              </div>

              {/* Status flag */}
              <div className="inline-flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-full text-[10px] font-mono border border-slate-800 text-slate-300">
                <span className={`w-2 h-2 rounded-full ${state.timerActive ? 'bg-green-500 animate-ping' : 'bg-amber-500'}`} />
                <span className="font-bold uppercase">{state.matchStatus}</span>
              </div>
            </div>

            {/* Main Action Controllers: Play, Pause, Reset */}
            <div className="flex gap-3 my-3">
              <button
                onClick={toggleTimer}
                className={`flex-1 py-3 cursor-pointer rounded-xl font-bold text-xs uppercase tracking-widest text-white flex items-center justify-center gap-2 transition-all shadow ${
                  state.timerActive 
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-950/30' 
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-950/30'
                }`}
              >
                <Play className={`w-4 h-4 ${state.timerActive ? 'hidden' : 'block'}`} />
                <span className="text-white font-extrabold">{state.timerActive ? 'Jeda Pertandingan (PAUSE)' : 'JALANKAN WAKTU (PLAY)'}</span>
              </button>

              <button
                onClick={resetTimer}
                className="px-6 py-3 cursor-pointer bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-center gap-1.5"
                title="Reset timer ke durasi awal"
              >
                <RotateCcw className="w-4 h-4 text-slate-400" />
                Reset
              </button>
            </div>

            {/* Official Tournament Round selectors */}
            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <span className="block text-[10px] text-slate-500 font-mono uppercase font-black tracking-widest mb-2.5">AKTIFKAN BABAK PERTANDINGAN</span>
              
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleSelectRound(num as any)}
                    className={`py-2 px-4 cursor-pointer text-xs font-black rounded-lg transition-all border ${
                      state.currentBabak === num 
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 border-emerald-450 text-white shadow-lg' 
                        : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-400'
                    }`}
                  >
                    BABAK {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Extended Match & Score Control Panel */}
            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 mt-3 flex flex-col gap-2.5 text-left">
              <span className="block text-[10px] text-emerald-400 font-mono uppercase font-black tracking-widest">KONTROL PARTAI & KOREKSI SEBAGAI SEKRETARIS</span>
              
              {/* Row 1: Quick Navigation for Partai Number */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-900 pb-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Navigasi Partai:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => { playBeep('click'); dispatch('SEKRETARIS_ADJUST_PARTAI', { offset: -1 }); }}
                    className="px-2.5 py-1 text-[10px] font-black uppercase bg-slate-900 border border-slate-800 text-slate-305 hover:bg-slate-800 rounded-md cursor-pointer transition-all"
                  >
                    ← P -1
                  </button>
                  <span className="text-xs font-mono font-black text-amber-400 px-1.5 self-center">P{state.partai}</span>
                  <button
                    onClick={() => { playBeep('click'); dispatch('SEKRETARIS_ADJUST_PARTAI', { offset: 1 }); }}
                    className="px-2.5 py-1 text-[10px] font-black uppercase bg-slate-900 border border-slate-800 text-slate-305 hover:bg-slate-800 rounded-md cursor-pointer transition-all"
                  >
                    P +1 →
                  </button>
                </div>
              </div>

              {/* Row 2: Manual Score Correction Offset */}
              <div className="grid grid-cols-2 gap-3 border-b border-slate-900 pb-2">
                {/* Blue Side Adjustment */}
                <div className="flex flex-col gap-1 text-left">
                  <span className="text-[8px] font-black uppercase text-cyan-405">Koreksi Skor Biru:</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => { playBeep('warning'); dispatch('SEKRETARIS_ADJUST_SCORE', { sudut: 'biru', amount: -1 }); }}
                      className="flex-1 py-1 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 text-rose-450 text-[10px] font-black rounded-md cursor-pointer"
                    >
                      -1
                    </button>
                    <button
                      onClick={() => { playBeep('valid'); dispatch('SEKRETARIS_ADJUST_SCORE', { sudut: 'biru', amount: 1 }); }}
                      className="flex-1 py-1 bg-cyan-950/20 hover:bg-cyan-950/40 border border-cyan-900/30 text-cyan-405 text-[10px] font-black rounded-md cursor-pointer"
                    >
                      +1
                    </button>
                  </div>
                </div>

                {/* Red Side Adjustment */}
                <div className="flex flex-col gap-1 text-left">
                  <span className="text-[8px] font-black uppercase text-red-500">Koreksi Skor Merah:</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => { playBeep('warning'); dispatch('SEKRETARIS_ADJUST_SCORE', { sudut: 'merah', amount: -1 }); }}
                      className="flex-1 py-1 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 text-rose-455 text-[10px] font-black rounded-md cursor-pointer"
                    >
                      -1
                    </button>
                    <button
                      onClick={() => { playBeep('valid'); dispatch('SEKRETARIS_ADJUST_SCORE', { sudut: 'merah', amount: 1 }); }}
                      className="flex-1 py-1 bg-red-955/20 hover:bg-red-955/40 border border-red-900/30 text-red-400 text-[10px] font-black rounded-md cursor-pointer"
                    >
                      +1
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 3: Declare Direct Decision UD */}
              <div className="flex flex-col gap-1 text-left">
                <span className="text-[8px] font-black uppercase text-slate-400 block">Sahkan Keputusan Partai (Direct Win / UD):</span>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    onClick={() => {
                      if (confirm(`Sahkan Kemenangan UD (Undur Diri) untuk Sudut MERAH?`)) {
                        playBeep('valid');
                        dispatch('SEKRETARIS_DECLARE_WINNER', { winner: 'merah' });
                      }
                    }}
                    className="py-1 bg-red-955/30 hover:bg-red-900/40 border border-red-900/50 text-red-400 text-[9px] md:text-[10px] font-black uppercase rounded-md cursor-pointer transition-all"
                  >
                    Menang UD MERAH
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Sahkan Kemenangan UD (Undur Diri) untuk Sudut BIRU?`)) {
                        playBeep('valid');
                        dispatch('SEKRETARIS_DECLARE_WINNER', { winner: 'biru' });
                      }
                    }}
                    className="py-1 bg-blue-955/30 hover:bg-blue-900/40 border border-blue-900/50 text-blue-400 text-[9px] md:text-[10px] font-black uppercase rounded-md cursor-pointer transition-all"
                  >
                    Menang UD BIRU
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Active profiles, Score summary (Col 5) */}
          <div className="col-span-5 flex flex-col justify-between bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 min-h-0">
            
            {/* Active profile headers summary cards */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest font-mono">Laporan Atlet Aktif</span>
              
              {/* Blue corner info */}
              <div className="bg-gradient-to-r from-blue-950/20 to-slate-900/55 p-2.5 rounded border border-blue-900/40 flex justify-between items-center shadow-md">
                <div className="truncate max-w-[12rem]">
                  <span className="text-[8px] font-black uppercase text-cyan-405">SUDUT BIRU</span>
                  <div className="text-xs font-black text-white uppercase truncate">{state.atletBiru.nama}</div>
                  <div className="text-[10px] text-blue-400 font-mono truncate">{state.atletBiru.kontingen}</div>
                </div>
                <div className="text-xl font-mono text-cyan-405 font-black">{state.scores.biru.total}</div>
              </div>

              {/* Red corner info */}
              <div className="bg-gradient-to-r from-red-950/20 to-slate-900/55 p-2.5 rounded border border-red-900/40 flex justify-between items-center shadow-md">
                <div className="truncate max-w-[12rem]">
                  <span className="text-[8px] font-black uppercase text-red-500">SUDUT MERAH</span>
                  <div className="text-xs font-black text-white uppercase truncate">{state.atletMerah.nama}</div>
                  <div className="text-[10px] text-red-400 font-mono truncate">{state.atletMerah.kontingen}</div>
                </div>
                <div className="text-xl font-mono text-red-500 font-black">{state.scores.merah.total}</div>
              </div>
            </div>

            {/* PARTAI SELANJUTNYA (NEXT MATCH) */}
            {nextMatchInfo && (
              <div className={`mt-3 p-3 rounded-xl border ${
                theme === 'dark' 
                  ? 'bg-slate-950/60 border-slate-900/60' 
                  : 'bg-white border-slate-200'
              } shadow-sm`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 font-mono flex items-center gap-1">
                    <span>⏭️</span> Partai Selanjutnya
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    theme === 'dark' ? 'bg-slate-900 text-slate-300 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}>
                    {nextMatchInfo.match.partai}
                  </span>
                </div>

                <div className={`text-[11px] font-black truncate mb-2 uppercase ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  {nextMatchInfo.category.name}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  {/* Sudut Merah */}
                  <div className={`border rounded p-1.5 truncate text-left ${
                    theme === 'dark' ? 'bg-red-950/15 border-red-900/30' : 'bg-red-50/50 border-red-200/50'
                  }`}>
                    <span className="text-[8px] font-black uppercase text-red-500 block">MERAH</span>
                    <div className={`font-extrabold truncate ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                      {nextMatchInfo.match.atletMerah.nama || '................'}
                    </div>
                    <div className={`text-[9px] truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      {nextMatchInfo.match.atletMerah.kontingen || '................'}
                    </div>
                  </div>

                  {/* Sudut Biru */}
                  <div className={`border rounded p-1.5 truncate text-left ${
                    theme === 'dark' ? 'bg-blue-950/15 border-blue-900/30' : 'bg-blue-50/50 border-blue-200/50'
                  }`}>
                    <span className="text-[8px] font-black uppercase text-cyan-505 block">BIRU</span>
                    <div className={`font-extrabold truncate ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                      {nextMatchInfo.match.atletBiru.nama || '................'}
                    </div>
                    <div className={`text-[9px] truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      {nextMatchInfo.match.atletBiru.kontingen || '................'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    playBeep('valid');
                    const cleanKelas = nextMatchInfo.category.name.replace(/\s*\(.*\)/, '');
                    await dispatch('LOAD_BAGAN_MATCH', {
                      namaEvent: state.namaEvent || "Kejuaraan Pencak Silat",
                      partai: nextMatchInfo.match.partai.replace(/Partai\s+/i, ''),
                      kelas: cleanKelas,
                      gender: nextMatchInfo.category.gender,
                      selectedWaktu: state.selectedWaktu || 120,
                      activeBaganCategoryId: nextMatchInfo.category.id,
                      activeBaganMatchId: nextMatchInfo.match.id,
                      atletMerah: {
                        nama: nextMatchInfo.match.atletMerah.nama || "Sudut Merah",
                        kontingen: nextMatchInfo.match.atletMerah.kontingen || "SUDUT MERAH"
                      },
                      atletBiru: {
                        nama: nextMatchInfo.match.atletBiru.nama || "Sudut Biru",
                        kontingen: nextMatchInfo.match.atletBiru.kontingen || "SUDUT BIRU"
                      }
                    });
                  }}
                  className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-550 text-white font-extrabold uppercase text-[10px] rounded-lg tracking-wider transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer border-0"
                >
                  <Play className="w-3 h-3" />
                  Muat Partai Selanjutnya
                </button>
              </div>
            )}

            {/* Complete downloadable logs history database */}
            <div className="mt-4 border-t border-slate-800 pt-3 flex flex-col gap-2">
              <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest font-mono block">Dokumen Resmi Hasil Pertandingan</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleExportCSV}
                  className="py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-350 font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Ekspor CSV
                </button>
                <button
                  onClick={handleExportPDF}
                  className="py-2 bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-900/60 rounded-lg text-emerald-400 font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Cetak PDF
                </button>
              </div>
            </div>

            {/* Back to roster option */}
            <button
              onClick={resetOrNextPartai}
              className="mt-3 py-2 bg-red-950/30 hover:bg-red-900/40 cursor-pointer text-red-400 border border-red-955 rounded-lg text-xs font-bold uppercase transition-transform active:scale-[0.98] text-center"
            >
              Reset/Selesaikan Pertandingan Ini
            </button>
          </div>

        </div>
      ) : activeTab === 'all' ? (
        
        /* COMBINED MODE (ALL) - BOTH ATHLETE REGISTRATION & MATCH CONTROL TOGETHER */
        <div className="grid grid-cols-12 gap-3 flex-1 my-2 min-h-0 overflow-y-auto">
          
          {/* LEFT COLUMN: Match Control dashboard (Col 5) */}
          <div className="col-span-12 lg:col-span-5 flex flex-col gap-3 min-h-0">
            
            {/* Giant Timer Section */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center relative overflow-hidden shadow-inner">
              <span className="text-[9px] font-black text-slate-500 uppercase font-mono tracking-widest">DIGITAL SHOCK TIMER</span>
              
              <div className="text-[4rem] leading-none font-black text-transparent bg-clip-text bg-gradient-to-b from-teal-405 to-cyan-305 font-mono my-1 tracking-wide filter drop-shadow">
                {formatTimer(state.timerSeconds)}
              </div>

              {/* Status indicator */}
              <div className="inline-flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-full text-[10px] font-mono border border-slate-800 text-slate-305">
                <span className={`w-2 h-2 rounded-full ${state.timerActive ? 'bg-green-500 animate-ping' : 'bg-amber-500'}`} />
                <span className="font-bold uppercase">{state.matchStatus}</span>
              </div>
            </div>

            {/* Play, Pause, and Reset Controls */}
            <div className="flex gap-2">
              <button
                onClick={toggleTimer}
                className={`flex-1 py-2.5 cursor-pointer rounded-xl font-bold text-xs uppercase tracking-wider text-white flex items-center justify-center gap-1.5 transition-all shadow ${
                  state.timerActive 
                    ? 'bg-amber-600 hover:bg-amber-505 shadow-md shadow-amber-955/20' 
                    : 'bg-emerald-600 hover:bg-emerald-505 shadow-md shadow-emerald-955/20'
                }`}
              >
                <Play className={`w-3.5 h-3.5 ${state.timerActive ? 'hidden' : 'block'}`} />
                <span className="text-white font-extrabold text-[10px] md:text-xs">
                  {state.timerActive ? 'JEDA PERTANDINGAN' : 'MULAI PERTANDINGAN'}
                </span>
              </button>

              <button
                onClick={resetTimer}
                className="px-4 py-2.5 cursor-pointer bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-center gap-1"
                title="Reset timer ke durasi awal"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                Reset
              </button>
            </div>

            {/* Official Active Round selectors */}
            <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-805">
              <span className="block text-[9px] font-mono uppercase font-black text-slate-400 tracking-widest mb-2">PILIH BABAK AKTIF</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[1, 2, 3].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleSelectRound(num as any)}
                    className={`py-1.5 px-3 cursor-pointer text-xs font-black rounded-lg transition-all border ${
                      state.currentBabak === num 
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 border-emerald-450 text-white shadow-md' 
                        : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-400'
                    }`}
                  >
                    BABAK {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Athlete Scores & profiles recap */}
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest font-mono">Laporan Atlet & Skor</span>
              
              {/* Sudut Biru live info */}
              <div className="bg-gradient-to-r from-blue-950/20 via-slate-905 to-slate-905 p-2 rounded border border-blue-900/30 flex justify-between items-center shadow-sm">
                <div className="truncate max-w-[12rem]">
                  <span className="text-[7.5px] font-black uppercase text-cyan-405">SUDUT BIRU</span>
                  <div className="text-xs font-black text-white uppercase truncate">{state.atletBiru.nama}</div>
                  <div className="text-[9px] text-blue-400 font-mono truncate">{state.atletBiru.kontingen}</div>
                </div>
                <div className="text-lg font-mono text-cyan-405 font-black">{state.scores.biru.total}</div>
              </div>

              {/* Sudut Merah live info */}
              <div className="bg-gradient-to-r from-red-950/20 via-slate-905 to-slate-905 p-2 rounded border border-red-900/30 flex justify-between items-center shadow-sm">
                <div className="truncate max-w-[12rem]">
                  <span className="text-[7.5px] font-black uppercase text-red-500">SUDUT MERAH</span>
                  <div className="text-xs font-black text-white uppercase truncate">{state.atletMerah.nama}</div>
                  <div className="text-[9px] text-red-400 font-mono truncate">{state.atletMerah.kontingen}</div>
                </div>
                <div className="text-lg font-mono text-red-505 font-black">{state.scores.merah.total}</div>
              </div>
            </div>

            {/* PARTAI SELANJUTNYA (NEXT MATCH) */}
            {nextMatchInfo && (
              <div className={`p-3 rounded-xl border ${
                theme === 'dark' 
                  ? 'bg-slate-950/60 border-slate-900/60' 
                  : 'bg-white border-slate-200'
              } shadow-sm`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 font-mono flex items-center gap-1">
                    <span>⏭️</span> Partai Selanjutnya
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    theme === 'dark' ? 'bg-slate-900 text-slate-300 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}>
                    {nextMatchInfo.match.partai}
                  </span>
                </div>

                <div className={`text-[11px] font-black truncate mb-2 uppercase text-left ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  {nextMatchInfo.category.name}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  {/* Sudut Merah */}
                  <div className={`border rounded p-1.5 truncate text-left ${
                    theme === 'dark' ? 'bg-red-950/15 border-red-900/30' : 'bg-red-50/50 border-red-200/50'
                  }`}>
                    <span className="text-[8px] font-black uppercase text-red-500 block">MERAH</span>
                    <div className={`font-extrabold truncate ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                      {nextMatchInfo.match.atletMerah.nama || '................'}
                    </div>
                    <div className={`text-[9px] truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      {nextMatchInfo.match.atletMerah.kontingen || '................'}
                    </div>
                  </div>

                  {/* Sudut Biru */}
                  <div className={`border rounded p-1.5 truncate text-left ${
                    theme === 'dark' ? 'bg-blue-950/15 border-blue-900/30' : 'bg-blue-50/50 border-blue-200/50'
                  }`}>
                    <span className="text-[8px] font-black uppercase text-cyan-505 block">BIRU</span>
                    <div className={`font-extrabold truncate ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                      {nextMatchInfo.match.atletBiru.nama || '................'}
                    </div>
                    <div className={`text-[9px] truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      {nextMatchInfo.match.atletBiru.kontingen || '................'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    playBeep('valid');
                    const cleanKelas = nextMatchInfo.category.name.replace(/\s*\(.*\)/, '');
                    await dispatch('LOAD_BAGAN_MATCH', {
                      namaEvent: state.namaEvent || "Kejuaraan Pencak Silat",
                      partai: nextMatchInfo.match.partai.replace(/Partai\s+/i, ''),
                      kelas: cleanKelas,
                      gender: nextMatchInfo.category.gender,
                      selectedWaktu: state.selectedWaktu || 120,
                      activeBaganCategoryId: nextMatchInfo.category.id,
                      activeBaganMatchId: nextMatchInfo.match.id,
                      atletMerah: {
                        nama: nextMatchInfo.match.atletMerah.nama || "Sudut Merah",
                        kontingen: nextMatchInfo.match.atletMerah.kontingen || "SUDUT MERAH"
                      },
                      atletBiru: {
                        nama: nextMatchInfo.match.atletBiru.nama || "Sudut Biru",
                        kontingen: nextMatchInfo.match.atletBiru.kontingen || "SUDUT BIRU"
                      }
                    });
                  }}
                  className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-550 text-white font-extrabold uppercase text-[10px] rounded-lg tracking-wider transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer border-0"
                >
                  <Play className="w-3 h-3" />
                  Muat Partai Selanjutnya
                </button>
              </div>
            )}

            {/* Extended Match & Score Control Panel */}
            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 mt-2.5 flex flex-col gap-2.5 text-left">
              <span className="block text-[10px] text-emerald-400 font-mono uppercase font-black tracking-widest">KONTROL PARTAI & KOREKSI SEBAGAI SEKRETARIS</span>
              
              {/* Row 1: Quick Navigation for Partai Number */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-900 pb-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Navigasi Partai:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => { playBeep('click'); dispatch('SEKRETARIS_ADJUST_PARTAI', { offset: -1 }); }}
                    className="px-2.5 py-1 text-[10px] font-black uppercase bg-slate-900 border border-slate-800 text-slate-305 hover:bg-slate-800 rounded-md cursor-pointer transition-all"
                  >
                    ← P -1
                  </button>
                  <span className="text-xs font-mono font-black text-amber-400 px-1.5 self-center">P{state.partai}</span>
                  <button
                    onClick={() => { playBeep('click'); dispatch('SEKRETARIS_ADJUST_PARTAI', { offset: 1 }); }}
                    className="px-2.5 py-1 text-[10px] font-black uppercase bg-slate-900 border border-slate-800 text-slate-305 hover:bg-slate-800 rounded-md cursor-pointer transition-all"
                  >
                    P +1 →
                  </button>
                </div>
              </div>

              {/* Row 2: Manual Score Correction Offset */}
              <div className="grid grid-cols-2 gap-3 border-b border-slate-900 pb-2">
                {/* Blue Side Adjustment */}
                <div className="flex flex-col gap-1 text-left">
                  <span className="text-[8px] font-black uppercase text-cyan-405">Koreksi Skor Biru:</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => { playBeep('warning'); dispatch('SEKRETARIS_ADJUST_SCORE', { sudut: 'biru', amount: -1 }); }}
                      className="flex-1 py-1 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 text-rose-450 text-[10px] font-black rounded-md cursor-pointer"
                    >
                      -1
                    </button>
                    <button
                      onClick={() => { playBeep('valid'); dispatch('SEKRETARIS_ADJUST_SCORE', { sudut: 'biru', amount: 1 }); }}
                      className="flex-1 py-1 bg-cyan-950/20 hover:bg-cyan-950/40 border border-cyan-900/30 text-cyan-405 text-[10px] font-black rounded-md cursor-pointer"
                    >
                      +1
                    </button>
                  </div>
                </div>

                {/* Red Side Adjustment */}
                <div className="flex flex-col gap-1 text-left">
                  <span className="text-[8px] font-black uppercase text-red-500">Koreksi Skor Merah:</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => { playBeep('warning'); dispatch('SEKRETARIS_ADJUST_SCORE', { sudut: 'merah', amount: -1 }); }}
                      className="flex-1 py-1 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 text-rose-455 text-[10px] font-black rounded-md cursor-pointer"
                    >
                      -1
                    </button>
                    <button
                      onClick={() => { playBeep('valid'); dispatch('SEKRETARIS_ADJUST_SCORE', { sudut: 'merah', amount: 1 }); }}
                      className="flex-1 py-1 bg-red-955/20 hover:bg-red-955/40 border border-red-900/30 text-red-400 text-[10px] font-black rounded-md cursor-pointer"
                    >
                      +1
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 3: Declare Direct Decision UD */}
              <div className="flex flex-col gap-1 text-left">
                <span className="text-[8px] font-black uppercase text-slate-400 block">Sahkan Keputusan Partai (Direct Win / UD):</span>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    onClick={() => {
                      if (confirm(`Sahkan Kemenangan UD (Undur Diri) untuk Sudut MERAH?`)) {
                        playBeep('valid');
                        dispatch('SEKRETARIS_DECLARE_WINNER', { winner: 'merah' });
                      }
                    }}
                    className="py-1 bg-red-955/30 hover:bg-red-900/40 border border-red-900/50 text-red-400 text-[9px] md:text-[10px] font-black uppercase rounded-md cursor-pointer transition-all"
                  >
                    Menang UD MERAH
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Sahkan Kemenangan UD (Undur Diri) untuk Sudut BIRU?`)) {
                        playBeep('valid');
                        dispatch('SEKRETARIS_DECLARE_WINNER', { winner: 'biru' });
                      }
                    }}
                    className="py-1 bg-blue-955/30 hover:bg-blue-900/40 border border-blue-900/50 text-blue-400 text-[9px] md:text-[10px] font-black uppercase rounded-md cursor-pointer transition-all"
                  >
                    Menang UD BIRU
                  </button>
                </div>
              </div>
            </div>

            {/* Complete action: Next partido or reset */}
            <button
              onClick={resetOrNextPartai}
              className="mt-1 py-2 bg-red-950/20 hover:bg-red-900/30 cursor-pointer text-red-400 border border-red-900/40 rounded-lg text-xs font-bold uppercase transition-all text-center"
            >
              Reset/Selesaikan Pertandingan Ini
            </button>
          </div>

          {/* RIGHT COLUMN: Athlete Registration & Configuration metadata (Col 7) */}
          <div className="col-span-12 lg:col-span-7 flex flex-col gap-3 min-h-0 bg-slate-900/20 p-3 rounded-lg border border-slate-900">
            <h4 className="text-[11px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
              <span>●</span> Registrasi Atlet & Data Partai
            </h4>

            {/* Athlete detail configuration cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* SUDUT BIRU FIELD CONFIG */}
              <div className="bg-gradient-to-b from-blue-950/10 to-slate-900/40 p-2.5 rounded-lg border border-blue-900/15">
                <span className="text-[9px] font-black uppercase text-cyan-405 tracking-wider font-mono">REGISTRASI SUDUT BIRU</span>
                <div className="mt-1.5 flex flex-col gap-1.5">
                  <div>
                    <label className="block text-[8px] text-slate-500 uppercase font-mono">Nama Atlet</label>
                    <input 
                      type="text" 
                      value={state.atletBiru.nama}
                      onChange={(e) => handleUpdateAthlete('biru', 'nama', e.target.value)}
                      className="w-full text-xs bg-slate-900/80 border border-slate-800 px-2 py-1 rounded-md focus:border-blue-500 outline-none font-bold text-white"
                      placeholder="Nama Lengkap"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] text-slate-500 uppercase font-mono">Kontingen / Pengda</label>
                    <input 
                      type="text" 
                      value={state.atletBiru.kontingen}
                      onChange={(e) => handleUpdateAthlete('biru', 'kontingen', e.target.value)}
                      className="w-full text-xs bg-slate-900/80 border border-slate-800 px-2 py-1 rounded-md focus:border-blue-500 outline-none font-bold text-white"
                      placeholder="Kontingen"
                    />
                  </div>
                </div>
              </div>

              {/* SUDUT MERAH FIELD CONFIG */}
              <div className="bg-gradient-to-b from-red-950/10 to-slate-900/40 p-2.5 rounded-lg border border-red-900/15">
                <span className="text-[9px] font-black uppercase text-red-500 tracking-wider font-mono">REGISTRASI SUDUT MERAH</span>
                <div className="mt-1.5 flex flex-col gap-1.5">
                  <div>
                    <label className="block text-[8px] text-slate-500 uppercase font-mono">Nama Atlet</label>
                    <input 
                      type="text" 
                      value={state.atletMerah.nama}
                      onChange={(e) => handleUpdateAthlete('merah', 'nama', e.target.value)}
                      className="w-full text-xs bg-slate-900/80 border border-slate-800 px-2 py-1 rounded-md focus:border-red-500 outline-none font-bold text-white"
                      placeholder="Nama Lengkap"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] text-slate-500 uppercase font-mono">Kontingen / Pengda</label>
                    <input 
                      type="text" 
                      value={state.atletMerah.kontingen}
                      onChange={(e) => handleUpdateAthlete('merah', 'kontingen', e.target.value)}
                      className="w-full text-xs bg-slate-900/80 border border-slate-800 px-2 py-1 rounded-md focus:border-red-500 outline-none font-bold text-white"
                      placeholder="Kontingen"
                    />
                  </div>
                </div>
              </div>
            </div>

            {scheduledList.length > 0 && (
              <div className="bg-slate-950/25 p-2 rounded-lg border border-emerald-950/40">
                <label className="block text-[9px] text-emerald-450 font-mono uppercase font-bold mb-0.5">📅 PILIH DARI JADWAL PERTANDINGAN</label>
                <select
                  value={scheduledList.find(x => x.num === parseInt(state.partai.replace(/\D/g, ''), 10))?.uniqueId || ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleSelectScheduledMatch(e.target.value);
                    }
                  }}
                  className="w-full text-xs bg-slate-950 border border-emerald-900/40 focus:border-emerald-500 px-2 py-1.5 rounded-md outline-none text-emerald-400 font-bold font-mono"
                >
                  <option value="" className="text-slate-500 bg-slate-950">-- Pilih Partai Terjadwal --</option>
                  {scheduledList.map(item => (
                    <option key={item.uniqueId} value={item.uniqueId} className="text-slate-300 bg-slate-950">
                      P{item.num.toString().padStart(2, '0')} - {item.categoryName.replace(/\s*\(.*\)/, '')} ({item.match.atletMerah.nama || 'TBD'} vs {item.match.atletBiru.nama || 'TBD'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Core Match Metadata fields */}
            <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60 grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-[8px] text-slate-505 font-mono uppercase font-bold mb-0.5">Nama Event</label>
                <input 
                  type="text" 
                  value={state.namaEvent}
                  onChange={(e) => handleUpdateInfo({ namaEvent: e.target.value })}
                  className="w-full text-xs bg-slate-900 border border-slate-800 focus:border-emerald-500 px-2 py-1 rounded-md outline-none text-white font-bold"
                />
              </div>
              <div>
                <label className="block text-[8px] text-slate-505 font-mono uppercase font-bold mb-0.5">Partai No</label>
                <input 
                  type="text"
                  value={state.partai}
                  onChange={(e) => handleUpdateInfo({ partai: e.target.value })}
                  className="w-full text-xs bg-slate-900 border border-slate-800 focus:border-emerald-500 px-2 py-1 rounded-md outline-none text-white font-bold font-mono"
                />
              </div>
              <div>
                <label className="block text-[8px] text-slate-505 font-mono uppercase font-bold mb-0.5">Kelas/Nomor</label>
                <input 
                  type="text"
                  value={state.kelas}
                  onChange={(e) => handleUpdateInfo({ kelas: e.target.value })}
                  className="w-full text-xs bg-slate-900 border border-slate-800 focus:border-emerald-500 px-2 py-1 rounded-md outline-none text-white font-bold"
                />
              </div>
              <div>
                <label className="block text-[8px] text-slate-505 font-mono uppercase font-bold mb-0.5">Gender</label>
                <div className="grid grid-cols-2 gap-0.5 bg-slate-950 p-0.5 border border-slate-800 rounded-md">
                  <button
                    type="button"
                    onClick={() => { playBeep('click'); handleUpdateInfo({ gender: 'Putra' }); }}
                    className={`py-0.5 cursor-pointer rounded font-black text-[10px] uppercase ${state.gender === 'Putra' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    PA
                  </button>
                  <button
                    type="button"
                    onClick={() => { playBeep('click'); handleUpdateInfo({ gender: 'Putri' }); }}
                    className={`py-0.5 cursor-pointer rounded font-black text-[10px] uppercase ${state.gender === 'Putri' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    PI
                  </button>
                </div>
              </div>
            </div>

            {/* Custom Input Durasi Babak & Logo upload row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {/* Stepper block */}
              <div className="bg-slate-950/30 p-2 rounded-lg border border-slate-800/50 flex flex-col justify-center">
                <label className="block text-[8px] text-slate-400 font-mono uppercase font-bold mb-1">
                  Durasi Waktu Babak
                </label>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 flex gap-1 items-center bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        playBeep('click');
                        const curM = Math.floor(state.selectedWaktu / 60);
                        const curS = state.selectedWaktu % 60;
                        const newM = Math.max(0, curM - 1);
                        handleUpdateInfo({ selectedWaktu: newM * 60 + curS });
                      }}
                      className="px-1 text-xs font-black text-slate-400 hover:text-white"
                    >
                      -
                    </button>
                    <span className="flex-1 text-center font-bold text-xs font-mono">{Math.floor(state.selectedWaktu / 60)}m</span>
                    <button
                      type="button"
                      onClick={() => {
                        playBeep('click');
                        const curM = Math.floor(state.selectedWaktu / 60);
                        const curS = state.selectedWaktu % 60;
                        const newM = curM + 1;
                        handleUpdateInfo({ selectedWaktu: newM * 60 + curS });
                      }}
                      className="px-1 text-xs font-black text-slate-400 hover:text-white"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex-1 flex gap-1 items-center bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 font-mono">
                    <button
                      type="button"
                      onClick={() => {
                        playBeep('click');
                        const curM = Math.floor(state.selectedWaktu / 60);
                        const curS = state.selectedWaktu % 60;
                        const newS = (curS - 5 + 60) % 60;
                        handleUpdateInfo({ selectedWaktu: curM * 60 + newS });
                      }}
                      className="px-1 text-xs font-black text-slate-400 hover:text-white"
                    >
                      -
                    </button>
                    <span className="flex-1 text-center font-bold text-xs font-mono">{state.selectedWaktu % 60}s</span>
                    <button
                      type="button"
                      onClick={() => {
                        playBeep('click');
                        const curM = Math.floor(state.selectedWaktu / 60);
                        const curS = state.selectedWaktu % 60;
                        const newS = (curS + 5) % 60;
                        handleUpdateInfo({ selectedWaktu: curM * 60 + newS });
                      }}
                      className="px-1 text-xs font-black text-slate-400 hover:text-white"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Logo Uploads */}
              <div className="bg-slate-950/30 p-2 rounded-lg border border-slate-800/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="block text-[8px] text-slate-500 font-mono uppercase font-bold">Logo Event</span>
                  {(state.logoKiri || state.logoKanan || state.logoTengah) && (
                    <button
                      type="button"
                      onClick={() => {
                        playBeep('warning');
                        dispatch('UPLOAD_LOGOS', { logoKiri: null, logoKanan: null, logoTengah: null });
                      }}
                      className="text-[8px] text-red-500 hover:text-red-400 font-bold uppercase transition-all"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => { playBeep('click'); fileInputKiriRef.current?.click(); }}
                    className={`py-1 cursor-pointer hover:bg-slate-800 border text-[8px] uppercase font-bold rounded flex items-center justify-center gap-1 transition-all ${
                      state.logoKiri ? 'bg-cyan-950/20 border-cyan-800 text-cyan-405' : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span>L-Kiri</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { playBeep('click'); fileInputTengahRef.current?.click(); }}
                    className={`py-1 cursor-pointer hover:bg-slate-800 border text-[8px] uppercase font-bold rounded flex items-center justify-center gap-1 transition-all ${
                      state.logoTengah ? 'bg-amber-955/20 border-amber-805 text-amber-400' : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span>L-Tengah</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { playBeep('click'); fileInputKananRef.current?.click(); }}
                    className={`py-1 cursor-pointer hover:bg-slate-800 border text-[8px] uppercase font-bold rounded flex items-center justify-center gap-1 transition-all ${
                      state.logoKanan ? 'bg-red-955/20 border-red-800 text-red-405' : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span>L-Kanan</span>
                  </button>
                </div>
              </div>
            </div>

            {/* CSV Roster Importer */}
            <div className="p-2 border border-slate-800 bg-slate-900/40 rounded-lg flex items-center justify-between gap-1.5">
              <span className="text-[9px] font-bold text-slate-400 font-mono uppercase">Mass Roster</span>
              <div className="flex gap-2">
                <button
                  onClick={downloadTemplateCSV}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold uppercase rounded-md text-slate-300 flex items-center gap-1 w-auto transition-all"
                >
                  <Download className="w-3 h-3" />
                  Template
                </button>
                <label className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold uppercase rounded-md text-slate-300 flex items-center gap-1 cursor-pointer w-auto transition-all">
                  <Upload className="w-3 h-3 text-emerald-450" />
                  Upload
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleImportCSV}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Match History management */}
            <div className="p-2 bg-slate-950/20 rounded-lg border border-slate-900 flex items-center justify-between">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wide font-mono">Persisted History ({histories.length})</span>
              <div className="flex gap-1 font-mono">
                <button
                  onClick={handleExportCSV}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-[9px] uppercase rounded flex items-center gap-1 cursor-pointer transition-colors"
                  title="Ekspor CSV"
                >
                  <Download className="w-3 h-3" />
                  CSV
                </button>
                <button
                  onClick={handleExportPDF}
                  className="px-2 py-1 bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-900/40 text-emerald-400 font-bold text-[9px] uppercase rounded flex items-center gap-1 cursor-pointer transition-colors"
                  title="Cetak PDF"
                >
                  <FileText className="w-3 h-3" />
                  PDF
                </button>
                {histories.length > 0 && (
                  <button 
                    onClick={clearMatchHistoriesList}
                    className="px-2 py-1 text-[9px] font-bold text-red-500 hover:text-red-400 flex items-center gap-1 bg-red-955/20 rounded border border-red-900/30 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> Hapus
                  </button>
                )}
              </div>
            </div>

          </div>

        </div>
      ) : activeTab === 'jadwal' ? (
        <JadwalTab theme={theme} state={state} dispatch={dispatch} />
      ) : null}

      {/* 3. Popup Dialogue Modals */}
      <AnimatePresence>
        
        {/* Proceed to next round confirmation warning popup */}
        {showNextBabakConfirm && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 max-w-sm w-full p-6 rounded-2xl shadow-2xl text-center"
            >
              <HelpCircle className="w-12 h-12 text-emerald-450 mx-auto mb-3 animate-pulse" />
              <h3 className="text-base font-black text-white uppercase tracking-tight mb-1.5">
                LANJUT KE BABAK BERIKUTNYA?
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Waktu babak berjalan telah habis. Apakah Anda yakin ingin memajukan pertandingan ke babak selanjutnya? Tindakan ini akan secara otomatis melepas kunci panel Juri.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleProceedNextBabak}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 font-bold text-xs uppercase tracking-wider rounded-lg transition-transform active:scale-95"
                >
                  Ya, Lanjutkan
                </button>
                <button
                  onClick={() => { playBeep('click'); setShowNextBabakConfirm(false); }}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-705 text-slate-350 text-xs font-bold uppercase tracking-wider border border-slate-700/50 rounded-lg transition-transform active:scale-95"
                >
                  Tidak
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Dynamic Multi-Device Connection QR Modal (Barcode System) */}
        {showQrModal && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-slate-950 border border-slate-800 max-w-4xl w-full p-6 md:p-8 rounded-3xl shadow-2xl relative overflow-hidden text-slate-100"
            >
              {/* Neon accent spotlight behind cards */}
              <div className="absolute top-1/4 left-1/3 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
              
              <div className="flex justify-between items-start mb-6 pb-4 border-b border-slate-800/80">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 text-indigo-400">
                    <QrCode className="w-6 h-6 text-indigo-400" /> FITUR SAMBUNGAN MULTI-PANEL (BARCODE/QR)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Scan Barcode/QR Code di bawah menggunakan Handphone atau Tablet untuk menyambungkan perangkat langsung ke sistem scoring sebagai Juri, Dewan, atau Monitor.
                  </p>
                </div>
                <button
                  onClick={() => { playBeep('click'); setShowQrModal(false); }}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg text-xs font-bold text-slate-400 transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>

              {/* Grid of roles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto pr-1">
                
                {[
                  { id: 'juri1', label: 'JURI 1', color: 'border-amber-500/40 bg-amber-950/10 text-amber-400' },
                  { id: 'juri2', label: 'JURI 2', color: 'border-emerald-500/40 bg-emerald-950/10 text-emerald-400' },
                  { id: 'juri3', label: 'JURI 3', color: 'border-sky-500/40 bg-sky-950/10 text-sky-400' },
                  { id: 'dewan', label: 'DEWAN JURI', color: 'border-purple-500/40 bg-purple-950/10 text-purple-400' },
                  { id: 'monitor', label: 'LAYAR MONITOR', color: 'border-blue-500/40 bg-blue-950/10 text-blue-400' },
                  { id: 'sekretaris', label: 'SEKRETARIS', color: 'border-rose-500/40 bg-rose-950/10 text-rose-400' },
                ].map((item) => {
                  const url = `${window.location.origin}${window.location.pathname}?role=${item.id}`;
                  
                  return (
                    <div 
                      key={item.id} 
                      className={`flex flex-col items-center p-4 rounded-2xl border ${item.color} relative overflow-hidden transition-all duration-300 hover:scale-[1.02] shadow-md`}
                    >
                      <span className="text-[10px] uppercase font-black tracking-widest bg-slate-900/90 px-2.5 py-0.5 rounded-full border border-slate-800 mb-3">
                        {item.label}
                      </span>
                      
                      {/* White high-contrast frame for ideal scanning response */}
                      <div className="p-3 bg-white rounded-xl shadow-lg border border-slate-200 transition-transform active:scale-95 duration-200">
                        <QRCodeSVG 
                          value={url} 
                          size={120} 
                          bgColor="#ffffff" 
                          fgColor="#0f172a" 
                          includeMargin={false} 
                          level="H"
                        />
                      </div>

                      <div className="mt-3 w-full text-center">
                        <p className="text-[10px] text-slate-400 select-all truncate mb-2 font-mono px-1 py-0.5 bg-slate-900 rounded border border-slate-850" title={url}>
                          {url}
                        </p>
                        <button
                          onClick={() => {
                            playBeep('valid');
                            navigator.clipboard.writeText(url);
                            alert(`Link ${item.label} berhasil disalin!`);
                          }}
                          className="w-full py-1 text-[9px] uppercase font-bold tracking-wider rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          Salin Link
                        </button>
                      </div>
                    </div>
                  );
                })}

              </div>

              <div className="mt-6 flex flex-col md:flex-row items-center justify-between text-slate-500 text-[10px] border-t border-slate-900 pt-4 font-mono">
                <div>
                  Koneksi terjalin menggunakan protokol <span className="text-emerald-400 font-bold">WebSocket Real-Time Sync</span>.
                </div>
                <div className="mt-1 md:mt-0">
                  Semua panel akan menyinkronkan status pertandingan secara instan.
                </div>
              </div>
            </motion.div>
          </div>
        )}

      </AnimatePresence>
    </div>
  );
}

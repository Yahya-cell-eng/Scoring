import React, { useState, useRef, useEffect, useMemo } from 'react';
import { TGRState, TGRPeserta } from '../types';
import { playBeep } from '../utils/sound';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { QRCodeSVG } from 'qrcode.react';
import TGRRegistrasiDataPanel from './TGRRegistrasiDataPanel';
import SekretarisSeniMultiPesertaPanel from './SekretarisSeniMultiPesertaPanel';
import { 
  ArrowLeft, UserPlus, Trash2, Edit3, Check, Star, Settings, 
  Timer, Play, Pause, RotateCcw, Award, CheckSquare, RefreshCw, LogIn, ChevronRight, FileSpreadsheet,
  QrCode, HelpCircle, Sun, Moon, FileText, CheckCircle, Download, Upload, Info, X, Users, Maximize2, Minimize2,
  Image as ImageIcon
} from 'lucide-react';

interface TGRSekretarisPanelProps {
  state: TGRState;
  dispatch: (type: string, payload?: any) => Promise<any>;
  onBack: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export default function TGRSekretarisPanel({ state, dispatch, onBack, theme, onToggleTheme }: TGRSekretarisPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showRegistrasiPage, setShowRegistrasiPage] = useState(false);

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

  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Custom dialog states (to avoid sandboxed iframe blocking of window.alert/confirm)
  const [customConfirm, setCustomConfirm] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [customAlert, setCustomAlert] = useState<{
    show: boolean;
    title: string;
    message: string;
  } | null>(null);

  const showCustomAlert = (title: string, message: string) => {
    setCustomAlert({ show: true, title, message });
  };

  const showCustomConfirm = (title: string, message: string, onConfirm: () => void) => {
    setCustomConfirm({ show: true, title, message, onConfirm });
  };

  // Tab state: 'roster' | 'control' | 'corrections' | 'rekap' | 'pool_multi'
  const [activeTab, setActiveTab] = useState<'roster' | 'control' | 'corrections' | 'rekap' | 'pool_multi'>('control');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [editingPeserta, setEditingPeserta] = useState<TGRPeserta | null>(null);

  // Form states
  const [formNama, setFormNama] = useState('');
  const [formKontingen, setFormKontingen] = useState('');
  const [formKategori, setFormKategori] = useState<string>('Jurus Tunggal Tangan Kosong');
  const [formNoUrut, setFormNoUrut] = useState<number>(1);

  // Event info form states (synced with actual state values)
  const [formNamaEvent, setFormNamaEvent] = useState(state.namaEvent);
  const [formGelanggang, setFormGelanggang] = useState(state.gelanggang);
  const [formPartai, setFormPartai] = useState(state.partai || 'PARTAI 1');
  const [formBabak, setFormBabak] = useState(state.babak || 'FINAL');
  const [formJumlahJuri, setFormJumlahJuri] = useState<number>(state.jumlahJuri);
  const [formSelectedWaktu, setFormSelectedWaktu] = useState<number>(state.selectedWaktu);

  // Logo input refs
  const fileInputKiriRef = useRef<HTMLInputElement>(null);
  const fileInputTengahRef = useRef<HTMLInputElement>(null);
  const fileInputKananRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (position: 'kiri' | 'tengah' | 'kanan', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showCustomAlert('File Tidak Valid', 'Format file harus berupa gambar (PNG, JPG, SVG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      playBeep('valid');
      const payload: any = {};
      if (position === 'kiri') payload.logoKiri = base64;
      if (position === 'tengah') payload.logoTengah = base64;
      if (position === 'kanan') payload.logoKanan = base64;
      
      await dispatch('TGR_UPLOAD_LOGOS', payload);
      await dispatch('TGR_ADD_AUDIT_LOG', {
        user: 'Sekretaris',
        action: `Mengunggah logo ${position} kejuaraan TGR`
      });
    };
    reader.readAsDataURL(file);
  };

  // Sync settings when state changes from other devices
  useEffect(() => {
    console.log("[TGRSekretarisPanel] Verified state updates:", {
      namaEvent: state.namaEvent,
      gelanggang: state.gelanggang,
      partai: state.partai,
      babak: state.babak,
      jumlahJuri: state.jumlahJuri,
      activePesertaId: state.activePesertaId,
      pesertaCount: state.pesertaList?.length || 0,
      sessionStatus: state.sessionStatus
    });

    if (state.pesertaList) {
      state.pesertaList.forEach((p, i) => {
        if (!p.scores) {
          console.warn(`[TGRSekretarisPanel] Peserta "${p.nama}" at index ${i} has undefined scores object. Auto-healing to Empty.`);
          p.scores = {};
        }
        if (!p.kebenaranScores) {
          console.warn(`[TGRSekretarisPanel] Peserta "${p.nama}" at index ${i} has undefined kebenaranScores object. Auto-healing to Empty.`);
          p.kebenaranScores = {};
        }
      });
    }

    setFormNamaEvent(state.namaEvent);
    setFormGelanggang(state.gelanggang);
    setFormPartai(state.partai || 'PARTAI 1');
    setFormBabak(state.babak || 'FINAL');
    setFormJumlahJuri(state.jumlahJuri);
    setFormSelectedWaktu(state.selectedWaktu);
  }, [state.namaEvent, state.gelanggang, state.partai, state.babak, state.jumlahJuri, state.selectedWaktu, state.pesertaList]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'sekretaris2026') {
      playBeep('valid');
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      playBeep('warning');
      setLoginError('Sandi sekretaris salah! Gunakan: sekretaris2026');
    }
  };

  const handleOpenAddModal = () => {
    playBeep('click');
    setEditingPeserta(null);
    setFormNama('');
    setFormKontingen('');
    setFormKategori('Jurus Tunggal Tangan Kosong');
    setFormNoUrut(state.pesertaList.length + 1);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (p: TGRPeserta) => {
    playBeep('click');
    setEditingPeserta(p);
    setFormNama(p.nama);
    setFormKontingen(p.kontingen);
    setFormKategori(p.kategori);
    setFormNoUrut(p.noUrut);
    setShowAddModal(true);
  };

  const handleSavePeserta = async (e: React.FormEvent) => {
    e.preventDefault();
    playBeep('valid');

    const payloadPeserta = {
      id: editingPeserta ? editingPeserta.id : Math.random().toString(36).substring(2),
      nama: formNama,
      kontingen: formKontingen,
      kategori: formKategori,
      noUrut: formNoUrut
    };

    await dispatch('TGR_UPDATE_PESERTA', {
      action: editingPeserta ? 'edit' : 'add',
      peserta: payloadPeserta
    });

    await dispatch('TGR_ADD_AUDIT_LOG', {
      user: 'Sekretaris',
      action: `${editingPeserta ? 'Mengupdate' : 'Menambahkan'} peserta TGR: ${formNama} (${formKontingen})`
    });

    setShowAddModal(false);
  };

  const handleDeletePeserta = (id: string, nama: string) => {
    showCustomConfirm(
      'HAPUS PESERTA',
      `Apakah Anda yakin ingin menghapus peserta ${nama}? Tindakan ini tidak dapat dibatalkan.`,
      async () => {
        playBeep('warning');
        await dispatch('TGR_UPDATE_PESERTA', {
          action: 'delete',
          pesertaId: id
        });

        await dispatch('TGR_ADD_AUDIT_LOG', {
          user: 'Sekretaris',
          action: `Menghapus peserta TGR: ${nama}`
        });
      }
    );
  };

  const handleSetActivePeserta = async (pesertaId: string) => {
    playBeep('click');
    await dispatch('TGR_SET_ACTIVE_PESERTA', { pesertaId });
    await dispatch('TGR_ADD_AUDIT_LOG', {
      user: 'Sekretaris',
      action: `Menetapkan peserta ID ${pesertaId} sebagai aktif di arena TGR`
    });
  };

  const handleUpdateEventSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    playBeep('valid');

    await dispatch('TGR_UPDATE_EVENT_INFO', {
      namaEvent: formNamaEvent,
      gelanggang: formGelanggang,
      partai: formPartai,
      babak: formBabak,
      jumlahJuri: formJumlahJuri,
      selectedWaktu: formSelectedWaktu
    });

    await dispatch('TGR_ADD_AUDIT_LOG', {
      user: 'Sekretaris',
      action: `Mengupdate konfigurasi gelanggang TGR: Juri = ${formJumlahJuri}, Partai = ${formPartai}, Babak = ${formBabak}`
    });
  };

  const toggleTimer = async () => {
    playBeep('click');
    if (state.timerActive) {
      await dispatch('TGR_PAUSE_TIMER');
    } else {
      await dispatch('TGR_START_TIMER');
    }
  };

  const resetTimer = async () => {
    playBeep('click');
    await dispatch('TGR_RESET_TIMER');
  };

  // Seeding sample data
  const handleGenerateSampleData = async () => {
    playBeep('valid');
    const samples = [
      { nama: "Ahmad Fauzi", kontingen: "DKI Jakarta", kategori: "Tunggal" as const, noUrut: 1 },
      { nama: "Siti Rahmawati", kontingen: "Jawa Barat", kategori: "Tunggal" as const, noUrut: 2 },
      { nama: "Dewa-Sena (Duo)", kontingen: "Bali", kategori: "Ganda" as const, noUrut: 3 },
      { nama: "Regu Putra Merdeka", kontingen: "Jawa Timur", kategori: "Regu" as const, noUrut: 4 },
      { nama: "Rahmat Hidayat", kontingen: "Sumatera Barat", kategori: "Tunggal" as const, noUrut: 5 },
    ];

    for (const s of samples) {
      await dispatch('TGR_UPDATE_PESERTA', {
        action: 'add',
        peserta: {
          id: 'sample_' + Math.random().toString(36).substring(2),
          nama: s.nama,
          kontingen: s.kontingen,
          kategori: s.kategori,
          noUrut: s.noUrut
        }
      });
    }

    await dispatch('TGR_ADD_AUDIT_LOG', {
      user: 'Sekretaris',
      action: 'Menghasilkan 5 peserta simulasi / sampel TGR'
    });
  };

  // CSV Exporter
  const handleDownloadCSV = () => {
    playBeep('valid');
    let csv = "\uFEFF"; // BOM for Excel formatting
    csv += 'No Urut,Nama,Kontingen,Kategori,Final Score,Ranking,Status,Deductions (Hukuman),Waktu Tampil\n';
    state.pesertaList.forEach(p => {
      csv += `${p.noUrut},"${p.nama}","${p.kontingen}","${p.kategori}",${p.finalScore !== undefined ? p.finalScore.toFixed(3) : '-'},${p.ranking || '-'},"${p.status}",${p.deductions},"${p.waktuTampil ? formatTime(p.waktuTampil) : '-'}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rekap_Nilas_Seni_TGR_${state.namaEvent.replace(/\s+/g, '_')}_${Date.now()}.csv`;
    a.click();
  };

  // PDF Exporter using jsPDF (Landscape official document layout)
  const handleExportPDF = () => {
    playBeep('click');
    const doc = new jsPDF('l', 'mm', 'a4'); // landscape
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    let currentY = 18;
    
    // Draw outer professional double borders
    doc.setDrawColor(217, 119, 6); // gold
    doc.setLineWidth(0.6);
    doc.rect(8, 8, pageWidth - 16, pageHeight - 16);
    doc.setDrawColor(30, 41, 59); // slate-800
    doc.setLineWidth(0.2);
    doc.rect(9, 9, pageWidth - 18, pageHeight - 18);
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("REKAPITULASI RESMI HASIL SKORING KATEGORI SENI (TGR)", pageWidth / 2, currentY, { align: "center" });
    currentY += 5;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text("IKATAN PENCAK SILAT INDONESIA (IPSI) - DIGITAL SCORING SYSTEM", pageWidth / 2, currentY, { align: "center" });
    currentY += 5;
    
    // Divider line
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.3);
    doc.line(12, currentY, pageWidth - 12, currentY);
    currentY += 6;
    
    // Metadata Header Info Panel
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240);
    doc.rect(12, currentY, pageWidth - 24, 15, "FD");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(`NAMA EVENT     : ${state.namaEvent.toUpperCase()}`, 16, currentY + 6);
    doc.text(`GELANGGANG    : ${state.gelanggang.toUpperCase()}`, 16, currentY + 11);
    doc.text(`TANGGAL CETAK  : ${new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })} WIB`, pageWidth - 100, currentY + 6);
    doc.text(`JUMLAH JURI    : ${state.jumlahJuri} JURI`, pageWidth - 100, currentY + 11);
    currentY += 20;

    // Draw Table Header
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(12, currentY, pageWidth - 24, 8, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    
    doc.text("URUT", 14, currentY + 5.5);
    doc.text("NAMA ATLET / TIM", 24, currentY + 5.5);
    doc.text("KONTINGEN", 64, currentY + 5.5);
    doc.text("KATEGORI", 100, currentY + 5.5);
    
    // Judges columns dynamic header
    let startJudgesX = 120;
    const colWidth = 10;
    for (let j = 1; j <= state.jumlahJuri; j++) {
      doc.text(`J${j}`, startJudgesX + (j - 1) * colWidth + 2, currentY + 5.5);
    }
    
    let endJudgesX = startJudgesX + state.jumlahJuri * colWidth;
    doc.text("HUKUM", endJudgesX + 3, currentY + 5.5);
    doc.text("WAKTU", endJudgesX + colWidth + 6, currentY + 5.5);
    doc.text("SKOR AKHIR", endJudgesX + colWidth * 2 + 10, currentY + 5.5);
    doc.text("PERINGKAT", pageWidth - 28, currentY + 5.5);
    
    currentY += 8;

    // Draw Table Rows
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    
    // Sort by Urut or Ranking
    const sortedPeserta = [...state.pesertaList].sort((a, b) => a.noUrut - b.noUrut);
    
    if (sortedPeserta.length === 0) {
      doc.setDrawColor(226, 232, 240);
      doc.rect(12, currentY, pageWidth - 24, 8);
      doc.text("Belum ada data roster peserta terdaftar.", pageWidth / 2, currentY + 5.5, { align: "center" });
      currentY += 8;
    } else {
      sortedPeserta.forEach((p, index) => {
        // Zebra row striping
        if (index % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(12, currentY, pageWidth - 24, 8, "F");
        }
        
        doc.setDrawColor(226, 232, 240);
        doc.line(12, currentY + 8, pageWidth - 12, currentY + 8);
        
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(p.noUrut.toString(), 16, currentY + 5.5);
        
        doc.setFont("helvetica", "normal");
        doc.setTextColor(51, 65, 85);
        doc.text(p.nama, 24, currentY + 5.5);
        doc.text(p.kontingen, 64, currentY + 5.5);
        doc.text(p.kategori, 100, currentY + 5.5);
        
        // Draw individual scores
        for (let j = 1; j <= state.jumlahJuri; j++) {
          const sVal = p.scores ? p.scores[`juri${j}`] : undefined;
          const text = sVal !== undefined ? sVal.toFixed(2) : "-";
          doc.text(text, startJudgesX + (j - 1) * colWidth + 1, currentY + 5.5);
        }
        
        doc.text(p.deductions ? p.deductions.toFixed(3) : "0.000", endJudgesX + 3, currentY + 5.5);
        doc.text(p.waktuTampil ? formatTime(p.waktuTampil) : "00:00", endJudgesX + colWidth + 6, currentY + 5.5);
        
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(p.finalScore !== undefined ? p.finalScore.toFixed(3) : "-", endJudgesX + colWidth * 2 + 10, currentY + 5.5);
        
        // Ranking color highlighting (Top 3)
        if (p.ranking === 1) {
          doc.setTextColor(217, 119, 6); // Gold
          doc.text("JUARA 1", pageWidth - 28, currentY + 5.5);
        } else if (p.ranking === 2) {
          doc.setTextColor(100, 116, 139); // Silver
          doc.text("JUARA 2", pageWidth - 28, currentY + 5.5);
        } else if (p.ranking === 3) {
          doc.setTextColor(180, 83, 9); // Bronze
          doc.text("JUARA 3", pageWidth - 28, currentY + 5.5);
        } else {
          doc.setTextColor(100, 116, 139);
          doc.text(p.ranking ? `RANK ${p.ranking}` : "-", pageWidth - 28, currentY + 5.5);
        }
        
        currentY += 8;
      });
    }

    // Signatures
    currentY = Math.max(currentY + 12, pageHeight - 38);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    
    doc.text("Ketua Pertandingan,", 30, currentY);
    doc.text("Dewan Hakim TGR,", 110, currentY);
    doc.text("Sekretaris Pertandingan,", pageWidth - 70, currentY);
    
    doc.line(30, currentY + 14, 75, currentY + 14);
    doc.line(110, currentY + 14, 155, currentY + 14);
    doc.line(pageWidth - 70, currentY + 14, pageWidth - 25, currentY + 14);
    
    doc.setFont("helvetica", "bold");
    doc.text("( ________________________ )", 30, currentY + 18);
    doc.text("( ________________________ )", 110, currentY + 18);
    doc.text("( ________________________ )", pageWidth - 70, currentY + 18);

    doc.save(`Dokumen_Hasil_Seni_TGR_${state.namaEvent.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
  };

  const handleToggleSessionStatus = async () => {
    playBeep('click');
    const newStatus = state.sessionStatus === 'open' ? 'closed' : 'open';
    await dispatch('TGR_TOGGLE_SESSION', { status: newStatus });
    await dispatch('TGR_ADD_AUDIT_LOG', {
      user: 'Sekretaris',
      action: `Mengubah status sesi penilaian juri menjadi: ${newStatus.toUpperCase()}`
    });
  };

  const handleApproveCorrection = async (juriId: string) => {
    playBeep('valid');
    await dispatch('TGR_APPROVE_JURI_CORRECTION', { juriId });
    await dispatch('TGR_ADD_AUDIT_LOG', {
      user: 'Sekretaris',
      action: `MEYETUJUI koreksi nilai dari ${juriId.toUpperCase()}`
    });
  };

  const handleRejectCorrection = async (juriId: string) => {
    playBeep('warning');
    await dispatch('TGR_REJECT_JURI_CORRECTION', { juriId });
    await dispatch('TGR_ADD_AUDIT_LOG', {
      user: 'Sekretaris',
      action: `MENOLAK koreksi nilai dari ${juriId.toUpperCase()}`
    });
  };

  const handleClearScore = (pesertaId: string, nama: string) => {
    showCustomConfirm(
      'RESET NILAI & HUKUMAN',
      `Apakah Anda yakin ingin mereset seluruh nilai dan hukuman untuk peserta ${nama}? Tindakan ini bersifat permanen.`,
      async () => {
        playBeep('warning');
        await dispatch('TGR_CANCEL_SCORE', { pesertaId });
        await dispatch('TGR_ADD_AUDIT_LOG', {
          user: 'Sekretaris',
          action: `Mereset/Membatalkan seluruh nilai juri untuk peserta: ${nama}`
        });
      }
    );
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const activePeserta = state.pesertaList.find(p => p.id === state.activePesertaId);

  // Filter corrections that are pending
  const pendingCorrections = useMemo(() => {
    return Object.entries(state.juriCorrections || {})
      .filter(([_, value]) => value.status === 'pending')
      .map(([juriId, value]) => ({
        juriId,
        ...value,
        pesertaNama: state.pesertaList.find(p => p.id === value.pesertaId)?.nama || "Unknown"
      }));
  }, [state.juriCorrections, state.pesertaList]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#050202] text-slate-100 p-4 font-sans relative">
        <div className="absolute inset-0 bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-950/20 via-slate-950 to-[#020205] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md border border-amber-500/20 bg-slate-950/90 rounded-2xl p-8 shadow-2xl relative z-10"
        >
          <div className="absolute top-0 left-0 w-8 h-1 border-t border-l border-amber-500" />
          <div className="absolute top-0 right-0 w-8 h-1 border-t border-r border-amber-500" />

          <div className="text-center mb-6">
            <Timer className="w-12 h-12 text-amber-500 mx-auto mb-3 animate-pulse" />
            <h2 className="text-xl font-black font-sport tracking-widest text-amber-500 uppercase">
              SEKRETARIS PERTANDINGAN (TGR)
            </h2>
            <p className="text-[10px] uppercase tracking-wider font-mono text-slate-400 mt-1">
              LOGIN ADMIN SEKRETARIS & PENCATAT WAKTU
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                PASSWORD SEKRETARIS
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full py-2.5 px-4 bg-slate-900 border border-slate-800 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="sekretaris2026"
                required
              />
            </div>

            {loginError && (
              <div className="text-[10px] font-bold text-red-400 font-mono uppercase bg-red-950/40 p-2.5 rounded-lg border border-red-500/20 text-center">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-black font-sport tracking-wider text-xs uppercase rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>MASUK SEKRETARIS</span>
            </button>
          </form>

          <button
            onClick={onBack}
            className="w-full mt-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest hover:text-slate-300 font-mono transition-colors text-center block cursor-pointer"
          >
            Kembali ke Pemilihan Peran
          </button>
        </motion.div>
      </div>
    );
  }

  if (showRegistrasiPage) {
    return (
      <TGRRegistrasiDataPanel
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
    <div className={`w-full h-full min-h-screen flex flex-col justify-between select-none transition-colors duration-300 relative ${
      theme === 'dark' ? 'text-slate-100 bg-[#020207]' : 'text-slate-800 bg-slate-50'
    }`}>
      {/* Dynamic glow spotlight (only in dark mode) */}
      {theme === 'dark' && (
        <div className="absolute top-0 right-1/4 w-[28rem] h-[28rem] rounded-full blur-[150px] pointer-events-none bg-purple-950/10" />
      )}

      {/* 1. HEADER SECTION (Perfect Alignment with Tanding Secretary) */}
      <div className={`flex justify-between items-center pb-3 border px-4 py-2 flex-shrink-0 transition-all duration-300 ${
        theme === 'dark' 
          ? 'border-slate-800/80 bg-slate-950' 
          : 'border-slate-200 bg-white shadow-sm'
      }`}>
        <div className="flex items-center gap-2">
          <button 
            onClick={onBack}
            className={`px-3 py-1.5 text-xs cursor-pointer rounded-lg transition-colors font-bold uppercase flex items-center gap-1 ${
              theme === 'dark' 
                ? 'bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300' 
                : 'bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700'
            }`}
          >
            ← Keluar
          </button>
          <button
            onClick={onToggleTheme}
            className={`p-2 rounded-lg transition-colors cursor-pointer border ${
              theme === 'dark' 
                ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-amber-400' 
                : 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-600'
            }`}
            title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className={`p-2 rounded-lg transition-colors cursor-pointer border ${
              theme === 'dark' 
                ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300' 
                : 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-600'
            }`}
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          
          <button
            onClick={() => { playBeep('click'); setShowQrModal(true); }}
            className={`px-3 py-1.5 text-xs cursor-pointer rounded-lg transition-colors font-extrabold uppercase flex items-center gap-1.5 border ${
              theme === 'dark' 
                ? 'bg-indigo-950/40 hover:bg-indigo-900/60 border-indigo-900 text-indigo-300' 
                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700'
            }`}
            title="Sambungkan Device / QR Barcode"
          >
            <QrCode className="w-4 h-4 text-indigo-500" />
            <span>Barcode System</span>
          </button>

          <div className={`h-5 w-[1px] ${theme === 'dark' ? 'bg-slate-850' : 'bg-slate-250'} mx-1`} />
          <div className="flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-amber-500" />
            <span className={`text-xs font-mono font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>PANEL SEKRETARIS SENI TGR</span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className={`flex p-1 rounded-xl border items-center gap-1 ${
          theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            onClick={() => { playBeep('click'); setShowRegistrasiPage(true); }}
            className="px-3 py-1.5 text-xs uppercase font-black cursor-pointer rounded-lg transition-all bg-amber-600 text-white shadow shadow-amber-900/40 hover:bg-amber-500 hover:scale-105 active:scale-95 duration-250"
          >
            🏆 REGISTRASI DATA
          </button>
          <div className={`h-4 w-[1px] ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-300'} mx-0.5`} />
          <button
            onClick={() => { playBeep('click'); setActiveTab('control'); }}
            className={`px-3 py-1.5 text-xs uppercase font-black cursor-pointer rounded-lg transition-all ${
              activeTab === 'control' 
                ? 'bg-amber-600 text-white shadow shadow-amber-900/40 font-extrabold' 
                : 'text-slate-400 hover:text-slate-600 font-bold'
            }`}
          >
            🕹️ Kontrol Arena
          </button>
          <button
            onClick={() => { playBeep('click'); setActiveTab('roster'); }}
            className={`px-3 py-1.5 text-xs uppercase font-black cursor-pointer rounded-lg transition-all ${
              activeTab === 'roster' 
                ? 'bg-amber-600 text-white shadow shadow-amber-900/40 font-extrabold' 
                : 'text-slate-400 hover:text-slate-600 font-bold'
            }`}
          >
            📋 Registrasi Roster
          </button>
          <button
            onClick={() => { playBeep('click'); setActiveTab('corrections'); }}
            className={`px-3 py-1.5 text-xs uppercase font-black cursor-pointer rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'corrections' 
                ? 'bg-amber-600 text-white shadow shadow-amber-900/40 font-extrabold' 
                : 'text-slate-400 hover:text-slate-600 font-bold'
            }`}
          >
            🛠️ Koreksi & Log
            {pendingCorrections.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            )}
          </button>
          <button
            onClick={() => { playBeep('click'); setActiveTab('rekap'); }}
            className={`px-3 py-1.5 text-xs uppercase font-black cursor-pointer rounded-lg transition-all ${
              activeTab === 'rekap' 
                ? 'bg-amber-600 text-white shadow shadow-amber-900/40 font-extrabold' 
                : 'text-slate-400 hover:text-slate-600 font-bold'
            }`}
          >
            📄 Cetak & Rekap
          </button>
          <div className={`h-4 w-[1px] ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-300'} mx-0.5`} />
          <button
            onClick={async () => {
              playBeep('click');
              const nextMode = state.sistemSeni === 'prestasi' ? 'pool' : 'prestasi';
              await dispatch('TGR_SET_SISTEM_SENI', { sistem: nextMode });
              await dispatch('TGR_ADD_AUDIT_LOG', {
                user: 'Sekretaris',
                action: `Mengubah sistem seni arena menjadi: ${nextMode === 'pool' ? 'Sistem Pool (Ranking Nilai)' : 'Sistem Prestasi (Bagan VS)'}`
              });
            }}
            className={`px-3 py-1.5 text-xs uppercase font-black cursor-pointer rounded-lg transition-all flex items-center gap-1.5 border ${
              state.sistemSeni === 'prestasi'
                ? 'bg-purple-950/60 border-purple-800/80 text-purple-300 shadow-md shadow-purple-950/50'
                : 'bg-amber-950/60 border-amber-800/80 text-amber-300 shadow-md shadow-amber-950/50'
            }`}
            title="Klik untuk mengubah sistem seni (Sistem Pool vs Sistem Prestasi)"
          >
            {state.sistemSeni === 'prestasi' ? (
              <>
                <span className="text-purple-400">⚔️</span>
                <span>SISTEM PRESTASI (VS)</span>
              </>
            ) : (
              <>
                <span className="text-amber-400">🏊</span>
                <span>SISTEM POOL</span>
              </>
            )}
          </button>
        </div>

        {/* Sync Status Info */}
        <div className={`text-right text-[11px] font-mono flex items-center gap-1.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
          <div>
            PARTAI <span className={`font-black text-xs px-2 py-0.5 rounded-md shadow-sm ml-1 ${theme === 'dark' ? 'bg-amber-950/50 text-amber-400 border border-amber-900/30' : 'bg-amber-50 text-amber-800 border border-amber-200 font-extrabold'}`}>{state.partai || '01'}</span>
          </div>
          <div className="mx-0.5">|</div>
          <div>
            GELANGGANG <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{state.gelanggang}</span>
          </div>
        </div>
      </div>

      {/* 2. MAIN APP CONTENT CONTAINER */}
      <main className="flex-1 p-3 overflow-y-auto">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: OPERASIONAL ARENA & LIVE SCORE */}
          {activeTab === 'control' && (
            <motion.div 
              key="tab-control"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="grid grid-cols-12 gap-3 h-full items-start"
            >
              {/* Left Column (Col 5): Synchronized Arena Timer Control */}
              <div className="col-span-12 lg:col-span-5 flex flex-col gap-3">
                {/* Timer Control Card */}
                <div className={`p-4 rounded-2xl border ${
                  theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                } text-center flex flex-col items-center justify-between`}>
                  <div className="text-[10px] font-black tracking-widest font-mono text-amber-500 uppercase flex items-center gap-1.5 justify-center">
                    <Timer className={`w-4 h-4 ${state.timerActive ? 'text-amber-500 animate-spin' : 'text-slate-400'}`} />
                    IPSI SYNCHRONIZED ARENA TIMER TGR
                  </div>

                  <div className="text-7xl font-black font-sport text-amber-500 tracking-wider my-3 font-mono">
                    {formatTime(state.timerSeconds)}
                  </div>

                  <div className="flex gap-2 w-full mt-2">
                    <button
                      onClick={toggleTimer}
                      className={`flex-1 py-3 rounded-xl cursor-pointer font-black font-sport text-xs uppercase flex items-center justify-center gap-1.5 transition-all ${
                        state.timerActive
                          ? 'bg-rose-600 hover:bg-rose-500 text-white shadow'
                          : 'bg-emerald-600 hover:bg-emerald-505 text-white shadow'
                      }`}
                    >
                      {state.timerActive ? (
                        <>
                          <Pause className="w-4 h-4" />
                          <span>PAUSE TIMER</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          <span>MULAI TIMER</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={resetTimer}
                      className={`px-4 py-3 rounded-xl cursor-pointer font-black font-sport text-xs uppercase flex items-center justify-center gap-1.5 transition-all ${
                        theme === 'dark' 
                          ? 'bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-300' 
                          : 'bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700'
                      }`}
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>RESET</span>
                    </button>
                  </div>
                </div>

                {/* Active Competitor Selector and Session Moderator */}
                <div className={`p-4 rounded-2xl border ${
                  theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <h3 className="text-[11px] font-black font-sport tracking-widest text-amber-500 uppercase border-b border-slate-800 pb-2 mb-3">
                    🕹️ MODERATOR ARENA TGR AKTIF
                  </h3>

                  <div className="space-y-3">
                    {/* If Prestasi (VS) mode, provide Quick Sudut Switcher */}
                    {state.sistemSeni === 'prestasi' && (
                      <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-800/40">
                        <div className="text-[9px] font-mono font-black uppercase text-purple-300 mb-2 flex items-center justify-between">
                          <span>⚔️ TAMPILKAN SUDUT AKTIF (BAGAN PRESTASI)</span>
                          {state.activeVSMatch?.winner && (
                            <span className="text-amber-400 font-bold">
                              Pemenang: Sudut {state.activeVSMatch.winner.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {/* Merah Button */}
                          {(() => {
                            const merah = state.pesertaList.find(p => p.id === state.activeVSMatch?.merahPesertaId) || state.pesertaList.find(p => p.sudut === 'merah');
                            const isMerahActive = state.activePesertaId === merah?.id;
                            return (
                              <button
                                onClick={() => merah && handleSetActivePeserta(merah.id)}
                                disabled={!merah}
                                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                                  isMerahActive
                                    ? 'bg-red-600 border-red-400 text-white shadow-lg shadow-red-950/60 ring-2 ring-red-400'
                                    : 'bg-red-950/30 border-red-800/40 text-red-300 hover:bg-red-900/40'
                                } ${!merah ? 'opacity-40 cursor-not-allowed' : ''}`}
                              >
                                <div className="text-[8px] font-black uppercase tracking-wider font-mono opacity-80">
                                  🔴 SUDUT MERAH {isMerahActive && '★ AKTIF'}
                                </div>
                                <div className="text-xs font-black uppercase truncate mt-0.5">
                                  {merah ? merah.nama : 'Kosong'}
                                </div>
                                <div className="text-[9px] font-mono opacity-80 mt-1 flex justify-between">
                                  <span>{merah?.kontingen || '-'}</span>
                                  <span className="font-bold">{merah?.finalScore !== undefined ? merah.finalScore.toFixed(3) : '9.990'}</span>
                                </div>
                              </button>
                            );
                          })()}

                          {/* Biru Button */}
                          {(() => {
                            const biru = state.pesertaList.find(p => p.id === state.activeVSMatch?.biruPesertaId) || state.pesertaList.find(p => p.sudut === 'biru');
                            const isBiruActive = state.activePesertaId === biru?.id;
                            return (
                              <button
                                onClick={() => biru && handleSetActivePeserta(biru.id)}
                                disabled={!biru}
                                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                                  isBiruActive
                                    ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-950/60 ring-2 ring-blue-400'
                                    : 'bg-blue-950/30 border-blue-800/40 text-blue-300 hover:bg-blue-900/40'
                                } ${!biru ? 'opacity-40 cursor-not-allowed' : ''}`}
                              >
                                <div className="text-[8px] font-black uppercase tracking-wider font-mono opacity-80">
                                  🔵 SUDUT BIRU {isBiruActive && '★ AKTIF'}
                                </div>
                                <div className="text-xs font-black uppercase truncate mt-0.5">
                                  {biru ? biru.nama : 'Kosong'}
                                </div>
                                <div className="text-[9px] font-mono opacity-80 mt-1 flex justify-between">
                                  <span>{biru?.kontingen || '-'}</span>
                                  <span className="font-bold">{biru?.finalScore !== undefined ? biru.finalScore.toFixed(3) : '9.990'}</span>
                                </div>
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Active Peserta Selection Dropdown */}
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                        PILIH PESERTA AKTIF YANG TAMPIL DI ARENA
                      </label>
                      <select
                        value={state.activePesertaId || ""}
                        onChange={(e) => handleSetActivePeserta(e.target.value)}
                        className={`w-full text-xs font-bold font-mono px-3 py-2 border rounded-lg focus:outline-none transition-colors ${
                          theme === 'dark' 
                            ? 'bg-slate-950 border-slate-800 text-white focus:border-amber-500' 
                            : 'bg-white border-slate-300 text-slate-800 focus:border-amber-500'
                        }`}
                      >
                        <option value="">-- PILIH PESERTA ARENA --</option>
                        {state.pesertaList.map(p => (
                          <option key={p.id} value={p.id}>
                            No {p.noUrut} - {p.nama.toUpperCase()} ({p.kontingen.toUpperCase()} - {p.kategori}) {p.sudut ? `[${p.sudut.toUpperCase()}]` : ''} {p.pool ? `[${p.pool}]` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Sesi Juri status */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-bold text-slate-400 uppercase font-mono">STATUS SESI PENILAIAN JURI</span>
                        <button
                          onClick={handleToggleSessionStatus}
                          className={`w-full py-2.5 font-black uppercase text-[10px] tracking-wider rounded-lg border flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                            state.sessionStatus === 'open'
                              ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/20'
                              : 'bg-rose-950/30 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${state.sessionStatus === 'open' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                          <span>SESI {state.sessionStatus === 'open' ? 'DIBUKA' : 'DITUTUP'}</span>
                        </button>
                      </div>

                      {/* Reset Score for Active Competitor */}
                      {activePeserta && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[8px] font-bold text-slate-400 uppercase font-mono">MANIPULASI NILAI SEMENTARA</span>
                          <button
                            onClick={() => handleClearScore(activePeserta.id, activePeserta.nama)}
                            className="w-full py-2.5 font-black uppercase text-[10px] tracking-wider rounded-lg border border-red-500/20 bg-red-950/20 hover:bg-red-900/30 text-red-400 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>RESET NILAI TIM</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column (Col 7): Live Scoreboard Recipient */}
              <div className="col-span-12 lg:col-span-7 flex flex-col gap-3">
                {activePeserta ? (
                  <div className={`p-4 rounded-2xl border h-full flex flex-col justify-between ${
                    theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                    <div>
                      {/* Active Competitor details */}
                      <div className="flex justify-between items-start border-b border-slate-850 pb-3 mb-3">
                        <div>
                          <span className="text-[9px] font-black uppercase text-amber-500 tracking-wider font-mono">
                            DATA PENAMPIL AKTIF (ARENA 1)
                          </span>
                          <h2 className={`text-xl font-black uppercase ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {activePeserta.nama}
                          </h2>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Kontingen: <span className="font-bold text-slate-300">{activePeserta.kontingen}</span> | Kategori: <span className="font-bold text-amber-500">{activePeserta.kategori}</span>
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block font-mono">
                            SKOR AKHIR
                          </span>
                          <div className="text-4xl font-black text-amber-500 font-mono tracking-wider">
                            {activePeserta.finalScore !== undefined ? activePeserta.finalScore.toFixed(3) : "9.990"}
                          </div>
                        </div>
                      </div>

                      {/* Grid of Judges and Live Score indicator */}
                      <span className="block text-[9px] font-mono uppercase font-black text-slate-400 tracking-widest mb-2">
                        PANEL PANTAUAN NILAI LIVE KEBENARAN & KEMANTAPAN JURI AKTIF ({state.jumlahJuri} Juri)
                      </span>

                      <div className="grid grid-cols-2 xs:grid-cols-5 gap-2">
                        {Array.from({ length: state.jumlahJuri }, (_, i) => i + 1).map((num) => {
                          const juriId = `juri${num}`;
                          const rawScore = activePeserta.scores ? activePeserta.scores[juriId] : undefined;
                          const hasScore = rawScore !== undefined;
                          const scoreVal = hasScore ? rawScore : 9.990;
                          const kebenaranVal = (activePeserta.kebenaranScores && activePeserta.kebenaranScores[juriId]) || 9.500;
                          const isFinalized = activePeserta.finalizedJuries?.includes(juriId) || false;

                          const isGreen = num === 5 || num === 6;

                          let boxClass = "";
                          if (isFinalized) {
                            boxClass = isGreen
                              ? 'bg-emerald-600 border-emerald-400 text-white shadow-md'
                              : 'bg-blue-600 border-blue-400 text-white shadow-md';
                          } else {
                            boxClass = 'bg-slate-900 border-amber-500/50 text-amber-400 shadow-sm';
                          }

                          return (
                            <div 
                              key={juriId} 
                              className={`p-2.5 rounded-xl border text-center flex flex-col justify-between transition-all duration-300 ${boxClass}`}
                            >
                              <div className="flex items-center justify-between text-[8px] font-extrabold uppercase tracking-wider font-mono">
                                <span>JURI {num}</span>
                                {isFinalized ? (
                                  <span className="text-white text-xs font-black">✔</span>
                                ) : (
                                  <span className="text-amber-500 animate-pulse text-[7px]">● LIVE</span>
                                )}
                              </div>
                              <div className="my-1.5">
                                <div className={`text-xl font-black font-mono tracking-wide ${isFinalized ? 'text-white' : 'text-amber-400'}`}>
                                  {scoreVal.toFixed(3)}
                                </div>
                                <div className="text-[7.5px] opacity-75 font-mono">
                                  Keb: {kebenaranVal.toFixed(3)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-850 flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-amber-500" />
                        <span>Keterangan: Skor Akhir dihitung dari nilai median Juri dikurangi total Hukuman dewan ({activePeserta.deductions.toFixed(3)})</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`p-8 rounded-2xl border border-dashed flex flex-col items-center justify-center text-center h-full ${
                    theme === 'dark' ? 'border-slate-800 bg-slate-950/40 text-slate-400' : 'border-slate-300 bg-slate-50 text-slate-500'
                  }`}>
                    <Users className="w-12 h-12 text-slate-600 mb-2 animate-bounce" />
                    <h3 className="text-sm font-black uppercase font-sport text-amber-500">BELUM ADA PESERTA AKTIF DI ARENA</h3>
                    <p className="text-xs max-w-sm mt-1">
                      Silakan pilih peserta dari daftar dropdown di sebelah kiri atau registrasikan peserta baru untuk memulai penilaian seni real-time.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 2: REGISTRASI ROSTER PESERTA */}
          {activeTab === 'roster' && (
            <motion.div 
              key="tab-roster"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="grid grid-cols-12 gap-3 h-full items-start"
            >
              {/* Left Column (Col 4): Arena Settings */}
              <div className="col-span-12 lg:col-span-4 flex flex-col gap-3">
                <div className={`p-4 rounded-2xl border ${
                  theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <h3 className="text-xs font-black font-sport tracking-widest text-amber-500 uppercase border-b border-slate-850 pb-2 mb-3">
                    SETTING GELANGGANG & TURNAMEN TGR
                  </h3>

                  <form onSubmit={handleUpdateEventSettings} className="space-y-3.5">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                        Nama Event TGR
                      </label>
                      <input
                        type="text"
                        value={formNamaEvent}
                        onChange={(e) => setFormNamaEvent(e.target.value)}
                        className={`w-full py-1.5 px-3 border rounded text-xs font-bold ${
                          theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-800'
                        }`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                          Partai
                        </label>
                        <input
                          type="text"
                          value={formPartai}
                          onChange={(e) => setFormPartai(e.target.value)}
                          className={`w-full py-1.5 px-3 border rounded text-xs font-bold ${
                            theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-800'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                          Babak / Tahap
                        </label>
                        <input
                          type="text"
                          value={formBabak}
                          onChange={(e) => setFormBabak(e.target.value)}
                          className={`w-full py-1.5 px-3 border rounded text-xs font-bold ${
                            theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-800'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                          Gelanggang TGR
                        </label>
                        <input
                          type="text"
                          value={formGelanggang}
                          onChange={(e) => setFormGelanggang(e.target.value)}
                          className={`w-full py-1.5 px-3 border rounded text-xs font-bold ${
                            theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-800'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                          Jumlah Juri (4-10)
                        </label>
                        <input
                          type="number"
                          min="4"
                          max="10"
                          value={formJumlahJuri}
                          onChange={(e) => setFormJumlahJuri(parseInt(e.target.value) || 5)}
                          className={`w-full py-1.5 px-3 border rounded text-xs font-bold ${
                            theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-800'
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                        Durasi Tampil (detik)
                      </label>
                      <input
                        type="number"
                        step="10"
                        value={formSelectedWaktu}
                        onChange={(e) => setFormSelectedWaktu(parseInt(e.target.value) || 180)}
                        className={`w-full py-1.5 px-3 border rounded text-xs font-bold ${
                          theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-800'
                        }`}
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase tracking-wider text-[10px] rounded transition-transform active:scale-95 cursor-pointer"
                    >
                      SIMPAN KONFIGURASI EVENT
                    </button>
                  </form>

                  {/* Upload Logo Layar Monitor Section */}
                  <div className="border-t border-slate-800 pt-3 mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="block text-[10px] text-amber-500 font-mono uppercase font-bold flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Logo Layar Monitor (TGR & Partai)</span>
                      </span>
                      {(state.logoKiri || state.logoKanan || state.logoTengah) && (
                        <button
                          type="button"
                          onClick={() => {
                            playBeep('warning');
                            dispatch('TGR_UPLOAD_LOGOS', { logoKiri: null, logoKanan: null, logoTengah: null });
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
                        className={`py-2 px-1 cursor-pointer hover:bg-slate-800 border text-[9px] uppercase font-bold rounded flex flex-col items-center justify-center gap-1 transition-all ${
                          state.logoKiri ? 'bg-cyan-950/40 border-cyan-700 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                        title="Upload Logo Kejuaraan (Kiri)"
                      >
                        {state.logoKiri ? (
                          <img src={state.logoKiri} alt="Logo Kiri" className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />
                        ) : (
                          <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                        )}
                        <span className="truncate max-w-full">Logo Kiri</span>
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
                        className={`py-2 px-1 cursor-pointer hover:bg-slate-800 border text-[9px] uppercase font-bold rounded flex flex-col items-center justify-center gap-1 transition-all ${
                          state.logoTengah ? 'bg-amber-950/40 border-amber-700 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                        title="Upload Logo Event / Kejuaraan (Tengah)"
                      >
                        {state.logoTengah ? (
                          <img src={state.logoTengah} alt="Logo Tengah" className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />
                        ) : (
                          <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        <span className="truncate max-w-full">Logo Tengah</span>
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
                        className={`py-2 px-1 cursor-pointer hover:bg-slate-800 border text-[9px] uppercase font-bold rounded flex flex-col items-center justify-center gap-1 transition-all ${
                          state.logoKanan ? 'bg-red-950/40 border-red-700 text-red-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                        title="Upload Logo IPSI (Kanan)"
                      >
                        {state.logoKanan ? (
                          <img src={state.logoKanan} alt="Logo Kanan" className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />
                        ) : (
                          <ImageIcon className="w-3.5 h-3.5 text-red-400" />
                        )}
                        <span className="truncate max-w-full">Logo Kanan</span>
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
              </div>

              {/* Right Column (Col 8): Participants Management Table */}
              <div className="col-span-12 lg:col-span-8 flex flex-col gap-3 h-full">
                <div className={`p-4 rounded-2xl border h-full flex flex-col ${
                  theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div className="flex items-center justify-between border-b border-slate-850 pb-3 mb-3">
                    <div>
                      <h3 className="text-xs font-black font-sport tracking-widest text-amber-500 uppercase">
                        📋 MANAJEMEN ROSTER PESERTA SENI (TGR)
                      </h3>
                      <p className="text-[9px] text-slate-400 uppercase font-mono">
                        Tambahkan atau hapus atlet seni yang akan dinilai oleh juri
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {state.pesertaList.length === 0 && (
                        <button
                          onClick={handleGenerateSampleData}
                          className={`px-3 py-1.5 cursor-pointer rounded-lg border text-xs font-black uppercase flex items-center gap-1.5 transition-all ${
                            theme === 'dark' 
                              ? 'bg-purple-950/40 hover:bg-purple-900/40 border-purple-900 text-purple-400' 
                              : 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700'
                          }`}
                        >
                          Seeding Sampel
                        </button>
                      )}

                      <button
                        onClick={handleOpenAddModal}
                        className="px-3 py-1.5 cursor-pointer rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black font-sport text-xs uppercase flex items-center gap-1 transition-all"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>TAMBAH ATLET</span>
                      </button>
                    </div>
                  </div>

                  {/* Table element */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[50vh]">
                    {state.pesertaList.length === 0 ? (
                      <div className="text-center py-12 text-slate-500">
                        Belum ada peserta yang didaftarkan. Gunakan tombol 'Tambah Atlet' atau 'Seeding Sampel' di atas.
                      </div>
                    ) : (
                      state.pesertaList.map((p) => {
                        const isActive = p.id === state.activePesertaId;
                        return (
                          <div
                            key={p.id}
                            className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                              isActive
                                ? 'bg-amber-950/20 border-amber-500/80 text-white'
                                : 'bg-slate-900/20 border-slate-850 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-black text-amber-500 font-mono text-xs">
                                {p.noUrut}
                              </div>

                              <div>
                                <div className="text-[9px] font-mono uppercase text-amber-500/80 font-bold">
                                  KATEGORI: {p.kategori}
                                </div>
                                <div className={`text-sm font-black uppercase ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                                  {p.nama}
                                </div>
                                <div className="text-[10px] font-mono text-slate-400">
                                  {p.kontingen} {p.ranking !== undefined ? `| RANK ${p.ranking}` : ''} {p.finalScore !== undefined ? `| SKOR: ${p.finalScore.toFixed(3)}` : ''} {p.waktuTampil !== undefined ? `| WAKTU: ${formatTime(p.waktuTampil)}` : ''}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {!isActive ? (
                                <button
                                  onClick={() => handleSetActivePeserta(p.id)}
                                  className="px-2.5 py-1 bg-slate-800 border border-slate-700 hover:border-amber-500 text-amber-500 rounded text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-0.5"
                                >
                                  <span>AKTIFKAN</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              ) : (
                                <span className="px-2.5 py-1 bg-amber-500 text-slate-950 text-[9px] font-black uppercase rounded-md animate-pulse">
                                  AKTIF DI ARENA
                                </span>
                              )}

                              <button
                                onClick={() => handleOpenEditModal(p)}
                                className="p-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-500 rounded transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeletePeserta(p.id, p.nama)}
                                className="p-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: KOREKSI JURI & AUDIT LOGS */}
          {activeTab === 'corrections' && (
            <motion.div 
              key="tab-corrections"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="grid grid-cols-12 gap-3 h-full items-start"
            >
              {/* Left column (Col 5): Corrections Approval */}
              <div className="col-span-12 lg:col-span-5 flex flex-col gap-3">
                <div className={`p-4 rounded-2xl border ${
                  theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <h3 className="text-xs font-black font-sport tracking-widest text-amber-500 uppercase border-b border-slate-850 pb-2 mb-3">
                    🛠️ PERSETUJUAN KOREKSI NILAI JURI
                  </h3>

                  <div className="space-y-3">
                    {pendingCorrections.length === 0 ? (
                      <div className="text-center py-10 text-xs text-slate-400">
                        Tidak ada permintaan koreksi nilai juri yang tertunda (pending).
                      </div>
                    ) : (
                      pendingCorrections.map((c) => (
                        <div 
                          key={c.juriId}
                          className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-955/10 flex flex-col gap-2"
                        >
                          <div className="flex justify-between items-center text-xs font-black uppercase text-amber-500">
                            <span>{c.juriId.toUpperCase()}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold">KOREKSI</span>
                          </div>

                          <div className="text-xs text-slate-300">
                            <div>Nama: <span className="font-extrabold text-white">{c.pesertaNama}</span></div>
                            <div className="flex gap-2 items-center mt-1">
                              <span>Original: <strong className="text-slate-400">{c.original.toFixed(3)}</strong></span>
                              <span>→</span>
                              <span>Koreksi: <strong className="text-emerald-400">{c.requested.toFixed(3)}</strong></span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-1">
                            <button
                              onClick={() => handleApproveCorrection(c.juriId)}
                              className="py-1.5 text-[9px] font-black uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg cursor-pointer transition-colors"
                            >
                              SETUJUI
                            </button>
                            <button
                              onClick={() => handleRejectCorrection(c.juriId)}
                              className="py-1.5 text-[9px] font-black uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-500 rounded-lg cursor-pointer transition-colors"
                            >
                              TOLAK
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Right column (Col 7): Live Audit Logs */}
              <div className="col-span-12 lg:col-span-7 flex flex-col gap-3">
                <div className={`p-4 rounded-2xl border ${
                  theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                } flex flex-col`}>
                  <h3 className="text-xs font-black font-sport tracking-widest text-amber-500 uppercase border-b border-slate-850 pb-2 mb-3">
                    📜 AUDIT LOGS AKTIVITAS ARENA TGR
                  </h3>

                  <div className="flex-1 overflow-y-auto space-y-2 max-h-[50vh] pr-1">
                    {state.auditLogs.length === 0 ? (
                      <div className="text-center py-10 text-xs text-slate-400">
                        Belum ada aktivitas log yang tercatat.
                      </div>
                    ) : (
                      state.auditLogs.map((log) => (
                        <div 
                          key={log.id} 
                          className="p-2 border-b border-slate-850 text-[10px] font-mono flex items-start gap-2 text-slate-300"
                        >
                          <span className="text-amber-500 font-extrabold flex-shrink-0">
                            [{new Date(log.timestamp).toLocaleTimeString()}]
                          </span>
                          <span>
                            <strong className="text-slate-200">{log.user}:</strong> {log.action}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: REKAPITULASI & CETAK RESMI */}
          {activeTab === 'rekap' && (
            <motion.div 
              key="tab-rekap"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="max-w-xl mx-auto flex flex-col gap-4"
            >
              <div className={`p-6 rounded-2xl border text-center ${
                theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-lg'
              }`}>
                <Award className="w-16 h-16 text-amber-500 mx-auto mb-3 animate-pulse" />
                <h3 className="text-base font-black font-sport tracking-widest text-amber-500 uppercase mb-1">
                  LAPORAN & REKAP NILAI KATEGORI SENI (TGR)
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
                  Unduh atau cetak seluruh hasil skoring pertandingan untuk kebutuhan arsip Dewan Hakim IPSI dan panitia penyelenggara.
                </p>

                <div className="grid grid-cols-2 gap-3.5">
                  <button
                    onClick={handleDownloadCSV}
                    className="py-3 px-4 rounded-xl font-black font-sport text-xs uppercase flex items-center justify-center gap-1.5 transition-all bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-md"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>UNDUH REKAP CSV (EXCEL)</span>
                  </button>

                  <button
                    onClick={handleExportPDF}
                    className="py-3 px-4 rounded-xl font-black font-sport text-xs uppercase flex items-center justify-center gap-1.5 transition-all bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer shadow-md"
                  >
                    <FileText className="w-4 h-4" />
                    <span>CETAK PDF RESMI</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 5: POOL MANAGEMENT (3-4+ PESERTA PER PARTAI) */}
          {activeTab === 'pool_multi' && (
            <motion.div
              key="tab-pool-multi"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="h-full w-full"
            >
              <SekretarisSeniMultiPesertaPanel
                tgrState={state}
                dispatch={dispatch}
                onClose={() => setActiveTab('control')}
                theme={theme}
                onToggleTheme={onToggleTheme}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* 3. MODAL POPUPS */}
      <AnimatePresence>
        
        {/* Connection QR Barcode Modal (Barcode System) */}
        {showQrModal && (
          <motion.div
            key="qr-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-slate-950 border border-slate-800 max-w-4xl w-full p-6 md:p-8 rounded-3xl shadow-2xl relative overflow-hidden text-slate-100 animate-none"
            >
              <div className="absolute top-1/4 left-1/3 w-[300px] h-[300px] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
              
              <div className="flex justify-between items-start mb-6 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 text-amber-500">
                    <QrCode className="w-6 h-6 text-amber-500" /> MULTI-DEVICE BARCODE SCORING TGR
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Scan Barcode/QR Code di bawah menggunakan Handphone atau Tablet untuk menyambungkan perangkat langsung ke sistem skoring seni TGR.
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[55vh] overflow-y-auto pr-1">
                {[
                  { id: 'juri1', label: 'JURI TGR 1', color: 'border-amber-500/40 bg-amber-950/10 text-amber-400' },
                  { id: 'juri2', label: 'JURI TGR 2', color: 'border-emerald-500/40 bg-emerald-950/10 text-emerald-400' },
                  { id: 'juri3', label: 'JURI TGR 3', color: 'border-sky-500/40 bg-sky-950/10 text-sky-400' },
                  { id: 'juri4', label: 'JURI TGR 4', color: 'border-blue-500/40 bg-blue-950/10 text-blue-400' },
                  { id: 'juri5', label: 'JURI TGR 5', color: 'border-purple-500/40 bg-purple-950/10 text-purple-400' },
                  { id: 'ketua', label: 'KETUA PERTANDINGAN', color: 'border-red-500/40 bg-red-950/10 text-red-400' },
                  { id: 'dewan', label: 'DEWAN TGR', color: 'border-rose-500/40 bg-rose-950/10 text-rose-400' },
                  { id: 'monitor', label: 'LAYAR MONITOR DISPLAY', color: 'border-teal-500/40 bg-teal-950/10 text-teal-400' },
                ].map((item) => {
                  const url = `${window.location.origin}${window.location.pathname}?mode=seni&role=${item.id}`;
                  
                  return (
                    <div 
                      key={item.id} 
                      className={`flex flex-col items-center p-3.5 rounded-2xl border ${item.color} relative overflow-hidden transition-all duration-300 hover:scale-[1.02] shadow-md`}
                    >
                      <span className="text-[9px] uppercase font-black tracking-widest bg-slate-900/90 px-2 py-0.5 rounded-full border border-slate-800 mb-3">
                        {item.label}
                      </span>
                      
                      <div className="p-2.5 bg-white rounded-xl shadow-lg border border-slate-200 transition-transform active:scale-95 duration-200">
                        <QRCodeSVG 
                          value={url} 
                          size={95} 
                          bgColor="#ffffff" 
                          fgColor="#0f172a" 
                          includeMargin={false} 
                          level="H"
                        />
                      </div>

                      <div className="mt-3 w-full text-center">
                        <button
                          onClick={() => {
                            playBeep('valid');
                            navigator.clipboard.writeText(url);
                            showCustomAlert('LINK BERHASIL DISALIN', `Link ${item.label} berhasil disalin ke clipboard!`);
                          }}
                          className="w-full py-1 text-[8px] uppercase font-bold tracking-wider rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          Salin Link
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Add/Edit Participant Modal popup */}
        {showAddModal && (
          <motion.div
            key="add-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[999]"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-amber-500/20 rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <h3 className="text-sm font-black font-sport tracking-widest text-amber-500 uppercase border-b border-slate-800 pb-2">
                {editingPeserta ? 'EDIT DATA PESERTA' : 'TAMBAH PESERTA BARU'}
              </h3>

              <form onSubmit={handleSavePeserta} className="space-y-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                    Nama Peserta / Tim
                  </label>
                  <input
                    type="text"
                    value={formNama}
                    onChange={(e) => setFormNama(e.target.value)}
                    className="w-full py-1.5 px-3 bg-slate-950 border border-slate-800 rounded text-xs text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                    Kontingen / Daerah
                  </label>
                  <input
                    type="text"
                    value={formKontingen}
                    onChange={(e) => setFormKontingen(e.target.value)}
                    className="w-full py-1.5 px-3 bg-slate-950 border border-slate-800 rounded text-xs text-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                      Kategori TGR
                    </label>
                    <select
                      value={formKategori}
                      onChange={(e) => setFormKategori(e.target.value)}
                      className="w-full py-1.5 px-3 bg-slate-950 border border-slate-800 rounded text-xs text-white focus:outline-none"
                    >
                      <option value="Jurus Tunggal Tangan Kosong">Jurus Tunggal Tangan Kosong</option>
                      <option value="Jurus Tunggal Senjata">Jurus Tunggal Senjata</option>
                      <option value="Jurus Ganda">Jurus Ganda</option>
                      <option value="Jurus Ganda Tangan Kosong">Jurus Ganda Tangan Kosong</option>
                      <option value="Jurus Ganda Senjata">Jurus Ganda Senjata</option>
                      <option value="Jurus Regu A">Jurus Regu A</option>
                      <option value="Jurus Regu B">Jurus Regu B</option>
                      <option value="Jurus Regu IPSI">Jurus Regu IPSI</option>
                      <option value="Jurus Bebas">Jurus Bebas</option>
                      <option value="Jurus Seni">Jurus Seni</option>
                      <option value="Tunggal">Tunggal</option>
                      <option value="Ganda">Ganda</option>
                      <option value="Regu">Regu</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">
                      No. Urut Tampil
                    </label>
                    <input
                      type="number"
                      value={formNoUrut}
                      onChange={(e) => setFormNoUrut(parseInt(e.target.value) || 1)}
                      className="w-full py-1.5 px-3 bg-slate-950 border border-slate-800 rounded text-xs text-white"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold uppercase tracking-wider text-[10px] rounded cursor-pointer"
                  >
                    BATAL
                  </button>

                  <button
                    type="submit"
                    className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase tracking-wider text-[10px] rounded cursor-pointer"
                  >
                    SIMPAN ROSTER
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Custom Confirmation Dialog */}
        {customConfirm && customConfirm.show && (
          <motion.div
            key="custom-confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[99999] flex items-center justify-center p-4 animate-none"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 max-w-sm w-full p-6 rounded-2xl shadow-2xl text-center"
            >
              <h3 className="text-sm font-black text-amber-500 uppercase tracking-widest mb-2 font-sport">
                {customConfirm.title}
              </h3>
              <p className="text-xs text-slate-350 mb-6 font-medium">
                {customConfirm.message}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    playBeep('valid');
                    customConfirm.onConfirm();
                    setCustomConfirm(null);
                  }}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase tracking-wider text-[10px] rounded transition-transform active:scale-95 cursor-pointer"
                >
                  Ya, Lanjutkan
                </button>
                <button
                  onClick={() => {
                    playBeep('click');
                    setCustomConfirm(null);
                  }}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase tracking-wider text-[10px] border border-slate-700 rounded transition-transform active:scale-95 cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Custom Alert Dialog */}
        {customAlert && customAlert.show && (
          <motion.div
            key="custom-alert"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[99999] flex items-center justify-center p-4 animate-none"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 max-w-sm w-full p-6 rounded-2xl shadow-2xl text-center"
            >
              <h3 className="text-sm font-black text-amber-500 uppercase tracking-widest mb-2 font-sport">
                {customAlert.title}
              </h3>
              <p className="text-xs text-slate-350 mb-6 font-medium">
                {customAlert.message}
              </p>
              <button
                onClick={() => {
                  playBeep('click');
                  setCustomAlert(null);
                }}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase tracking-wider text-[10px] border border-slate-700 rounded transition-transform active:scale-95 cursor-pointer"
              >
                Tutup
              </button>
            </motion.div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* 4. FOOTER STATUS BAR */}
      <footer className={`border-t px-4 py-2 flex items-center justify-between text-[8px] font-mono tracking-widest uppercase flex-shrink-0 ${
        theme === 'dark' ? 'border-slate-900 bg-slate-950 text-slate-600' : 'border-slate-200 bg-white text-slate-400'
      }`}>
        <span>IPSI DIGITAL SCORING TGR SEKRETARIS CONTROLLER</span>
        <span>Akses Admin: sekretaris2026 | Timer Sync Online</span>
      </footer>
    </div>
  );
}

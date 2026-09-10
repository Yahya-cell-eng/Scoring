import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Printer, Download, Calendar, Clock, MapPin, FileText, CheckCircle2, 
  ListOrdered, Search, Filter, X, Shield, Award, Users, ChevronRight, Eye, RefreshCw,
  Sparkles, Layers, CheckSquare, Trophy, Upload, Plus, Edit3, Trash2, Wand2, Copy,
  FileSpreadsheet, AlertCircle, FileUp, Image as ImageIcon
} from 'lucide-react';
import { MatchState, TGRState, MatchHistory, BaganCategory, BaganMatch } from '../types';
import { playBeep } from '../utils/sound';
import safeHtml2canvas from '../utils/safeHtml2canvas';
import { jsPDF } from 'jspdf';
import OfficialIpsiScheduleSheet from './OfficialIpsiScheduleSheet';
import sekretarisImg from '../assets/images/sekretaris_panel_1782782300726.jpg';
import { 
  parseRawAthletesData, 
  parseExcelFile, 
  downloadOfficialExcelTemplate, 
  exportAthletesToExcelFile, 
  autoGroupAllAthletes,
  ParsedAthleteRecord 
} from '../utils/smartDataParser';
import { getNextMatchTarget } from '../utils/bracketProgression';
import { generateSchedulePdf, exportScheduleToExcel, printScheduleElement, ScheduleMatchRow, ScheduleMetadata } from '../utils/generateSchedulePdf';
import AturUrutanPartaiModal from './AturUrutanPartaiModal';
import EditJadwalPartaiModal from './EditJadwalPartaiModal';

interface PortalSekretarisJadwalModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: MatchState | null;
  tgrState: TGRState | null;
  histories?: MatchHistory[];
  onOpenSekretarisTanding: () => void;
  onOpenSekretarisSeni: () => void;
  dispatch?: (type: string, payload?: any) => void;
}

export type ScheduleItemType = 'tanding' | 'seni';

export interface UnifiedScheduleItem {
  id: string;
  type: ScheduleItemType;
  orderNumber: number;
  partaiLabel: string;
  categoryName: string;
  genderOrDetail: string;
  roundOrJurus: string;
  // Merah / Pesilat 1
  party1Name: string;
  party1Kontingen: string;
  // Biru / Pesilat 2 (or second info for Seni)
  party2Name: string;
  party2Kontingen: string;
  // Status & Result
  status: 'live' | 'selesai' | 'terjadwal';
  winnerOrScore: string;
  progressionNote?: string;
  ranking?: number;
  rawTanding?: any;
  rawSeni?: any;
}

export default function PortalSekretarisJadwalModal({
  isOpen,
  onClose,
  state,
  tgrState,
  histories = [],
  onOpenSekretarisTanding,
  onOpenSekretarisSeni,
  dispatch
}: PortalSekretarisJadwalModalProps) {
  // Mode: 'all' (Jadwal Jadi Satu), 'tanding', 'seni', 'smart_input' (Input Data Otomatis)
  const [activeTab, setActiveTab] = useState<'all' | 'tanding' | 'seni' | 'smart_input'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'selesai' | 'terjadwal'>('all');

  // Custom Header States matching official tournament format (Jombang Pencak Silat Championship - II)
  const [headerTitle, setHeaderTitle] = useState(state?.namaEvent || "JOMBANG PENCAK SILAT CHAMPIONSHIP - II");
  const [headerSubtitle, setHeaderSubtitle] = useState("KEJUARAAN PENCAK SILAT");
  const [headerLocationDate, setHeaderLocationDate] = useState("Jombang, 16 s/d 18 Januari 2026");
  const [gelanggang, setGelanggang] = useState("ARENA 3");
  const [hariTanggal, setHariTanggal] = useState("JUM'AT, 16 JANUARI 2026");
  const [sesi, setSesi] = useState("1 - PAGI");
  const [pukul, setPukul] = useState("07:00 - SELESAI");
  const [kelasCategory, setKelasCategory] = useState("SENI | PEMASALAN");
  const [scheduleLayout, setScheduleLayout] = useState<'auto' | 'seni_pool' | 'tanding_standard' | 'tanding_pool_bracket'>('auto');
  const [emptyRowsCount, setEmptyRowsCount] = useState(2);
  const [isExporting, setIsExporting] = useState(false);
  const [showAturUrutanModal, setShowAturUrutanModal] = useState(false);
  const [showEditJadwalModal, setShowEditJadwalModal] = useState(false);

  // Logo Customization States (Logo Kiri = Federasi/IPSI/KONI, Logo Kanan = Kejuaraan/Daerah/Event)
  const [logoKiri, setLogoKiri] = useState<string | null>(() => {
    return state?.logoKiri || localStorage.getItem('silat_schedule_logo_kiri') || localStorage.getItem('silat_logo_kiri') || null;
  });
  const [logoKanan, setLogoKanan] = useState<string | null>(() => {
    return state?.logoKanan || localStorage.getItem('silat_schedule_logo_kanan') || localStorage.getItem('silat_logo_kanan') || null;
  });

  // Smart Input Data Otomatis States
  const [inputMode, setInputMode] = useState<'excel' | 'text'>('excel');
  const [rawInputText, setRawInputText] = useState('');
  const [parsedPreviewList, setParsedPreviewList] = useState<ParsedAthleteRecord[]>([]);
  const [pesertaPerBaganSetting, setPesertaPerBaganSetting] = useState<4 | 8 | 16>(4);
  const [seniPesertaPerPoolSetting, setSeniPesertaPerPoolSetting] = useState<number>(4);
  const [isLoadingExcel, setIsLoadingExcel] = useState(false);
  const [excelLoadedFileName, setExcelLoadedFileName] = useState<string | null>(null);
  const [excelErrorMsg, setExcelErrorMsg] = useState<string | null>(null);

  const printAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoKiriInputRef = useRef<HTMLInputElement>(null);
  const logoKananInputRef = useRef<HTMLInputElement>(null);

  // Handle Logo Uploads
  const handleUploadLogoKiri = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLogoKiri(base64);
      localStorage.setItem('silat_schedule_logo_kiri', base64);
      localStorage.setItem('silat_logo_kiri', base64);
      if (dispatch) {
        dispatch('SET_STATE', { logoKiri: base64 });
      }
      playBeep('valid');
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  const handleUploadLogoKanan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLogoKanan(base64);
      localStorage.setItem('silat_schedule_logo_kanan', base64);
      localStorage.setItem('silat_logo_kanan', base64);
      if (dispatch) {
        dispatch('SET_STATE', { logoKanan: base64 });
      }
      playBeep('valid');
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  const handleRemoveLogoKiri = () => {
    setLogoKiri(null);
    localStorage.removeItem('silat_schedule_logo_kiri');
    localStorage.removeItem('silat_logo_kiri');
    if (dispatch) {
      dispatch('SET_STATE', { logoKiri: null });
    }
    playBeep('click');
  };

  const handleRemoveLogoKanan = () => {
    setLogoKanan(null);
    localStorage.removeItem('silat_schedule_logo_kanan');
    localStorage.removeItem('silat_logo_kanan');
    if (dispatch) {
      dispatch('SET_STATE', { logoKanan: null });
    }
    playBeep('click');
  };

  // Handle Smart Parser Real-time Analysis
  const handleAnalyzeRawText = (text: string) => {
    setRawInputText(text);
    const parsed = parseRawAthletesData(text);
    setParsedPreviewList(parsed);
    setExcelLoadedFileName(null);
    setExcelErrorMsg(null);
  };

  // Handle Excel File Upload (.xlsx, .xls, .csv)
  const handleUploadExcelFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    await processSelectedExcelFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processSelectedExcelFile = async (file: File) => {
    setIsLoadingExcel(true);
    setExcelErrorMsg(null);
    try {
      playBeep('click');
      const parsedRecords = await parseExcelFile(file);
      if (parsedRecords.length === 0) {
        setExcelErrorMsg("File Excel terbaca kosong atau format tidak dikenali. Silakan gunakan template resmi.");
      } else {
        setParsedPreviewList(parsedRecords);
        setExcelLoadedFileName(file.name);
        playBeep('valid');
      }
    } catch (err: any) {
      console.error("Gagal membaca file Excel:", err);
      setExcelErrorMsg(`Gagal memproses file Excel: ${err?.message || 'Format tidak didukung'}`);
    } finally {
      setIsLoadingExcel(false);
    }
  };

  const handleDownloadExcelTemplate = () => {
    playBeep('click');
    downloadOfficialExcelTemplate();
  };

  const handleExportParsedExcel = () => {
    if (parsedPreviewList.length === 0) return;
    playBeep('click');
    exportAthletesToExcelFile(parsedPreviewList, 'Data_Atlet_IPSI_Terdaftar.xlsx');
  };

  const handleLoadSampleData = () => {
    playBeep('click');
    const sample = `1. HIDAYAT LIMONU - SULAWESI UTARA - Tanding B PA Dewasa
2. YUDHA MAHENDRI - RIAU - Tanding B PA Dewasa
3. MUH ISKANDAR - PAPUA - Tanding B PA Dewasa
4. ALAMSYAH - KALIMANTAN TIMUR - Tanding B PA Dewasa
5. AFRIANI LAURENSIA - SUMATERA UTARA - Kelas B PI Dewasa
6. SUCI WULANDARI - SUMATERA BARAT - Kelas B PI Dewasa
7. NADIA HAQ U N C - JAWA TENGAH - Kelas B PI Dewasa
8. ADELA EARLENE S - JAWA TIMUR - Kelas B PI Dewasa
9. KHOLIL RAHMAN A A - NTT - Tanding C PA Dewasa
10. M YUSUF HANAS - SULAWESI SELATAN - Tanding C PA Dewasa
11. WEWEY WITA - JAWA BARAT - Tanding C PI Dewasa
12. INGON SARESA D - PAPUA - Tanding C PI Dewasa
13. FAJAR RAMADHAN - BANTEN - Kelas A Remaja Putra
14. ANDI WIJAYA - DKI JAKARTA - Kelas A Remaja Putra
15. AHMAD FAUZI - JAWA BARAT - Seni Tunggal Putra Dewasa
16. SITI RAHMA - JAWA TENGAH - Seni Tunggal Putri Dewasa`;

    setInputMode('text');
    handleAnalyzeRawText(sample);
  };

  // Helper match generator
  const generateBracketMatches = (size: number): BaganMatch[] => {
    const matches: BaganMatch[] = [];
    if (size === 2) {
      matches.push({ id: 1, round: 'final', partai: 'Partai TBD', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null });
    } else if (size === 4) {
      matches.push({ id: 1, round: 'semi', partai: 'Partai TBD', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null });
      matches.push({ id: 2, round: 'semi', partai: 'Partai TBD', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null });
      matches.push({ id: 3, round: 'final', partai: 'Partai TBD', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null });
    } else if (size === 8) {
      for (let i = 1; i <= 4; i++) {
        matches.push({ id: i, round: 'quarter', partai: 'Partai TBD', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null });
      }
      for (let i = 5; i <= 6; i++) {
        matches.push({ id: i, round: 'semi', partai: 'Partai TBD', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null });
      }
      matches.push({ id: 7, round: 'final', partai: 'Partai TBD', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null });
    } else if (size === 16) {
      for (let i = 1; i <= 8; i++) {
        matches.push({ id: i, round: 'eighth', partai: 'Partai TBD', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null });
      }
      for (let i = 9; i <= 12; i++) {
        matches.push({ id: i, round: 'quarter', partai: 'Partai TBD', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null });
      }
      for (let i = 13; i <= 14; i++) {
        matches.push({ id: i, round: 'semi', partai: 'Partai TBD', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null });
      }
      matches.push({ id: 15, round: 'final', partai: 'Partai TBD', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null });
    }
    return matches;
  };

  // Process & Apply Smart Input Data to State and Schedules
  const handleApplySmartParsedData = async () => {
    if (parsedPreviewList.length === 0) {
      alert("Masukkan dan analisis data atlet terlebih dahulu!");
      return;
    }

    playBeep('valid');

    // Use unified smart parser with automatic category/age/gender/class segregation and progression
    const { tandingCategories, seniPesertaList } = autoGroupAllAthletes(
      parsedPreviewList,
      pesertaPerBaganSetting,
      seniPesertaPerPoolSetting || 4
    );

    // Save to localStorage
    localStorage.setItem('silat_bagan_data', JSON.stringify(tandingCategories));
    
    // Convert to registered athletes format
    const tandingAthletes = parsedPreviewList.filter(p => p.kategoriType === 'Tanding');
    const registeredAthletes = tandingAthletes.map(a => ({
      id: a.id,
      nama: a.nama,
      kontingen: a.kontingen,
      kelas: a.kelas,
      usia: a.kategoriUsia,
      gender: a.gender
    }));
    localStorage.setItem('silat_registered_athletes', JSON.stringify(registeredAthletes));

    // Also handle Seni if present
    if (seniPesertaList.length > 0) {
      localStorage.setItem('tgr_peserta_list', JSON.stringify(seniPesertaList));
      if (dispatch) {
        dispatch('UPDATE_TGR_PESERTA_LIST', { pesertaList: seniPesertaList });
      }
    }

    // Broadcast update categories
    if (dispatch) {
      dispatch('UPDATE_BAGAN_CATEGORIES', { categories: tandingCategories });
    }

    alert(`Berhasil memisahkan otomatis ${parsedPreviewList.length} atlet ke dalam ${tandingCategories.length} bagan tanding & pool seni dengan alur partai pemenang otomatis!`);
    setActiveTab('all');
  };

  // Distribute across ALL active arenas automatically based on contingents, categories, and modes
  const handleDistributeToAllActiveArenas = async () => {
    if (parsedPreviewList.length === 0) {
      alert("Masukkan dan analisis data atlet terlebih dahulu!");
      return;
    }

    playBeep('valid');

    const { tandingCategories, seniPesertaList } = autoGroupAllAthletes(
      parsedPreviewList,
      pesertaPerBaganSetting,
      seniPesertaPerPoolSetting || 4
    );

    if (dispatch) {
      dispatch('DISTRIBUTE_EXCEL_ALL_ARENAS', {
        tandingCategories,
        seniPesertaList
      });
    }

    alert(`Berhasil membagi data ${parsedPreviewList.length} atlet secara otomatis ke semua Gelanggang Aktif!\n\n• Atlet satu kontingen dipisahkan agar tidak bertemu di babak awal\n• Kategori usia, jenis kelamin, dan kelas terpisah rapi\n• Kategori lomba (Tanding dan Seni) dialokasikan sesuai mode gelanggang aktif\n• Layar monitor partai dan gelanggang langsung tersinkronisasi.`);
    setActiveTab('all');
  };

  // 1. Build unified schedule items
  const unifiedItems: UnifiedScheduleItem[] = useMemo(() => {
    const list: UnifiedScheduleItem[] = [];

    // TANDING Matches
    if (state?.baganCategories) {
      state.baganCategories.forEach((cat) => {
        cat.matches.forEach((m) => {
          const isLive = state.activeBaganCategoryId === cat.id && state.activeBaganMatchId === m.id;
          const partaiNum = parseInt((m.partai || '').replace(/\D/g, ''), 10) || 999;
          
          let status: 'live' | 'selesai' | 'terjadwal' = 'terjadwal';
          if (isLive) status = 'live';
          else if (m.winner) status = 'selesai';

          let winnerText = '-';
          if (m.winner === 'merah') winnerText = 'MENANG MERAH';
          else if (m.winner === 'biru') winnerText = 'MENANG BIRU';

          // Calculate winner progression info
          const nextTarget = getNextMatchTarget(cat, m.id);
          let progressionNote = '';
          if (nextTarget && nextTarget.targetMatchId) {
            if (m.winner) {
              progressionNote = `Lolos ke ${nextTarget.targetPartaiLabel} (${nextTarget.targetSide === 'Merah' ? 'Sudut Merah' : 'Sudut Biru'})${nextTarget.isFinal ? ' [FINAL]' : ''}`;
            } else {
              progressionNote = `Pemenang ke ${nextTarget.targetPartaiLabel} (${nextTarget.targetSide === 'Merah' ? 'Sudut Merah' : 'Sudut Biru'})${nextTarget.isFinal ? ' [FINAL]' : ''}`;
            }
          } else if (nextTarget && nextTarget.isFinal) {
            progressionNote = 'Perebutan Juara 1 & 2';
          }

          list.push({
            id: `tanding_${cat.id}_${m.id}`,
            type: 'tanding',
            orderNumber: partaiNum,
            partaiLabel: m.partai || `Partai ${partaiNum}`,
            categoryName: `[TANDING] ${cat.name}`,
            genderOrDetail: cat.gender,
            roundOrJurus: m.round,
            party1Name: m.atletMerah.nama || 'Pemenang Sebelumnya',
            party1Kontingen: m.atletMerah.kontingen || '-',
            party2Name: m.atletBiru.nama || 'Pemenang Sebelumnya',
            party2Kontingen: m.atletBiru.kontingen || '-',
            status,
            winnerOrScore: winnerText,
            progressionNote,
            rawTanding: { cat, match: m }
          });
        });
      });
    }

    // SENI TGR Peserta
    if (tgrState?.pesertaList) {
      tgrState.pesertaList.forEach((p) => {
        const orderNum = p.noUrut || 999;
        const isLive = tgrState.activePesertaId === p.id && tgrState.timerActive;
        
        let status: 'live' | 'selesai' | 'terjadwal' = 'terjadwal';
        if (isLive || p.status === 'Sedang Tampil') status = 'live';
        else if (p.status === 'Sudah Menilai' || p.finalScore !== undefined) status = 'selesai';

        let scoreText = '-';
        if (p.finalScore !== undefined) {
          scoreText = `Skor: ${p.finalScore.toFixed(3)}${p.ranking ? ` (#${p.ranking})` : ''}`;
        }

        let poolNote = p.poolName || '';
        if (p.isFinalPool) {
          poolNote = '🏆 POOL FINAL (Perebutan Medali)';
        }

        list.push({
          id: `seni_${p.id}`,
          type: 'seni',
          orderNumber: orderNum,
          partaiLabel: `Partai ${orderNum} (Seni)`,
          categoryName: `[SENI TGR] ${p.kategori}`,
          genderOrDetail: p.kategori,
          roundOrJurus: p.kategori,
          party1Name: p.nama,
          party1Kontingen: p.kontingen,
          party2Name: `Kategori: ${p.kategori}`,
          party2Kontingen: `No Urut ${p.noUrut}`,
          status,
          winnerOrScore: scoreText,
          progressionNote: poolNote,
          ranking: p.ranking,
          rawSeni: p
        });
      });
    }

    // Sort combined list numerically by orderNumber
    list.sort((a, b) => {
      if (a.orderNumber !== b.orderNumber) {
        return a.orderNumber - b.orderNumber;
      }
      return a.type === 'tanding' ? -1 : 1;
    });

    return list;
  }, [state, tgrState]);

  // 2. Filtered list based on tab, query, status
  const filteredSchedule = useMemo(() => {
    return unifiedItems.filter((item) => {
      // Tab filter
      if (activeTab === 'tanding' && item.type !== 'tanding') return false;
      if (activeTab === 'seni' && item.type !== 'seni') return false;

      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuery = 
          item.partaiLabel.toLowerCase().includes(q) ||
          item.categoryName.toLowerCase().includes(q) ||
          item.party1Name.toLowerCase().includes(q) ||
          item.party1Kontingen.toLowerCase().includes(q) ||
          item.party2Name.toLowerCase().includes(q) ||
          item.party2Kontingen.toLowerCase().includes(q) ||
          item.roundOrJurus.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      return true;
    });
  }, [unifiedItems, activeTab, statusFilter, searchQuery]);

  // Statistics counters
  const totalMatches = unifiedItems.length;
  const totalTanding = unifiedItems.filter(i => i.type === 'tanding').length;
  const totalSeni = unifiedItems.filter(i => i.type === 'seni').length;
  const totalLive = unifiedItems.filter(i => i.status === 'live').length;
  const totalSelesai = unifiedItems.filter(i => i.status === 'selesai').length;

  // Metadata & Rows builders
  const getScheduleMeta = (): ScheduleMetadata => ({
    headerTitle,
    headerSubtitle,
    headerLocationDate,
    lokasiTanggal: headerLocationDate,
    gelanggang,
    hariTanggal,
    sesiNama: sesi,
    sesiWaktu: pukul,
    fase: kelasCategory || 'Pertandingan Resmi',
    layoutStyle: scheduleLayout === 'auto' ? 'standard' : scheduleLayout,
    logoKiri,
    logoKanan,
    showSignatures: true
  });

  const getScheduleRows = (): ScheduleMatchRow[] => {
    return filteredSchedule.map((item, idx) => {
      let kelasDisplay = item.genderOrDetail;
      if (item.rawTanding?.cat) {
        const cat = item.rawTanding.cat;
        const kLetter = (cat.kelas || cat.name).replace(/kelas\s*/i, '').trim().split(' ')[0];
        const gTag = cat.gender === 'Putra' ? 'PA' : 'PI';
        kelasDisplay = `${kLetter} / ${gTag}`;
      } else if (item.type === 'seni') {
        const catSeni = item.rawSeni?.kategori || item.categoryName;
        kelasDisplay = catSeni.toUpperCase();
      }

      return {
        no: idx + 1,
        partai: item.partaiLabel.replace(/\D/g, '') || String(item.orderNumber),
        kelas: kelasDisplay,
        roundLabel: item.roundOrJurus,
        merahNama: item.party1Name || '-',
        merahKontingen: item.party1Kontingen || '-',
        biruNama: item.party2Name || '-',
        biruKontingen: item.party2Kontingen || '-',
        remark: item.winnerOrScore && item.winnerOrScore !== '-' ? item.winnerOrScore : (item.status === 'live' ? 'LIVE' : '')
      };
    });
  };

  const handlePrint = () => {
    playBeep('valid');
    if (printAreaRef.current) {
      printScheduleElement(printAreaRef.current);
    } else {
      window.print();
    }
  };

  const handleExportExcel = () => {
    playBeep('valid');
    exportScheduleToExcel(getScheduleMeta(), getScheduleRows());
  };

  const handleExportPdf = async () => {
    playBeep('click');
    setIsExporting(true);

    try {
      // First attempt native vector multi-page generation for razor-sharp text
      generateSchedulePdf(getScheduleMeta(), getScheduleRows());
      playBeep('valid');
    } catch (err) {
      console.warn("Falling back to canvas PDF generation:", err);
      if (printAreaRef.current) {
        try {
          const canvas = await safeHtml2canvas(printAreaRef.current, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.98);
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`Jadwal_Resmi_${headerTitle.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
          playBeep('valid');
        } catch (canvasErr) {
          console.error("PDF generation failed completely:", canvasErr);
        }
      }
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-6xl bg-[#060919] border border-blue-500/40 rounded-2xl shadow-[0_0_50px_rgba(59,130,246,0.25)] text-slate-100 flex flex-col max-h-[94vh] overflow-hidden"
      >
        {/* Modal Top Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-purple-900/40 bg-gradient-to-r from-[#0d0722] via-[#090b20] to-[#0d0722]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-purple-500/70 bg-slate-950 flex items-center justify-center p-0.5 shadow-[0_0_15px_rgba(168,85,247,0.4)] shrink-0">
              <img
                src={sekretarisImg}
                alt="Sekretaris Utama"
                className="w-full h-full object-contain rounded-full"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wide uppercase text-white flex items-center gap-2 font-sport">
                <span>SEKRETARIS UTAMA &bull; JADWAL PERTANDINGAN</span>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-purple-500/20 border border-purple-400/40 text-purple-300">
                  TANDING & SENI (IPSI / PON XX)
                </span>
              </h2>
              <p className="text-[10px] font-mono text-slate-400 tracking-wider uppercase">
                Input Data Otomatis, Pemisahan Kategori/Kelas/Usia, dan Cetak Jadwal Terpadu
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                playBeep('click');
                onClose();
                onOpenSekretarisTanding();
              }}
              className="px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Sekretaris Tanding</span>
            </button>

            <button
              onClick={() => {
                playBeep('click');
                onClose();
                onOpenSekretarisSeni();
              }}
              className="px-3 py-1.5 rounded-lg bg-purple-950 hover:bg-purple-900 border border-purple-500/50 text-purple-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow cursor-pointer"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Sekretaris Seni</span>
            </button>

            <button
              onClick={() => {
                playBeep('click');
                onClose();
              }}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-Header Tabs & Quick Action Buttons */}
        <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-950/70 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* Primary Unified Choice */}
            <button
              onClick={() => {
                playBeep('click');
                setActiveTab('all');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] border border-emerald-400/50'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Jadwal Jadi Satu ({totalMatches} Partai)</span>
            </button>

            {/* Smart Auto-Parser Input Tab */}
            <button
              onClick={() => {
                playBeep('click');
                setActiveTab('smart_input');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'smart_input'
                  ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)] border border-amber-400/50'
                  : 'bg-amber-950/40 text-amber-300 hover:text-amber-100 border border-amber-500/30'
              }`}
            >
              <Wand2 className="w-4 h-4 text-amber-200" />
              <span>Input Data Otomatis</span>
            </button>

            {/* Filter to Tanding only */}
            <button
              onClick={() => {
                playBeep('click');
                setActiveTab('tanding');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'tanding'
                  ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] border border-cyan-400/40'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Tanding Saja ({totalTanding})</span>
            </button>

            {/* Filter to Seni only */}
            <button
              onClick={() => {
                playBeep('click');
                setActiveTab('seni');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'seni'
                  ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] border border-purple-400/40'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Seni TGR Saja ({totalSeni})</span>
            </button>
          </div>

          {/* Action Tools (Search, Print, Export PDF) */}
          {activeTab !== 'smart_input' && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari partai / atlet / kontingen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-44 sm:w-56"
                />
              </div>

              <button
                onClick={() => {
                  playBeep('click');
                  setShowEditJadwalModal(true);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95"
                title="Koreksi Nama Pesilat, Kontingen, Babak, atau Nomor Partai Sebelum Dicetak"
              >
                <Edit3 className="w-3.5 h-3.5 text-emerald-200" />
                <span>✏️ Edit Jadwal</span>
              </button>

              <button
                onClick={() => {
                  playBeep('click');
                  setShowAturUrutanModal(true);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                title="Atur & Urutkan Ulang Nomor Partai (Standar IPSI / Babak / Kategori)"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Atur Urutan Partai</span>
              </button>

              <button
                onClick={handleExportExcel}
                className="px-3.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Unduh Excel</span>
              </button>

              <button
                onClick={handleExportPdf}
                disabled={isExporting}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting ? 'Mengekspor...' : 'Unduh PDF Resmi'}</span>
              </button>

              <button
                onClick={handlePrint}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Jadwal</span>
              </button>
            </div>
          )}
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* TAB 1: SMART AUTO-PARSER (INPUT DATA OTOMATIS EXCEL & TEKS) */}
          {activeTab === 'smart_input' ? (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/40 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-black uppercase text-amber-200 flex items-center gap-2">
                        <span>Input Data Otomatis via Excel & Smart Parser</span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
                          .XLSX / .XLS / .CSV
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400 font-mono">
                        Unggah file Excel atau tempel teks daftar atlet. Sistem otomatis memisahkan Kategori, Kelas, Kategori Usia, Gender, Nama & Kontingen.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handleDownloadExcelTemplate}
                      className="px-3 py-1.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-800/80 border border-emerald-400/40 text-emerald-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Unduh Template Excel</span>
                    </button>

                    <button
                      onClick={handleLoadSampleData}
                      className="px-3 py-1.5 rounded-lg bg-amber-900/60 hover:bg-amber-800/80 border border-amber-400/40 text-amber-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Contoh Format PON</span>
                    </button>
                  </div>
                </div>

                {/* Input Mode Selector */}
                <div className="flex items-center gap-2 mb-4 p-1 bg-slate-950/80 border border-slate-800 rounded-xl w-fit">
                  <button
                    onClick={() => setInputMode('excel')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                      inputMode === 'excel'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Upload File Excel (.xlsx / .xls)</span>
                  </button>

                  <button
                    onClick={() => setInputMode('text')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                      inputMode === 'text'
                        ? 'bg-amber-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Tempel Teks Bebas</span>
                  </button>
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleUploadExcelFile}
                  className="hidden"
                />

                {/* Mode 1: Excel File Upload Dropzone */}
                {inputMode === 'excel' ? (
                  <div className="space-y-3">
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                          await processSelectedExcelFile(e.dataTransfer.files[0]);
                        }
                      }}
                      className="border-2 border-dashed border-emerald-500/50 hover:border-emerald-400 bg-slate-950/70 hover:bg-emerald-950/20 p-8 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform mb-3 shadow-lg">
                        <FileUp className="w-7 h-7" />
                      </div>
                      <h4 className="text-sm font-black text-slate-200 uppercase tracking-wide group-hover:text-emerald-300">
                        {isLoadingExcel ? 'Sedang Memproses Excel...' : 'Klik atau Seret (Drag & Drop) File Excel ke Sini'}
                      </h4>
                      <p className="text-xs text-slate-400 font-mono mt-1 max-w-md">
                        Mendukung format spreadsheet <strong className="text-emerald-400 font-bold">.XLSX, .XLS, .CSV</strong> dengan kolom Nama Atlet, Kontingen, Kategori, Kelas, Usia & Gender.
                      </p>
                      
                      {excelLoadedFileName && (
                        <div className="mt-4 px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-400/50 text-emerald-200 text-xs font-mono font-bold flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>File Terbaca: {excelLoadedFileName}</span>
                        </div>
                      )}
                    </div>

                    {excelErrorMsg && (
                      <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-xl text-xs font-mono text-red-200 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                        <span>{excelErrorMsg}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Mode 2: Textarea for Raw Data Input */
                  <div className="space-y-2">
                    <label className="block text-xs font-mono font-bold text-amber-300 uppercase">
                      Tempel Data Atlet di Sini (Bebas Format):
                    </label>
                    <textarea
                      rows={7}
                      value={rawInputText}
                      onChange={(e) => handleAnalyzeRawText(e.target.value)}
                      placeholder="Contoh:&#10;1. HIDAYAT LIMONU - SULAWESI UTARA - Tanding B PA Dewasa&#10;2. YUDHA MAHENDRI - RIAU - Tanding B PA Dewasa&#10;3. AFRIANI LAURENSIA (SUMATERA UTARA) Kelas B PI Dewasa&#10;4. AHMAD FAUZI - JAWA BARAT - Seni Tunggal Putra Dewasa"
                      className="w-full p-3.5 bg-slate-950/90 border border-slate-700/90 rounded-xl text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    ></textarea>
                  </div>
                )}

                {/* Configuration Options */}
                <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-6 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-cyan-400 uppercase font-bold">Bagan Tanding:</span>
                      <div className="flex items-center gap-1">
                        {[4, 8, 16].map((sz) => (
                          <button
                            key={sz}
                            onClick={() => setPesertaPerBaganSetting(sz as 4 | 8 | 16)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                              pesertaPerBaganSetting === sz
                                ? 'bg-cyan-500 text-black font-black shadow-md'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {sz} Peserta
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-purple-400 uppercase font-bold">Pool Seni:</span>
                      <div className="flex items-center gap-1">
                        {[4, 6, 8].map((sz) => (
                          <button
                            key={sz}
                            onClick={() => setSeniPesertaPerPoolSetting(sz)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                              seniPesertaPerPoolSetting === sz
                                ? 'bg-purple-500 text-white font-black shadow-md'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {sz} / Pool
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {parsedPreviewList.length > 0 && (
                      <button
                        onClick={handleExportParsedExcel}
                        className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Ekspor Excel</span>
                      </button>
                    )}

                    <button
                      onClick={handleApplySmartParsedData}
                      disabled={parsedPreviewList.length === 0}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                      title="Terapkan jadwal hanya ke gelanggang saat ini"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Terapkan ke Gelanggang Ini</span>
                    </button>

                    <button
                      onClick={handleDistributeToAllActiveArenas}
                      disabled={parsedPreviewList.length === 0}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] disabled:opacity-50 cursor-pointer"
                      title="Otomatis bagi kontingen, kelas, usia & lomba ke seluruh gelanggang aktif"
                    >
                      <Sparkles className="w-4 h-4 text-slate-950" />
                      <span>Bagi Otomatis ke Seluruh Gelanggang Aktif ({parsedPreviewList.length} Atlet)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Real-time Parsed Preview Table */}
              {parsedPreviewList.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono uppercase font-black text-cyan-300 flex items-center gap-2">
                      <span>Hasil Analisis Otomatis: {parsedPreviewList.length} Peserta Terdeteksi</span>
                    </h4>
                    <span className="text-[11px] font-mono text-slate-400">
                      Tanding: {parsedPreviewList.filter(p => p.kategoriType === 'Tanding').length} • Seni: {parsedPreviewList.filter(p => p.kategoriType !== 'Tanding').length}
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-slate-800 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[10px] uppercase font-mono">
                          <th className="py-2 px-3 text-center w-10">No</th>
                          <th className="py-2 px-3">Nama Atlet</th>
                          <th className="py-2 px-3">Kontingen</th>
                          <th className="py-2 px-3 text-center">Jenis</th>
                          <th className="py-2 px-3 text-center">Kelas</th>
                          <th className="py-2 px-3 text-center">Kategori Usia</th>
                          <th className="py-2 px-3 text-center">Gender</th>
                          <th className="py-2 px-3 text-center">Format IPSI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {parsedPreviewList.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-slate-800/40">
                            <td className="py-2 px-3 text-center text-slate-500">{idx + 1}</td>
                            <td className="py-2 px-3 font-bold text-white uppercase">{item.nama}</td>
                            <td className="py-2 px-3 font-semibold text-slate-300 uppercase">{item.kontingen}</td>
                            <td className="py-2 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                item.kategoriType === 'Tanding' ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40' : 'bg-purple-950 text-purple-300 border border-purple-500/40'
                              }`}>
                                {item.kategoriType}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center text-amber-300 font-bold">{item.kelas}</td>
                            <td className="py-2 px-3 text-center text-emerald-300">{item.kategoriUsia}</td>
                            <td className="py-2 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.gender === 'Putra' ? 'text-blue-300' : 'text-pink-300'
                              }`}>
                                {item.gender}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center font-black text-yellow-400">
                              {item.kelasDisplay}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: UNIFIED RUN-SHEET & OFFICIAL PRINT PREVIEW */
            <div className="space-y-6">
              
              {/* Header Metadata & Logo Customization Section */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
                
                {/* 1. Header Information Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
                  <div className="lg:col-span-2">
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Nama Kejuaraan / Event</label>
                    <input
                      type="text"
                      value={headerTitle}
                      onChange={(e) => setHeaderTitle(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-200 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Lokasi & Rentang Tanggal</label>
                    <input
                      type="text"
                      value={headerLocationDate}
                      onChange={(e) => setHeaderLocationDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Arena / Gelanggang</label>
                    <input
                      type="text"
                      value={gelanggang}
                      onChange={(e) => setGelanggang(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-200 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Hari & Tanggal</label>
                    <input
                      type="text"
                      value={hariTanggal}
                      onChange={(e) => setHariTanggal(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Sesi</label>
                    <input
                      type="text"
                      value={sesi}
                      onChange={(e) => setSesi(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Pukul / Jam</label>
                    <input
                      type="text"
                      value={pukul}
                      onChange={(e) => setPukul(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-200 font-mono"
                    />
                  </div>
                </div>

                {/* Layout Model Selector Strip */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold uppercase text-amber-400">Pilih Model Layout Jadwal:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => {
                          setScheduleLayout('seni_pool');
                          setKelasCategory('SENI | PEMASALAN');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          scheduleLayout === 'seni_pool'
                            ? 'bg-amber-400 text-black shadow-lg shadow-amber-500/20'
                            : 'bg-slate-950 text-slate-300 border border-slate-700 hover:bg-slate-800'
                        }`}
                      >
                        🎨 Model 1: Seni Pool (Hal 1, 2, 8, 9)
                      </button>

                      <button
                        onClick={() => {
                          setScheduleLayout('tanding_standard');
                          setKelasCategory('TANDING | PEMASALAN');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          scheduleLayout === 'tanding_standard'
                            ? 'bg-cyan-400 text-black shadow-lg shadow-cyan-500/20'
                            : 'bg-slate-950 text-slate-300 border border-slate-700 hover:bg-slate-800'
                        }`}
                      >
                        ⚔️ Model 2: Tanding Dua Sudut (Hal 3, 4, 5)
                      </button>

                      <button
                        onClick={() => {
                          setScheduleLayout('tanding_pool_bracket');
                          setKelasCategory('TANDING | PRESTASI');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          scheduleLayout === 'tanding_pool_bracket'
                            ? 'bg-purple-400 text-black shadow-lg shadow-purple-500/20'
                            : 'bg-slate-950 text-slate-300 border border-slate-700 hover:bg-slate-800'
                        }`}
                      >
                        🏆 Model 3: Tanding Pool 4 & Alur Final (Hal 6, 7)
                      </button>

                      <button
                        onClick={() => setScheduleLayout('auto')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                          scheduleLayout === 'auto'
                            ? 'bg-emerald-500 text-black font-black'
                            : 'bg-slate-950 text-slate-400 border border-slate-700 hover:bg-slate-800'
                        }`}
                      >
                        ⚡ Otomatis
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Kategori:</span>
                    <input
                      type="text"
                      value={kelasCategory}
                      onChange={(e) => setKelasCategory(e.target.value)}
                      className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-slate-200 text-xs font-bold"
                      placeholder="e.g. SENI | PEMASALAN"
                    />
                  </div>
                </div>

                {/* 2. Logo Upload Controls (Logo Kiri & Kanan) */}
                <div className="pt-3 border-t border-slate-800/90">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-mono font-black uppercase text-slate-200">
                        Upload Logo Jadwal Pertandingan Resmi
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      Logo otomatis tampil di lembar jadwal, pratinjau, dan unduhan PDF
                    </span>
                  </div>

                  {/* Hidden File Inputs for Logos */}
                  <input
                    ref={logoKiriInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadLogoKiri}
                    className="hidden"
                  />
                  <input
                    ref={logoKananInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadLogoKanan}
                    className="hidden"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Logo Kiri Card */}
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-lg bg-white border border-slate-300 flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-sm">
                          {logoKiri ? (
                            <img src={logoKiri} alt="Logo Kiri" className="w-full h-full object-contain" />
                          ) : (
                            <div className="w-full h-full rounded-full border border-red-600 bg-amber-50 flex items-center justify-center text-[10px] font-black text-red-600">
                              IPSI
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-200">Logo Kiri (Federasi / IPSI)</div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {logoKiri ? 'Custom Logo Aktif' : 'Default IPSI Resmi'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => logoKiriInputRef.current?.click()}
                          className="px-2.5 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{logoKiri ? 'Ganti' : 'Upload'}</span>
                        </button>
                        {logoKiri && (
                          <button
                            onClick={handleRemoveLogoKiri}
                            title="Reset ke logo default IPSI"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 hover:text-red-300 text-slate-400 border border-slate-700 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Logo Kanan Card */}
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-lg bg-white border border-slate-300 flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-sm">
                          {logoKanan ? (
                            <img src={logoKanan} alt="Logo Kanan" className="w-full h-full object-contain" />
                          ) : (
                            <div className="w-full h-full rounded bg-amber-50 border border-slate-900 flex flex-col items-center justify-center text-center p-0.5">
                              <span className="text-[8px] font-black text-red-600 leading-none">PON XX</span>
                              <span className="text-[7px] font-bold text-slate-800 leading-none">PAPUA</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-200">Logo Kanan (Event / PON / Daerah)</div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {logoKanan ? 'Custom Logo Aktif' : 'Default PON / Event'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => logoKananInputRef.current?.click()}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{logoKanan ? 'Ganti' : 'Upload'}</span>
                        </button>
                        {logoKanan && (
                          <button
                            onClick={handleRemoveLogoKanan}
                            title="Reset ke logo default PON/Event"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 hover:text-red-300 text-slate-400 border border-slate-700 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Quick Filter Status Bar */}
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-500">Filter Status:</span>
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                      statusFilter === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    Semua ({totalMatches})
                  </button>
                  <button
                    onClick={() => setStatusFilter('live')}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                      statusFilter === 'live' ? 'bg-red-600 text-white' : 'bg-slate-900 text-red-400 hover:text-red-300'
                    }`}
                  >
                    LIVE ({totalLive})
                  </button>
                  <button
                    onClick={() => setStatusFilter('selesai')}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                      statusFilter === 'selesai' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-emerald-400 hover:text-emerald-300'
                    }`}
                  >
                    Selesai ({totalSelesai})
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                    <span>Baris Kosong Cetak:</span>
                    <input
                      type="number"
                      min={0}
                      max={15}
                      value={emptyRowsCount}
                      onChange={(e) => setEmptyRowsCount(parseInt(e.target.value, 10) || 0)}
                      className="w-12 px-1 py-0.5 bg-slate-950 border border-slate-700 rounded text-center text-white"
                    />
                  </div>
                  <div className="text-[11px] font-mono text-cyan-300">
                    Menampilkan <strong>{filteredSchedule.length}</strong> partai pertandingan
                  </div>
                </div>
              </div>

              {/* Printable Area using Exact Official Tournament Format */}
              <div ref={printAreaRef} className="rounded-xl overflow-hidden shadow-2xl">
                <OfficialIpsiScheduleSheet
                  headerTitle={headerTitle}
                  headerSubtitle={headerSubtitle}
                  headerLocationDate={headerLocationDate}
                  gelanggang={gelanggang}
                  hariTanggal={hariTanggal}
                  sesi={sesi}
                  pukul={pukul}
                  kelasCategory={kelasCategory}
                  layoutMode={scheduleLayout}
                  scheduleItems={filteredSchedule}
                  emptyRowsCount={emptyRowsCount}
                  logoKiri={logoKiri}
                  logoKanan={logoKanan}
                />
              </div>

            </div>
          )}

        </div>

      </motion.div>

      {/* Atur & Perbaiki Urutan Partai Modal */}
      <AturUrutanPartaiModal
        isOpen={showAturUrutanModal}
        onClose={() => setShowAturUrutanModal(false)}
        categories={state?.baganCategories || []}
        onSave={(updated) => {
          if (dispatch) {
            dispatch('UPDATE_BAGAN_CATEGORIES', { categories: updated });
          }
          try {
            localStorage.setItem('silat_bagan_categories', JSON.stringify(updated));
          } catch (e) {
            console.error(e);
          }
        }}
      />

      {/* Edit & Koreksi Jadwal Partai Modal (Mencakup Semua Jadwal Tanding & Seni) */}
      <EditJadwalPartaiModal
        isOpen={showEditJadwalModal}
        onClose={() => setShowEditJadwalModal(false)}
        categories={state?.baganCategories || []}
        onSaveCategories={(updated) => {
          if (dispatch) {
            dispatch('UPDATE_BAGAN_CATEGORIES', { categories: updated });
          }
          try {
            localStorage.setItem('silat_bagan_categories', JSON.stringify(updated));
            localStorage.setItem('silat_bagan_data', JSON.stringify(updated));
          } catch (e) {
            console.error(e);
          }
        }}
        tgrState={tgrState}
        onSaveTgrPeserta={(updated) => {
          if (dispatch) {
            dispatch('TGR_UPDATE_PESERTA', { action: 'sync_list', pesertaList: updated });
          }
          try {
            localStorage.setItem('tgr_peserta_list', JSON.stringify(updated));
          } catch (e) {
            console.error(e);
          }
        }}
      />
    </div>
  );
}

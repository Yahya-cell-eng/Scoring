/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Plus, Trash2, Edit2, Download, Upload, Play, Trophy, CheckSquare, Square, RefreshCw, FileText, Save, Users, X,
  Wand2, Copy, Sparkles, CheckCircle2, FileSpreadsheet, FileUp, AlertCircle
} from 'lucide-react';
import { MatchState, BaganCategory, BaganMatch, Athlete } from '../types';
import { playBeep } from '../utils/sound';
import safeHtml2canvas from '../utils/safeHtml2canvas';
import { jsPDF } from 'jspdf';
import { generateSchedulePdf, ScheduleMetadata, ScheduleMatchRow } from '../utils/generateSchedulePdf';
import { 
  parseRawAthletesData, 
  parseExcelFile, 
  downloadOfficialExcelTemplate, 
  exportAthletesToExcelFile, 
  ParsedAthleteRecord 
} from '../utils/smartDataParser';
import { distributeAthletesAvoidSameContingent } from '../utils/contingentDrawing';

// Define structure for registered athletes
interface RegistrasiAthlete {
  id: string;
  nama: string;
  kontingen: string;
  kelas: string;       // e.g. "Kelas A", "Kelas B"
  usia: string;        // e.g. "Remaja", "Dewasa"
  gender: 'Putra' | 'Putri';
}

interface RegistrasiDataPanelProps {
  theme: 'dark' | 'light';
  state: MatchState;
  dispatch: (type: string, payload?: any) => Promise<any>;
  onClose: () => void;
}

export default function RegistrasiDataPanel({ theme, state, dispatch, onClose }: RegistrasiDataPanelProps) {
  const [activeTab, setActiveTab] = useState<'input' | 'bagan' | 'kontrol'>('input');
  
  // Registered Athletes state
  const [athletes, setAthletes] = useState<RegistrasiAthlete[]>(() => {
    const saved = localStorage.getItem('silat_registered_athletes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved athletes", e);
      }
    }
    return [];
  });

  // Bracket/Categories state synced with state or localStorage
  const [categories, setCategories] = useState<BaganCategory[]>(() => {
    if (state.baganCategories && state.baganCategories.length > 0) {
      return state.baganCategories;
    }
    const saved = localStorage.getItem('silat_bagan_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved brackets", e);
      }
    }
    return [];
  });

  // Sync categories with incoming parent state in real-time
  useEffect(() => {
    if (state.baganCategories && state.baganCategories.length > 0) {
      setCategories(state.baganCategories);
    }
  }, [state.baganCategories]);

  // Persist and broadcast categories update
  const updateCategories = (newCategories: BaganCategory[]) => {
    setCategories(newCategories);
    localStorage.setItem('silat_bagan_data', JSON.stringify(newCategories));
    dispatch('UPDATE_BAGAN_CATEGORIES', { categories: newCategories });
  };

  // Maintain checked schedule matches in sequential order
  const [scheduledMatchIds, setScheduledMatchIds] = useState<string[]>(() => {
    // Determine initially checked matches based on whether their match.partai has a scheduled number
    const initialList: { uniqueId: string; num: number }[] = [];
    const savedCats = localStorage.getItem('silat_bagan_data');
    let catsToScan: BaganCategory[] = [];
    if (savedCats) {
      try {
        catsToScan = JSON.parse(savedCats);
      } catch (e) {}
    }
    if (catsToScan.length === 0 && state.baganCategories) {
      catsToScan = state.baganCategories;
    }
    catsToScan.forEach(cat => {
      cat.matches.forEach(m => {
        if (m.partai && m.partai.startsWith('Partai ') && !m.partai.includes('TBD')) {
          const num = parseInt(m.partai.replace('Partai ', ''), 10);
          if (!isNaN(num)) {
            initialList.push({ uniqueId: `${cat.id}_${m.id}`, num });
          }
        }
      });
    });
    // Sort chronologically and return IDs
    return initialList.sort((a, b) => a.num - b.num).map(x => x.uniqueId);
  });

  const getRoundLabelIndo = (round: string): string => {
    switch (round.toLowerCase()) {
      case 'thirtysecond': return 'Babak 64 Besar';
      case 'sixteenth': return 'Babak 32 Besar';
      case 'eighth': return 'Babak 16 Besar';
      case 'quarter': return 'Perempat Final';
      case 'semi': return 'Semi Final';
      case 'final': return 'Final';
      default: return round;
    }
  };

  const getNextMatchNote = (catId: string, matchId: number): string => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return "";
    
    const size = cat.size;
    let targetMatchId: number | null = null;
    let side: 'Merah' | 'Biru' | null = null;
    let isFinal = false;
    
    if (size === 2) {
      isFinal = true;
    } else if (size === 4) {
      if (matchId === 1) { targetMatchId = 3; side = 'Merah'; }
      else if (matchId === 2) { targetMatchId = 3; side = 'Biru'; }
      else if (matchId === 3) { isFinal = true; }
    } else if (size === 8) {
      if (matchId === 1) { targetMatchId = 5; side = 'Merah'; }
      else if (matchId === 2) { targetMatchId = 5; side = 'Biru'; }
      else if (matchId === 3) { targetMatchId = 6; side = 'Merah'; }
      else if (matchId === 4) { targetMatchId = 6; side = 'Biru'; }
      else if (matchId === 5) { targetMatchId = 7; side = 'Merah'; }
      else if (matchId === 6) { targetMatchId = 7; side = 'Biru'; }
      else if (matchId === 7) { isFinal = true; }
    } else if (size === 16) {
      if (matchId === 1) { targetMatchId = 9; side = 'Merah'; }
      else if (matchId === 2) { targetMatchId = 9; side = 'Biru'; }
      else if (matchId === 3) { targetMatchId = 10; side = 'Merah'; }
      else if (matchId === 4) { targetMatchId = 10; side = 'Biru'; }
      else if (matchId === 5) { targetMatchId = 11; side = 'Merah'; }
      else if (matchId === 6) { targetMatchId = 11; side = 'Biru'; }
      else if (matchId === 7) { targetMatchId = 12; side = 'Merah'; }
      else if (matchId === 8) { targetMatchId = 12; side = 'Biru'; }
      else if (matchId === 9) { targetMatchId = 13; side = 'Merah'; }
      else if (matchId === 10) { targetMatchId = 13; side = 'Biru'; }
      else if (matchId === 11) { targetMatchId = 14; side = 'Merah'; }
      else if (matchId === 12) { targetMatchId = 14; side = 'Biru'; }
      else if (matchId === 13) { targetMatchId = 15; side = 'Merah'; }
      else if (matchId === 14) { targetMatchId = 15; side = 'Biru'; }
      else if (matchId === 15) { isFinal = true; }
    }
    
    if (isFinal) {
      return "🏆 Perebutan Juara 1";
    }
    
    if (targetMatchId !== null) {
      const targetMatch = cat.matches.find(m => m.id === targetMatchId);
      if (targetMatch) {
        const partaiClean = targetMatch.partai.replace(/Partai\s+/i, 'P.');
        const sideText = side === 'Merah' ? 'Merah' : 'Biru';
        return `Pemenang ke ${partaiClean} ${sideText}`;
      }
    }
    
    return "";
  };

  // Schedule all matches automatically across all categories. Shuffles matches across categories and stages completely randomly.
  const scheduleAllMatches = (catsList?: BaganCategory[]) => {
    const listToProcess = catsList || categories;
    
    // 1. Collect all match unique IDs
    const allMatchesList: string[] = [];
    
    listToProcess.forEach(cat => {
      cat.matches.forEach(m => {
        allMatchesList.push(`${cat.id}_${m.id}`);
      });
    });

    // 2. Shuffle all matches randomly using Fisher-Yates algorithm
    const shuffledMatches = [...allMatchesList];
    for (let i = shuffledMatches.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledMatches[i], shuffledMatches[j]] = [shuffledMatches[j], shuffledMatches[i]];
    }

    setScheduledMatchIds(shuffledMatches);

    const newCats = listToProcess.map(cat => {
      const updatedMatches = cat.matches.map(m => {
        const uId = `${cat.id}_${m.id}`;
        const idx = shuffledMatches.indexOf(uId);
        if (idx !== -1) {
          return { ...m, partai: `Partai ${idx + 1}` };
        } else {
          return { ...m, partai: 'Partai TBD' };
        }
      });
      return { ...cat, matches: updatedMatches };
    });

    updateCategories(newCats);
  };

  // Clear all scheduled match IDs and reset their labels
  const clearAllScheduledMatches = () => {
    setScheduledMatchIds([]);
    const newCats = categories.map(cat => {
      const updatedMatches = cat.matches.map(m => {
        return { ...m, partai: 'Partai TBD' };
      });
      return { ...cat, matches: updatedMatches };
    });
    updateCategories(newCats);
  };

  // Persist athletes local database
  const saveAthletesLocal = (newAthletes: RegistrasiAthlete[]) => {
    setAthletes(newAthletes);
    localStorage.setItem('silat_registered_athletes', JSON.stringify(newAthletes));
  };

  // Smart Auto-Parser States
  const [showSmartInputModal, setShowSmartInputModal] = useState(false);
  const [smartInputMode, setSmartInputMode] = useState<'excel' | 'text'>('excel');
  const [smartRawText, setSmartRawText] = useState('');
  const [smartParsedList, setSmartParsedList] = useState<ParsedAthleteRecord[]>([]);
  const [smartExcelLoading, setSmartExcelLoading] = useState(false);
  const [smartExcelFileName, setSmartExcelFileName] = useState<string | null>(null);
  const [smartExcelError, setSmartExcelError] = useState<string | null>(null);
  const smartFileInputRef = useRef<HTMLInputElement>(null);

  const handleAnalyzeSmartText = (text: string) => {
    setSmartRawText(text);
    const parsed = parseRawAthletesData(text);
    setSmartParsedList(parsed);
    setSmartExcelFileName(null);
    setSmartExcelError(null);
  };

  const handleProcessExcelSmart = async (file: File) => {
    setSmartExcelLoading(true);
    setSmartExcelError(null);
    try {
      playBeep('click');
      const parsedRecords = await parseExcelFile(file);
      if (parsedRecords.length === 0) {
        setSmartExcelError("File Excel terbaca kosong atau format tidak sesuai. Gunakan template resmi.");
      } else {
        setSmartParsedList(parsedRecords);
        setSmartExcelFileName(file.name);
        playBeep('valid');
      }
    } catch (err: any) {
      console.error("Gagal membaca Excel:", err);
      setSmartExcelError(`Gagal membaca file Excel: ${err?.message || 'Format tidak didukung'}`);
    } finally {
      setSmartExcelLoading(false);
    }
  };

  const handleApplySmartAthletes = () => {
    if (smartParsedList.length === 0) return;
    playBeep('valid');

    const newAthletes: RegistrasiAthlete[] = smartParsedList.map((item, idx) => ({
      id: `ath_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
      nama: item.nama,
      kontingen: item.kontingen,
      kelas: item.kelas,
      usia: item.kategoriUsia,
      gender: item.gender
    }));

    const merged = [...athletes, ...newAthletes];
    saveAthletesLocal(merged);
    rebuildBracketsFromAthletes(merged);
    setShowSmartInputModal(false);
    setSmartRawText('');
    setSmartParsedList([]);
    setSmartExcelFileName(null);
    alert(`Berhasil memisahkan & mendaftarkan ${newAthletes.length} atlet secara otomatis ke bagan pertandingan!`);
  };

  // Form State for inputting athletes
  const [editingAthleteId, setEditingAthleteId] = useState<string | null>(null);
  const [formNama, setFormNama] = useState('');
  const [formKontingen, setFormKontingen] = useState('');
  const [formKelas, setFormKelas] = useState('Kelas A');
  const [formUsia, setFormUsia] = useState('Remaja');
  const [formGender, setFormGender] = useState<'Putra' | 'Putri'>('Putra');

  // Selected Category ID in Bagan Tab
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState<string>('');

  // List of unique categories derived from active athletes
  const derivedCategoriesList = React.useMemo(() => {
    const uniqueGroups = new Map<string, { kelas: string; usia: string; gender: 'Putra' | 'Putri' }>();
    athletes.forEach(ath => {
      const key = `${ath.kelas} ${ath.usia} ${ath.gender}`;
      if (!uniqueGroups.has(key)) {
        uniqueGroups.set(key, { kelas: ath.kelas, usia: ath.usia, gender: ath.gender });
      }
    });

    return Array.from(uniqueGroups.entries()).map(([name, detail]) => ({
      name,
      ...detail,
      athletesCount: athletes.filter(a => a.kelas === detail.kelas && a.usia === detail.usia && a.gender === detail.gender).length
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [athletes]);

  // Set default selected category if none selected or if selected got deleted
  useEffect(() => {
    if (categories.length > 0) {
      const exists = categories.some(c => c.name === selectedCatId);
      if (!exists) {
        setSelectedCatId(categories[0].name);
      }
    } else {
      setSelectedCatId('');
    }
  }, [categories, selectedCatId]);

  // User configurable participants per bracket (4, 8, 16)
  const [pesertaPerBagan, setPesertaPerBagan] = useState<4 | 8 | 16>(() => {
    const saved = localStorage.getItem('silat_peserta_per_bagan');
    return saved ? (parseInt(saved) as 4 | 8 | 16) : 4;
  });

  const handleUpdatePesertaPerBagan = (val: 4 | 8 | 16) => {
    setPesertaPerBagan(val);
    localStorage.setItem('silat_peserta_per_bagan', String(val));
    playBeep('click');
  };

  // Form State for "Tambah Bagan Baru"
  const [newBaganNama, setNewBaganNama] = useState('');
  const [newBaganGender, setNewBaganGender] = useState<'Putra' | 'Putri'>('Putra');
  const [newBaganSize, setNewBaganSize] = useState<number>(4);
  const [newBaganError, setNewBaganError] = useState<string | null>(null);

  const handleCreateNewBagan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBaganNama.trim()) {
      setNewBaganError("Nama bagan wajib diisi.");
      playBeep('warning');
      return;
    }

    setNewBaganError(null);
    playBeep('valid');

    const size = newBaganSize;
    const matches = generateMatchesForSize(size);

    const newBagan: BaganCategory = {
      id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: newBaganNama.trim(),
      gender: newBaganGender,
      size: size,
      kelas: newBaganNama.trim(),
      usia: 'Dewasa',
      matches: matches
    };

    const updatedCategories = [...categories, newBagan];
    updateCategories(updatedCategories);

    // Switch tab and select the new bagan
    setSelectedCatId(newBagan.name);
    setActiveTab('bagan');

    // Reset form
    setNewBaganNama('');
    setNewBaganGender('Putra');
    setNewBaganSize(4);
  };

  // Active Category data for Brackets View
  const activeBaganCategory = categories.find(c => c.name === selectedCatId);

  // States for manual setup & Lotting
  const [showLottingModal, setShowLottingModal] = useState(false);
  const [lottingInput, setLottingInput] = useState("");
  const [lottingMode, setLottingMode] = useState<'single' | 'split' | 'manual'>('single');
  const [lottingMaxPerBagan, setLottingMaxPerBagan] = useState<4 | 8 | 16>(4);
  const [manualPoolsCount, setManualPoolsCount] = useState<number>(2);
  const [manualPoolsInputs, setManualPoolsInputs] = useState<string[]>(["", "", "", "", "", "", "", ""]);
  
  // States for importing registered athletes inside Lotting modal (impor data atlet)
  const [showImportRegistrasi, setShowImportRegistrasi] = useState(false);
  const [importSearch, setImportSearch] = useState("");

  const handleImportRegisteredAthletes = (onlyCocok: boolean) => {
    if (!activeBaganCategory) return;
    playBeep('valid');
    
    const matchGender = activeBaganCategory.gender;
    const matchKelas = activeBaganCategory.kelas || activeBaganCategory.name || "";
    
    const filtered = athletes.filter(ath => {
      if (onlyCocok) {
        const genderMatch = ath.gender.toLowerCase() === matchGender.toLowerCase();
        let kelasMatch = false;
        if (ath.kelas) {
          kelasMatch = matchKelas.toLowerCase().includes(ath.kelas.toLowerCase()) || 
                       ath.kelas.toLowerCase().includes(matchKelas.toLowerCase());
        } else {
          kelasMatch = true;
        }
        return genderMatch && kelasMatch;
      }
      return true;
    });

    if (filtered.length === 0) {
      alert(`Tidak ditemukan atlet terdaftar yang ${onlyCocok ? 'cocok dengan kategori ini' : 'tersedia'}.`);
      return;
    }

    const formattedLines = filtered.map(ath => `${ath.nama} - ${ath.kontingen}`).join('\n');
    
    if (lottingInput.trim()) {
      if (confirm("Kotak input sudah berisi nama. Apakah Anda ingin menambahkan (Append) atlet terdaftar ini di baris baru? (Cancel untuk menimpa)")) {
        setLottingInput(prev => prev.trim() + '\n' + formattedLines);
      } else {
        setLottingInput(formattedLines);
      }
    } else {
      setLottingInput(formattedLines);
    }
  };
  const [showManageAthletesModal, setShowManageAthletesModal] = useState(false);
  const [manageAthletesList, setManageAthletesList] = useState<{ id: number; merahNama: string; merahKont: string; biruNama: string; biruKont: string; partai: string }[]>([]);

  const handleDistributeEvenly = () => {
    playBeep('click');
    const rawLines = lottingInput.split("\n").map(l => l.trim()).filter(Boolean);
    if (rawLines.length === 0) {
      alert("Masukkan daftar nama peserta di kotak utama terlebih dahulu sebelum membagi.");
      return;
    }
    
    const newInputs = ["", "", "", "", "", "", "", ""];
    rawLines.forEach((line, idx) => {
      const poolIdx = idx % manualPoolsCount;
      if (newInputs[poolIdx]) {
        newInputs[poolIdx] += "\n" + line;
      } else {
        newInputs[poolIdx] = line;
      }
    });
    setManualPoolsInputs(newInputs);
  };

  const handleGeneratePresetLotting = () => {
    if (!activeBaganCategory) return;
    playBeep('click');
    const size = activeBaganCategory.size;
    const gender = activeBaganCategory.gender;
    
    const putraNames = [
      "Fajar Ramadhan", "Galang Perkasa", "Andi Wijaya", "Rian Hidayat", 
      "Budi Santoso", "Made Wirawan", "Hendra Wijaya", "Zulfikar", 
      "Ahmad Fauzi", "Eko Prasetyo", "Rizal Gibran", "Dimas Anggara"
    ];
    const putriNames = [
      "Siti Rahma", "Aisyah Putri", "Dewi Lestari", "Larasati", 
      "Tri Wahyuni", "Indah Permata", "Novi Amelia", "Dian Lestari", 
      "Rini Safitri", "Santi Susanti", "Maya Kartika", "Mega Utami"
    ];
    const regions = [
      "DKI Jakarta", "Jawa Barat", "Jawa Tengah", "Jawa Timur", 
      "Banten", "DI Yogyakarta", "Bali", "Aceh Timur", 
      "Sumatra Utara", "Sumatra Barat", "Kaltim", "Sulsel"
    ];
    
    const namePool = gender === 'Putra' ? putraNames : putriNames;
    const shuffledNames = [...namePool].sort(() => Math.random() - 0.5);
    const shuffledRegions = [...regions].sort(() => Math.random() - 0.5);
    
    const lines: string[] = [];
    for (let i = 0; i < size; i++) {
      const name = shuffledNames[i % shuffledNames.length];
      const region = shuffledRegions[i % shuffledRegions.length];
      lines.push(`${name} - ${region}`);
    }
    
    setLottingInput(lines.join("\n"));
  };

  const parseAthletes = (inputText: string): { nama: string; kontingen: string }[] => {
    const rawLines = inputText.split("\n");
    const parsedAthletes: { nama: string; kontingen: string }[] = [];
    
    rawLines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      let nama = trimmed;
      let kontingen = "";
      
      if (trimmed.includes(" - ")) {
        const parts = trimmed.split(" - ");
        nama = parts[0].trim();
        kontingen = parts.slice(1).join(" - ").trim();
      } else if (trimmed.includes("-")) {
        const parts = trimmed.split("-");
        nama = parts[0].trim();
        kontingen = parts.slice(1).join("-").trim();
      } else if (trimmed.includes("[") && trimmed.includes("]")) {
        const start = trimmed.indexOf("[");
        const end = trimmed.indexOf("]");
        nama = trimmed.substring(0, start).trim();
        kontingen = trimmed.substring(start + 1, end).trim();
      }
      
      if (nama) {
        parsedAthletes.push({
          nama,
          kontingen: kontingen || "UMUM"
        });
      }
    });
    return parsedAthletes;
  };

  const handleOpenManageAthletesModal = () => {
    if (!activeBaganCategory) return;
    const numInitialMatches = activeBaganCategory.size / 2;
    const list = [];
    for (let i = 0; i < numInitialMatches; i++) {
      const m = activeBaganCategory.matches[i];
      if (m) {
        list.push({
          id: m.id,
          partai: m.partai,
          merahNama: m.atletMerah.nama,
          merahKont: m.atletMerah.kontingen,
          biruNama: m.atletBiru.nama,
          biruKont: m.atletBiru.kontingen
        });
      }
    }
    setManageAthletesList(list);
    setShowManageAthletesModal(true);
  };

  const handleSaveManageAthletes = () => {
    if (!activeBaganCategory) return;
    playBeep('valid');

    const newCats = categories.map(cat => {
      if (cat.id !== activeBaganCategory.id) return cat;

      const updatedMatches = cat.matches.map(m => ({
        ...m,
        atletMerah: { ...m.atletMerah },
        atletBiru: { ...m.atletBiru }
      }));

      manageAthletesList.forEach(item => {
        const matchIndex = updatedMatches.findIndex(m => m.id === item.id);
        if (matchIndex !== -1) {
          updatedMatches[matchIndex].atletMerah = { 
            nama: item.merahNama.trim(), 
            kontingen: item.merahNama.trim() ? item.merahKont.trim() || 'UMUM' : '' 
          };
          updatedMatches[matchIndex].atletBiru = { 
            nama: item.biruNama.trim(), 
            kontingen: item.biruNama.trim() ? item.biruKont.trim() || 'UMUM' : '' 
          };
          updatedMatches[matchIndex].winner = null;
        }
      });

      const size = cat.size;
      const numInitialMatches = size / 2;
      for (let i = 0; i < numInitialMatches; i++) {
        const m = updatedMatches[i];
        if (m.atletMerah.nama && !m.atletBiru.nama) {
          m.atletBiru = { nama: 'BYE', kontingen: 'AUTOMATIC' };
        }
        if (!m.atletMerah.nama && m.atletBiru.nama) {
          m.atletMerah = { nama: 'BYE', kontingen: 'AUTOMATIC' };
        }
      }

      const propagated = propagateBracket(updatedMatches, size);

      return {
        ...cat,
        matches: propagated
      };
    });

    scheduleAllMatches(newCats);
    setShowManageAthletesModal(false);
  };

  const handleExecuteLotting = () => {
    if (!activeBaganCategory) return;
    playBeep('valid');
    
    if (lottingMode === 'manual') {
      const poolsToCreate: { nameSuffix: string; athletes: { nama: string; kontingen: string }[] }[] = [];
      let totalAthletesCount = 0;

      for (let i = 0; i < manualPoolsCount; i++) {
        const poolAthletes = parseAthletes(manualPoolsInputs[i] || "");
        if (poolAthletes.length > 0) {
          totalAthletesCount += poolAthletes.length;
          poolsToCreate.push({
            nameSuffix: ` - Pool ${String.fromCharCode(64 + i + 1)}`, 
            athletes: poolAthletes
          });
        }
      }

      if (poolsToCreate.length === 0) {
        alert("Masukkan minimal 1 nama atlet di salah satu Pool.");
        return;
      }

      const maxPerBagan = lottingMaxPerBagan;
      const newPoolCategories: BaganCategory[] = poolsToCreate.map((pool, idx) => {
        const count = pool.athletes.length;

        let bracketSize: 2 | 4 | 8 | 16 = maxPerBagan;
        if (count <= 2) bracketSize = 2;
        else if (count <= 4) bracketSize = 4;
        else if (count <= 8) bracketSize = 8;
        else bracketSize = 16;

        if (bracketSize > maxPerBagan) {
          bracketSize = maxPerBagan;
        }

        const poolMatches = generateMatchesForSize(bracketSize);
        const updated = poolMatches.map(m => ({
          ...m,
          atletMerah: { ...m.atletMerah },
          atletBiru: { ...m.atletBiru },
          winner: m.winner
        }));

        const numInitialMatches = bracketSize / 2;
        for (let j = 0; j < numInitialMatches; j++) {
          const m = updated[j];
          const merahIdx = j * 2;
          const biruIdx = merahIdx + 1;
          m.atletMerah = pool.athletes[merahIdx] ? { nama: pool.athletes[merahIdx].nama, kontingen: pool.athletes[merahIdx].kontingen } : { nama: '', kontingen: '' };
          m.atletBiru = pool.athletes[biruIdx] ? { nama: pool.athletes[biruIdx].nama, kontingen: pool.athletes[biruIdx].kontingen } : { nama: '', kontingen: '' };
          
          if (m.atletMerah.nama && !m.atletBiru.nama) {
            m.atletBiru = { nama: "BYE", kontingen: "AUTOMATIC" };
          }
          if (!m.atletMerah.nama && m.atletBiru.nama) {
            m.atletMerah = { nama: "BYE", kontingen: "AUTOMATIC" };
          }
        }

        const propagated = propagateBracket(updated, bracketSize);

        return {
          id: `cat_${Date.now()}_pool_manual_${idx + 1}_${Math.random().toString(36).substr(2, 4)}`,
          name: `${activeBaganCategory.name}${pool.nameSuffix}`,
          gender: activeBaganCategory.gender,
          size: bracketSize,
          kelas: activeBaganCategory.kelas,
          usia: activeBaganCategory.usia,
          matches: propagated
        };
      });

      const activeIndex = categories.findIndex(c => c.id === activeBaganCategory.id);
      if (activeIndex !== -1) {
        const updatedCategories = [...categories];
        updatedCategories.splice(activeIndex, 1, ...newPoolCategories);
        scheduleAllMatches(updatedCategories);
        setSelectedCatId(newPoolCategories[0].name);
      }
      setShowLottingModal(false);
      return;
    }

    const parsedAthletes = parseAthletes(lottingInput);
    if (parsedAthletes.length === 0) {
      alert("Masukkan minimal 1 nama atlet untuk diundi.");
      return;
    }

    const shuffledAthletes = [...parsedAthletes].sort(() => Math.random() - 0.5);

    if (lottingMode === 'single') {
      const size = activeBaganCategory.size;
      const poolMatches = generateMatchesForSize(size);
      const updated = poolMatches.map(m => ({
        ...m,
        atletMerah: { ...m.atletMerah },
        atletBiru: { ...m.atletBiru },
        winner: m.winner
      }));

      const numInitialMatches = size / 2;
      for (let j = 0; j < numInitialMatches; j++) {
        const m = updated[j];
        const merahIdx = j * 2;
        const biruIdx = merahIdx + 1;
        m.atletMerah = shuffledAthletes[merahIdx] ? { nama: shuffledAthletes[merahIdx].nama, kontingen: shuffledAthletes[merahIdx].kontingen } : { nama: '', kontingen: '' };
        m.atletBiru = shuffledAthletes[biruIdx] ? { nama: shuffledAthletes[biruIdx].nama, kontingen: shuffledAthletes[biruIdx].kontingen } : { nama: '', kontingen: '' };
        
        if (m.atletMerah.nama && !m.atletBiru.nama) {
          m.atletBiru = { nama: "BYE", kontingen: "AUTOMATIC" };
        }
        if (!m.atletMerah.nama && m.atletBiru.nama) {
          m.atletMerah = { nama: "BYE", kontingen: "AUTOMATIC" };
        }
      }

      const propagated = propagateBracket(updated, size);

      const updatedCategories = categories.map(cat => {
        if (cat.id === activeBaganCategory.id) {
          return {
            ...cat,
            matches: propagated
          };
        }
        return cat;
      });

      scheduleAllMatches(updatedCategories);
      setShowLottingModal(false);
    } else {
      const maxPerBagan = lottingMaxPerBagan;
      const poolsToCreate: { athletes: { nama: string; kontingen: string }[] }[] = [];
      
      let temp: { nama: string; kontingen: string }[] = [];
      shuffledAthletes.forEach((ath, idx) => {
        temp.push(ath);
        if (temp.length === maxPerBagan || idx === shuffledAthletes.length - 1) {
          poolsToCreate.push({ athletes: temp });
          temp = [];
        }
      });

      const newPoolCategories: BaganCategory[] = poolsToCreate.map((pool, idx) => {
        const count = pool.athletes.length;

        let bracketSize: 2 | 4 | 8 | 16 = maxPerBagan;
        if (count <= 2) bracketSize = 2;
        else if (count <= 4) bracketSize = 4;
        else if (count <= 8) bracketSize = 8;
        else bracketSize = 16;

        if (bracketSize > maxPerBagan) {
          bracketSize = maxPerBagan;
        }

        const poolMatches = generateMatchesForSize(bracketSize);
        const updated = poolMatches.map(m => ({
          ...m,
          atletMerah: { ...m.atletMerah },
          atletBiru: { ...m.atletBiru },
          winner: m.winner
        }));

        const numInitialMatches = bracketSize / 2;
        for (let j = 0; j < numInitialMatches; j++) {
          const m = updated[j];
          const merahIdx = j * 2;
          const biruIdx = merahIdx + 1;
          m.atletMerah = pool.athletes[merahIdx] ? { nama: pool.athletes[merahIdx].nama, kontingen: pool.athletes[merahIdx].kontingen } : { nama: '', kontingen: '' };
          m.atletBiru = pool.athletes[biruIdx] ? { nama: pool.athletes[biruIdx].nama, kontingen: pool.athletes[biruIdx].kontingen } : { nama: '', kontingen: '' };
          
          if (m.atletMerah.nama && !m.atletBiru.nama) {
            m.atletBiru = { nama: "BYE", kontingen: "AUTOMATIC" };
          }
          if (!m.atletMerah.nama && m.atletBiru.nama) {
            m.atletMerah = { nama: "BYE", kontingen: "AUTOMATIC" };
          }
        }

        const propagated = propagateBracket(updated, bracketSize);

        const poolLetter = String.fromCharCode(64 + idx + 1);
        return {
          id: `cat_${Date.now()}_pool_split_${idx + 1}_${Math.random().toString(36).substr(2, 4)}`,
          name: `${activeBaganCategory.name} - Pool ${poolLetter}`,
          gender: activeBaganCategory.gender,
          size: bracketSize,
          kelas: activeBaganCategory.kelas,
          usia: activeBaganCategory.usia,
          matches: propagated
        };
      });

      const activeIndex = categories.findIndex(c => c.id === activeBaganCategory.id);
      if (activeIndex !== -1) {
        const updatedCategories = [...categories];
        updatedCategories.splice(activeIndex, 1, ...newPoolCategories);
        scheduleAllMatches(updatedCategories);
        setSelectedCatId(newPoolCategories[0].name);
      }
      setShowLottingModal(false);
    }
  };

  // Helper to generate empty matches based on size
  const generateMatchesForSize = (size: number): BaganMatch[] => {
    const matches: BaganMatch[] = [];
    if (size === 2) {
      matches.push(
        { id: 1, round: 'final', partai: 'Partai TBD', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null }
      );
    } else if (size === 4) {
      matches.push(
        { id: 1, round: 'semi', partai: 'Partai TBD', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null },
        { id: 2, round: 'semi', partai: 'Partai TBD', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null },
        { id: 3, round: 'final', partai: 'Partai TBD', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null }
      );
    } else if (size === 8) {
      matches.push(
        { id: 1, round: 'quarter', partai: 'Partai TBD', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null },
        { id: 2, round: 'quarter', partai: 'Partai TBD', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null },
        { id: 3, round: 'quarter', partai: 'Partai TBD', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null },
        { id: 4, round: 'quarter', partai: 'Partai TBD', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null },
        { id: 5, round: 'semi', partai: 'Partai TBD', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null },
        { id: 6, round: 'semi', partai: 'Partai TBD', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null },
        { id: 7, round: 'final', partai: 'Partai TBD', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null }
      );
    } else if (size === 16) {
      // Round 1 (Octo Final) - Matches 1 to 8
      for (let i = 1; i <= 8; i++) {
        matches.push({ id: i, round: 'quarter', partai: `Partai TBD`, atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null });
      }
      // Round 2 (Quarter Final) - Matches 9 to 12
      for (let i = 9; i <= 12; i++) {
        matches.push({ id: i, round: 'quarter', partai: `Partai TBD`, atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null });
      }
      // Round 3 (Semi Final) - Matches 13 to 14
      for (let i = 13; i <= 14; i++) {
        matches.push({ id: i, round: 'semi', partai: `Partai TBD`, atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null });
      }
      // Round 4 (Final) - Match 15
      matches.push({ id: 15, round: 'final', partai: 'Partai TBD', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null });
    } else if (size === 32) {
      // Round 1 (32 participants): Matches 1 to 16
      for (let i = 1; i <= 16; i++) {
        matches.push({ id: i, round: 'sixteenth', partai: 'Partai TBD', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null });
      }
      // Round 2 (16 Besar): Matches 17 to 24
      for (let i = 17; i <= 24; i++) {
        matches.push({ id: i, round: 'eighth', partai: 'Partai TBD', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null });
      }
      // Round 3 (Quarter Final): Matches 25 to 28
      for (let i = 25; i <= 28; i++) {
        matches.push({ id: i, round: 'quarter', partai: 'Partai TBD', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null });
      }
      // Round 4 (Semi Final): Matches 29 to 30
      for (let i = 29; i <= 30; i++) {
        matches.push({ id: i, round: 'semi', partai: 'Partai TBD', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null });
      }
      // Round 5 (Final): Match 31
      matches.push({ id: 31, round: 'final', partai: 'Partai TBD', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null });
    } else if (size === 64) {
      // Round 1 (64 participants): Matches 1 to 32
      for (let i = 1; i <= 32; i++) {
        matches.push({ id: i, round: 'thirtysecond', partai: 'Partai TBD', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null });
      }
      // Round 2 (32 Besar): Matches 33 to 48
      for (let i = 33; i <= 48; i++) {
        matches.push({ id: i, round: 'sixteenth', partai: 'Partai TBD', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null });
      }
      // Round 3 (16 Besar): Matches 49 to 56
      for (let i = 49; i <= 56; i++) {
        matches.push({ id: i, round: 'eighth', partai: 'Partai TBD', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null });
      }
      // Round 4 (Quarter Final): Matches 57 to 60
      for (let i = 57; i <= 60; i++) {
        matches.push({ id: i, round: 'quarter', partai: 'Partai TBD', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null });
      }
      // Round 5 (Semi Final): Matches 61 to 62
      for (let i = 61; i <= 62; i++) {
        matches.push({ id: i, round: 'semi', partai: 'Partai TBD', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null });
      }
      // Round 6 (Final): Match 63
      matches.push({ id: 63, round: 'final', partai: 'Partai TBD', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null });
    }
    return matches;
  };

  // Helper to propagate winners step-by-step
  const propagateBracket = (initialMatches: BaganMatch[], size: number): BaganMatch[] => {
    // Keep a deep copy of initial matches to check if participants change
    const original = initialMatches.map(m => ({
      ...m,
      atletMerah: { ...m.atletMerah },
      atletBiru: { ...m.atletBiru }
    }));

    const updated = initialMatches.map(m => ({
      ...m,
      atletMerah: { ...m.atletMerah },
      atletBiru: { ...m.atletBiru },
      winner: m.winner
    }));

    // Clear downstream match rosters to avoid stale entries
    const numInitialMatches = size / 2;
    for (let i = numInitialMatches; i < updated.length; i++) {
      updated[i].atletMerah = { nama: '', kontingen: '' };
      updated[i].atletBiru = { nama: '', kontingen: '' };
    }

    const isBye = (nama?: string) => {
      if (!nama) return false;
      const n = nama.trim().toLowerCase();
      return n === 'bye' || n === 'automatic' || n === '—' || n === '-';
    };

    // Propagate step-by-step
    for (let i = 0; i < updated.length; i++) {
      const match = updated[i];
      const matchId = match.id;

      const mNama = match.atletMerah.nama;
      const bNama = match.atletBiru.nama;

      // Auto-detect winner if one side is BYE
      if (mNama && !isBye(mNama) && isBye(bNama)) {
        match.winner = 'merah';
      } else if (bNama && !isBye(bNama) && isBye(mNama)) {
        match.winner = 'biru';
      }

      // If the contestants in the propagated match are different from the original contestants,
      // reset the winner of this match to null.
      const origMatch = original.find(om => om.id === matchId);
      if (origMatch) {
        const contestantChanged = 
          match.atletMerah.nama !== origMatch.atletMerah.nama ||
          match.atletBiru.nama !== origMatch.atletBiru.nama;
        if (contestantChanged) {
          match.winner = null;
        }
      }

      const winner = match.winner;
      const adv = winner === 'merah' ? match.atletMerah : winner === 'biru' ? match.atletBiru : { nama: '', kontingen: '' };

      if (size === 16) {
        if (matchId === 1) updated[8].atletMerah = adv;
        else if (matchId === 2) updated[8].atletBiru = adv;
        else if (matchId === 3) updated[9].atletMerah = adv;
        else if (matchId === 4) updated[9].atletBiru = adv;
        else if (matchId === 5) updated[10].atletMerah = adv;
        else if (matchId === 6) updated[10].atletBiru = adv;
        else if (matchId === 7) updated[11].atletMerah = adv;
        else if (matchId === 8) updated[11].atletBiru = adv;
        else if (matchId === 9) updated[12].atletMerah = adv;
        else if (matchId === 10) updated[12].atletBiru = adv;
        else if (matchId === 11) updated[13].atletMerah = adv;
        else if (matchId === 12) updated[13].atletBiru = adv;
        else if (matchId === 13) updated[14].atletMerah = adv;
        else if (matchId === 14) updated[14].atletBiru = adv;
      } else if (size === 32) {
        // Matches 1-16 feed into Matches 17-24 (17, 18, 19, 20, 21, 22, 23, 24)
        if (matchId >= 1 && matchId <= 16) {
          const targetId = 16 + Math.ceil(matchId / 2);
          const isMerah = matchId % 2 !== 0;
          if (isMerah) updated[targetId - 1].atletMerah = adv;
          else updated[targetId - 1].atletBiru = adv;
        }
        // Matches 17-24 feed into Matches 25-28
        else if (matchId >= 17 && matchId <= 24) {
          const targetId = 24 + Math.ceil((matchId - 16) / 2);
          const isMerah = matchId % 2 !== 0;
          if (isMerah) updated[targetId - 1].atletMerah = adv;
          else updated[targetId - 1].atletBiru = adv;
        }
        // Matches 25-28 feed into Matches 29-30
        else if (matchId >= 25 && matchId <= 28) {
          const targetId = 28 + Math.ceil((matchId - 24) / 2);
          const isMerah = matchId % 2 !== 0;
          if (isMerah) updated[targetId - 1].atletMerah = adv;
          else updated[targetId - 1].atletBiru = adv;
        }
        // Matches 29-30 feed into Match 31
        else if (matchId >= 29 && matchId <= 30) {
          const targetId = 31;
          const isMerah = matchId % 2 !== 0;
          if (isMerah) updated[targetId - 1].atletMerah = adv;
          else updated[targetId - 1].atletBiru = adv;
        }
      } else if (size === 64) {
        // Matches 1-32 feed into Matches 33-48
        if (matchId >= 1 && matchId <= 32) {
          const targetId = 32 + Math.ceil(matchId / 2);
          const isMerah = matchId % 2 !== 0;
          if (isMerah) updated[targetId - 1].atletMerah = adv;
          else updated[targetId - 1].atletBiru = adv;
        }
        // Matches 33-48 feed into Matches 49-56
        else if (matchId >= 33 && matchId <= 48) {
          const targetId = 48 + Math.ceil((matchId - 32) / 2);
          const isMerah = matchId % 2 !== 0;
          if (isMerah) updated[targetId - 1].atletMerah = adv;
          else updated[targetId - 1].atletBiru = adv;
        }
        // Matches 49-56 feed into Matches 57-60
        else if (matchId >= 49 && matchId <= 56) {
          const targetId = 56 + Math.ceil((matchId - 48) / 2);
          const isMerah = matchId % 2 !== 0;
          if (isMerah) updated[targetId - 1].atletMerah = adv;
          else updated[targetId - 1].atletBiru = adv;
        }
        // Matches 57-60 feed into Matches 61-62
        else if (matchId >= 57 && matchId <= 60) {
          const targetId = 60 + Math.ceil((matchId - 56) / 2);
          const isMerah = matchId % 2 !== 0;
          if (isMerah) updated[targetId - 1].atletMerah = adv;
          else updated[targetId - 1].atletBiru = adv;
        }
        // Matches 61-62 feed into Match 63
        else if (matchId >= 61 && matchId <= 62) {
          const targetId = 63;
          const isMerah = matchId % 2 !== 0;
          if (isMerah) updated[targetId - 1].atletMerah = adv;
          else updated[targetId - 1].atletBiru = adv;
        }
      } else if (size === 8) {
        if (matchId === 1) updated[4].atletMerah = adv;
        else if (matchId === 2) updated[4].atletBiru = adv;
        else if (matchId === 3) updated[5].atletMerah = adv;
        else if (matchId === 4) updated[5].atletBiru = adv;
        else if (matchId === 5) updated[6].atletMerah = adv;
        else if (matchId === 6) updated[6].atletBiru = adv;
      } else if (size === 4) {
        if (matchId === 1) updated[2].atletMerah = adv;
        else if (matchId === 2) updated[2].atletBiru = adv;
      }
    }

    return updated;
  };

  // Generate / Rebuild brackets automatically from Inputted Athletes
  const rebuildBracketsFromAthletes = (currentAthletes: RegistrasiAthlete[]) => {
    // Group athletes
    const groups = new Map<string, RegistrasiAthlete[]>();
    currentAthletes.forEach(ath => {
      const key = `${ath.kelas} ${ath.usia} ${ath.gender}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(ath);
    });

    const newCategories: BaganCategory[] = [];
    groups.forEach((groupAthletes, categoryBaseName) => {
      const firstAth = groupAthletes[0];
      
      // Split into brackets with guaranteed contingent separation (no same contingent in first round!)
      const sizeLimit = pesertaPerBagan;
      const chunks: RegistrasiAthlete[][] = distributeAthletesAvoidSameContingent(groupAthletes, sizeLimit as 2 | 4 | 8 | 16);

      chunks.forEach((chunkAthletes, chunkIdx) => {
        // Name the category. If there is only 1 chunk, keep the original name.
        // Otherwise, add "- Bagan 1", "- Bagan 2" etc.
        const categoryName = chunks.length > 1 
          ? `${categoryBaseName} - Bagan ${chunkIdx + 1}` 
          : categoryBaseName;

        // Find matching existing category to preserve match winners or partido numbers if possible
        const existing = categories.find(c => c.name === categoryName);
        
        const size = sizeLimit;
        let matches = generateMatchesForSize(size);

        const numStarterMatches = size / 2;
        matches = matches.map(m => {
          const mId = m.id;
          const existingM = existing?.matches.find(exM => exM.id === mId);
          
          if (mId <= numStarterMatches) {
            // Starter match: populated directly from chunk athletes
            const merahIdx = (mId - 1) * 2;
            const biruIdx = merahIdx + 1;
            const mAth = chunkAthletes[merahIdx] ? { nama: chunkAthletes[merahIdx].nama, kontingen: chunkAthletes[merahIdx].kontingen } : { nama: '', kontingen: '' };
            const bAth = chunkAthletes[biruIdx] ? { nama: chunkAthletes[biruIdx].nama, kontingen: chunkAthletes[biruIdx].kontingen } : { nama: '', kontingen: '' };
            
            return {
              ...m,
              partai: existingM?.partai || 'Partai TBD',
              atletMerah: mAth,
              atletBiru: bAth,
              winner: existingM?.winner || null
            };
          } else {
            // Downstream match: start empty or with existing values
            return {
              ...m,
              partai: existingM?.partai || 'Partai TBD',
              atletMerah: existingM?.atletMerah || { nama: '', kontingen: '' },
              atletBiru: existingM?.atletBiru || { nama: '', kontingen: '' },
              winner: existingM?.winner || null
            };
          }
        });

        // Auto-fill starter matches that have only 1 athlete with BYE
        for (let i = 0; i < numStarterMatches; i++) {
          const m = matches[i];
          if (m.atletMerah.nama && !m.atletBiru.nama) {
            m.atletBiru = { nama: 'BYE', kontingen: 'AUTOMATIC' };
          }
          if (!m.atletMerah.nama && m.atletBiru.nama) {
            m.atletMerah = { nama: 'BYE', kontingen: 'AUTOMATIC' };
          }
        }

        // Propagate advanced athletes
        const propagated = propagateBracket(matches, size);

        newCategories.push({
          id: existing?.id || `cat_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          name: categoryName,
          gender: firstAth.gender,
          size,
          kelas: firstAth.kelas,
          usia: firstAth.usia,
          matches: propagated
        });
      });
    });

    // Automatically schedule all matches sequentially by default
    scheduleAllMatches(newCategories);
  };

  // Submit form (Save Athlete)
  const handleSaveAthlete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim() || !formKontingen.trim()) {
      alert("Lengkapi nama atlet dan kontingen!");
      return;
    }

    playBeep('valid');
    let updated: RegistrasiAthlete[];

    if (editingAthleteId) {
      updated = athletes.map(ath => ath.id === editingAthleteId ? {
        ...ath,
        nama: formNama.trim(),
        kontingen: formKontingen.trim(),
        kelas: formKelas,
        usia: formUsia,
        gender: formGender
      } : ath);
      setEditingAthleteId(null);
    } else {
      const newAthlete: RegistrasiAthlete = {
        id: `ath_${Date.now()}`,
        nama: formNama.trim(),
        kontingen: formKontingen.trim(),
        kelas: formKelas,
        usia: formUsia,
        gender: formGender
      };
      updated = [...athletes, newAthlete];
    }

    saveAthletesLocal(updated);
    rebuildBracketsFromAthletes(updated);

    // Reset Form (maintain category selectors for fast entry)
    setFormNama('');
    setFormKontingen('');
  };

  // Click edit athlete
  const handleStartEdit = (ath: RegistrasiAthlete) => {
    playBeep('click');
    setEditingAthleteId(ath.id);
    setFormNama(ath.nama);
    setFormKontingen(ath.kontingen);
    setFormKelas(ath.kelas);
    setFormUsia(ath.usia);
    setFormGender(ath.gender);
  };

  // Click delete athlete
  const handleDeleteAthlete = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus data atlet ini?")) {
      playBeep('warning');
      const updated = athletes.filter(ath => ath.id !== id);
      saveAthletesLocal(updated);
      rebuildBracketsFromAthletes(updated);
    }
  };

  // Match result handling (Set Winner inside bracket)
  const handleSetBracketWinner = (catId: string, matchId: number, winner: 'merah' | 'biru' | null) => {
    playBeep('click');
    const newCats = categories.map(cat => {
      if (cat.id !== catId) return cat;

      const updatedMatches = cat.matches.map(m => ({
        ...m,
        atletMerah: { ...m.atletMerah },
        atletBiru: { ...m.atletBiru }
      }));

      const matchIdx = updatedMatches.findIndex(m => m.id === matchId);
      if (matchIdx === -1) return cat;

      updatedMatches[matchIdx].winner = winner;

      const propagated = propagateBracket(updatedMatches, cat.size);

      return {
        ...cat,
        matches: propagated
      };
    });

    updateCategories(newCats);
  };

  // Clear specific bracket matches
  const handleClearBracketWinnerAndData = (catId: string) => {
    if (confirm("Apakah Anda yakin ingin me-reset status pemenang seluruh partai di bagan ini?")) {
      playBeep('warning');
      const newCats = categories.map(cat => {
        if (cat.id !== catId) return cat;
        const resetMatches = cat.matches.map(m => {
          // If quarter/semi-final match starting rosters are set from registered list, keep athletes but wipe winner
          // and wipe calculated advanced rows
          const isStarter = m.id <= (cat.size / 2);
          return {
            ...m,
            atletMerah: isStarter ? m.atletMerah : { nama: '', kontingen: '' },
            atletBiru: isStarter ? m.atletBiru : { nama: '', kontingen: '' },
            winner: null
          };
        });

        const propagated = propagateBracket(resetMatches, cat.size);
        return {
          ...cat,
          matches: propagated
        };
      });
      updateCategories(newCats);
    }
  };

  // Delete a specific bracket category
  const handleDeleteCategory = (catId: string, catName: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus seluruh bagan kelas "${catName}"?`)) {
      playBeep('warning');
      const newCats = categories.filter(cat => cat.id !== catId);
      updateCategories(newCats);
      if (selectedCatId === catName) {
        setSelectedCatId('');
      }
    }
  };

  // Save edited category name
  const handleSaveCategoryName = (catId: string, oldCatName: string) => {
    const trimmedName = editCategoryName.trim();
    if (!trimmedName) {
      alert("Nama bagan kelas tidak boleh kosong.");
      return;
    }
    
    // Check if new name already exists in other categories
    const exists = categories.some(cat => cat.id !== catId && cat.name.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      alert("Nama bagan kelas tersebut sudah digunakan.");
      return;
    }

    playBeep('click');
    const newCats = categories.map(cat => {
      if (cat.id === catId) {
        return {
          ...cat,
          name: trimmedName
        };
      }
      return cat;
    });

    updateCategories(newCats);
    
    // Update selectedCatId if the edited category was currently selected
    if (selectedCatId === oldCatName) {
      setSelectedCatId(trimmedName);
    }
    
    setEditingCategoryId(null);
  };

  // Delete all bracket categories
  const handleDeleteAllCategories = () => {
    if (confirm("Apakah Anda yakin ingin menghapus SEMUA bagan kelas tanding yang terdaftar? Tindakan ini tidak dapat dibatalkan.")) {
      playBeep('warning');
      updateCategories([]);
      setSelectedCatId('');
    }
  };

  // Inline match editing inside BAGAN PERTANDINGAN
  const [editingBracketMatch, setEditingBracketMatch] = useState<{ catId: string; mId: number } | null>(null);
  const [editMerahNama, setEditMerahNama] = useState('');
  const [editMerahKontingen, setEditMerahKontingen] = useState('');
  const [editBiruNama, setEditBiruNama] = useState('');
  const [editBiruKontingen, setEditBiruKontingen] = useState('');

  const handleSaveBracketMatchInfo = () => {
    if (!editingBracketMatch) return;
    playBeep('valid');

    const newCats = categories.map(cat => {
      if (cat.id !== editingBracketMatch.catId) return cat;
      const updatedMatches = cat.matches.map(m => {
        if (m.id === editingBracketMatch.mId) {
          return {
            ...m,
            atletMerah: { nama: editMerahNama.trim(), kontingen: editMerahKontingen.trim() },
            atletBiru: { nama: editBiruNama.trim(), kontingen: editBiruKontingen.trim() }
          };
        }
        return m;
      });

      return {
        ...cat,
        matches: updatedMatches
      };
    });

    updateCategories(newCats);
    setEditingBracketMatch(null);
  };

  // Load match to live scorer panel
  const handlePlayLiveMatch = async (match: BaganMatch, category: BaganCategory) => {
    playBeep('valid');
    try {
      // Set appropriate global states and broadcast them
      await dispatch('UPDATE_METADATA', {
        namaEvent: state.namaEvent || "Kejuaraan Pencak Silat",
        partai: match.partai.replace(/\D/g, '') || "01",
        kelas: category.kelas || "A",
        gender: category.gender || "Putra",
      });

      await dispatch('UPDATE_ATHLETE', {
        sudut: 'merah',
        nama: match.atletMerah.nama,
        kontingen: match.atletMerah.kontingen
      });

      await dispatch('UPDATE_ATHLETE', {
        sudut: 'biru',
        nama: match.atletBiru.nama,
        kontingen: match.atletBiru.kontingen
      });

      await dispatch('RESET_SCORES');
      
      // Update global selected values to link this active match
      await dispatch('UPDATE_ACTIVE_BAGAN_MATCH', {
        categoryId: category.id,
        matchId: match.id
      });

      alert(`Partai ${match.partai} berhasil dimuat ke panel scoring utama!`);
      onClose(); // Auto navigate back to see scoring panel
    } catch (e) {
      console.error("Error setting up live match:", e);
    }
  };

  // --- KONTROL PARTAI SCHEDULER LOGIC ---
  // List of all matches flatly
  const flatMatchesList = React.useMemo(() => {
    const list: {
      uniqueId: string;
      catId: string;
      catName: string;
      kelas: string;
      gender: string;
      round: string;
      match: BaganMatch;
    }[] = [];

    categories.forEach(cat => {
      cat.matches.forEach(m => {
        list.push({
          uniqueId: `${cat.id}_${m.id}`,
          catId: cat.id,
          catName: cat.name,
          kelas: cat.kelas || '',
          gender: cat.gender,
          round: m.round,
          match: m
        });
      });
    });

    return list;
  }, [categories]);

  // Handle toggling scheduling checkbox
  const handleToggleScheduleMatch = (uniqueId: string) => {
    playBeep('click');
    let updatedIds: string[];
    if (scheduledMatchIds.includes(uniqueId)) {
      updatedIds = scheduledMatchIds.filter(id => id !== uniqueId);
    } else {
      updatedIds = [...scheduledMatchIds, uniqueId];
    }
    setScheduledMatchIds(updatedIds);

    // Apply Partai labels sequentially to matches in categories
    const newCats = categories.map(cat => {
      const updatedMatches = cat.matches.map(m => {
        const uId = `${cat.id}_${m.id}`;
        const idx = updatedIds.indexOf(uId);
        if (idx !== -1) {
          return { ...m, partai: `Partai ${idx + 1}` };
        } else {
          return { ...m, partai: 'Partai TBD' };
        }
      });
      return { ...cat, matches: updatedMatches };
    });

    updateCategories(newCats);
  };

  // --- IMPOR EXCEL (CSV) & EXPORT LOGIC ---

  // EXPORT EXCEL (CSV) - ATHLETES
  const handleExportAthletesCSV = () => {
    playBeep('valid');
    const headers = ['ID', 'Nama', 'Kontingen', 'Kelas Tanding', 'Kategori Usia', 'Gender'];
    const rows = athletes.map(a => [a.id, a.nama, a.kontingen, a.kelas, a.usia, a.gender]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Data_Atlet_Pencak_Silat_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // EXPORT EXCEL (CSV) - BRACKETS
  const handleExportBracketsCSV = () => {
    playBeep('valid');
    const headers = ['Kategori', 'Match ID', 'Round Stage', 'Partai Nomor', 'Sudut Merah', 'Kontingen Merah', 'Sudut Biru', 'Kontingen Biru', 'Pemenang'];
    const rows: string[][] = [];
    categories.forEach(cat => {
      cat.matches.forEach(m => {
        rows.push([
          cat.name,
          m.id.toString(),
          m.round,
          m.partai,
          m.atletMerah.nama,
          m.atletMerah.kontingen,
          m.atletBiru.nama,
          m.atletBiru.kontingen,
          m.winner || 'Belum Ada'
        ]);
      });
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Bagan_Pertandingan_Silat_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // EXPORT EXCEL (CSV) - KONTROL PARTAI
  const handleExportKontrolCSV = () => {
    playBeep('valid');
    const headers = ['Partai Nomor', 'Kategori', 'Babak Tahap', 'Atlet Sudut Merah', 'Kontingen Merah', 'Atlet Sudut Biru', 'Kontingen Biru', 'Status Terjadwal'];
    const rows = flatMatchesList.map(item => {
      const idx = scheduledMatchIds.indexOf(item.uniqueId);
      return [
        idx !== -1 ? `Partai ${idx + 1}` : 'TBD',
        item.catName,
        item.round,
        item.match.atletMerah.nama,
        item.match.atletMerah.kontingen,
        item.match.atletBiru.nama,
        item.match.atletBiru.kontingen,
        idx !== -1 ? 'TERJADWAL' : 'BELUM'
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Kontrol_Partai_Silat_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // DOWNLOAD TEMPLATES
  const handleDownloadTemplateAthletes = () => {
    playBeep('click');
    const headers = ['Nama', 'Kontingen', 'Kelas Tanding', 'Kategori Usia', 'Gender'];
    const sampleRows = [
      ['Fajar Ramadhan', 'Banten', 'Kelas A', 'Remaja', 'Putra'],
      ['Andi Wijaya', 'DKI Jakarta', 'Kelas A', 'Remaja', 'Putra'],
      ['Galang Perkasa', 'Sumatra Barat', 'Kelas A', 'Remaja', 'Putra'],
      ['Rian Hidayat', 'Jawa Barat', 'Kelas A', 'Remaja', 'Putra'],
      ['Siti Rahma', 'Jawa Tengah', 'Kelas B', 'Dewasa', 'Putri']
    ];
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...sampleRows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Template_Impor_Atlet_Silat.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // IMPORT EXCEL (CSV) - ATHLETES
  const handleImportAthletesCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    playBeep('valid');
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      if (lines.length <= 1) {
        alert("File CSV kosong atau format salah!");
        return;
      }

      // Detect header columns indices
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
      const idxNama = headers.indexOf('nama');
      const idxKontingen = headers.indexOf('kontingen');
      const idxKelas = headers.findIndex(h => h.includes('kelas'));
      const idxUsia = headers.findIndex(h => h.includes('usia'));
      const idxGender = headers.indexOf('gender');

      if (idxNama === -1 || idxKontingen === -1) {
        alert("Kolom 'Nama' dan 'Kontingen' harus ada di file CSV!");
        return;
      }

      const importedAthletes: RegistrasiAthlete[] = [];
      for (let i = 1; i < lines.length; i++) {
        // Simple CSV cell splitter handling quotes
        const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/"/g, '').trim());
        if (!row[idxNama] || !row[idxKontingen]) continue;

        importedAthletes.push({
          id: `ath_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`,
          nama: row[idxNama],
          kontingen: row[idxKontingen],
          kelas: idxKelas !== -1 && row[idxKelas] ? row[idxKelas] : 'Kelas A',
          usia: idxUsia !== -1 && row[idxUsia] ? row[idxUsia] : 'Remaja',
          gender: idxGender !== -1 && row[idxGender] && row[idxGender].toLowerCase().includes('putri') ? 'Putri' : 'Putra'
        });
      }

      if (importedAthletes.length > 0) {
        const merged = [...athletes, ...importedAthletes];
        saveAthletesLocal(merged);
        rebuildBracketsFromAthletes(merged);
        alert(`Berhasil mengimpor ${importedAthletes.length} data atlet!`);
      } else {
        alert("Tidak ada data atlet valid yang diimpor.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input element
  };

  // IMPORT EXCEL (CSV) - BAGAN BRACKET MATCHES
  const handleImportBracketsCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    playBeep('valid');
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      if (lines.length <= 1) {
        alert("File CSV kosong!");
        return;
      }

      // Update matching categories
      const newCats = [...categories];
      
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/"/g, '').trim());
        if (row.length < 9) continue;

        const catName = row[0];
        const matchId = parseInt(row[1], 10);
        const round = row[2] as any;
        const partai = row[3];
        const mNama = row[4];
        const mKont = row[5];
        const bNama = row[6];
        const bKont = row[7];
        const winnerStr = row[8].toLowerCase();
        const winner = winnerStr.includes('merah') ? 'merah' : winnerStr.includes('biru') ? 'biru' : null;

        const catIdx = newCats.findIndex(c => c.name === catName);
        if (catIdx !== -1) {
          const mIdx = newCats[catIdx].matches.findIndex(m => m.id === matchId);
          if (mIdx !== -1) {
            newCats[catIdx].matches[mIdx] = {
              ...newCats[catIdx].matches[mIdx],
              partai,
              atletMerah: { nama: mNama, kontingen: mKont },
              atletBiru: { nama: bNama, kontingen: bKont },
              winner
            };
          }
        }
      }

      updateCategories(newCats);
      alert("Berhasil mengimpor rincian bagan pertandingan!");
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // IMPORT EXCEL (CSV) - KONTROL SCHEDULE
  const handleImportKontrolCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    playBeep('valid');
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

      const parsedScheduledIds: string[] = [];
      const newCats = [...categories];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/"/g, '').trim());
        if (row.length < 8) continue;

        const pNumStr = row[0]; // "Partai 1"
        const catName = row[1];
        const stage = row[2];
        const isScheduled = row[7] === 'TERJADWAL';

        if (isScheduled && pNumStr !== 'TBD') {
          // Find the corresponding category & match
          const cat = newCats.find(c => c.name === catName);
          if (cat) {
            const m = cat.matches.find(match => match.round === stage);
            if (m) {
              const uId = `${cat.id}_${m.id}`;
              parsedScheduledIds.push(uId);
            }
          }
        }
      }

      if (parsedScheduledIds.length > 0) {
        setScheduledMatchIds(parsedScheduledIds);
        // Sequentialize names
        const appliedCats = newCats.map(cat => {
          const updatedMatches = cat.matches.map(m => {
            const uId = `${cat.id}_${m.id}`;
            const idx = parsedScheduledIds.indexOf(uId);
            return {
              ...m,
              partai: idx !== -1 ? `Partai ${idx + 1}` : 'Partai TBD'
            };
          });
          return { ...cat, matches: updatedMatches };
        });
        updateCategories(appliedCats);
        alert(`Berhasil mengimpor penjadwalan ${parsedScheduledIds.length} partai!`);
      } else {
        alert("Tidak ada jadwal valid yang dideteksi.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // --- HIGH-PRECISION OFFICIAL IPSI PDF GENERATORS (Pure vector PDF) ---
  const reportPrintAreaRef = useRef<HTMLDivElement>(null);
  const bracketPrintAreaRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // 1. Generate Registered Athletes PDF
  const generateAthletesRosterPdf = (athletesList: RegistrasiAthlete[], eventName: string, gelanggang: string) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
    const marginX = 12;
    const contentWidth = pageWidth - marginX * 2; // 186mm

    const rowsPerPage = 20;
    const totalPages = Math.ceil(Math.max(athletesList.length, 1) / rowsPerPage);

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) doc.addPage('a4', 'p');

      let currentY = 14;

      // Outer border
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.6);
      doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text('DAFTAR PESERTA / ATLET TERDAFTAR RESMI', pageWidth / 2, currentY, { align: 'center' });
      currentY += 5;

      doc.setFontSize(11);
      doc.text((eventName || 'KEJUARAAN PENCAK SILAT NASIONAL').toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
      currentY += 4.5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text('IKATAN PENCAK SILAT INDONESIA (IPSI) - DIGITAL MATCH COMMISSION', pageWidth / 2, currentY, { align: 'center' });
      currentY += 4;

      // Divider line
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.4);
      doc.line(marginX, currentY, marginX + contentWidth, currentY);
      currentY += 5;

      // Info panel
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(marginX, currentY, contentWidth, 10, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(`TOTAL ATLET: ${athletesList.length} PESERTA`, marginX + 4, currentY + 6.5);
      doc.text(`GELANGGANG: ${(gelanggang || 'GELANGGANG 1').toUpperCase()}`, marginX + 60, currentY + 6.5);
      doc.text(`TANGGAL CETAK: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}`, marginX + 110, currentY + 6.5);
      currentY += 14;

      // Table Header
      doc.setFillColor(15, 23, 42);
      doc.rect(marginX, currentY, contentWidth, 8, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);

      const colNo = 10;
      const colNama = 58;
      const colKontingen = 48;
      const colKelas = 26;
      const colUsia = 24;

      let x = marginX;
      doc.text('NO', x + 2, currentY + 5.5); x += colNo;
      doc.text('NAMA ATLET / PESERTA', x + 2, currentY + 5.5); x += colNama;
      doc.text('KONTINGEN / PENGKAB', x + 2, currentY + 5.5); x += colKontingen;
      doc.text('KELAS', x + 2, currentY + 5.5); x += colKelas;
      doc.text('USIA', x + 2, currentY + 5.5); x += colUsia;
      doc.text('GENDER', x + 2, currentY + 5.5);
      currentY += 8;

      // Rows
      const pageRows = athletesList.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      pageRows.forEach((ath, i) => {
        const rowIndex = page * rowsPerPage + i + 1;
        const rowHeight = 7.5;

        if (i % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(marginX, currentY, contentWidth, rowHeight, 'F');
        }

        doc.setDrawColor(226, 232, 240);
        doc.line(marginX, currentY + rowHeight, marginX + contentWidth, currentY + rowHeight);

        doc.setTextColor(15, 23, 42);
        let rx = marginX;
        doc.setFont('helvetica', 'bold');
        doc.text(rowIndex.toString(), rx + 2, currentY + 5); rx += colNo;

        doc.setFont('helvetica', 'bold');
        doc.text(ath.nama.toUpperCase().slice(0, 32), rx + 2, currentY + 5); rx += colNama;

        doc.setFont('helvetica', 'normal');
        doc.text(ath.kontingen.toUpperCase().slice(0, 26), rx + 2, currentY + 5); rx += colKontingen;
        doc.text(ath.kelas.toUpperCase(), rx + 2, currentY + 5); rx += colKelas;
        doc.text(ath.usia.toUpperCase(), rx + 2, currentY + 5); rx += colUsia;
        doc.text(ath.gender.toUpperCase(), rx + 2, currentY + 5);

        currentY += rowHeight;
      });

      // Page number
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Halaman ${page + 1} dari ${totalPages}`, marginX + contentWidth / 2, pageHeight - 12, { align: 'center' });

      // Signatures on last page
      if (page === totalPages - 1) {
        const sigY = Math.max(currentY + 12, pageHeight - 38);
        if (sigY < pageHeight - 18) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(15, 23, 42);

          doc.text('Ketua Pertandingan,', marginX + 30, sigY, { align: 'center' });
          doc.text('(........................................)', marginX + 30, sigY + 16, { align: 'center' });

          doc.text('Sekretaris Pertandingan,', marginX + contentWidth - 30, sigY, { align: 'center' });
          doc.text('(........................................)', marginX + contentWidth - 30, sigY + 16, { align: 'center' });
        }
      }
    }

    doc.save(`Daftar_Atlet_Terdaftar_${Date.now()}.pdf`);
  };

  // 2. Generate Bracket PDF
  const generateBracketReportPdf = (cat: BaganCategory, eventName: string, gelanggang: string) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 12;
    const contentWidth = pageWidth - marginX * 2;

    let currentY = 14;

    // Outer border
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.6);
    doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text('BAGAN PERTANDINGAN PENCAK SILAT (RESMI)', pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;

    doc.setFontSize(11);
    doc.text((eventName || 'KEJUARAAN PENCAK SILAT NASIONAL').toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
    currentY += 4.5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(185, 28, 28);
    doc.text(`KATEGORI: ${cat.name.toUpperCase()} (Ukuran: ${cat.size} Peserta)`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 4;

    // Divider
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(marginX, currentY, marginX + contentWidth, currentY);
    currentY += 6;

    // Table Header
    doc.setFillColor(15, 23, 42);
    doc.rect(marginX, currentY, contentWidth, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);

    doc.text('NO', marginX + 3, currentY + 5.5);
    doc.text('PARTAI', marginX + 14, currentY + 5.5);
    doc.text('BABAK', marginX + 34, currentY + 5.5);
    doc.text('SUDUT MERAH (NAMA / KONTINGEN)', marginX + 66, currentY + 5.5);
    doc.text('SUDUT BIRU (NAMA / KONTINGEN)', marginX + 124, currentY + 5.5);
    doc.text('HASIL', marginX + 172, currentY + 5.5);
    currentY += 8;

    cat.matches.forEach((m, index) => {
      if (currentY > pageHeight - 35) {
        doc.addPage('a4', 'p');
        currentY = 16;
        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.6);
        doc.rect(8, 8, pageWidth - 16, pageHeight - 16);
      }

      const rowHeight = 9;
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(marginX, currentY, contentWidth, rowHeight, 'F');
      }

      doc.setDrawColor(226, 232, 240);
      doc.line(marginX, currentY + rowHeight, marginX + contentWidth, currentY + rowHeight);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text((index + 1).toString(), marginX + 3, currentY + 5.5);
      doc.text(m.partai, marginX + 14, currentY + 5.5);

      const roundLabel = getRoundLabelIndo(m.round).toUpperCase();
      doc.text(roundLabel, marginX + 34, currentY + 5.5);

      // Merah
      const merahNama = m.atletMerah.nama ? `${m.atletMerah.nama} (${m.atletMerah.kontingen})` : '—';
      const isMerahWin = m.winner === 'merah';
      doc.setTextColor(isMerahWin ? 220 : 15, isMerahWin ? 38 : 23, isMerahWin ? 38 : 42);
      doc.text(merahNama.slice(0, 30), marginX + 66, currentY + 5.5);

      // Biru
      const biruNama = m.atletBiru.nama ? `${m.atletBiru.nama} (${m.atletBiru.kontingen})` : '—';
      const isBiruWin = m.winner === 'biru';
      doc.setTextColor(isBiruWin ? 37 : 15, isBiruWin ? 99 : 23, isBiruWin ? 235 : 42);
      doc.text(biruNama.slice(0, 30), marginX + 124, currentY + 5.5);

      // Winner
      doc.setTextColor(15, 23, 42);
      const winText = isMerahWin ? 'MERAH' : isBiruWin ? 'BIRU' : '-';
      doc.text(winText, marginX + 172, currentY + 5.5);

      currentY += rowHeight;
    });

    // Final champion if any
    const finalMatch = cat.matches.find(m => m.round === 'final');
    if (finalMatch && finalMatch.winner) {
      const champ = finalMatch.winner === 'merah' ? finalMatch.atletMerah : finalMatch.atletBiru;
      currentY += 8;
      doc.setFillColor(254, 243, 199);
      doc.setDrawColor(245, 158, 11);
      doc.rect(marginX + 20, currentY, contentWidth - 40, 14, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(180, 83, 9);
      doc.text('🏆 JUARA 1 (CHAMPION)', pageWidth / 2, currentY + 5, { align: 'center' });
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${champ.nama.toUpperCase()} (${champ.kontingen.toUpperCase()})`, pageWidth / 2, currentY + 10.5, { align: 'center' });
      currentY += 20;
    } else {
      currentY += 10;
    }

    // Signatures
    const sigY = Math.max(currentY + 4, pageHeight - 36);
    if (sigY < pageHeight - 16) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);

      doc.text('Ketua Pertandingan,', marginX + 30, sigY, { align: 'center' });
      doc.text('(........................................)', marginX + 30, sigY + 16, { align: 'center' });

      doc.text('Sekretaris Pertandingan,', marginX + contentWidth - 30, sigY, { align: 'center' });
      doc.text('(........................................)', marginX + contentWidth - 30, sigY + 16, { align: 'center' });
    }

    doc.save(`Bagan_${cat.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
  };

  const handleDownloadPDFReport = async (reportType: 'athletes' | 'bracket' | 'control') => {
    playBeep('valid');
    setIsGeneratingPdf(true);

    try {
      if (reportType === 'control') {
        // Build schedule match rows based on scheduled IDs or all matches
        const matchesToExport = flatMatchesList
          .filter(item => scheduledMatchIds.includes(item.uniqueId))
          .sort((a, b) => {
            const idxA = scheduledMatchIds.indexOf(a.uniqueId);
            const idxB = scheduledMatchIds.indexOf(b.uniqueId);
            return idxA - idxB;
          });

        const listToUse = matchesToExport.length > 0 ? matchesToExport : flatMatchesList;

        if (listToUse.length === 0) {
          alert('Belum ada data partai pertandingan untuk diunduh. Silakan buat atau input data atlet terlebih dahulu.');
          setIsGeneratingPdf(false);
          return;
        }

        const scheduleRows: ScheduleMatchRow[] = listToUse.map((item, index) => {
          const partaiNum = matchesToExport.length > 0
            ? (index + 1).toString()
            : (item.match.partai.replace(/\D/g, '') || (index + 1).toString());

          return {
            no: index + 1,
            partai: partaiNum,
            kelas: (item.kelas || item.catName || 'Kelas A').replace('Kelas ', '').toUpperCase(),
            roundLabel: getRoundLabelIndo(item.round),
            merahNama: item.match.atletMerah.nama || '—',
            merahKontingen: item.match.atletMerah.kontingen || '—',
            biruNama: item.match.atletBiru.nama || '—',
            biruKontingen: item.match.atletBiru.kontingen || '—',
            remark: item.match.winner ? (item.match.winner === 'merah' ? 'Pemenang: Merah' : 'Pemenang: Biru') : '',
            winner: item.match.winner
          };
        });

        const meta: ScheduleMetadata = {
          headerTitle: 'JADWAL PERTANDINGAN PENCAK SILAT',
          headerSubtitle: (state.namaEvent || 'KEJUARAAN PENCAK SILAT').toUpperCase(),
          headerLocationDate: 'KOMISI PERTANDINGAN IPSI',
          gelanggang: (state.gelanggang || 'GELANGGANG 1').toUpperCase(),
          hariTanggal: new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
          sesiNama: '1 - REGULER',
          showSignatures: true
        };

        generateSchedulePdf(meta, scheduleRows);
      } else if (reportType === 'athletes') {
        if (athletes.length === 0) {
          alert('Belum ada atlet yang terdaftar untuk diunduh.');
          setIsGeneratingPdf(false);
          return;
        }
        generateAthletesRosterPdf(athletes, state.namaEvent, state.gelanggang || 'GELANGGANG 1');
      } else if (reportType === 'bracket') {
        if (!activeBaganCategory) {
          alert('Pilih salah satu kategori bagan terlebih dahulu.');
          setIsGeneratingPdf(false);
          return;
        }
        generateBracketReportPdf(activeBaganCategory, state.namaEvent, state.gelanggang || 'GELANGGANG 1');
      }
    } catch (e) {
      console.error('Failed to generate PDF', e);
      alert('Gagal mengunduh PDF. Silakan coba kembali.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className={`min-h-screen w-full flex flex-col ${
      theme === 'dark' ? 'bg-[#05070e] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* HEADER BANNER */}
      <div className={`px-6 py-4 flex items-center justify-between border-b ${
        theme === 'dark' ? 'bg-[#080d1a] border-slate-900' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className={`p-2 rounded-lg cursor-pointer transition-colors ${
              theme === 'dark' ? 'hover:bg-slate-900 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-black tracking-wide font-sport uppercase">REGISTRASI DATA PERTANDINGAN</h1>
            <p className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider mt-0.5">Sekretaris Desk &bull; Digital Silat Scoring</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className={`flex p-1 rounded-lg border ${
          theme === 'dark' ? 'bg-slate-900 border-slate-850' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            onClick={() => { playBeep('click'); setActiveTab('input'); }}
            className={`px-4 py-1.5 text-xs font-black uppercase rounded cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'input' 
                ? 'bg-emerald-600 text-white shadow shadow-emerald-900/40' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Input Data Atlit
          </button>
          <button
            onClick={() => { playBeep('click'); setActiveTab('bagan'); }}
            className={`px-4 py-1.5 text-xs font-black uppercase rounded cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'bagan' 
                ? 'bg-emerald-600 text-white shadow shadow-emerald-900/40' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            Bagan Pertandingan
          </button>
          <button
            onClick={() => { playBeep('click'); setActiveTab('kontrol'); }}
            className={`px-4 py-1.5 text-xs font-black uppercase rounded cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'kontrol' 
                ? 'bg-emerald-600 text-white shadow shadow-emerald-900/40' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Kontrol Partai
          </button>
        </div>
      </div>

      {/* SUB-PANEL VIEWS */}
      <div className="flex-1 p-6 overflow-x-hidden max-w-[1600px] w-full mx-auto">
        <AnimatePresence mode="wait">
          
          {/* TAB A: INPUT DATA ATLIT */}
          {activeTab === 'input' && (
            <motion.div 
              key="input-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Form Input (Left 4 columns) */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                <div className={`p-5 rounded-2xl border ${
                  theme === 'dark' ? 'bg-[#080c16] border-slate-900' : 'bg-white border-slate-200'
                }`}>
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono mb-4">FORMULIR PENDAFTARAN ATLET</h3>
                  
                  <form onSubmit={handleSaveAthlete} className="flex flex-col gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 font-mono mb-1">Nama Atlit</label>
                      <input 
                        type="text" 
                        value={formNama}
                        onChange={e => setFormNama(e.target.value)}
                        className={`w-full text-xs font-bold px-3 py-2 rounded-lg outline-none border focus:border-emerald-500 ${
                          theme === 'dark' ? 'bg-slate-950 border-slate-850 text-white' : 'bg-slate-50 border-slate-250 text-slate-900'
                        }`}
                        placeholder="Nama Lengkap Atlet"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 font-mono mb-1">Kontingen / Daerah</label>
                      <input 
                        type="text" 
                        value={formKontingen}
                        onChange={e => setFormKontingen(e.target.value)}
                        className={`w-full text-xs font-bold px-3 py-2 rounded-lg outline-none border focus:border-emerald-500 ${
                          theme === 'dark' ? 'bg-slate-950 border-slate-850 text-white' : 'bg-slate-50 border-slate-250 text-slate-900'
                        }`}
                        placeholder="Asal Kontingen/Pengkab"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 font-mono mb-1">Kelas Tanding</label>
                        <select 
                          value={formKelas}
                          onChange={e => setFormKelas(e.target.value)}
                          className={`w-full text-xs font-bold px-3 py-2 rounded-lg outline-none border ${
                            theme === 'dark' ? 'bg-slate-950 border-slate-850 text-white' : 'bg-slate-50 border-slate-250 text-slate-900'
                          }`}
                        >
                          {['Kelas A', 'Kelas B', 'Kelas C', 'Kelas D', 'Kelas E', 'Kelas F', 'Kelas G', 'Kelas H', 'Kelas I', 'Kelas J'].map(k => (
                            <option key={k} value={k}>{k}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 font-mono mb-1">Gender</label>
                        <select 
                          value={formGender}
                          onChange={e => setFormGender(e.target.value as any)}
                          className={`w-full text-xs font-bold px-3 py-2 rounded-lg outline-none border ${
                            theme === 'dark' ? 'bg-slate-950 border-slate-850 text-white' : 'bg-slate-50 border-slate-250 text-slate-900'
                          }`}
                        >
                          <option value="Putra">Putra</option>
                          <option value="Putri">Putri</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 font-mono mb-1">Kategori Usia</label>
                      <select 
                        value={formUsia}
                        onChange={e => setFormUsia(e.target.value)}
                        className={`w-full text-xs font-bold px-3 py-2 rounded-lg outline-none border ${
                          theme === 'dark' ? 'bg-slate-950 border-slate-850 text-white' : 'bg-slate-50 border-slate-250 text-slate-900'
                        }`}
                      >
                        {['Remaja', 'Dewasa', 'Pra-Remaja', 'Usia Dini'].map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="mt-2 w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                    >
                      <Save className="w-4 h-4" />
                      {editingAthleteId ? 'Simpan Perubahan' : 'Save Atlet'}
                    </button>
                  </form>
                </div>

                {/* Import / Export toolbox */}
                <div className={`p-5 rounded-2xl border flex flex-col gap-3 ${
                  theme === 'dark' ? 'bg-[#080c16] border-slate-900' : 'bg-white border-slate-200'
                }`}>
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono mb-1">INTEGRASI & INPUT DATA OTOMATIS</h3>
                  
                  {/* Smart Auto-Parser Trigger Button */}
                  <button
                    onClick={() => {
                      playBeep('click');
                      setShowSmartInputModal(true);
                    }}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-xs uppercase rounded-xl transition-all shadow-[0_0_15px_rgba(245,158,11,0.35)] cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Wand2 className="w-4 h-4 text-amber-200" />
                    <span>✨ Input Data Otomatis (Smart Parser)</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleDownloadTemplateAthletes}
                      className={`py-2 px-3 border rounded-lg text-xs font-extrabold uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-250 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      Template CSV
                    </button>

                    <label className={`py-2 px-3 border rounded-lg text-xs font-extrabold uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer text-center ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800 text-emerald-400 hover:bg-slate-800' : 'bg-white border-slate-250 text-emerald-600 hover:bg-emerald-50/50'
                    }`}>
                      <Upload className="w-3.5 h-3.5" />
                      Impor CSV
                      <input 
                        type="file" 
                        accept=".csv" 
                        onChange={handleImportAthletesCSV}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <button
                    onClick={handleExportAthletesCSV}
                    className="w-full py-2 bg-emerald-900/20 hover:bg-emerald-900/40 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 font-extrabold text-xs uppercase rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export ke Excel (CSV)
                  </button>

                  <button
                    onClick={() => handleDownloadPDFReport('athletes')}
                    className="w-full py-2 bg-purple-900/20 hover:bg-purple-900/40 border border-purple-500/30 text-purple-400 hover:text-purple-300 font-extrabold text-xs uppercase rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Unduh Dokumen PDF
                  </button>
                </div>
              </div>

              {/* Grid filtered athletes (Right 8 columns) */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                <div className={`p-5 rounded-2xl border flex-1 flex flex-col ${
                  theme === 'dark' ? 'bg-[#080c16] border-slate-900' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono">GRID DAFTAR ATLIT ({athletes.length} REGISTERED)</h3>
                    {athletes.length > 0 && (
                      <button
                        onClick={() => {
                          if (confirm("Apakah Anda yakin menghapus semua data atlet?")) {
                            saveAthletesLocal([]);
                            rebuildBracketsFromAthletes([]);
                          }
                        }}
                        className="text-[10px] font-bold text-red-500 hover:text-red-400 flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Hapus Semua
                      </button>
                    )}
                  </div>

                  {athletes.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 text-center gap-3">
                      <Users className="w-12 h-12 text-slate-650" />
                      <p className="text-xs text-slate-500 max-w-sm">Belum ada atlet yang terdaftar. Gunakan formulir di sebelah kiri atau klik tombol "Impor CSV" untuk memuat data roster massal.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-1">
                      {derivedCategoriesList.map(catGroup => {
                        const catAthletes = athletes.filter(a => a.kelas === catGroup.kelas && a.usia === catGroup.usia && a.gender === catGroup.gender);
                        return (
                          <div 
                            key={catGroup.name}
                            className={`p-4 rounded-xl border flex flex-col gap-2 ${
                              theme === 'dark' ? 'bg-slate-950/40 border-slate-900' : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex justify-between items-center border-b border-slate-850 pb-2 mb-1">
                              <span className="text-xs font-black uppercase tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
                                {catGroup.name}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 font-mono uppercase">
                                {catGroup.athletesCount} Atlit
                              </span>
                            </div>

                            <div className="flex flex-col gap-1.5">
                              {catAthletes.map(ath => (
                                <div 
                                  key={ath.id}
                                  className={`flex justify-between items-center p-2 rounded-lg text-xs ${
                                    theme === 'dark' ? 'bg-slate-900/60 hover:bg-slate-900 text-slate-200' : 'bg-white hover:bg-slate-100 text-slate-800'
                                  }`}
                                >
                                  <div className="leading-tight truncate flex-1">
                                    <div className="font-extrabold uppercase truncate">{ath.nama}</div>
                                    <div className="text-[10px] text-slate-500 font-semibold truncate">{ath.kontingen}</div>
                                  </div>

                                  <div className="flex gap-1.5 ml-2">
                                    <button
                                      onClick={() => handleStartEdit(ath)}
                                      className="p-1 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 rounded cursor-pointer transition-all"
                                      title="Edit"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteAthlete(ath.id)}
                                      className="p-1 hover:bg-red-600/20 text-red-500 hover:text-red-400 rounded cursor-pointer transition-all"
                                      title="Hapus"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB B: BAGAN PERTANDINGAN */}
          {activeTab === 'bagan' && (
            <motion.div 
              key="bagan-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Left Selector (4 columns) */}
              <div className="lg:col-span-3 flex flex-col gap-4">
                <div className={`p-5 rounded-2xl border ${
                  theme === 'dark' ? 'bg-[#080c16] border-slate-900' : 'bg-white border-slate-200'
                }`}>
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono mb-3">PILIH BAGAN KELAS</h3>
                  
                  {categories.length === 0 ? (
                    <div className="text-center text-xs py-10 text-slate-500">Belum ada kelas tanding terdaftar.</div>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
                      {categories.map(cat => {
                        // Count actual non-empty athletes in this bracket matches
                        const athletesInBracket = new Set<string>();
                        cat.matches.forEach(m => {
                          if (m.round === 'semi') { // only count from starter rounds
                            if (m.atletMerah.nama) athletesInBracket.add(m.atletMerah.nama);
                            if (m.atletBiru.nama) athletesInBracket.add(m.atletBiru.nama);
                          }
                        });
                        const count = athletesInBracket.size;

                        if (editingCategoryId === cat.id) {
                          return (
                            <div
                              key={cat.id}
                              className={`w-full rounded-xl border p-2 flex flex-col gap-2 ${
                                theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'
                              }`}
                            >
                              <input
                                type="text"
                                value={editCategoryName}
                                onChange={(e) => setEditCategoryName(e.target.value)}
                                className={`w-full text-xs font-bold px-2 py-1.5 rounded outline-none border focus:border-emerald-500 ${
                                  theme === 'dark' ? 'bg-slate-900 border-slate-850 text-white' : 'bg-white border-slate-250 text-slate-900'
                                }`}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveCategoryName(cat.id, cat.name);
                                  } else if (e.key === 'Escape') {
                                    setEditingCategoryId(null);
                                  }
                                }}
                              />
                              <div className="flex justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingCategoryId(null);
                                  }}
                                  className="px-2 py-1 text-[10px] font-extrabold uppercase bg-slate-600 hover:bg-slate-500 text-white rounded cursor-pointer transition-all active:scale-95"
                                >
                                  Batal
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveCategoryName(cat.id, cat.name);
                                  }}
                                  className="px-2 py-1 text-[10px] font-extrabold uppercase bg-emerald-600 hover:bg-emerald-500 text-white rounded cursor-pointer transition-all active:scale-95"
                                >
                                  Simpan
                                </button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={cat.id}
                            className={`w-full rounded-xl border transition-all flex items-center justify-between ${
                              selectedCatId === cat.name
                                ? 'bg-emerald-600/15 border-emerald-500/80 text-emerald-400'
                                : theme === 'dark'
                                ? 'bg-slate-950/40 border-slate-900 text-slate-400 hover:bg-slate-900'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <button
                              onClick={() => { playBeep('click'); setSelectedCatId(cat.name); }}
                              className="flex-1 text-left px-4 py-3 font-black text-xs uppercase cursor-pointer truncate"
                            >
                              {cat.name}
                            </button>
                            <div className="flex items-center gap-1 pr-2 flex-shrink-0">
                              <span className="text-[9px] font-mono font-bold px-1 py-0.5 rounded bg-slate-950/80 text-slate-500 whitespace-nowrap">{count} Atlit</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingCategoryId(cat.id);
                                  setEditCategoryName(cat.name);
                                  playBeep('click');
                                }}
                                className="p-1 rounded hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition-all cursor-pointer"
                                title="Edit nama bagan kelas"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCategory(cat.id, cat.name);
                                }}
                                className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                                title="Hapus bagan kelas ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Import / Export toolbox (Bagan) */}
                <div className={`p-5 rounded-2xl border flex flex-col gap-3 ${
                  theme === 'dark' ? 'bg-[#080c16] border-slate-900' : 'bg-white border-slate-200'
                }`}>
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono mb-1">INTEGRASI BAGAN</h3>
                  
                  <div className="grid grid-cols-1 gap-2">
                    <label className={`py-2 px-3 border rounded-lg text-xs font-extrabold uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer text-center ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800 text-emerald-400 hover:bg-slate-800' : 'bg-white border-slate-250 text-emerald-600 hover:bg-emerald-50/50'
                    }`}>
                      <Upload className="w-3.5 h-3.5" />
                      Impor Hasil Bagan (CSV)
                      <input 
                        type="file" 
                        accept=".csv" 
                        onChange={handleImportBracketsCSV}
                        className="hidden"
                      />
                    </label>

                    <button
                      onClick={handleExportBracketsCSV}
                      className="w-full py-2 bg-emerald-900/20 hover:bg-emerald-900/40 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 font-extrabold text-xs uppercase rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export Bagan ke CSV
                    </button>

                    <button
                      onClick={() => handleDownloadPDFReport('bracket')}
                      className="w-full py-2 bg-purple-900/20 hover:bg-purple-900/40 border border-purple-500/30 text-purple-400 hover:text-purple-300 font-extrabold text-xs uppercase rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Unduh PDF Bagan
                    </button>

                    <button
                      onClick={handleDeleteAllCategories}
                      className="w-full py-2 bg-red-950/30 hover:bg-red-900/40 border border-red-500/30 text-red-400 hover:text-red-300 font-extrabold text-xs uppercase rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                      title="Hapus semua bagan kelas"
                    >
                      <Trash2 className="w-4 h-4" />
                      Hapus Semua Bagan
                    </button>
                  </div>
                </div>

                {/* TAMBAH BAGAN BARU PANEL */}
                <div className={`p-5 rounded-2xl border flex flex-col gap-3 ${
                  theme === 'dark' ? 'bg-[#080c16] border-slate-900' : 'bg-white border-slate-200'
                }`}>
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono mb-1">
                    TAMBAH BAGAN BARU
                  </h3>
                  
                  <form onSubmit={handleCreateNewBagan} className="flex flex-col gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 font-mono mb-1">Nama Bagan / Kelas</label>
                      <input 
                        type="text" 
                        value={newBaganNama}
                        onChange={e => {
                          setNewBaganNama(e.target.value);
                          if (newBaganError) setNewBaganError(null);
                        }}
                        className={`w-full text-xs font-bold px-3 py-2 rounded-lg outline-none border focus:border-emerald-500 ${
                          theme === 'dark' ? 'bg-slate-950 border-slate-850 text-white' : 'bg-slate-50 border-slate-250 text-slate-900'
                        }`}
                        placeholder="Contoh: Kelas C Putri"
                      />
                      {newBaganError && (
                        <p className="text-red-500 text-[10px] font-semibold mt-1 flex items-center gap-1">
                          ⚠️ {newBaganError}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 font-mono mb-1">Gender</label>
                        <select 
                          value={newBaganGender}
                          onChange={e => setNewBaganGender(e.target.value as 'Putra' | 'Putri')}
                          className={`w-full text-xs font-bold px-2 py-2 rounded-lg outline-none border ${
                            theme === 'dark' ? 'bg-slate-950 border-slate-850 text-white' : 'bg-slate-50 border-slate-250 text-slate-900'
                          }`}
                        >
                          <option value="Putra">Putra</option>
                          <option value="Putri">Putri</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 font-mono mb-1">Ukuran</label>
                        <select 
                          value={newBaganSize}
                          onChange={e => setNewBaganSize(Number(e.target.value))}
                          className={`w-full text-xs font-bold px-2 py-2 rounded-lg outline-none border ${
                            theme === 'dark' ? 'bg-slate-950 border-slate-850 text-white' : 'bg-slate-50 border-slate-250 text-slate-900'
                          }`}
                        >
                          <option value={4}>4 Peserta</option>
                          <option value={8}>8 Peserta</option>
                          <option value={16}>16 Peserta</option>
                          <option value={32}>32 Peserta</option>
                          <option value={64}>64 Peserta</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      BUAT BAGAN
                    </button>
                  </form>
                </div>
              </div>

              {/* Bracket Visualization (Right 9 columns) */}
              <div className="lg:col-span-9 flex flex-col gap-4">
                <div className={`p-5 rounded-2xl border flex-1 flex flex-col relative overflow-hidden ${
                  theme === 'dark' ? 'bg-[#080c16] border-slate-900' : 'bg-white border-slate-200'
                }`}>
                  
                  {/* Inline Edit Bracket Match form overlay if active */}
                  {editingBracketMatch && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-6">
                      <div className={`p-5 rounded-2xl border max-w-md w-full flex flex-col gap-4 ${
                        theme === 'dark' ? 'bg-[#0a0f1d] border-slate-800' : 'bg-white border-slate-200'
                      }`}>
                        <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono">EDIT PESERTA PARTAI BRACKET</h4>
                        
                        <div className="flex flex-col gap-3">
                          <div className="p-3 rounded-lg border border-red-900/30 bg-red-950/10">
                            <label className="block text-[10px] text-red-400 font-bold uppercase font-mono mb-1">Sudut Merah</label>
                            <input 
                              type="text" 
                              value={editMerahNama} 
                              onChange={e => setEditMerahNama(e.target.value)}
                              className="w-full text-xs font-bold bg-slate-950 border border-slate-800 px-2 py-1.5 rounded text-white"
                              placeholder="Nama Atlet Merah"
                            />
                            <input 
                              type="text" 
                              value={editMerahKontingen} 
                              onChange={e => setEditMerahKontingen(e.target.value)}
                              className="w-full text-[10px] font-bold bg-slate-950 border border-slate-800 px-2 py-1.5 rounded text-slate-400 mt-1.5"
                              placeholder="Kontingen"
                            />
                          </div>

                          <div className="p-3 rounded-lg border border-blue-900/30 bg-blue-950/10">
                            <label className="block text-[10px] text-blue-400 font-bold uppercase font-mono mb-1">Sudut Biru</label>
                            <input 
                              type="text" 
                              value={editBiruNama} 
                              onChange={e => setEditBiruNama(e.target.value)}
                              className="w-full text-xs font-bold bg-slate-950 border border-slate-800 px-2 py-1.5 rounded text-white"
                              placeholder="Nama Atlet Biru"
                            />
                            <input 
                              type="text" 
                              value={editBiruKontingen} 
                              onChange={e => setEditBiruKontingen(e.target.value)}
                              className="w-full text-[10px] font-bold bg-slate-950 border border-slate-800 px-2 py-1.5 rounded text-slate-400 mt-1.5"
                              placeholder="Kontingen"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end mt-2">
                          <button 
                            onClick={() => setEditingBracketMatch(null)}
                            className="px-3 py-1.5 text-xs font-extrabold uppercase rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                          >
                            Batal
                          </button>
                          <button 
                            onClick={handleSaveBracketMatchInfo}
                            className="px-4 py-1.5 text-xs font-extrabold uppercase rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                          >
                            Simpan
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ACTIVE BAGAN VIEW */}
                  {!selectedCatId ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-24 text-center">
                      <Trophy className="w-12 h-12 text-slate-650" />
                      <p className="text-xs text-slate-500 mt-2">Pilih kelas tanding di sebelah kiri untuk menampilkan bagan pertandingan.</p>
                    </div>
                  ) : !activeBaganCategory ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-16 text-center gap-4">
                      <Trophy className="w-12 h-12 text-slate-650" />
                      <p className="text-xs text-slate-400">Bagan belum siap.</p>
                      
                      {/* Configuration Controls */}
                      <div className="flex flex-col items-center gap-3 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80 max-w-md">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider font-mono">PENGATURAN PESERTA PER BAGAN:</span>
                        <div className="flex gap-1.5">
                          {([4, 8, 16] as const).map(sizeOption => (
                            <button
                              key={sizeOption}
                              onClick={() => handleUpdatePesertaPerBagan(sizeOption)}
                              className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg border transition-all cursor-pointer ${
                                pesertaPerBagan === sizeOption
                                  ? 'bg-indigo-600 border-indigo-500 text-white shadow shadow-indigo-900/30 scale-105'
                                  : theme === 'dark'
                                  ? 'bg-slate-950/40 border-slate-850 text-slate-400 hover:bg-slate-900'
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {sizeOption} Peserta
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-400 italic leading-snug">
                          Jika diatur {pesertaPerBagan} peserta sedangkan data atlet terinput lebih banyak, sisa atlet otomatis dipecah ke bagan terpisah (Bagan 1, Bagan 2, dst).
                        </p>
                      </div>

                      <button 
                        onClick={() => {
                          const catData = derivedCategoriesList.find(c => c.name === selectedCatId);
                          if (catData) {
                            const catAthletes = athletes.filter(a => a.kelas === catData.kelas && a.usia === catData.usia && a.gender === catData.gender);
                            rebuildBracketsFromAthletes(catAthletes);
                          }
                        }}
                        className="py-2 px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-emerald-950/20"
                      >
                        Inisialisasi Bagan Kelas Ini
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col">
                      <div className="flex justify-between items-center border-b border-slate-850 pb-3 mb-4">
                        <div>
                          <h2 className="text-md font-black tracking-wide uppercase text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-amber-500 font-sport">
                            BAGAN: {activeBaganCategory.name}
                          </h2>
                          <p className="text-[10px] text-slate-500 font-mono font-bold mt-0.5">SIZE {activeBaganCategory.size} BRACKET &bull; SINKRONISASI OTOMATIS</p>
                        </div>

                        <button
                          onClick={() => handleClearBracketWinnerAndData(activeBaganCategory.id)}
                          className="px-3 py-1.5 border border-red-900/40 text-red-500 hover:text-white hover:bg-red-950/20 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer font-mono"
                        >
                          <RefreshCw className="w-3 h-3" /> Reset Bagan
                        </button>
                      </div>

                      {/* Config Row */}
                      <div className="flex flex-col md:flex-row items-start md:items-center gap-3 bg-indigo-950/10 p-3 rounded-xl border border-indigo-900/20 mb-6 justify-between">
                        <div className="flex flex-wrap items-center gap-3 flex-1">
                          <span className="text-[9px] font-black text-indigo-400 uppercase tracking-wider font-mono">PENGATURAN PESERTA:</span>
                          <div className="flex gap-1">
                            {([4, 8, 16] as const).map(sizeOption => (
                              <button
                                key={sizeOption}
                                onClick={() => {
                                  handleUpdatePesertaPerBagan(sizeOption);
                                  // Automatically rebuild brackets with the new size limit for the current athletes
                                  const catData = derivedCategoriesList.find(c => c.name === selectedCatId);
                                  if (catData) {
                                    const catAthletes = athletes.filter(a => a.kelas === catData.kelas && a.usia === catData.usia && a.gender === catData.gender);
                                    // To be safe, we can trigger the rebuild with the correct configuration stored in localstorage first
                                    setTimeout(() => {
                                      rebuildBracketsFromAthletes(catAthletes);
                                    }, 50);
                                  }
                                }}
                                className={`px-2 py-1 text-[9px] font-black uppercase rounded border transition-all cursor-pointer ${
                                  pesertaPerBagan === sizeOption
                                    ? 'bg-indigo-600 border-indigo-500 text-white scale-105'
                                    : theme === 'dark'
                                    ? 'bg-slate-950/40 border-slate-850 text-slate-400 hover:bg-slate-900'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                {sizeOption} Peserta
                              </button>
                            ))}
                          </div>
                          <p className="text-[9px] text-slate-400 italic leading-none">
                            Mengubah ukuran otomatis membagi sisa atlet ke bagan lain (Bagan 1, Bagan 2, dst).
                          </p>
                        </div>

                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => { playBeep('click'); handleOpenManageAthletesModal(); }}
                            className="px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-1 transition-all shadow shadow-indigo-900/20 cursor-pointer"
                            title="Atur Susunan Peserta Manual"
                          >
                            <Users className="w-3.5 h-3.5" /> Atur Peserta
                          </button>

                          <button
                            onClick={() => { playBeep('click'); setShowLottingModal(true); setLottingInput(""); }}
                            className="px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1 transition-all shadow shadow-emerald-800/20 cursor-pointer"
                            title="Undi Atlet Secara Acak"
                          >
                            🎯 Lotting Atlet
                          </button>

                          <button
                            onClick={() => handleDownloadPDFReport('bracket')}
                            className="px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider bg-purple-600 hover:bg-purple-500 text-white rounded-lg flex items-center gap-1 transition-all shadow shadow-purple-800/20 cursor-pointer"
                            title="Unduh Dokumen PDF Bagan Pertandingan"
                          >
                            <FileText className="w-3.5 h-3.5" /> Unduh Bagan PDF
                          </button>
                        </div>
                      </div>

                      {/* DRAWING INTERACTIVE BRACKETS AREA (PRINTABLE TARGET) */}
                      <div 
                        ref={bracketPrintAreaRef}
                        className={`p-6 rounded-2xl flex items-center justify-center min-h-[480px] overflow-x-auto ${
                          theme === 'dark' ? 'bg-[#0b0f19]' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-8 font-sans py-4">
                          {/* STAGE: 64 Besar (Only shown if Size is 64) */}
                          {activeBaganCategory.size === 64 && (
                            <div className="flex flex-col justify-around gap-2 h-[580px] min-w-[210px]">
                              <div className="text-center font-mono text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-850 pb-1 mb-1">Babak 64 Besar</div>
                              <div className="flex flex-col gap-2 overflow-y-auto max-h-[520px] pr-1">
                                {Array.from({ length: 32 }, (_, i) => i + 1).map(idx => {
                                  const m = activeBaganCategory.matches.find(match => match.id === idx)!;
                                  return renderBracketNode(m, activeBaganCategory);
                                })}
                              </div>
                            </div>
                          )}

                          {activeBaganCategory.size === 64 && <div className="text-slate-700 font-bold font-mono text-xs">&rarr;</div>}

                          {/* STAGE: 32 Besar (Shown if Size is 32 or 64) */}
                          {(activeBaganCategory.size === 32 || activeBaganCategory.size === 64) && (
                            <div className="flex flex-col justify-around gap-2 h-[580px] min-w-[210px]">
                              <div className="text-center font-mono text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-850 pb-1 mb-1">Babak 32 Besar</div>
                              <div className="flex flex-col gap-2 overflow-y-auto max-h-[520px] pr-1">
                                {activeBaganCategory.size === 64 ? (
                                  Array.from({ length: 16 }, (_, i) => i + 33).map(idx => {
                                    const m = activeBaganCategory.matches.find(match => match.id === idx)!;
                                    return renderBracketNode(m, activeBaganCategory);
                                  })
                                ) : (
                                  Array.from({ length: 16 }, (_, i) => i + 1).map(idx => {
                                    const m = activeBaganCategory.matches.find(match => match.id === idx)!;
                                    return m ? renderBracketNode(m, activeBaganCategory) : null;
                                  })
                                )}
                              </div>
                            </div>
                          )}

                          {(activeBaganCategory.size === 32 || activeBaganCategory.size === 64) && <div className="text-slate-700 font-bold font-mono text-xs">&rarr;</div>}

                          {/* STAGE 0: Octo Finals (Shown if Size is 16, 32, or 64) */}
                          {(activeBaganCategory.size === 16 || activeBaganCategory.size === 32 || activeBaganCategory.size === 64) && (
                            <div className="flex flex-col justify-around gap-2 h-[580px]">
                              <div className="text-center font-mono text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-850 pb-1 mb-1">Babak 16 Besar</div>
                              <div className="flex flex-col gap-3 overflow-y-auto max-h-[520px] pr-1">
                                {activeBaganCategory.size === 64 ? (
                                  Array.from({ length: 8 }, (_, i) => i + 49).map(idx => {
                                    const m = activeBaganCategory.matches.find(match => match.id === idx)!;
                                    return renderBracketNode(m, activeBaganCategory);
                                  })
                                ) : activeBaganCategory.size === 32 ? (
                                  Array.from({ length: 8 }, (_, i) => i + 17).map(idx => {
                                    const m = activeBaganCategory.matches.find(match => match.id === idx)!;
                                    return renderBracketNode(m, activeBaganCategory);
                                  })
                                ) : (
                                  [1, 2, 3, 4, 5, 6, 7, 8].map(idx => {
                                    const m = activeBaganCategory.matches.find(match => match.id === idx)!;
                                    return renderBracketNode(m, activeBaganCategory);
                                  })
                                )}
                              </div>
                            </div>
                          )}

                          {(activeBaganCategory.size === 16 || activeBaganCategory.size === 32 || activeBaganCategory.size === 64) && <div className="text-slate-700 font-bold font-mono text-xs">&rarr;</div>}

                          {/* STAGE 1: Quarter Finals (Shown if Size is 8, 16, 32, or 64) */}
                          {(activeBaganCategory.size === 8 || activeBaganCategory.size === 16 || activeBaganCategory.size === 32 || activeBaganCategory.size === 64) && (
                            <div className="flex flex-col justify-around gap-4 h-[580px]">
                              <div className="text-center font-mono text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-850 pb-1 mb-1">Perempat Final</div>
                              {activeBaganCategory.size === 64 ? (
                                Array.from({ length: 4 }, (_, i) => i + 57).map(idx => {
                                  const m = activeBaganCategory.matches.find(match => match.id === idx)!;
                                  return renderBracketNode(m, activeBaganCategory);
                                })
                              ) : activeBaganCategory.size === 32 ? (
                                Array.from({ length: 4 }, (_, i) => i + 25).map(idx => {
                                  const m = activeBaganCategory.matches.find(match => match.id === idx)!;
                                  return renderBracketNode(m, activeBaganCategory);
                                })
                              ) : activeBaganCategory.size === 16 ? (
                                [9, 10, 11, 12].map(idx => {
                                  const m = activeBaganCategory.matches.find(match => match.id === idx)!;
                                  return renderBracketNode(m, activeBaganCategory);
                                })
                              ) : (
                                [1, 2, 3, 4].map(idx => {
                                  const m = activeBaganCategory.matches.find(match => match.id === idx)!;
                                  return renderBracketNode(m, activeBaganCategory);
                                })
                              )}
                            </div>
                          )}

                          {(activeBaganCategory.size === 8 || activeBaganCategory.size === 16 || activeBaganCategory.size === 32 || activeBaganCategory.size === 64) && <div className="text-slate-700 font-bold font-mono text-xs">&rarr;</div>}

                          {/* STAGE 2: Semi Finals */}
                          <div className="flex flex-col justify-around gap-12 h-[580px]">
                            <div className="text-center font-mono text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-850 pb-1 mb-1">Semi Final</div>
                            {activeBaganCategory.size === 64 ? (
                              Array.from({ length: 2 }, (_, i) => i + 61).map(idx => {
                                const m = activeBaganCategory.matches.find(match => match.id === idx)!;
                                return renderBracketNode(m, activeBaganCategory);
                              })
                            ) : activeBaganCategory.size === 32 ? (
                              Array.from({ length: 2 }, (_, i) => i + 29).map(idx => {
                                const m = activeBaganCategory.matches.find(match => match.id === idx)!;
                                return renderBracketNode(m, activeBaganCategory);
                              })
                            ) : activeBaganCategory.size === 16 ? (
                              [13, 14].map(idx => {
                                const m = activeBaganCategory.matches.find(match => match.id === idx)!;
                                return renderBracketNode(m, activeBaganCategory);
                              })
                            ) : activeBaganCategory.size === 8 ? (
                              [5, 6].map(idx => {
                                const m = activeBaganCategory.matches.find(match => match.id === idx)!;
                                return renderBracketNode(m, activeBaganCategory);
                              })
                            ) : (
                              [1, 2].map(idx => {
                                const m = activeBaganCategory.matches.find(match => match.id === idx)!;
                                return renderBracketNode(m, activeBaganCategory);
                              })
                            )}
                          </div>

                          <div className="text-slate-700 font-bold font-mono text-xs">&rarr;</div>

                          {/* STAGE 3: Final Match */}
                          <div className="flex flex-col justify-center gap-6 h-[580px]">
                            <div className="text-center font-mono text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-850 pb-1 mb-1">Babak Final</div>
                            {(() => {
                              const finalId = activeBaganCategory.size === 64 ? 63 : activeBaganCategory.size === 32 ? 31 : activeBaganCategory.size === 16 ? 15 : activeBaganCategory.size === 8 ? 7 : 3;
                              const m = activeBaganCategory.matches.find(match => match.id === finalId)!;
                              return renderBracketNode(m, activeBaganCategory);
                            })()}
                          </div>

                          <div className="text-slate-700 font-bold font-mono text-xs">&rarr;</div>

                          {/* CHAMPION DISPLAY PODIUM */}
                          <div className="flex flex-col justify-center h-[580px]">
                            <div className="text-center font-mono text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-850 pb-1 mb-1">Juara 1</div>
                            {renderChampionPodium(activeBaganCategory)}
                          </div>
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              </div>
            </motion.div>
          )}

          {/* TAB C: KONTROL PARTAI SCHEDULER */}
          {activeTab === 'kontrol' && (
            <motion.div 
              key="kontrol-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex flex-col gap-6"
            >
              {/* RECAP ROW */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className={`p-4 rounded-xl border flex flex-col justify-center ${
                  theme === 'dark' ? 'bg-[#080c16] border-slate-900' : 'bg-white border-slate-200'
                }`}>
                  <span className="text-[10px] font-bold text-slate-500 font-mono uppercase">Total Atlit Terdaftar</span>
                  <span className="text-xl font-black font-sport text-emerald-400 mt-1">{athletes.length} ATLIT</span>
                </div>

                <div className={`p-4 rounded-xl border flex flex-col justify-center ${
                  theme === 'dark' ? 'bg-[#080c16] border-slate-900' : 'bg-white border-slate-200'
                }`}>
                  <span className="text-[10px] font-bold text-slate-500 font-mono uppercase">Total Kelas Tanding</span>
                  <span className="text-xl font-black font-sport text-cyan-400 mt-1">{derivedCategoriesList.length} KELAS</span>
                </div>

                <div className={`p-4 rounded-xl border flex flex-col justify-center ${
                  theme === 'dark' ? 'bg-[#080c16] border-slate-900' : 'bg-white border-slate-200'
                }`}>
                  <span className="text-[10px] font-bold text-slate-500 font-mono uppercase">Total Partai Tersedia</span>
                  <span className="text-xl font-black font-sport text-purple-400 mt-1">{flatMatchesList.length} PARTAI</span>
                </div>

                <div className={`p-4 rounded-xl border flex flex-col justify-center ${
                  theme === 'dark' ? 'bg-[#080c16] border-slate-900' : 'bg-white border-slate-200'
                }`}>
                  <span className="text-[10px] font-bold text-slate-500 font-mono uppercase">Partai Terjadwal</span>
                  <span className="text-xl font-black font-sport text-yellow-500 mt-1">{scheduledMatchIds.length} TERJADWAL</span>
                </div>
              </div>

              {/* MAIN SCHEDULING TABLE */}
              <div className={`p-5 rounded-2xl border flex flex-col ${
                theme === 'dark' ? 'bg-[#080c16] border-slate-900' : 'bg-white border-slate-200'
              }`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono">DAFTAR KONTROL SELURUH PARTAI PERTANDINGAN</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Centang kotak pada baris partai untuk memasukkannya ke jadwal pertandingan secara berurutan.</p>
                  </div>

                  {/* Excel Tools for Kontrol */}
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        playBeep('valid');
                        scheduleAllMatches();
                        alert("Seluruh partai berhasil dijadwalkan secara acak!");
                      }}
                      className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-black uppercase transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      🎲 Jadwalkan Semua (Urutan Acak)
                    </button>

                    <button
                      onClick={() => {
                        playBeep('click');
                        if (confirm("Apakah Anda yakin ingin mengosongkan seluruh jadwal partai?")) {
                          clearAllScheduledMatches();
                        }
                      }}
                      className="py-1.5 px-3 border border-rose-500/20 bg-rose-950/10 text-rose-400 hover:bg-rose-900/20 rounded text-[10px] font-black uppercase transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      ❌ Kosongkan Jadwal
                    </button>

                    <button
                      onClick={handleExportKontrolCSV}
                      className="py-1.5 px-3 border border-emerald-500/20 bg-emerald-950/10 text-emerald-400 rounded text-[10px] font-black uppercase transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> Export Jadwal CSV
                    </button>

                    <label className="py-1.5 px-3 border border-emerald-500/20 bg-emerald-950/10 text-emerald-400 rounded text-[10px] font-black uppercase transition-all cursor-pointer flex items-center gap-1.5 text-center">
                      <Upload className="w-3.5 h-3.5" /> Impor CSV
                      <input 
                        type="file" 
                        accept=".csv" 
                        onChange={handleImportKontrolCSV}
                        className="hidden"
                      />
                    </label>

                    <button
                      onClick={() => handleDownloadPDFReport('control')}
                      className="py-1.5 px-3 border border-purple-500/20 bg-purple-950/10 text-purple-400 rounded text-[10px] font-black uppercase transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" /> Unduh Dokumen PDF
                    </button>
                  </div>
                </div>

                {flatMatchesList.length === 0 ? (
                  <div className="text-center text-slate-500 text-xs py-16">
                    Belum ada partai pertandingan yang tersedia. Tambahkan data atlet pada Tab "Input Data Atlit" terlebih dahulu.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse font-sans text-xs">
                      <thead>
                        <tr className={`border-b ${theme === 'dark' ? 'border-slate-850 text-slate-400' : 'border-slate-200 text-slate-600'} uppercase font-mono tracking-wider font-bold`}>
                          <th className="py-2.5 px-3 text-center">Centang</th>
                          <th className="py-2.5 px-3">Nomor Partai</th>
                          <th className="py-2.5 px-3">Kategori / Kelas</th>
                          <th className="py-2.5 px-3">Babak Tahap</th>
                          <th className="py-2.5 px-3">Sudut Merah (Red Corner)</th>
                          <th className="py-2.5 px-3">Sudut Biru (Blue Corner)</th>
                          <th className="py-2.5 px-3">Pemenang</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {flatMatchesList.map(item => {
                          const isChecked = scheduledMatchIds.includes(item.uniqueId);
                          const scheduledIdx = scheduledMatchIds.indexOf(item.uniqueId);
                          
                          return (
                            <tr 
                              key={item.uniqueId}
                              className={`transition-colors ${
                                isChecked 
                                  ? theme === 'dark' ? 'bg-emerald-950/10' : 'bg-emerald-50/20' 
                                  : theme === 'dark' ? 'hover:bg-slate-900/40' : 'hover:bg-slate-50'
                              }`}
                            >
                              {/* CHECKBOX COLUMN */}
                              <td className="py-3 px-3 text-center">
                                <button
                                  onClick={() => handleToggleScheduleMatch(item.uniqueId)}
                                  className={`p-1 rounded cursor-pointer ${isChecked ? 'text-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                  {isChecked ? <CheckSquare className="w-5 h-5 fill-current text-emerald-500 text-white" /> : <Square className="w-5 h-5" />}
                                </button>
                              </td>

                              {/* JADWAL PARTAI NO COLUMN */}
                              <td className="py-3 px-3 font-mono font-bold">
                                {isChecked ? (
                                  <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-500 uppercase text-[10px] border border-yellow-500/30">
                                    Partai {scheduledIdx + 1}
                                  </span>
                                ) : (
                                  <span className="text-slate-550 italic uppercase text-[10px]">Belum Terjadwal</span>
                                )}
                              </td>

                              {/* KELAS / KATEGORI COLUMN */}
                              <td className="py-3 px-3 uppercase font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                                {item.catName}
                              </td>

                              {/* ROUND COLUMN */}
                              <td className="py-3 px-3 font-mono text-[10px] uppercase font-bold">
                                <span className={`px-2 py-0.5 rounded ${
                                  item.round === 'final' 
                                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                                    : item.round === 'semi'
                                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                }`}>
                                  {item.round === 'final' ? 'Final' : item.round === 'semi' ? 'Semi Final' : 'Perempat Final'}
                                </span>
                              </td>

                              {/* RED ATHLETE */}
                              <td className="py-3 px-3 leading-tight">
                                <div className="font-extrabold uppercase text-red-400">{item.match.atletMerah.nama || '—'}</div>
                                <div className="text-[10px] text-slate-500 font-semibold">{item.match.atletMerah.kontingen || '—'}</div>
                              </td>

                              {/* BLUE ATHLETE */}
                              <td className="py-3 px-3 leading-tight">
                                <div className="font-extrabold uppercase text-blue-400">{item.match.atletBiru.nama || '—'}</div>
                                <div className="text-[10px] text-slate-500 font-semibold">{item.match.atletBiru.kontingen || '—'}</div>
                              </td>

                              {/* WINNER CELL */}
                              <td className="py-3 px-3 font-bold font-mono text-[10px] uppercase">
                                {item.match.winner ? (
                                  <span className={`px-2 py-0.5 rounded ${
                                    item.match.winner === 'merah' 
                                      ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                  }`}>
                                    🏆 {item.match.winner}
                                  </span>
                                ) : (
                                  <span className="text-slate-600">Menunggu...</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {showLottingModal && activeBaganCategory && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className={`bg-slate-900 border border-slate-800 ${lottingMode === 'manual' ? 'max-w-3xl' : 'max-w-lg'} w-full p-6 rounded-2xl shadow-2xl relative text-slate-100 flex flex-col max-h-[90vh] overflow-hidden transition-all duration-300`}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowLottingModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer z-10"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex-shrink-0">
                <h3 className="text-base font-black text-emerald-400 uppercase tracking-tight flex items-center gap-2">
                  🎯 SISTEM LOTTING & MANUAL POOL ATLET
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Kocok undi otomatis atau konfigurasikan pembagian pool secara manual berdasarkan kategori kelas, usia, dan jenis kelamin.
                </p>

                {/* Info Box */}
                <div className="mt-3 grid grid-cols-2 gap-2 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Nama Kelas</span>
                    <span className="font-extrabold text-white">{activeBaganCategory.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Golongan Usia</span>
                    <span className="font-extrabold text-amber-400">{activeBaganCategory.usia || "Remaja"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Jenis Kelamin</span>
                    <span className="font-extrabold text-blue-400">{activeBaganCategory.gender}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Kapasitas Bagan</span>
                    <span className="font-extrabold text-emerald-400">{activeBaganCategory.size} Atlet ({activeBaganCategory.size === 4 ? 'Semifinal' : 'Perempat'})</span>
                  </div>
                </div>

                {/* SETTING: Pembagian Pool/Bagan */}
                <div className="mt-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 flex flex-col gap-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-black tracking-wider text-indigo-400 flex items-center gap-1">
                      ⚙️ Pengaturan Pembagian Bagan / Pool
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Mode Pemilihan */}
                    <div>
                      <label className="block text-[8px] uppercase font-bold text-slate-500 mb-1">Metode Pengundian</label>
                      <select
                        value={lottingMode}
                        onChange={(e) => {
                          const val = e.target.value as 'single' | 'split' | 'manual';
                          setLottingMode(val);
                          playBeep('click');
                        }}
                        className="w-full text-xs bg-slate-900 border border-slate-800 focus:border-indigo-500 px-2.5 py-1.5 rounded-lg outline-none text-slate-100 font-semibold cursor-pointer"
                      >
                        <option value="single">Satu Bagan Tunggal ({activeBaganCategory.size} Atlet)</option>
                        <option value="split">Bagi ke Beberapa Pool (Acak Otomatis)</option>
                        <option value="manual">Bagi ke Beberapa Pool (Manual Input per Pool)</option>
                      </select>
                    </div>

                    {/* Maksimal Peserta per Bagan */}
                    <div>
                      <label className="block text-[8px] uppercase font-bold text-slate-500 mb-1">Maks. Atlet per Pool/Bagan</label>
                      <select
                        value={lottingMaxPerBagan}
                        onChange={(e) => setLottingMaxPerBagan(Number(e.target.value) as 4 | 8 | 16)}
                        disabled={lottingMode === 'single'}
                        className="w-full text-xs bg-slate-900 border border-slate-800 focus:border-indigo-500 px-2.5 py-1.5 rounded-lg outline-none text-slate-100 font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <option value={4}>4 Atlet (Semifinal)</option>
                        <option value={8}>8 Atlet (Perempat)</option>
                        <option value={16}>16 Atlet (Penyisihan)</option>
                      </select>
                    </div>
                  </div>

                  {lottingMode === 'split' && (
                    <div className="text-[10px] text-indigo-300 leading-normal border-t border-slate-800/60 pt-2 flex items-start gap-1">
                      <span>💡</span>
                      <span>
                        Sistem akan membagi total <strong>{parseAthletes(lottingInput).length} atlet</strong> secara acak menjadi beberapa pool terpisah berkapasitas maksimal <strong>{lottingMaxPerBagan} atlet</strong> per pool. Sisa atlet yang tidak genap akan otomatis ditempatkan di pool terakhir dengan ukuran bagan optimal.
                      </span>
                    </div>
                  )}

                  {lottingMode === 'manual' && (
                    <div className="text-[10px] text-indigo-300 leading-normal border-t border-slate-800/60 pt-2 flex items-start gap-1">
                      <span>💡</span>
                      <span>
                        Sistem akan membuat <strong>{manualPoolsCount} pool manual</strong>. Anda bisa mengetik nama-nama atlet langsung ke masing-masing box pool di bawah (tanpa diundi secara acak). Kapasitas maksimal tiap pool adalah <strong>{lottingMaxPerBagan} atlet</strong>.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Textarea Input area */}
              <div className="flex-1 overflow-y-auto my-4 flex flex-col min-h-0 gap-2">
                {/* PANEL IMPOR DATA ATLET DARI REGISTRASI (impor data atlet) */}
                <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 mb-1 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-black tracking-wider text-emerald-400 flex items-center gap-1">
                      📥 Impor Data Atlet Terdaftar
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowImportRegistrasi(!showImportRegistrasi)}
                      className="px-2 py-0.5 text-[9px] font-black uppercase bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 cursor-pointer"
                    >
                      {showImportRegistrasi ? "🙈 Sembunyikan" : "👀 Tampilkan Panel Impor"}
                    </button>
                  </div>

                  {showImportRegistrasi && (
                    <div className="flex flex-col gap-2 mt-1 border-t border-slate-800/60 pt-2">
                      <div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center">
                        <div className="flex gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleImportRegisteredAthletes(true)}
                            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[9px] font-black uppercase tracking-wider cursor-pointer transition-all"
                          >
                            📥 Impor yang Cocok ({athletes.filter(ath => {
                              const genderMatch = ath.gender.toLowerCase() === activeBaganCategory.gender.toLowerCase();
                              const matchKelas = activeBaganCategory.kelas || activeBaganCategory.name || "";
                              const kelasMatch = ath.kelas && (matchKelas.toLowerCase().includes(ath.kelas.toLowerCase()) || ath.kelas.toLowerCase().includes(matchKelas.toLowerCase()));
                              return genderMatch && (kelasMatch || !ath.kelas);
                            }).length})
                          </button>
                          <button
                            type="button"
                            onClick={() => handleImportRegisteredAthletes(false)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[9px] font-black uppercase tracking-wider cursor-pointer transition-all"
                          >
                            📂 Impor Semua ({athletes.length})
                          </button>
                        </div>

                        <input
                          type="text"
                          value={importSearch}
                          onChange={e => setImportSearch(e.target.value)}
                          placeholder="Cari nama / kontingen..."
                          className="text-[10px] px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-white placeholder-slate-500 w-full sm:w-44 focus:outline-none focus:border-indigo-500 font-bold"
                        />
                      </div>

                      <div className="max-h-[120px] overflow-y-auto border border-slate-800 rounded-lg bg-slate-950/60 p-1 flex flex-col gap-1">
                        {(() => {
                          const matchGender = activeBaganCategory.gender;
                          const matchKelas = activeBaganCategory.kelas || activeBaganCategory.name || "";
                          
                          const filteredList = athletes.filter(ath => {
                            if (importSearch) {
                              const query = importSearch.toLowerCase();
                              const nameMatch = ath.nama.toLowerCase().includes(query);
                              const kontingenMatch = ath.kontingen.toLowerCase().includes(query);
                              const kelasMatch = ath.kelas && ath.kelas.toLowerCase().includes(query);
                              if (!nameMatch && !kontingenMatch && !kelasMatch) return false;
                            }
                            return true;
                          });

                          if (filteredList.length === 0) {
                            return <div className="text-center text-slate-500 text-[10px] py-4">Tidak ada data atlet terdaftar</div>;
                          }

                          return filteredList.map(ath => {
                            const isCocok = ath.gender.toLowerCase() === matchGender.toLowerCase() && 
                              (!ath.kelas || matchKelas.toLowerCase().includes(ath.kelas.toLowerCase()) || ath.kelas.toLowerCase().includes(matchKelas.toLowerCase()));

                            return (
                              <div key={ath.id} className="flex justify-between items-center bg-slate-900/50 p-1.5 rounded border border-slate-800/80 hover:bg-slate-900 transition-colors">
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-extrabold text-slate-200">{ath.nama}</span>
                                  <span className="text-[9px] text-slate-400 font-semibold">{ath.kontingen} • {ath.kelas} ({ath.gender})</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {isCocok ? (
                                    <span className="text-[8px] bg-emerald-950 text-emerald-400 px-1 py-0.5 rounded font-black uppercase">Sesuai</span>
                                  ) : (
                                    <span className="text-[8px] bg-slate-950 text-slate-500 px-1 py-0.5 rounded font-black uppercase">Beda</span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      playBeep('click');
                                      const line = `${ath.nama} - ${ath.kontingen}`;
                                      if (lottingInput.trim()) {
                                        setLottingInput(prev => prev.trim() + '\n' + line);
                                      } else {
                                        setLottingInput(line);
                                      }
                                    }}
                                    className="px-2 py-0.5 bg-indigo-900 hover:bg-indigo-800 text-indigo-300 rounded text-[9px] font-extrabold cursor-pointer transition-all"
                                  >
                                    ➕ Tambah
                                  </button>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                {lottingMode !== 'manual' ? (
                  <>
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] uppercase font-bold text-slate-400">
                        Daftar Nama Peserta ({parseAthletes(lottingInput).length} / {activeBaganCategory.size})
                      </label>
                      <button
                        onClick={handleGeneratePresetLotting}
                        className="px-2 py-0.5 text-[9px] font-black uppercase bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 cursor-pointer"
                      >
                        ⚡ Gunakan Preset Atlet
                      </button>
                    </div>

                    <textarea
                      value={lottingInput}
                      onChange={(e) => setLottingInput(e.target.value)}
                      placeholder="Masukkan nama atlet & kontingen, satu per baris. Contoh:&#10;Fajar Ramadhan - DKI Jakarta&#10;Galang Perkasa - Jawa Barat&#10;Andi Wijaya - Banten"
                      className="w-full flex-1 min-h-[160px] text-xs bg-slate-950 border border-slate-800 focus:border-emerald-500 p-3 rounded-xl outline-none text-white font-mono leading-relaxed"
                    />

                    <p className="text-[10px] text-slate-500 leading-tight">
                      💡 *Tips*: Anda bisa langsung menyalin daftar nama atlet dari Excel atau Notepad. Jika jumlah atlet yang dimasukkan kurang dari kapasitas bagan ({activeBaganCategory.size}), sistem akan mengisi slot kosong dengan <strong className="text-amber-500">BYE</strong> secara otomatis.
                    </p>
                  </>
                ) : (
                  <div className="flex flex-col gap-3 flex-1 min-h-0">
                    {/* Master list input first */}
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 flex-shrink-0">
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-[10px] uppercase font-black text-slate-400">
                          📋 1. Master List Atlet (Opsional)
                        </label>
                        <button
                          onClick={handleGeneratePresetLotting}
                          className="px-2 py-0.5 text-[9px] font-black uppercase bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 cursor-pointer"
                        >
                          ⚡ Gunakan Preset
                        </button>
                      </div>
                      <textarea
                        value={lottingInput}
                        onChange={(e) => setLottingInput(e.target.value)}
                        placeholder="Tempel master list atlet di sini untuk didistribusikan otomatis ke pool di bawah..."
                        className="w-full h-[80px] text-[11px] bg-slate-950 border border-slate-800 focus:border-indigo-500 p-2 rounded-lg outline-none text-white font-mono"
                      />
                      <div className="flex justify-between items-center mt-2 gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold text-slate-500">Jumlah Pool:</span>
                          <select
                            value={manualPoolsCount}
                            onChange={(e) => {
                              setManualPoolsCount(Number(e.target.value));
                              playBeep('click');
                            }}
                            className="bg-slate-900 border border-slate-800 text-xs px-2 py-1 rounded text-white cursor-pointer"
                          >
                            {[2, 3, 4, 5, 6, 7, 8].map(n => (
                              <option key={n} value={n}>{n} Pool</option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={handleDistributeEvenly}
                          className="px-2.5 py-1 text-[10px] font-black uppercase bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors cursor-pointer"
                        >
                          分 Distribusikan Rata ke Pool &darr;
                        </button>
                      </div>
                    </div>

                    {/* Pools Inputs Grid */}
                    <div className="flex-1 flex flex-col min-h-0 gap-1.5">
                      <label className="block text-[10px] uppercase font-black text-slate-400">
                        ✍️ 2. Atur Isi Atlet per Pool Secara Manual
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto max-h-[220px] pr-1">
                        {Array.from({ length: manualPoolsCount }).map((_, i) => {
                          const poolLetter = String.fromCharCode(64 + i + 1);
                          const parsedCount = parseAthletes(manualPoolsInputs[i] || "").length;
                          return (
                            <div key={i} className="p-2.5 bg-slate-950/40 border border-slate-800/80 rounded-xl flex flex-col gap-1.5">
                              <div className="flex justify-between items-center text-[10px] font-black text-indigo-400 font-mono">
                                <span>POOL {poolLetter}</span>
                                <span className="text-slate-500">{parsedCount} Atlet</span>
                              </div>
                              <textarea
                                value={manualPoolsInputs[i] || ""}
                                onChange={(e) => {
                                  const updated = [...manualPoolsInputs];
                                  updated[i] = e.target.value;
                                  setManualPoolsInputs(updated);
                                }}
                                placeholder={`Ketik atlet Pool ${poolLetter} di sini...`}
                                className="w-full h-[90px] text-[11px] bg-slate-950 border border-slate-850 focus:border-indigo-500 p-2 rounded-lg outline-none text-white font-mono leading-tight"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal actions */}
              <div className="flex-shrink-0 flex gap-3 border-t border-slate-800/40 pt-3">
                <button
                  onClick={handleExecuteLotting}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 font-black text-xs uppercase tracking-wider rounded-lg transition-transform active:scale-95 flex items-center justify-center gap-1 cursor-pointer shadow shadow-emerald-700/20"
                >
                  {lottingMode === 'manual' ? '💾 Simpan & Buat Pool Manual' : '🎲 Mulai Lotting & Undi Acak'}
                </button>
                <button
                  onClick={() => setShowLottingModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-350 text-xs font-bold uppercase tracking-wider border border-slate-700/50 rounded-lg transition-transform active:scale-95 cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showManageAthletesModal && activeBaganCategory && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-slate-900 border border-slate-800 max-w-4xl w-full p-6 rounded-2xl shadow-2xl relative text-slate-100 flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowManageAthletesModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer z-10"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex-shrink-0 border-b border-slate-800/60 pb-3">
                <h3 className="text-base font-black text-indigo-400 uppercase tracking-tight flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-400" /> PENGATUR PESERTA BAGAN MANUAL
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Atur nama dan kontingen atlet secara manual untuk setiap partai babak pertama. Kosongkan slot atau klik <strong className="text-amber-500">BYE</strong> jika tidak ada peserta.
                </p>

                {/* Category Info */}
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-slate-850 border border-slate-800 font-extrabold text-white">
                    Kelas: {activeBaganCategory.name}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-850 border border-slate-800 font-extrabold text-purple-400">
                    Usia: {activeBaganCategory.usia || "Remaja"}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-850 border border-slate-800 font-extrabold text-blue-400">
                    Gender: {activeBaganCategory.gender}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-850 border border-slate-800 font-extrabold text-emerald-400">
                    Kapasitas: {activeBaganCategory.size} Atlet
                  </span>
                </div>
              </div>

              {/* Scrollable Matches Forms */}
              <div className="flex-1 overflow-y-auto my-4 pr-1 flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {manageAthletesList.map((match, idx) => (
                    <div 
                      key={match.id} 
                      className="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl flex flex-col gap-3 relative"
                    >
                      {/* Match Header */}
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase border-b border-slate-800/60 pb-1.5">
                        <span className="text-indigo-400 font-black">{match.partai}</span>
                        <span>SLOT {idx * 2 + 1} & {idx * 2 + 2}</span>
                      </div>

                      {/* Red Athlete (Sudut Merah) */}
                      <div className="p-2.5 bg-red-950/10 border border-red-900/25 rounded-xl flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black text-red-400 tracking-wider">● SUDUT MERAH (Slot {idx * 2 + 1})</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...manageAthletesList];
                              updated[idx].merahNama = "BYE";
                              updated[idx].merahKont = "AUTOMATIC";
                              setManageAthletesList(updated);
                            }}
                            className="text-[8px] uppercase font-black px-1.5 py-0.5 bg-red-900/40 hover:bg-red-900/30 text-red-400 rounded border border-red-900/30 cursor-pointer animate-none"
                          >
                            Set BYE
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[8px] uppercase font-bold text-slate-500 mb-0.5">Nama Atlet</label>
                            <input
                              type="text"
                              value={match.merahNama}
                              onChange={(e) => {
                                const updated = [...manageAthletesList];
                                updated[idx].merahNama = e.target.value;
                                setManageAthletesList(updated);
                              }}
                              placeholder="Nama Atlet"
                              className="w-full text-xs bg-slate-950 border border-slate-800 focus:border-red-500/80 px-2.5 py-1.5 rounded-lg outline-none text-white font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] uppercase font-bold text-slate-500 mb-0.5">Kontingen</label>
                            <input
                              type="text"
                              value={match.merahKont}
                              onChange={(e) => {
                                const updated = [...manageAthletesList];
                                updated[idx].merahKont = e.target.value;
                                setManageAthletesList(updated);
                              }}
                              placeholder="Kontingen"
                              className="w-full text-xs bg-slate-950 border border-slate-800 focus:border-red-500/80 px-2.5 py-1.5 rounded-lg outline-none text-white font-semibold"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Blue Athlete (Sudut Biru) */}
                      <div className="p-2.5 bg-blue-950/10 border border-blue-900/25 rounded-xl flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black text-blue-400 tracking-wider">● SUDUT BIRU (Slot {idx * 2 + 2})</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...manageAthletesList];
                              updated[idx].biruNama = "BYE";
                              updated[idx].biruKont = "AUTOMATIC";
                              setManageAthletesList(updated);
                            }}
                            className="text-[8px] uppercase font-black px-1.5 py-0.5 bg-blue-900/40 hover:bg-blue-900/30 text-blue-400 rounded border border-blue-900/30 cursor-pointer animate-none"
                          >
                            Set BYE
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[8px] uppercase font-bold text-slate-500 mb-0.5">Nama Atlet</label>
                            <input
                              type="text"
                              value={match.biruNama}
                              onChange={(e) => {
                                const updated = [...manageAthletesList];
                                updated[idx].biruNama = e.target.value;
                                setManageAthletesList(updated);
                              }}
                              placeholder="Nama Atlet"
                              className="w-full text-xs bg-slate-950 border border-slate-800 focus:border-blue-500/80 px-2.5 py-1.5 rounded-lg outline-none text-white font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] uppercase font-bold text-slate-500 mb-0.5">Kontingen</label>
                            <input
                              type="text"
                              value={match.biruKont}
                              onChange={(e) => {
                                const updated = [...manageAthletesList];
                                updated[idx].biruKont = e.target.value;
                                setManageAthletesList(updated);
                              }}
                              placeholder="Kontingen"
                              className="w-full text-xs bg-slate-950 border border-slate-800 focus:border-blue-500/80 px-2.5 py-1.5 rounded-lg outline-none text-white font-semibold"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer buttons */}
              <div className="flex-shrink-0 flex justify-between items-center border-t border-slate-800/40 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    playBeep('warning');
                    if (confirm("Kosongkan semua nama atlet di pengatur ini?")) {
                      const cleared = manageAthletesList.map(m => ({
                        ...m,
                        merahNama: "",
                        merahKont: "",
                        biruNama: "",
                        biruKont: ""
                      }));
                      setManageAthletesList(cleared);
                    }
                  }}
                  className="px-3 py-2 bg-slate-850 hover:bg-red-900/40 hover:text-red-400 hover:border-red-900/40 border border-slate-800 text-slate-400 text-xs font-bold uppercase rounded-lg cursor-pointer transition-all animate-none"
                >
                  Bersihkan Semua
                </button>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowManageAthletesModal(false)}
                    className="px-4 py-2 bg-slate-850 hover:bg-slate-750 text-slate-300 text-xs font-bold uppercase border border-slate-700/50 rounded-lg cursor-pointer animate-none"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSaveManageAthletes}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-lg shadow shadow-emerald-700/20 cursor-pointer flex items-center gap-1"
                  >
                    <Save className="w-4 h-4" /> Simpan Susunan Peserta
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

      </div>

      {/* HIDDEN OFFSCREEN CANVAS TARGET FOR GENERATING CORRECT PRINT REPORT FORMAT */}
      <div className="absolute left-[-9999px] top-0 pointer-events-none">
        <div 
          ref={reportPrintAreaRef}
          className="w-[800px] p-8 bg-white text-black flex flex-col gap-6"
          id="pdf-report-canvas"
          style={{ backgroundColor: '#ffffff', color: '#000000', fontFamily: 'Inter, sans-serif' }}
        >
          {/* HEADER DOKUMEN */}
          <div className="text-center pb-2 flex flex-col items-center">
            <span className="text-sm font-bold uppercase tracking-widest text-slate-800">JADWAL PERTANDINGAN KEJUARAAN PENCAK SILAT</span>
            <span className="text-xl font-black text-slate-900 uppercase tracking-wide mt-1">
              {state.namaEvent ? state.namaEvent.toUpperCase() : "TRI GUNA SAKTI CUP XIV"}
            </span>
            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest mt-1">
              16 - 17 Desember 2023
            </span>
            <div className="w-full h-1 bg-black mt-3" style={{ height: '3px', backgroundColor: '#000000' }} />
            <div className="w-full h-[1px] bg-black mt-0.5" style={{ height: '1px', backgroundColor: '#000000' }} />
          </div>

          {/* METADATA GRID (Dotted lines and alignment like the image) */}
          <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-800 pb-2">
            {/* Left Column */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center">
                <span className="w-20">Seri :</span>
                <span>I</span>
              </div>
              <div className="flex items-center">
                <span className="w-20">Waktu :</span>
                <span className="border-b border-dashed border-slate-400 w-32">&nbsp;</span>
              </div>
              <div className="flex items-center">
                <span className="w-20">Tanggal :</span>
                <span>18 Des 2023</span>
              </div>
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-2 pl-12">
              <div className="flex items-center">
                <span className="w-28">Gelanggang :</span>
                <span>1</span>
              </div>
              <div className="flex items-center">
                <span className="w-28">Babak :</span>
                <span>Penyisihan s/d Final</span>
              </div>
              <div className="flex items-center">
                <span className="w-28">Tingkat :</span>
                <span>Pra Remaja / Remaja</span>
              </div>
            </div>
          </div>

          {/* TAB 1: INPUT TAB DATA REPORT */}
          {activeTab === 'input' && (
            <div className="flex flex-col gap-4">
              <div className="text-center mb-2">
                <span className="text-sm font-bold uppercase tracking-wider text-slate-800">DATA REGISTERED ATHLETES REPORT</span>
                <div className="w-32 h-1 bg-black mt-2 mx-auto rounded" style={{ height: '3px', backgroundColor: '#000000' }} />
              </div>
              
              <table className="w-full text-left text-xs border-collapse border border-black text-black font-sans">
                <thead>
                  <tr className="border-b border-black font-bold font-mono uppercase" style={{ backgroundColor: '#f1f5f9' }}>
                    <th className="border-r border-black p-2 w-[6%] text-center">NO</th>
                    <th className="border-r border-black p-2 w-[34%]">NAMA LENGKAP</th>
                    <th className="border-r border-black p-2 w-[25%]">KONTINGEN</th>
                    <th className="border-r border-black p-2 w-[15%]">KELAS TANDING</th>
                    <th className="border-r border-black p-2 w-[10%]">GENDER</th>
                    <th className="p-2 w-[10%]">USIA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black border-b border-black">
                  {athletes.map((a, i) => (
                    <tr key={a.id} className="h-10">
                      <td className="border-r border-black p-1.5 text-center font-mono font-bold">{i + 1}</td>
                      <td className="border-r border-black p-1.5 font-black uppercase text-xs">{a.nama}</td>
                      <td className="border-r border-black p-1.5 text-slate-700 font-bold uppercase">{a.kontingen}</td>
                      <td className="border-r border-black p-1.5 uppercase font-medium">{a.kelas}</td>
                      <td className="border-r border-black p-1.5 uppercase font-medium">{a.gender}</td>
                      <td className="p-1.5 uppercase font-medium">{a.usia}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: BAGAN TAB DATA REPORT */}
          {activeTab === 'bagan' && activeBaganCategory && (
            <div className="flex flex-col gap-4">
              <div className="text-center mb-2">
                <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">BAGAN KELAS PERTANDINGAN</span>
                <h3 className="text-md font-black text-slate-950 uppercase mt-0.5">{activeBaganCategory.name}</h3>
              </div>
              
              <table className="w-full text-center border-collapse border border-black text-xs text-black font-sans">
                <thead>
                  <tr className="border-b border-black font-bold" style={{ backgroundColor: '#f1f5f9' }}>
                    <th className="border-r border-black p-2 w-[6%]">NO</th>
                    <th className="border-r border-black p-2 w-[8%]">PARTAI</th>
                    <th className="border-r border-black p-2 w-[16%]">BABAK</th>
                    <th className="border-r border-black p-2 w-[30%] text-white" style={{ backgroundColor: '#E50000' }}>SUDUT MERAH</th>
                    <th className="border-r border-black p-2 w-[30%] text-white" style={{ backgroundColor: '#0066CC' }}>SUDUT BIRU</th>
                    <th className="p-2 w-[10%]">NILAI</th>
                  </tr>
                </thead>
                <tbody className="border-b border-black">
                  {activeBaganCategory.matches.map((m, index) => {
                    const partaiNum = m.partai.replace(/\D/g, '') || (index + 1).toString();
                    const roundLabel = m.round === 'final' ? 'FINAL' : m.round === 'semi' ? 'SEMI FINAL' : 'PEREMPAT FINAL';

                    return (
                      <tr key={m.id} className="border-b border-black h-12">
                        <td className="border-r border-black p-1 text-center font-bold">{index + 1}</td>
                        <td className="border-r border-black p-1 text-center font-mono font-bold">{partaiNum}</td>
                        <td className="border-r border-black p-1 text-center font-bold uppercase">{roundLabel}</td>
                        
                        {/* SUDUT MERAH */}
                        <td className="border-r border-black p-1 text-center leading-tight">
                          <div className="font-extrabold uppercase text-xs">{m.atletMerah.nama || '—'}</div>
                          <div className="text-[10px] text-slate-600 font-semibold mt-0.5">{m.atletMerah.kontingen || '—'}</div>
                        </td>

                        {/* SUDUT BIRU */}
                        <td className="border-r border-black p-1 text-center leading-tight">
                          <div className="font-extrabold uppercase text-xs">{m.atletBiru.nama || '—'}</div>
                          <div className="text-[10px] text-slate-600 font-semibold mt-0.5">{m.atletBiru.kontingen || '—'}</div>
                        </td>

                        {/* NILAI (Split Cell) */}
                        <td className="p-0 text-center h-full align-stretch">
                          <div className="flex h-full min-h-[38px] w-full items-stretch">
                            <div className="w-1/2 border-r border-black h-full">&nbsp;</div>
                            <div className="w-1/2 h-full">&nbsp;</div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: KONTROL SCHEDULE TAB DATA REPORT */}
          {activeTab === 'kontrol' && (
            <div className="flex flex-col gap-4">
              <table className="w-full text-center border-collapse border border-black text-xs text-black font-sans">
                <thead>
                  <tr className="border-b border-black font-bold" style={{ backgroundColor: '#f1f5f9' }}>
                    <th className="border-r border-black p-2 w-[6%]">NO</th>
                    <th className="border-r border-black p-2 w-[8%]">PARTAI</th>
                    <th className="border-r border-black p-2 w-[16%]">KELAS</th>
                    <th className="border-r border-black p-2 w-[30%] text-white font-black" style={{ backgroundColor: '#E50000' }}>SUDUT MERAH</th>
                    <th className="border-r border-black p-2 w-[30%] text-white font-black" style={{ backgroundColor: '#0066CC' }}>SUDUT BIRU</th>
                    <th className="p-2 w-[10%]">NILAI</th>
                  </tr>
                </thead>
                <tbody className="border-b border-black">
                  {/* Map scheduled matches or fallback to all flat matches */}
                  {(() => {
                    const matchesToPrint = flatMatchesList
                      .filter(item => scheduledMatchIds.includes(item.uniqueId))
                      .sort((a, b) => {
                        const idxA = scheduledMatchIds.indexOf(a.uniqueId);
                        const idxB = scheduledMatchIds.indexOf(b.uniqueId);
                        return idxA - idxB;
                      });

                    const listToUse = matchesToPrint.length > 0 ? matchesToPrint : flatMatchesList;

                    return listToUse.map((item, index) => {
                      const partaiNum = matchesToPrint.length > 0 
                        ? (index + 1).toString() 
                        : (item.match.partai.replace(/\D/g, '') || (index + 1).toString());

                      const kelasLabel = (item.kelas || item.catName || '').replace("Kelas ", "").toUpperCase();

                      return (
                        <tr key={item.uniqueId} className="border-b border-black h-12">
                          <td className="border-r border-black p-1 text-center font-bold">{index + 1}</td>
                          <td className="border-r border-black p-1 text-center font-mono font-bold">{partaiNum}</td>
                          <td className="border-r border-black p-1 text-center font-bold uppercase">
                            <div className="font-extrabold text-[11px]">{kelasLabel}</div>
                            <div className="text-[8px] text-slate-700 font-bold mt-0.5 leading-none">{getRoundLabelIndo(item.round).toUpperCase()}</div>
                          </td>
                          
                          {/* SUDUT MERAH */}
                          <td className="border-r border-black p-1 text-center leading-tight">
                            <div className="font-extrabold uppercase text-xs">{item.match.atletMerah.nama || '—'}</div>
                            <div className="text-[10px] text-slate-600 font-semibold mt-0.5">{item.match.atletMerah.kontingen || '—'}</div>
                          </td>

                          {/* SUDUT BIRU */}
                          <td className="border-r border-black p-1 text-center leading-tight">
                            <div className="font-extrabold uppercase text-xs">{item.match.atletBiru.nama || '—'}</div>
                            <div className="text-[10px] text-slate-600 font-semibold mt-0.5">{item.match.atletBiru.kontingen || '—'}</div>
                          </td>

                          {/* NILAI (Split Cell) */}
                          <td className="p-0 text-center h-full align-stretch">
                            <div className="flex h-full min-h-[38px] w-full items-stretch">
                              <div className="w-1/2 border-r border-black h-full">&nbsp;</div>
                              <div className="w-1/2 h-full">&nbsp;</div>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          )}

          {/* SIGNATURE AREA IN RECAPS */}
          <div className="mt-12 flex justify-between px-8 text-xs font-sans text-black font-bold">
            <div className="text-center flex flex-col items-center">
              <div>Ketua Pertandingan,</div>
              <div className="mt-20 border-t border-black pt-2 w-44 text-center">
                (........................................)
              </div>
            </div>
            <div className="text-center flex flex-col items-center">
              <div>Sekretaris Pertandingan,</div>
              <div className="mt-20 border-t border-black pt-2 w-44 text-center">
                (........................................)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SMART AUTO-PARSER MODAL */}
      {showSmartInputModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`w-full max-w-4xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
              theme === 'dark' ? 'bg-[#080d1a] border-amber-500/40 text-slate-100' : 'bg-white border-amber-400 text-slate-900'
            }`}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-amber-500/30 bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase text-amber-200 flex items-center gap-2">
                    <span>Input Data Otomatis & Pemisah Kategori Cerdas</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
                      Excel / CSV / Teks
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Unggah file Excel atau tempel daftar peserta. Sistem otomatis memisahkan Kategori, Kelas, Usia, Gender, Nama & Kontingen.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadOfficialExcelTemplate()}
                  className="px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-400/40 text-emerald-200 text-xs font-bold font-mono uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Template Excel</span>
                </button>
                <button
                  onClick={() => setShowSmartInputModal(false)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Tab Selector: Excel Upload vs Text Paste */}
              <div className="flex items-center gap-2 p-1 bg-slate-950/80 border border-slate-800 rounded-xl w-fit">
                <button
                  onClick={() => setSmartInputMode('excel')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                    smartInputMode === 'excel'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Upload File Excel (.xlsx / .xls)</span>
                </button>

                <button
                  onClick={() => setSmartInputMode('text')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                    smartInputMode === 'text'
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
                ref={smartFileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={async (e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    await handleProcessExcelSmart(e.target.files[0]);
                    e.target.value = '';
                  }
                }}
                className="hidden"
              />

              {smartInputMode === 'excel' ? (
                <div className="space-y-3">
                  <div 
                    onClick={() => smartFileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        await handleProcessExcelSmart(e.dataTransfer.files[0]);
                      }
                    }}
                    className="border-2 border-dashed border-emerald-500/50 hover:border-emerald-400 bg-slate-950/70 hover:bg-emerald-950/20 p-8 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform mb-2">
                      <FileUp className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-black text-slate-200 uppercase tracking-wide group-hover:text-emerald-300">
                      {smartExcelLoading ? 'Sedang Membaca Excel...' : 'Klik atau Seret (Drag & Drop) File Excel ke Sini'}
                    </h4>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      Format kolom: <span className="text-emerald-400 font-bold">Nama Atlet, Kontingen, Kategori, Kelas, Usia & Gender</span>
                    </p>
                    
                    {smartExcelFileName && (
                      <div className="mt-3 px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-400/50 text-emerald-200 text-xs font-mono font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>File Terbaca: {smartExcelFileName}</span>
                      </div>
                    )}
                  </div>

                  {smartExcelError && (
                    <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-xl text-xs font-mono text-red-200 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{smartExcelError}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-mono font-bold uppercase text-amber-300">
                      Tempel Teks Daftar Atlet (Bebas Format):
                    </label>
                    <button
                      onClick={() => {
                        const sample = `1. HIDAYAT LIMONU - SULAWESI UTARA - Tanding B PA Dewasa\n2. YUDHA MAHENDRI - RIAU - Tanding B PA Dewasa\n3. AFRIANI LAURENSIA (SUMATERA UTARA) Kelas B PI Remaja\n4. FAJAR RAMADHAN - BANTEN - Kelas A Remaja Putra`;
                        handleAnalyzeSmartText(sample);
                      }}
                      className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer"
                    >
                      Muat Contoh Data
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    value={smartRawText}
                    onChange={(e) => handleAnalyzeSmartText(e.target.value)}
                    placeholder="Contoh:&#10;1. HIDAYAT LIMONU - SULAWESI UTARA - Tanding B PA Dewasa&#10;2. YUDHA MAHENDRI - RIAU - Tanding B PA Dewasa"
                    className={`w-full p-3.5 border rounded-xl text-xs font-mono placeholder-slate-500 focus:outline-none ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-700 text-slate-200 focus:border-amber-500' : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-amber-500'
                    }`}
                  />
                </div>
              )}

              {smartParsedList.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="font-bold text-cyan-400">Hasil Pemisahan: {smartParsedList.length} Peserta Terdeteksi</span>
                    <button
                      onClick={() => exportAthletesToExcelFile(smartParsedList, 'Data_Atlet_Registrasi.xlsx')}
                      className="text-xs font-mono font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Ekspor ke Excel</span>
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto border border-slate-800 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[10px] uppercase font-mono">
                        <tr>
                          <th className="py-2 px-3 text-center w-8">No</th>
                          <th className="py-2 px-3">Nama Atlet</th>
                          <th className="py-2 px-3">Kontingen</th>
                          <th className="py-2 px-3 text-center">Kelas</th>
                          <th className="py-2 px-3 text-center">Usia</th>
                          <th className="py-2 px-3 text-center">Gender</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {smartParsedList.map((item, i) => (
                          <tr key={item.id} className="hover:bg-slate-800/30">
                            <td className="py-1.5 px-3 text-center text-slate-500">{i + 1}</td>
                            <td className="py-1.5 px-3 font-bold text-white uppercase">{item.nama}</td>
                            <td className="py-1.5 px-3 text-slate-300 uppercase">{item.kontingen}</td>
                            <td className="py-1.5 px-3 text-center text-amber-300 font-bold">{item.kelas}</td>
                            <td className="py-1.5 px-3 text-center text-emerald-300">{item.kategoriUsia}</td>
                            <td className="py-1.5 px-3 text-center text-pink-300">{item.gender}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center">
              <button
                onClick={() => setShowSmartInputModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleApplySmartAthletes}
                disabled={smartParsedList.length === 0}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Daftarkan & Buat Bagan ({smartParsedList.length} Atlet)</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );

  // Helper to render Bracket Node in Bracket Chart
  function renderBracketNode(match: BaganMatch, category: BaganCategory) {
    const winnerMerah = match.winner === 'merah';
    const winnerBiru = match.winner === 'biru';

    return (
      <div 
        key={match.id}
        className={`w-52 p-3 rounded-xl border flex flex-col gap-2 relative group hover:scale-[1.02] transition-all duration-300 ${
          theme === 'dark' 
            ? 'bg-slate-950/80 border-slate-850 hover:border-slate-700' 
            : 'bg-white border-slate-200 hover:border-slate-300'
        }`}
      >
        {/* Match Title Partai badge */}
        <div className="flex justify-between items-center border-b border-slate-850 pb-1 text-[9px] font-mono font-black text-slate-400 uppercase">
          <span>{match.partai}</span>
          <span className="text-[8px] text-slate-500 font-bold">{match.round === 'final' ? 'FINAL' : match.round === 'semi' ? 'SEMI' : 'QUARTER'}</span>
        </div>

        {/* Merah Corner Row */}
        <div className={`flex items-center justify-between p-1 rounded-md border relative ${
          winnerMerah 
            ? 'bg-red-950/20 border-red-700/60 text-red-200 font-black' 
            : theme === 'dark'
            ? 'bg-slate-900/30 border-slate-900 text-slate-350'
            : 'bg-slate-50 border-slate-100 text-slate-700'
        }`}>
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-red-600 rounded-l" />
          <div className="pl-1.5 truncate flex-1 leading-none text-left">
            <div className="text-[10px] font-extrabold uppercase truncate">{match.atletMerah.nama || "Belum ada atlet"}</div>
            <div className="text-[8px] text-slate-500 truncate font-semibold">{match.atletMerah.kontingen || "—"}</div>
          </div>
          {winnerMerah && <Trophy className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0 animate-bounce ml-1" />}
        </div>

        {/* Biru Corner Row */}
        <div className={`flex items-center justify-between p-1 rounded-md border relative ${
          winnerBiru 
            ? 'bg-blue-950/20 border-blue-700/60 text-blue-200 font-black' 
            : theme === 'dark'
            ? 'bg-slate-900/30 border-slate-900 text-slate-350'
            : 'bg-slate-50 border-slate-100 text-slate-700'
        }`}>
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-600 rounded-l" />
          <div className="pl-1.5 truncate flex-1 leading-none text-left">
            <div className="text-[10px] font-extrabold uppercase truncate">{match.atletBiru.nama || "Belum ada atlet"}</div>
            <div className="text-[8px] text-slate-500 truncate font-semibold">{match.atletBiru.kontingen || "—"}</div>
          </div>
          {winnerBiru && <Trophy className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0 animate-bounce ml-1" />}
        </div>

        {/* Hover Action overlays for winner selection & inline edits */}
        <div className="flex justify-between items-center border-t border-slate-900 pt-1.5 mt-0.5 text-[8px] font-mono">
          <div className="flex gap-1">
            <button 
              onClick={() => handleSetBracketWinner(category.id, match.id, 'merah')}
              className={`px-1.5 py-0.5 rounded font-black cursor-pointer uppercase ${winnerMerah ? 'bg-red-600 text-white' : 'bg-red-950/20 text-red-400 hover:bg-red-950/40'}`}
              title="Set Merah Menang"
            >
              M
            </button>
            <button 
              onClick={() => handleSetBracketWinner(category.id, match.id, 'biru')}
              className={`px-1.5 py-0.5 rounded font-black cursor-pointer uppercase ${winnerBiru ? 'bg-blue-600 text-white' : 'bg-blue-955/20 text-blue-400 hover:bg-blue-955/40'}`}
              title="Set Biru Menang"
            >
              B
            </button>
            {match.winner && (
              <button 
                onClick={() => handleSetBracketWinner(category.id, match.id, null)}
                className="px-1 text-slate-500 hover:text-slate-350 cursor-pointer"
                title="Reset Pemenang"
              >
                &larr;
              </button>
            )}
          </div>

          <div className="flex gap-1">
            <button 
              onClick={() => {
                playBeep('click');
                setEditingBracketMatch({ catId: category.id, mId: match.id });
                setEditMerahNama(match.atletMerah.nama);
                setEditMerahKontingen(match.atletMerah.kontingen);
                setEditBiruNama(match.atletBiru.nama);
                setEditBiruKontingen(match.atletBiru.kontingen);
              }}
              className="px-1 text-slate-400 hover:text-white hover:bg-slate-900 rounded cursor-pointer uppercase font-extrabold"
              title="Edit Nama Peserta"
            >
              Edit
            </button>

            {match.atletMerah.nama && match.atletBiru.nama && (
              <button
                onClick={() => handlePlayLiveMatch(match, category)}
                className="px-1.5 py-0.5 rounded cursor-pointer font-black uppercase text-emerald-400 hover:bg-emerald-600 hover:text-white bg-emerald-900/20 border border-emerald-500/20"
                title="Muat ke scoring tanding live"
              >
                PLAY
              </button>
            )}
          </div>
        </div>

      </div>
    );
  }

  // Render Champion Medal Showcase
  function renderChampionPodium(category: BaganCategory) {
    const finalId = category.size === 8 ? 7 : 3;
    const finalMatch = category.matches.find(m => m.id === finalId);

    if (!finalMatch || !finalMatch.winner) {
      return (
        <div className={`w-40 p-4 rounded-xl border text-center flex flex-col items-center justify-center gap-1 ${
          theme === 'dark' ? 'bg-slate-950/40 border-slate-850/60 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'
        }`}>
          <Trophy className="w-6 h-6 text-slate-700 mb-1" />
          <span className="text-[9px] font-black uppercase tracking-widest font-mono">CHAMPION</span>
          <span className="text-[8px] italic">Awaiting Final...</span>
        </div>
      );
    }

    const champ = finalMatch.winner === 'merah' ? finalMatch.atletMerah : finalMatch.atletBiru;
    const isMerah = finalMatch.winner === 'merah';

    return (
      <div className={`w-40 p-4 rounded-xl border text-center flex flex-col items-center justify-center gap-1 relative overflow-hidden shadow-xl ${
        isMerah 
          ? 'bg-red-950/25 border-red-700/60 text-red-200' 
          : 'bg-blue-955/25 border-blue-700/60 text-blue-200'
      }`}>
        <Trophy className="w-8 h-8 text-yellow-500 mb-1 animate-pulse" />
        <span className="text-[8px] font-black uppercase tracking-widest text-yellow-500 font-mono">JUARA KELAS</span>
        <div className="leading-tight mt-1">
          <div className="text-xs font-black uppercase truncate">{champ.nama || "—"}</div>
          <div className="text-[9px] text-slate-400 font-bold truncate">{champ.kontingen || "—"}</div>
        </div>
      </div>
    );
  }
}

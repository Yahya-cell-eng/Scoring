import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Check, Edit3, ArrowLeftRight, Trash2, Plus, AlertCircle, 
  Sparkles, Save, User, Shield, Trophy, FileText, CheckCircle2, RotateCcw,
  Search, Users, Layers, Wand2, Hash, ArrowUp, ArrowDown
} from 'lucide-react';
import { BaganCategory, BaganMatch, TGRPeserta, TGRState } from '../types';
import { playBeep } from '../utils/sound';

export interface FlattenedMatchInfo {
  uniqueId: string; // "catId_matchId"
  catId: string;
  catName: string;
  shortKelas: string;
  gender: string;
  match: BaganMatch;
}

interface EditJadwalPartaiModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: BaganCategory[];
  onSaveCategories: (updatedCategories: BaganCategory[]) => void;
  tgrState?: TGRState | null;
  onSaveTgrPeserta?: (updatedPeserta: TGRPeserta[]) => void;
  targetMatchId?: string | null; // e.g. "tanding_catId_matchId" or "seni_pesertaId" or "catId_matchId"
  targetType?: 'tanding' | 'seni' | 'all';
}

export default function EditJadwalPartaiModal({
  isOpen,
  onClose,
  categories,
  onSaveCategories,
  tgrState,
  onSaveTgrPeserta,
  targetMatchId,
  targetType = 'all'
}: EditJadwalPartaiModalProps) {
  // Master Tab: 'tanding' | 'seni' | 'all'
  const [activeTab, setActiveTab] = useState<'tanding' | 'seni' | 'all'>(() => {
    if (targetType === 'seni' || (targetMatchId && targetMatchId.startsWith('seni_'))) return 'seni';
    if (targetType === 'tanding' || (targetMatchId && targetMatchId.startsWith('tanding_'))) return 'tanding';
    return 'all';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // -------------------------------------------------------------
  // TANDING STATE & FORMS
  // -------------------------------------------------------------
  const [selectedTandingId, setSelectedTandingId] = useState<string>('');
  const [isAddingNewTanding, setIsAddingNewTanding] = useState(false);

  // Form Fields Tanding
  const [tNomorPartai, setTNomorPartai] = useState('');
  const [tKategoriNama, setTKategoriNama] = useState('');
  const [tGender, setTGender] = useState<'Putra' | 'Putri'>('Putra');
  const [tBabak, setTBabak] = useState<'thirtysecond' | 'sixteenth' | 'eighth' | 'quarter' | 'semi' | 'final'>('quarter');
  const [tNamaMerah, setTNamaMerah] = useState('');
  const [tKontingenMerah, setTKontingenMerah] = useState('');
  const [tNamaBiru, setTNamaBiru] = useState('');
  const [tKontingenBiru, setTKontingenBiru] = useState('');

  // -------------------------------------------------------------
  // SENI TGR STATE & FORMS
  // -------------------------------------------------------------
  const [tgrPesertaList, setTgrPesertaList] = useState<TGRPeserta[]>(() => {
    if (tgrState?.pesertaList && tgrState.pesertaList.length > 0) {
      return tgrState.pesertaList;
    }
    try {
      const saved = localStorage.getItem('tgr_peserta_list');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Sync when tgrState changes
  useEffect(() => {
    if (tgrState?.pesertaList && tgrState.pesertaList.length > 0) {
      setTgrPesertaList(tgrState.pesertaList);
    }
  }, [tgrState?.pesertaList]);

  const [selectedSeniId, setSelectedSeniId] = useState<string>('');
  const [isAddingNewSeni, setIsAddingNewSeni] = useState(false);

  // Form Fields Seni
  const [sNomorPartai, setSNomorPartai] = useState<number>(1);
  const [sNoUndian, setSNoUndian] = useState<number>(1);
  const [sPool, setSPool] = useState('Pool A');
  const [sNama, setSNama] = useState('');
  const [sKontingen, setSKontingen] = useState('');
  const [sKategori, setSKategori] = useState('Tunggal');
  const [sGender, setSGender] = useState<'Putra' | 'Putri'>('Putra');
  const [sUsia, setSUsia] = useState('Dewasa');
  const [sBabak, setSBabak] = useState('Penyisihan');

  // -------------------------------------------------------------
  // MEMOIZED DATA LISTS
  // -------------------------------------------------------------
  // Flattened all Tanding matches
  const allTandingFlattened = useMemo(() => {
    const list: FlattenedMatchInfo[] = [];
    categories.forEach(cat => {
      cat.matches.forEach(m => {
        list.push({
          uniqueId: `${cat.id}_${m.id}`,
          catId: cat.id,
          catName: cat.name,
          shortKelas: cat.name,
          gender: cat.gender,
          match: m
        });
      });
    });
    // Sort numerically by partai
    list.sort((a, b) => {
      const numA = parseInt(a.match.partai.replace(/\D/g, ''), 10) || 999;
      const numB = parseInt(b.match.partai.replace(/\D/g, ''), 10) || 999;
      return numA - numB;
    });
    return list;
  }, [categories]);

  // Flattened all Seni participants
  const allSeniFlattened = useMemo(() => {
    const list = [...tgrPesertaList];
    list.sort((a, b) => {
      const pA = a.partaiNumber || (a.partai ? parseInt(a.partai.replace(/\D/g, ''), 10) : 0) || a.noUrut || 999;
      const pB = b.partaiNumber || (b.partai ? parseInt(b.partai.replace(/\D/g, ''), 10) : 0) || b.noUrut || 999;
      if (pA !== pB) return pA - pB;
      return (a.noUndian || 0) - (b.noUndian || 0);
    });
    return list;
  }, [tgrPesertaList]);

  // Initialize selections when targetMatchId or lists change
  useEffect(() => {
    if (!isOpen) return;

    if (targetMatchId) {
      if (targetMatchId.startsWith('seni_')) {
        const pId = targetMatchId.replace('seni_', '');
        setSelectedSeniId(pId);
        setActiveTab('seni');
      } else if (targetMatchId.startsWith('tanding_')) {
        const cleanId = targetMatchId.replace('tanding_', '');
        setSelectedTandingId(cleanId);
        setActiveTab('tanding');
      } else {
        // Check which list it belongs to
        if (allTandingFlattened.some(m => m.uniqueId === targetMatchId)) {
          setSelectedTandingId(targetMatchId);
          setActiveTab('tanding');
        } else if (allSeniFlattened.some(s => s.id === targetMatchId)) {
          setSelectedSeniId(targetMatchId);
          setActiveTab('seni');
        }
      }
    } else {
      if (!selectedTandingId && allTandingFlattened.length > 0) {
        setSelectedTandingId(allTandingFlattened[0].uniqueId);
      }
      if (!selectedSeniId && allSeniFlattened.length > 0) {
        setSelectedSeniId(allSeniFlattened[0].id);
      }
    }
  }, [isOpen, targetMatchId, allTandingFlattened, allSeniFlattened]);

  // Populate Tanding form on selection
  useEffect(() => {
    if (isAddingNewTanding) return;
    const cur = allTandingFlattened.find(m => m.uniqueId === selectedTandingId);
    if (cur) {
      setTNomorPartai(cur.match.partai);
      setTKategoriNama(cur.catName);
      setTGender(cur.gender.toLowerCase().includes('putri') ? 'Putri' : 'Putra');
      setTBabak(cur.match.round);
      setTNamaMerah(cur.match.atletMerah?.nama || '');
      setTKontingenMerah(cur.match.atletMerah?.kontingen || '');
      setTNamaBiru(cur.match.atletBiru?.nama || '');
      setTKontingenBiru(cur.match.atletBiru?.kontingen || '');
    }
  }, [selectedTandingId, allTandingFlattened, isAddingNewTanding]);

  // Populate Seni form on selection
  useEffect(() => {
    if (isAddingNewSeni) return;
    const cur = allSeniFlattened.find(s => s.id === selectedSeniId);
    if (cur) {
      const pNum = cur.partaiNumber || (cur.partai ? parseInt(cur.partai.replace(/\D/g, ''), 10) : 1) || 1;
      setSNomorPartai(pNum);
      setSNoUndian(cur.noUndian || cur.noUrut || 1);
      setSPool(cur.pool || `Pool ${String.fromCharCode(65 + Math.floor((pNum - 1) % 26))}`);
      setSNama(cur.nama || '');
      setSKontingen(cur.kontingen || '');
      setSKategori(cur.kategori || 'Tunggal');
      setSGender(cur.gender || 'Putra');
      setSUsia(cur.usia || 'Dewasa');
    }
  }, [selectedSeniId, allSeniFlattened, isAddingNewSeni]);

  if (!isOpen) return null;

  // -------------------------------------------------------------
  // ACTIONS: TANDING
  // -------------------------------------------------------------
  const handleSwapTandingCorners = () => {
    playBeep('click');
    const tempNama = tNamaMerah;
    const tempKont = tKontingenMerah;
    setTNamaMerah(tNamaBiru);
    setTKontingenMerah(tKontingenBiru);
    setTNamaBiru(tempNama);
    setTKontingenBiru(tempKont);
  };

  const handleClearTandingCorners = () => {
    playBeep('click');
    setTNamaMerah('');
    setTKontingenMerah('');
    setTNamaBiru('');
    setTKontingenBiru('');
  };

  const handleDeleteTandingMatch = (uniqueId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus partai tanding ini dari jadwal?')) return;
    playBeep('click');

    const matchInfo = allTandingFlattened.find(m => m.uniqueId === uniqueId);
    if (!matchInfo) return;

    const updated = categories.map(cat => {
      if (cat.id !== matchInfo.catId) return cat;
      return {
        ...cat,
        matches: cat.matches.filter(m => m.id !== matchInfo.match.id)
      };
    }).filter(cat => cat.matches.length > 0);

    onSaveCategories(updated);
    try {
      localStorage.setItem('silat_bagan_categories', JSON.stringify(updated));
      localStorage.setItem('silat_bagan_data', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    if (selectedTandingId === uniqueId && allTandingFlattened.length > 1) {
      const nextMatch = allTandingFlattened.find(m => m.uniqueId !== uniqueId);
      if (nextMatch) setSelectedTandingId(nextMatch.uniqueId);
    }
  };

  // -------------------------------------------------------------
  // ACTIONS: SENI
  // -------------------------------------------------------------
  const handleDeleteSeniPeserta = (pesertaId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus peserta / partai seni ini dari jadwal?')) return;
    playBeep('click');

    const updated = tgrPesertaList.filter(p => p.id !== pesertaId);
    setTgrPesertaList(updated);
    if (onSaveTgrPeserta) {
      onSaveTgrPeserta(updated);
    }
    try {
      localStorage.setItem('tgr_peserta_list', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    if (selectedSeniId === pesertaId && updated.length > 0) {
      setSelectedSeniId(updated[0].id);
    }
  };

  const handleAutoReorderSeniUndian = (partaiNum: number) => {
    playBeep('valid');
    const updated = [...tgrPesertaList];
    const samePartai = updated.filter(p => (p.partaiNumber || 1) === partaiNum);
    samePartai.forEach((p, idx) => {
      p.noUndian = idx + 1;
    });

    setTgrPesertaList(updated);
    if (onSaveTgrPeserta) onSaveTgrPeserta(updated);
    try {
      localStorage.setItem('tgr_peserta_list', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    alert(`Nomor undian urutan tampil untuk Partai ${partaiNum} berhasil diurutkan otomatis!`);
  };

  // -------------------------------------------------------------
  // SAVE ALL CHANGES (TANDING & SENI)
  // -------------------------------------------------------------
  const handleSaveAll = () => {
    playBeep('valid');

    // 1. Save Tanding Changes
    let updatedCategories = [...categories];
    if (isAddingNewTanding) {
      const targetCatIndex = updatedCategories.findIndex(c => 
        c.name.toLowerCase() === tKategoriNama.toLowerCase() && 
        c.gender.toLowerCase() === tGender.toLowerCase()
      );
      const newPartaiFormatted = tNomorPartai.startsWith('Partai') ? tNomorPartai : `Partai ${tNomorPartai}`;
      
      const newMatch: BaganMatch = {
        id: Date.now(),
        round: tBabak,
        partai: newPartaiFormatted,
        atletMerah: { nama: tNamaMerah.trim(), kontingen: tKontingenMerah.trim() },
        atletBiru: { nama: tNamaBiru.trim(), kontingen: tKontingenBiru.trim() },
        winner: null
      };

      if (targetCatIndex >= 0) {
        updatedCategories[targetCatIndex] = {
          ...updatedCategories[targetCatIndex],
          matches: [...updatedCategories[targetCatIndex].matches, newMatch]
        };
      } else {
        const newCatId = `cat_custom_${Date.now()}`;
        const newCategory: BaganCategory = {
          id: newCatId,
          name: tKategoriNama || 'Kelas Bebas',
          gender: tGender,
          size: 4,
          matches: [newMatch]
        };
        updatedCategories.push(newCategory);
      }
      setIsAddingNewTanding(false);
    } else if (selectedTandingId) {
      const curTanding = allTandingFlattened.find(m => m.uniqueId === selectedTandingId);
      if (curTanding) {
        const newPartaiFormatted = tNomorPartai.startsWith('Partai') ? tNomorPartai : `Partai ${tNomorPartai}`;
        updatedCategories = updatedCategories.map(cat => {
          if (cat.id !== curTanding.catId) return cat;
          return {
            ...cat,
            name: tKategoriNama.trim() || cat.name,
            gender: tGender || cat.gender,
            matches: cat.matches.map(m => {
              if (m.id !== curTanding.match.id) return m;
              return {
                ...m,
                partai: newPartaiFormatted,
                round: tBabak,
                atletMerah: {
                  ...m.atletMerah,
                  nama: tNamaMerah.trim(),
                  kontingen: tKontingenMerah.trim()
                },
                atletBiru: {
                  ...m.atletBiru,
                  nama: tNamaBiru.trim(),
                  kontingen: tKontingenBiru.trim()
                }
              };
            })
          };
        });
      }
    }

    onSaveCategories(updatedCategories);
    try {
      localStorage.setItem('silat_bagan_categories', JSON.stringify(updatedCategories));
      localStorage.setItem('silat_bagan_data', JSON.stringify(updatedCategories));
    } catch (e) {
      console.error(e);
    }

    // 2. Save Seni Changes
    let updatedSeni = [...tgrPesertaList];
    if (isAddingNewSeni) {
      const newSeniItem: TGRPeserta = {
        id: `seni_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        noUrut: updatedSeni.length + 1,
        noUndian: sNoUndian,
        partaiNumber: sNomorPartai,
        partai: `Partai ${sNomorPartai}`,
        pool: sPool || `Pool ${String.fromCharCode(65 + Math.floor((sNomorPartai - 1) % 26))}`,
        nama: sNama.trim() || 'Pesilat Seni Baru',
        kontingen: sKontingen.trim() || '-',
        kategori: sKategori,
        gender: sGender,
        usia: sUsia,
        status: 'Belum Menilai',
        scores: {},
        kebenaranScores: {},
        isLocked: false,
        decisions: [],
        deductions: 0,
        deductionReasons: [],
        dewanDecisionScore: 0,
        finalizedJuries: []
      };
      updatedSeni.push(newSeniItem);
      setTgrPesertaList(updatedSeni);
      setIsAddingNewSeni(false);
      setSelectedSeniId(newSeniItem.id);
    } else if (selectedSeniId) {
      updatedSeni = updatedSeni.map(s => {
        if (s.id !== selectedSeniId) return s;
        return {
          ...s,
          partaiNumber: sNomorPartai,
          partai: `Partai ${sNomorPartai}`,
          noUndian: sNoUndian,
          pool: sPool,
          nama: sNama.trim(),
          kontingen: sKontingen.trim(),
          kategori: sKategori,
          gender: sGender,
          usia: sUsia
        };
      });
      setTgrPesertaList(updatedSeni);
    }

    if (onSaveTgrPeserta) {
      onSaveTgrPeserta(updatedSeni);
    }
    try {
      localStorage.setItem('tgr_peserta_list', JSON.stringify(updatedSeni));
    } catch (e) {
      console.error(e);
    }

    setSaveSuccessMsg(true);
    setTimeout(() => {
      setSaveSuccessMsg(false);
    }, 2500);
  };

  // Filter lists by search query
  const filteredTanding = allTandingFlattened.filter(m => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.match.partai.toLowerCase().includes(q) ||
      m.catName.toLowerCase().includes(q) ||
      (m.match.atletMerah?.nama || '').toLowerCase().includes(q) ||
      (m.match.atletMerah?.kontingen || '').toLowerCase().includes(q) ||
      (m.match.atletBiru?.nama || '').toLowerCase().includes(q) ||
      (m.match.atletBiru?.kontingen || '').toLowerCase().includes(q)
    );
  });

  const filteredSeni = allSeniFlattened.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const pLabel = s.partai || `Partai ${s.partaiNumber || s.noUrut}`;
    return (
      pLabel.toLowerCase().includes(q) ||
      s.nama.toLowerCase().includes(q) ||
      s.kontingen.toLowerCase().includes(q) ||
      s.kategori.toLowerCase().includes(q) ||
      (s.pool || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-5 bg-black/85 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-5xl max-h-[94vh] flex flex-col rounded-3xl bg-[#080816] border border-purple-500/40 text-slate-100 shadow-[0_0_60px_rgba(168,85,247,0.35)] overflow-hidden font-sans"
      >
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-4 border-b border-purple-500/20 bg-gradient-to-r from-purple-950/90 via-slate-950 to-indigo-950/90 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-900/50 border border-purple-400/40 text-purple-300 shadow-md">
              <Edit3 className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black font-sport tracking-wider uppercase text-white flex items-center gap-2">
                <span>EDIT & KOREKSI JADWAL LENGKAP</span>
                {saveSuccessMsg && (
                  <span className="text-[10.5px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/50 flex items-center gap-1 animate-pulse">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Tersimpan!
                  </span>
                )}
              </h2>
              <p className="text-[11px] font-medium text-slate-400">
                Koreksi nomor partai, nama atlet, kontingen, babak, dan pool untuk kategori <strong className="text-purple-300">TANDING & SENI (TGR)</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Category Selector Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-slate-900/90 border border-slate-800">
              <button
                type="button"
                onClick={() => { playBeep('click'); setActiveTab('all'); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all flex items-center gap-1.5 ${
                  activeTab === 'all' 
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Semua ({allTandingFlattened.length + allSeniFlattened.length})</span>
              </button>

              <button
                type="button"
                onClick={() => { playBeep('click'); setActiveTab('tanding'); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all flex items-center gap-1.5 ${
                  activeTab === 'tanding' 
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🥋 Tanding ({allTandingFlattened.length})</span>
              </button>

              <button
                type="button"
                onClick={() => { playBeep('click'); setActiveTab('seni'); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all flex items-center gap-1.5 ${
                  activeTab === 'seni' 
                    ? 'bg-gradient-to-r from-amber-600 to-emerald-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🎭 Seni ({allSeniFlattened.length})</span>
              </button>
            </div>

            <button
              onClick={() => { playBeep('click'); onClose(); }}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="grid grid-cols-12 flex-1 min-h-0 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-800/80">
          
          {/* Left Column: Match / Participant Selector */}
          <div className="col-span-12 md:col-span-4 p-4 flex flex-col gap-3 overflow-y-auto max-h-[38vh] md:max-h-[72vh] bg-slate-950/60">
            
            {/* Search and Quick Add */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari partai, atlet, kontingen..."
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/90 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {activeTab === 'tanding' || activeTab === 'all' ? (
                <button
                  type="button"
                  onClick={() => {
                    playBeep('click');
                    setActiveTab('tanding');
                    setIsAddingNewTanding(true);
                    setTNomorPartai(`Partai ${allTandingFlattened.length + 1}`);
                    setTKategoriNama('Kelas A Dewasa');
                    setTNamaMerah('');
                    setTKontingenMerah('');
                    setTNamaBiru('');
                    setTKontingenBiru('');
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-cyan-900/60 hover:bg-cyan-800 text-cyan-200 border border-cyan-500/40 text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                  title="Tambah Partai Tanding Baru"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Tanding</span>
                </button>
              ) : null}

              {activeTab === 'seni' || activeTab === 'all' ? (
                <button
                  type="button"
                  onClick={() => {
                    playBeep('click');
                    setActiveTab('seni');
                    setIsAddingNewSeni(true);
                    setSNomorPartai(allSeniFlattened.length + 1);
                    setSNoUndian(1);
                    setSPool('Pool A');
                    setSNama('');
                    setSKontingen('');
                    setSKategori('Tunggal');
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-900/60 hover:bg-amber-800 text-amber-200 border border-amber-500/40 text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                  title="Tambah Peserta / Partai Seni Baru"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Seni</span>
                </button>
              ) : null}
            </div>

            {/* List of Matches */}
            <div className="space-y-1.5 pr-1 overflow-y-auto">
              
              {/* TANDING SECTION */}
              {(activeTab === 'tanding' || activeTab === 'all') && filteredTanding.length > 0 && (
                <div className="mb-3">
                  <div className="text-[9.5px] uppercase font-mono font-black text-cyan-400 tracking-wider mb-1.5 flex items-center gap-1 px-1">
                    <span>🥋 Partai Tanding ({filteredTanding.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {filteredTanding.map((m) => {
                      const isSelected = selectedTandingId === m.uniqueId && !isAddingNewTanding && activeTab !== 'seni';
                      return (
                        <div
                          key={m.uniqueId}
                          onClick={() => {
                            playBeep('click');
                            setActiveTab('tanding');
                            setIsAddingNewTanding(false);
                            setIsAddingNewSeni(false);
                            setSelectedTandingId(m.uniqueId);
                          }}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-left ${
                            isSelected 
                              ? 'bg-cyan-950/70 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.25)]' 
                              : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-900 hover:border-slate-700'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[11px] font-black font-mono text-amber-400">
                                {m.match.partai}
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 uppercase">
                                {m.shortKelas}
                              </span>
                            </div>
                            <div className="text-[10px] truncate text-slate-300">
                              <span className="text-red-400 font-bold">{m.match.atletMerah?.nama || '...'}</span>
                              <span className="text-slate-500 mx-1">vs</span>
                              <span className="text-blue-400 font-bold">{m.match.atletBiru?.nama || '...'}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTandingMatch(m.uniqueId);
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-950/40 transition-colors ml-1 cursor-pointer"
                            title="Hapus Partai Tanding Ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SENI SECTION */}
              {(activeTab === 'seni' || activeTab === 'all') && filteredSeni.length > 0 && (
                <div>
                  <div className="text-[9.5px] uppercase font-mono font-black text-amber-400 tracking-wider mb-1.5 flex items-center gap-1 px-1">
                    <span>🎭 Partai & Peserta Seni ({filteredSeni.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {filteredSeni.map((s) => {
                      const isSelected = selectedSeniId === s.id && !isAddingNewSeni && activeTab !== 'tanding';
                      const pLabel = s.partai || `Partai ${s.partaiNumber || s.noUrut}`;
                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            playBeep('click');
                            setActiveTab('seni');
                            setIsAddingNewSeni(false);
                            setIsAddingNewTanding(false);
                            setSelectedSeniId(s.id);
                          }}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-left ${
                            isSelected 
                              ? 'bg-amber-950/70 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.25)]' 
                              : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-900 hover:border-slate-700'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[11px] font-black font-mono text-amber-400">
                                {pLabel}
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800/60 uppercase">
                                {s.kategori}
                              </span>
                              {s.noUndian && (
                                <span className="text-[9px] font-mono text-slate-400 font-bold">
                                  #{s.noUndian}
                                </span>
                              )}
                            </div>
                            <div className="text-[10.5px] truncate text-slate-200 font-bold">
                              {s.nama}
                              <span className="text-[9.5px] font-normal text-slate-400 ml-1.5">
                                ({s.kontingen})
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSeniPeserta(s.id);
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-950/40 transition-colors ml-1 cursor-pointer"
                            title="Hapus Peserta Seni Ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {filteredTanding.length === 0 && filteredSeni.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Tidak ada jadwal partai ditemukan sesuai pencarian.
                </div>
              )}

            </div>
          </div>

          {/* Right Column: Edit Form */}
          <div className="col-span-12 md:col-span-8 p-6 flex flex-col justify-between overflow-y-auto max-h-[52vh] md:max-h-[72vh] bg-slate-950/95">
            
            {/* TANDING FORM */}
            {(activeTab === 'tanding' || (activeTab === 'all' && (!selectedSeniId || selectedTandingId))) && (
              <div className="space-y-4">
                
                {/* Header Box */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs uppercase font-mono font-black text-cyan-400 tracking-widest flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    {isAddingNewTanding ? 'Form Sisipkan Partai Tanding Baru' : `Edit ${tNomorPartai || 'Partai Tanding'}`}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSwapTandingCorners}
                      className="px-2.5 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 text-[10px] font-black uppercase flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                      title="Tukar Pesilat Sudut Merah dan Sudut Biru"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Tukar Merah ⇄ Biru</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleClearTandingCorners}
                      className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer transition-all"
                      title="Kosongkan Kolom Nama"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Kosongkan</span>
                    </button>
                  </div>
                </div>

                {/* Match Metadata: Nomor Partai, Kategori, Gender, Babak */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-900/50 p-3.5 rounded-2xl border border-slate-800">
                  <div>
                    <label className="block text-[9px] uppercase font-mono font-bold text-slate-400 mb-1">
                      Nomor Partai
                    </label>
                    <input
                      type="text"
                      value={tNomorPartai}
                      onChange={(e) => setTNomorPartai(e.target.value)}
                      placeholder="e.g. Partai 1"
                      className="w-full text-xs font-black font-mono px-2.5 py-1.5 rounded-lg border border-cyan-500/40 bg-slate-950 text-amber-400 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[9px] uppercase font-mono font-bold text-slate-400 mb-1">
                      Kelas / Kategori Tanding
                    </label>
                    <input
                      type="text"
                      value={tKategoriNama}
                      onChange={(e) => setTKategoriNama(e.target.value)}
                      placeholder="e.g. Kelas A Putra Dewasa (45-50 kg)"
                      className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase font-mono font-bold text-slate-400 mb-1">
                      Babak
                    </label>
                    <select
                      value={tBabak}
                      onChange={(e) => setTBabak(e.target.value as any)}
                      className="w-full text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                    >
                      <option value="quarter">Penyisihan</option>
                      <option value="sixteenth">Babak 32 Besar</option>
                      <option value="eighth">Babak 16 Besar</option>
                      <option value="semi">Semi Final</option>
                      <option value="final">Final (Perebutan Juara)</option>
                    </select>
                  </div>
                </div>

                {/* Athletes Data (Red & Blue Corners) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* SUDUT MERAH */}
                  <div className="p-4 rounded-2xl border border-red-500/30 bg-red-950/20 space-y-2.5">
                    <div className="flex items-center justify-between pb-1 border-b border-red-500/20">
                      <span className="text-xs font-black uppercase text-red-400 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                        SUDUT MERAH
                      </span>
                      <span className="text-[9px] font-mono text-red-300/80">Kiri Lembar Jadwal</span>
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase font-mono font-bold text-slate-400 mb-1">
                        Nama Pesilat Merah
                      </label>
                      <input
                        type="text"
                        value={tNamaMerah}
                        onChange={(e) => setTNamaMerah(e.target.value)}
                        placeholder="e.g. AHMAD FAUZI atau Pemenang P.1"
                        className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border border-red-500/40 bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:border-red-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase font-mono font-bold text-slate-400 mb-1">
                        Kontingen / Daerah / Perguruan
                      </label>
                      <input
                        type="text"
                        value={tKontingenMerah}
                        onChange={(e) => setTKontingenMerah(e.target.value)}
                        placeholder="e.g. JAWA BARAT / TAPAK SUCI"
                        className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border border-red-500/40 bg-slate-950 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-red-400"
                      />
                    </div>
                  </div>

                  {/* SUDUT BIRU */}
                  <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-950/20 space-y-2.5">
                    <div className="flex items-center justify-between pb-1 border-b border-blue-500/20">
                      <span className="text-xs font-black uppercase text-blue-400 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                        SUDUT BIRU
                      </span>
                      <span className="text-[9px] font-mono text-blue-300/80">Kanan Lembar Jadwal</span>
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase font-mono font-bold text-slate-400 mb-1">
                        Nama Pesilat Biru
                      </label>
                      <input
                        type="text"
                        value={tNamaBiru}
                        onChange={(e) => setTNamaBiru(e.target.value)}
                        placeholder="e.g. BAYU PRATAMA atau Pemenang P.2"
                        className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border border-blue-500/40 bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:border-blue-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase font-mono font-bold text-slate-400 mb-1">
                        Kontingen / Daerah / Perguruan
                      </label>
                      <input
                        type="text"
                        value={tKontingenBiru}
                        onChange={(e) => setTKontingenBiru(e.target.value)}
                        placeholder="e.g. JAWA TENGAH / PERISAI DIRI"
                        className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border border-blue-500/40 bg-slate-950 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-400"
                      />
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* SENI FORM */}
            {activeTab === 'seni' && (
              <div className="space-y-4">
                
                {/* Header Box */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs uppercase font-mono font-black text-amber-400 tracking-widest flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    {isAddingNewSeni ? 'Form Sisipkan Peserta / Partai Seni Baru' : `Edit Partai Seni #${sNomorPartai} - ${sNama || 'Atlet'}`}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleAutoReorderSeniUndian(sNomorPartai)}
                    className="px-2.5 py-1 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                    title="Auto Urutkan Nomor Undian dalam Partai Ini"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Auto Urutkan Undian</span>
                  </button>
                </div>

                {/* Match Metadata: Partai, No Undian, Pool, Kategori Seni */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-900/50 p-3.5 rounded-2xl border border-slate-800">
                  <div>
                    <label className="block text-[9px] uppercase font-mono font-bold text-slate-400 mb-1">
                      Nomor Partai Seni
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={sNomorPartai}
                      onChange={(e) => setSNomorPartai(parseInt(e.target.value, 10) || 1)}
                      className="w-full text-xs font-black font-mono px-2.5 py-1.5 rounded-lg border border-amber-500/40 bg-slate-950 text-amber-400 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase font-mono font-bold text-slate-400 mb-1">
                      No. Undian / Urutan Tampil
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={sNoUndian}
                      onChange={(e) => setSNoUndian(parseInt(e.target.value, 10) || 1)}
                      className="w-full text-xs font-black font-mono px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase font-mono font-bold text-slate-400 mb-1">
                      Pool / Babak
                    </label>
                    <input
                      type="text"
                      value={sPool}
                      onChange={(e) => setSPool(e.target.value)}
                      placeholder="e.g. Pool A, Pool B, Final"
                      className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase font-mono font-bold text-slate-400 mb-1">
                      Kategori Seni
                    </label>
                    <select
                      value={sKategori}
                      onChange={(e) => setSKategori(e.target.value)}
                      className="w-full text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                    >
                      <option value="Tunggal">Tunggal</option>
                      <option value="Ganda">Ganda</option>
                      <option value="Regu">Regu</option>
                      <option value="Solo Kreatif">Solo Kreatif</option>
                    </select>
                  </div>
                </div>

                {/* Athlete Details */}
                <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] uppercase font-mono font-bold text-slate-400 mb-1">
                        Nama Pesilat / Tim Seni
                      </label>
                      <input
                        type="text"
                        value={sNama}
                        onChange={(e) => setSNama(e.target.value)}
                        placeholder="e.g. SITI RAHMA & TIM"
                        className="w-full text-xs font-bold px-2.5 py-2 rounded-lg border border-amber-500/40 bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase font-mono font-bold text-slate-400 mb-1">
                        Kontingen / Perguruan / Daerah
                      </label>
                      <input
                        type="text"
                        value={sKontingen}
                        onChange={(e) => setSKontingen(e.target.value)}
                        placeholder="e.g. DKI JAKARTA / PERSINAS ASAD"
                        className="w-full text-xs font-bold px-2.5 py-2 rounded-lg border border-amber-500/40 bg-slate-950 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] uppercase font-mono font-bold text-slate-400 mb-1">
                        Gender
                      </label>
                      <select
                        value={sGender}
                        onChange={(e) => setSGender(e.target.value as any)}
                        className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                      >
                        <option value="Putra">Putra</option>
                        <option value="Putri">Putri</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase font-mono font-bold text-slate-400 mb-1">
                        Kategori Usia
                      </label>
                      <select
                        value={sUsia}
                        onChange={(e) => setSUsia(e.target.value)}
                        className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                      >
                        <option value="Usia Dini">Usia Dini</option>
                        <option value="Pra Remaja">Pra Remaja</option>
                        <option value="Remaja">Remaja</option>
                        <option value="Dewasa">Dewasa</option>
                        <option value="Master">Master</option>
                      </select>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-800 mt-4 gap-3">
              <p className="text-[10px] text-slate-400 italic text-center sm:text-left">
                * Perubahan akan langsung disinkronkan ke lembar cetak PDF, live score, bagan tanding, dan pool seni.
              </p>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => { playBeep('click'); onClose(); }}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold uppercase cursor-pointer transition-colors"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleSaveAll}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-600 hover:from-purple-500 hover:via-indigo-500 hover:to-emerald-500 text-white text-xs font-black uppercase flex items-center gap-2 shadow-[0_0_25px_rgba(168,85,247,0.4)] cursor-pointer transition-all active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Semua Perubahan</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      </motion.div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Plus, Trash2, Edit2, Download, Upload, Play, Trophy, CheckSquare, Square, 
  RefreshCw, FileText, Save, Users, X, Shuffle, Layers, Swords, Award, FileSpreadsheet, 
  Check, CheckCircle2, ChevronRight, Filter, Sparkles
} from 'lucide-react';
import { TGRState, TGRPeserta } from '../types';
import { playBeep } from '../utils/sound';
import { jsPDF } from 'jspdf';

export interface TGRRegistrasiAthlete {
  id: string;
  nama: string;
  kontingen: string;
  kelas: string;       // e.g. "Jurus Tunggal Tangan Kosong", "Tunggal", "Ganda", "Regu", "Jurus Bebas"
  usia: string;        // e.g. "Remaja", "Dewasa", "Pra-Remaja", "Usia Dini"
  gender: 'Putra' | 'Putri';
  pool?: string;       // e.g. "Pool A", "Pool B", "Pool C", "Pool D", "Final"
  noUndian?: number;   // Nomor urut undian tampil
  sudut?: 'merah' | 'biru'; // For Prestasi / VS mode
}

interface TGRRegistrasiDataPanelProps {
  theme: 'dark' | 'light';
  state: TGRState;
  dispatch: (type: string, payload?: any) => Promise<any>;
  onClose: () => void;
}

interface TGRBaganMatch {
  id: number;
  round: 'quarter' | 'semi' | 'final';
  partai: string;
  atletMerah: { nama: string; kontingen: string; id?: string };
  atletBiru: { nama: string; kontingen: string; id?: string };
  winner: 'merah' | 'biru' | null;
}

export const TGR_CATEGORIES = [
  "Jurus Bebas",
  "Jurus Seni",
  "Jurus Tunggal Tangan Kosong",
  "Jurus Tunggal Senjata",
  "Jurus Tunggal IPSI",
  "Jurus Ganda",
  "Jurus Ganda Tangan Kosong",
  "Jurus Ganda Senjata",
  "Jurus Regu A",
  "Jurus Regu B",
  "Jurus Regu IPSI",
  "Tunggal",
  "Ganda",
  "Regu",
  "Solo Kreatif"
];

export const AGE_CATEGORIES = ['Remaja', 'Dewasa', 'Pra-Remaja', 'Usia Dini'];
export const AVAILABLE_POOLS = ['Pool A', 'Pool B', 'Pool C', 'Pool D', 'Pool E', 'Pool F', 'Final'];

export default function TGRRegistrasiDataPanel({ theme, state, dispatch, onClose }: TGRRegistrasiDataPanelProps) {
  // System mode: 'pool' (Sistem Pool / Ranking Nilai) or 'prestasi' (Sistem Prestasi / Bagan VS)
  const [sistemSeni, setSistemSeni] = useState<'pool' | 'prestasi'>(state.sistemSeni || 'pool');

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'input' | 'manajemen' | 'kontrol'>('input');
  
  // Local persistence states
  const [athletes, setAthletes] = useState<TGRRegistrasiAthlete[]>([]);
  const [scheduledIds, setScheduledIds] = useState<string[]>([]);
  const [selectedBaganId, setSelectedBaganId] = useState<string>('');
  const [selectedPoolFilter, setSelectedPoolFilter] = useState<string>('Semua Pool');

  // Bracket matches persistence state
  const [baganMatchesMap, setBaganMatchesMap] = useState<{[categoryName: string]: TGRBaganMatch[]}>(() => {
    const saved = localStorage.getItem('silat_tgr_bagan_matches_map');
    if (saved) {
      try { return JSON.parse(saved); } catch(e) { console.error(e); }
    }
    return {};
  });

  const saveBaganMatchesMap = (newMap: {[categoryName: string]: TGRBaganMatch[]}) => {
    setBaganMatchesMap(newMap);
    localStorage.setItem('silat_tgr_bagan_matches_map', JSON.stringify(newMap));
  };

  // Switch system mode (Pool vs Prestasi)
  const handleToggleSistemSeni = async (newSistem: 'pool' | 'prestasi') => {
    playBeep('click');
    setSistemSeni(newSistem);
    try {
      await dispatch('TGR_SET_SISTEM_SENI', { sistem: newSistem });
      await dispatch('TGR_ADD_AUDIT_LOG', {
        user: 'Sekretaris',
        action: `Mengubah sistem pertandingan Seni menjadi: ${newSistem === 'pool' ? 'Sistem Pool (Ranking Nilai)' : 'Sistem Prestasi (Bagan VS / Head-to-Head)'}`
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Bracket propagation for Prestasi VS
  const propagateTGRBracket = (matches: TGRBaganMatch[], size: number): TGRBaganMatch[] => {
    const updated = matches.map(m => ({
      ...m,
      atletMerah: { ...m.atletMerah },
      atletBiru: { ...m.atletBiru },
      winner: m.winner
    }));

    const numInitialMatches = size / 2;
    for (let i = numInitialMatches; i < updated.length; i++) {
      updated[i].atletMerah = { nama: '', kontingen: '' };
      updated[i].atletBiru = { nama: '', kontingen: '' };
      updated[i].winner = null;
    }

    const isBye = (nama?: string) => {
      if (!nama) return false;
      const n = nama.trim().toLowerCase();
      return n === 'bye' || n === 'automatic' || n === '—' || n === '-';
    };

    for (let i = 0; i < updated.length; i++) {
      const match = updated[i];
      const matchId = match.id;

      const mNama = match.atletMerah.nama;
      const bNama = match.atletBiru.nama;

      if (mNama && !isBye(mNama) && (!bNama || isBye(bNama))) {
        match.winner = 'merah';
      } else if (bNama && !isBye(bNama) && (!mNama || isBye(mNama))) {
        match.winner = 'biru';
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

  const generateBaganForAthletes = (athletesList: TGRRegistrasiAthlete[]) => {
    const N = athletesList.length;
    let size: 2 | 4 | 8 | 16 = 2;
    if (N <= 2) size = 2;
    else if (N <= 4) size = 4;
    else if (N <= 8) size = 8;
    else size = 16;

    const matches: TGRBaganMatch[] = [];
    if (size === 2) {
      matches.push({
        id: 1,
        round: 'final',
        partai: 'Partai Final',
        atletMerah: { nama: athletesList[0]?.nama || '', kontingen: athletesList[0]?.kontingen || '', id: athletesList[0]?.id },
        atletBiru: { nama: athletesList[1]?.nama || '', kontingen: athletesList[1]?.kontingen || '', id: athletesList[1]?.id },
        winner: null
      });
    } else if (size === 4) {
      matches.push(
        {
          id: 1,
          round: 'semi',
          partai: 'Semifinal 1',
          atletMerah: { nama: athletesList[0]?.nama || '', kontingen: athletesList[0]?.kontingen || '', id: athletesList[0]?.id },
          atletBiru: { nama: athletesList[1]?.nama || '', kontingen: athletesList[1]?.kontingen || '', id: athletesList[1]?.id },
          winner: null
        },
        {
          id: 2,
          round: 'semi',
          partai: 'Semifinal 2',
          atletMerah: { nama: athletesList[2]?.nama || '', kontingen: athletesList[2]?.kontingen || '', id: athletesList[2]?.id },
          atletBiru: { nama: athletesList[3]?.nama || '', kontingen: athletesList[3]?.kontingen || '', id: athletesList[3]?.id },
          winner: null
        },
        {
          id: 3,
          round: 'final',
          partai: 'Partai Final',
          atletMerah: { nama: '', kontingen: '' },
          atletBiru: { nama: '', kontingen: '' },
          winner: null
        }
      );
    } else if (size === 8) {
      matches.push(
        {
          id: 1,
          round: 'quarter',
          partai: 'Penyisihan 1',
          atletMerah: { nama: athletesList[0]?.nama || '', kontingen: athletesList[0]?.kontingen || '', id: athletesList[0]?.id },
          atletBiru: { nama: athletesList[1]?.nama || '', kontingen: athletesList[1]?.kontingen || '', id: athletesList[1]?.id },
          winner: null
        },
        {
          id: 2,
          round: 'quarter',
          partai: 'Penyisihan 2',
          atletMerah: { nama: athletesList[2]?.nama || '', kontingen: athletesList[2]?.kontingen || '', id: athletesList[2]?.id },
          atletBiru: { nama: athletesList[3]?.nama || '', kontingen: athletesList[3]?.kontingen || '', id: athletesList[3]?.id },
          winner: null
        },
        {
          id: 3,
          round: 'quarter',
          partai: 'Penyisihan 3',
          atletMerah: { nama: athletesList[4]?.nama || '', kontingen: athletesList[4]?.kontingen || '', id: athletesList[4]?.id },
          atletBiru: { nama: athletesList[5]?.nama || '', kontingen: athletesList[5]?.kontingen || '', id: athletesList[5]?.id },
          winner: null
        },
        {
          id: 4,
          round: 'quarter',
          partai: 'Penyisihan 4',
          atletMerah: { nama: athletesList[6]?.nama || '', kontingen: athletesList[6]?.kontingen || '', id: athletesList[6]?.id },
          atletBiru: { nama: athletesList[7]?.nama || '', kontingen: athletesList[7]?.kontingen || '', id: athletesList[7]?.id },
          winner: null
        },
        {
          id: 5,
          round: 'semi',
          partai: 'Semifinal 1',
          atletMerah: { nama: '', kontingen: '' },
          atletBiru: { nama: '', kontingen: '' },
          winner: null
        },
        {
          id: 6,
          round: 'semi',
          partai: 'Semifinal 2',
          atletMerah: { nama: '', kontingen: '' },
          atletBiru: { nama: '', kontingen: '' },
          winner: null
        },
        {
          id: 7,
          round: 'final',
          partai: 'Partai Final',
          atletMerah: { nama: '', kontingen: '' },
          atletBiru: { nama: '', kontingen: '' },
          winner: null
        }
      );
    } else if (size === 16) {
      for (let i = 1; i <= 8; i++) {
        const mIdx = (i - 1) * 2;
        matches.push({
          id: i,
          round: 'quarter',
          partai: `Penyisihan Awal ${i}`,
          atletMerah: { nama: athletesList[mIdx]?.nama || '', kontingen: athletesList[mIdx]?.kontingen || '', id: athletesList[mIdx]?.id },
          atletBiru: { nama: athletesList[mIdx + 1]?.nama || '', kontingen: athletesList[mIdx + 1]?.kontingen || '', id: athletesList[mIdx + 1]?.id },
          winner: null
        });
      }
      for (let i = 9; i <= 12; i++) {
        matches.push({ id: i, round: 'quarter', partai: `Penyisihan Perempat ${i - 8}`, atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null });
      }
      matches.push(
        { id: 13, round: 'semi', partai: 'Semifinal 1', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null },
        { id: 14, round: 'semi', partai: 'Semifinal 2', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null }
      );
      matches.push({ id: 15, round: 'final', partai: 'Partai Final', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null });
    }
    
    return propagateTGRBracket(matches, size);
  };

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

  // Form states
  const [formNama, setFormNama] = useState('');
  const [formKontingen, setFormKontingen] = useState('');
  const [formKelas, setFormKelas] = useState(TGR_CATEGORIES[0]);
  const [formUsia, setFormUsia] = useState(AGE_CATEGORIES[0]);
  const [formGender, setFormGender] = useState<'Putra' | 'Putri'>('Putra');
  const [formPool, setFormPool] = useState<string>('Pool A');
  const [formNoUndian, setFormNoUndian] = useState<number>(1);
  const [editingAthleteId, setEditingAthleteId] = useState<string | null>(null);

  // Auto-divide Pool Modal
  const [showAutoPoolModal, setShowAutoPoolModal] = useState(false);
  const [autoPoolSize, setAutoPoolSize] = useState<number>(4);

  // Load registered athletes from TGR specific storage
  useEffect(() => {
    const savedAthletes = localStorage.getItem('silat_tgr_registered_athletes');
    if (savedAthletes) {
      try {
        setAthletes(JSON.parse(savedAthletes));
      } catch (e) {
        console.error(e);
      }
    } else {
      // Default initial mock data with pools
      const defaultData: TGRRegistrasiAthlete[] = [
        { id: 'tgr_1', nama: 'Bambang Pamungkas', kontingen: 'DKI Jakarta', kelas: 'Jurus Tunggal IPSI', usia: 'Dewasa', gender: 'Putra', pool: 'Pool A', noUndian: 1 },
        { id: 'tgr_2', nama: 'Siti Aminah', kontingen: 'Jawa Barat', kelas: 'Jurus Tunggal IPSI', usia: 'Dewasa', gender: 'Putra', pool: 'Pool A', noUndian: 2 },
        { id: 'tgr_3', nama: 'Iko Uwais', kontingen: 'Sumatera Barat', kelas: 'Jurus Tunggal IPSI', usia: 'Dewasa', gender: 'Putra', pool: 'Pool A', noUndian: 3 },
        { id: 'tgr_4', nama: 'Yayan Ruhian', kontingen: 'Jawa Timur', kelas: 'Jurus Tunggal IPSI', usia: 'Dewasa', gender: 'Putra', pool: 'Pool B', noUndian: 1 },
        { id: 'tgr_5', nama: 'Cecep Arif Rahman', kontingen: 'Jawa Barat', kelas: 'Jurus Tunggal IPSI', usia: 'Dewasa', gender: 'Putra', pool: 'Pool B', noUndian: 2 }
      ];
      setAthletes(defaultData);
      localStorage.setItem('silat_tgr_registered_athletes', JSON.stringify(defaultData));
    }

    const savedSchedule = localStorage.getItem('silat_tgr_scheduled_ids');
    if (savedSchedule) {
      try {
        setScheduledIds(JSON.parse(savedSchedule));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const saveAthletesLocal = (updated: TGRRegistrasiAthlete[]) => {
    setAthletes(updated);
    localStorage.setItem('silat_tgr_registered_athletes', JSON.stringify(updated));
  };

  const saveScheduleLocal = (updated: string[]) => {
    setScheduledIds(updated);
    localStorage.setItem('silat_tgr_scheduled_ids', JSON.stringify(updated));
  };

  // Add / Edit Athlete submit
  const handleSaveAthlete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim() || !formKontingen.trim()) {
      showCustomAlert('FORMULIR BELUM LENGKAP', 'Mohon isi nama atlit dan asal kontingen!');
      return;
    }

    playBeep('valid');
    if (editingAthleteId) {
      const updated = athletes.map(a => 
        a.id === editingAthleteId 
          ? { 
              ...a, 
              nama: formNama.trim(), 
              kontingen: formKontingen.trim(), 
              kelas: formKelas, 
              usia: formUsia, 
              gender: formGender,
              pool: formPool,
              noUndian: formNoUndian
            }
          : a
      );
      saveAthletesLocal(updated);
      setEditingAthleteId(null);
    } else {
      const newAthlete: TGRRegistrasiAthlete = {
        id: `tgr_ath_${Date.now()}`,
        nama: formNama.trim(),
        kontingen: formKontingen.trim(),
        kelas: formKelas,
        usia: formUsia,
        gender: formGender,
        pool: formPool,
        noUndian: formNoUndian
      };
      saveAthletesLocal([...athletes, newAthlete]);
    }

    // Reset fields
    setFormNama('');
    setFormKontingen('');
    setFormNoUndian(prev => prev + 1);
  };

  const handleStartEdit = (ath: TGRRegistrasiAthlete) => {
    playBeep('click');
    setEditingAthleteId(ath.id);
    setFormNama(ath.nama);
    setFormKontingen(ath.kontingen);
    setFormKelas(ath.kelas);
    setFormUsia(ath.usia);
    setFormGender(ath.gender);
    setFormPool(ath.pool || 'Pool A');
    setFormNoUndian(ath.noUndian || 1);
  };

  const handleDeleteAthlete = (id: string) => {
    showCustomConfirm(
      'HAPUS DATA ATLET',
      'Apakah anda yakin ingin menghapus data atlet ini?',
      () => {
        playBeep('click');
        const updated = athletes.filter(a => a.id !== id);
        saveAthletesLocal(updated);
        
        // Also remove from schedule if present
        const updatedSched = scheduledIds.filter(schedId => schedId !== id);
        saveScheduleLocal(updatedSched);
      }
    );
  };

  // Unique categories list derived from registered athletes
  const derivedCategoriesList = useMemo(() => {
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
    })).sort((a, b) => a.kelas.localeCompare(b.kelas) || a.gender.localeCompare(b.gender));
  }, [athletes]);

  // Auto-select first category if none or invalid
  useEffect(() => {
    if (derivedCategoriesList.length > 0) {
      if (!selectedBaganId || !derivedCategoriesList.some(c => c.name === selectedBaganId)) {
        setSelectedBaganId(derivedCategoriesList[0].name);
      }
    }
  }, [derivedCategoriesList, selectedBaganId]);

  // Current category athletes for active selection
  const currentCategoryAthletes = useMemo(() => {
    if (!selectedBaganId) return [];
    const cat = derivedCategoriesList.find(c => c.name === selectedBaganId);
    if (!cat) return [];
    return athletes.filter(a => a.kelas === cat.kelas && a.usia === cat.usia && a.gender === cat.gender);
  }, [selectedBaganId, derivedCategoriesList, athletes]);

  // Unique pools in currently selected category
  const currentCategoryPools = useMemo(() => {
    const pools = new Set<string>();
    currentCategoryAthletes.forEach(a => {
      pools.add(a.pool || 'Pool A');
    });
    return Array.from(pools).sort();
  }, [currentCategoryAthletes]);

  // Filtered athletes for Pool Management view
  const poolFilteredAthletes = useMemo(() => {
    if (selectedPoolFilter === 'Semua Pool') {
      return [...currentCategoryAthletes].sort((a, b) => {
        const poolCmp = (a.pool || 'Pool A').localeCompare(b.pool || 'Pool A');
        if (poolCmp !== 0) return poolCmp;
        return (a.noUndian || 0) - (b.noUndian || 0);
      });
    }
    return currentCategoryAthletes
      .filter(a => (a.pool || 'Pool A') === selectedPoolFilter)
      .sort((a, b) => (a.noUndian || 0) - (b.noUndian || 0));
  }, [currentCategoryAthletes, selectedPoolFilter]);

  // Bracket matches for Prestasi mode
  const currentMatches = useMemo(() => {
    if (!selectedBaganId) return [];
    const existing = baganMatchesMap[selectedBaganId];
    
    if (currentCategoryAthletes.length === 0) return [];

    const expectedMatchCount = currentCategoryAthletes.length <= 2 ? 1 
      : currentCategoryAthletes.length <= 4 ? 3 
      : currentCategoryAthletes.length <= 8 ? 7 : 15;

    if (!existing || existing.length !== expectedMatchCount) {
      return generateBaganForAthletes(currentCategoryAthletes);
    }
    
    return existing;
  }, [selectedBaganId, currentCategoryAthletes, baganMatchesMap]);

  // Advance winner in Bagan (Prestasi mode)
  const handleSelectBaganWinner = (matchId: number, winnerSide: 'merah' | 'biru' | null) => {
    if (!selectedBaganId) return;
    playBeep('click');

    const matches = currentMatches;
    const size = matches.length === 1 ? 2 : matches.length === 3 ? 4 : matches.length === 7 ? 8 : 16;

    const updatedMatches = matches.map(m => {
      if (m.id !== matchId) return m;
      return {
        ...m,
        winner: m.winner === winnerSide ? null : winnerSide
      };
    });

    const propagated = propagateTGRBracket(updatedMatches, size);
    
    saveBaganMatchesMap({
      ...baganMatchesMap,
      [selectedBaganId]: propagated
    });
  };

  // Shuffle Bagan positions (Prestasi mode)
  const handleShuffleBagan = () => {
    if (!selectedBaganId || currentCategoryAthletes.length === 0) return;

    playBeep('valid');
    showCustomConfirm(
      'KOCOK BAGAN PERTANDINGAN',
      `Apakah Anda yakin ingin mengocok urutan bagan untuk kategori ${selectedBaganId}? Seluruh pemenang babak sebelumnya akan direset.`,
      () => {
        const shuffled = [...currentCategoryAthletes].sort(() => Math.random() - 0.5);
        const generated = generateBaganForAthletes(shuffled);
        saveBaganMatchesMap({
          ...baganMatchesMap,
          [selectedBaganId]: generated
        });
      }
    );
  };

  // Shuffle Pool draw lotting (Pool mode)
  const handleShufflePoolDraw = () => {
    if (!selectedBaganId || currentCategoryAthletes.length === 0) return;

    playBeep('valid');
    showCustomConfirm(
      'KOCOK NOMOR UNDIAN POOL',
      `Apakah Anda yakin ingin mengocok nomor urut undian tampil untuk kategori ${selectedBaganId}${selectedPoolFilter !== 'Semua Pool' ? ` (${selectedPoolFilter})` : ''}?`,
      () => {
        const targetAthletes = selectedPoolFilter === 'Semua Pool' 
          ? currentCategoryAthletes 
          : currentCategoryAthletes.filter(a => (a.pool || 'Pool A') === selectedPoolFilter);

        // Group by pool and shuffle within each pool
        const poolsToShuffle = selectedPoolFilter === 'Semua Pool' ? currentCategoryPools : [selectedPoolFilter];
        const updated = [...athletes];

        poolsToShuffle.forEach(pName => {
          const inPool = targetAthletes.filter(a => (a.pool || 'Pool A') === pName);
          const shuffledIndices = [...Array(inPool.length).keys()].sort(() => Math.random() - 0.5);
          
          inPool.forEach((ath, i) => {
            const idxInAll = updated.findIndex(item => item.id === ath.id);
            if (idxInAll !== -1) {
              updated[idxInAll] = {
                ...updated[idxInAll],
                noUndian: shuffledIndices[i] + 1
              };
            }
          });
        });

        saveAthletesLocal(updated);
      }
    );
  };

  // Auto Divide into Pools helper
  const handleAutoDividePools = () => {
    if (!selectedBaganId || currentCategoryAthletes.length === 0) return;
    playBeep('valid');

    const shuffled = [...currentCategoryAthletes].sort(() => Math.random() - 0.5);
    const poolLetters = ['Pool A', 'Pool B', 'Pool C', 'Pool D', 'Pool E', 'Pool F'];
    const updated = [...athletes];

    shuffled.forEach((ath, idx) => {
      const poolIndex = Math.floor(idx / autoPoolSize);
      const poolName = poolLetters[poolIndex] || `Pool ${poolIndex + 1}`;
      const noInPool = (idx % autoPoolSize) + 1;

      const idxInAll = updated.findIndex(item => item.id === ath.id);
      if (idxInAll !== -1) {
        updated[idxInAll] = {
          ...updated[idxInAll],
          pool: poolName,
          noUndian: noInPool
        };
      }
    });

    saveAthletesLocal(updated);
    setShowAutoPoolModal(false);
    showCustomAlert("PEMBAGIAN POOL BERHASIL", `Berhasil membagi ${shuffled.length} atlet menjadi pool berkapasitas ${autoPoolSize} atlet.`);
  };

  // Get Bagan columns layout
  const getBaganColumns = (matches: TGRBaganMatch[]) => {
    if (matches.length === 1) {
      return [{ title: 'Babak Final', matches: [matches[0]] }];
    } else if (matches.length === 3) {
      return [
        { title: 'Semifinal', matches: [matches[0], matches[1]] },
        { title: 'Final', matches: [matches[2]] }
      ];
    } else if (matches.length === 7) {
      return [
        { title: 'Penyisihan', matches: [matches[0], matches[1], matches[2], matches[3]] },
        { title: 'Semifinal', matches: [matches[4], matches[5]] },
        { title: 'Final', matches: [matches[6]] }
      ];
    } else if (matches.length === 15) {
      return [
        { title: 'Penyisihan', matches: matches.slice(0, 8) },
        { title: 'Perempat Final', matches: matches.slice(8, 12) },
        { title: 'Semifinal', matches: matches.slice(12, 14) },
        { title: 'Final', matches: [matches[14]] }
      ];
    }
    return [];
  };

  // Scheduled matches list computed based on checked boxes in Kontrol Partai
  const scheduledMatches = useMemo(() => {
    return athletes.filter(a => scheduledIds.includes(a.id))
      .sort((a, b) => {
        const idxA = scheduledIds.indexOf(a.id);
        const idxB = scheduledIds.indexOf(b.id);
        return idxA - idxB;
      });
  }, [athletes, scheduledIds]);

  const handleToggleSchedule = (id: string) => {
    playBeep('click');
    if (scheduledIds.includes(id)) {
      saveScheduleLocal(scheduledIds.filter(i => i !== id));
    } else {
      saveScheduleLocal([...scheduledIds, id]);
    }
  };

  // Sync to Arena Dispatcher
  const handleSyncToArena = async () => {
    const targetList = scheduledMatches.length > 0 ? scheduledMatches : athletes;
    if (targetList.length === 0) {
      showCustomAlert("SINKRONISASI ARENA", "Belum ada data atlet untuk dikirim ke arena!");
      return;
    }
    
    showCustomConfirm(
      "SINKRONISASI ROSTER ARENA",
      `Apakah Anda yakin ingin mengirim ${targetList.length} atlet ke arena utama (${sistemSeni === 'pool' ? 'SISTEM POOL' : 'SISTEM PRESTASI'})?`,
      async () => {
        playBeep('valid');
        const payloadList = targetList.map((m, index) => ({
          id: m.id,
          noUrut: index + 1,
          noUndian: m.noUndian || (index + 1),
          partai: `PARTAI ${index + 1}`,
          partaiNumber: index + 1,
          pool: m.pool || 'Pool A',
          nama: m.nama,
          kontingen: m.kontingen,
          kategori: m.kelas,
          gender: m.gender,
          usia: m.usia
        }));

        try {
          await dispatch('TGR_SET_SISTEM_SENI', { sistem: sistemSeni });
          await dispatch('TGR_UPDATE_PESERTA', {
            action: 'sync_list',
            pesertaList: payloadList
          });

          await dispatch('TGR_ADD_AUDIT_LOG', {
            user: 'Sekretaris',
            action: `Sinkronisasi roster arena (${sistemSeni === 'pool' ? 'Sistem Pool' : 'Sistem Prestasi'}): Mengimpor ${payloadList.length} atlet ke arena`
          });

          showCustomAlert("SINKRONISASI BERHASIL", `Berhasil mengirimkan ${payloadList.length} atlet ke arena utama! Panel juri, dewan, dan monitor telah diperbarui.`);
        } catch (err: any) {
          console.error(err);
          showCustomAlert("GAGAL SINKRONISASI", `Gagal sinkronisasi data: ${err.message}`);
        }
      }
    );
  };

  // Export Athletes as CSV File
  const handleExportAthletesCSV = () => {
    playBeep('valid');
    let csv = '\uFEFF'; // UTF-8 BOM
    csv += 'NO,NAMA ATLIT,KONTINGEN,KATEGORI SENI,KATEGORI USIA,GENDER,POOL,NO UNDIAN\n';
    athletes.forEach((a, i) => {
      csv += `${i + 1},"${a.nama}","${a.kontingen}","${a.kelas}","${a.usia}","${a.gender}","${a.pool || 'Pool A'}",${a.noUndian || (i + 1)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `DATA_ATLIT_TGR_${state.namaEvent.replace(/\s+/g, '_') || 'KEJUARAAN'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download template CSV File
  const handleDownloadTemplate = () => {
    playBeep('click');
    let csv = '\uFEFF';
    csv += 'NAMA ATLIT,KONTINGEN,KATEGORI SENI,KATEGORI USIA,GENDER,POOL,NO UNDIAN\n';
    csv += 'Iko Uwais,Sinar Silat,Jurus Tunggal Tangan Kosong,Remaja,Putra,Pool A,1\n';
    csv += 'Yayan Ruhian,Harimau Singgalang,Jurus Tunggal Senjata,Dewasa,Putra,Pool A,2\n';
    csv += 'Cecep Arif Rahman,Panglipur,Jurus Bebas,Dewasa,Putra,Pool B,1\n';

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'TEMPLATE_REGISTRASI_TGR.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import CSV File
  const handleImportAthletesCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rows = text.split('\n').map(row => row.trim()).filter(Boolean);
        if (rows.length <= 1) return;

        const parsed: TGRRegistrasiAthlete[] = [];
        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
          if (cols.length >= 2 && cols[0]) {
            parsed.push({
              id: `tgr_csv_${Date.now()}_${i}`,
              nama: cols[0] || `Peserta ${i}`,
              kontingen: cols[1] || 'Umum',
              kelas: cols[2] || TGR_CATEGORIES[0],
              usia: cols[3] || AGE_CATEGORIES[0],
              gender: (cols[4] && cols[4].toLowerCase().includes('putri')) ? 'Putri' : 'Putra',
              pool: cols[5] || 'Pool A',
              noUndian: parseInt(cols[6], 10) || i
            });
          }
        }

        if (parsed.length > 0) {
          playBeep('valid');
          saveAthletesLocal([...athletes, ...parsed]);
          showCustomAlert('IMPORT BERHASIL', `Berhasil mengimpor ${parsed.length} atlet seni!`);
        }
      } catch (err: any) {
        showCustomAlert('GAGAL IMPORT', `Format file tidak valid: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  // Comprehensive PDF Reports Generation
  const handleDownloadPDFReport = () => {
    playBeep('valid');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 14;
    const contentWidth = pageWidth - (marginX * 2);

    let currentY = 14;

    // Outer border
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.6);
    doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    
    const docTitle = sistemSeni === 'pool' 
      ? 'LEMBAR POOL & HASIL PERTANDINGAN SENI (IPSI)'
      : 'BAGAN & JADWAL PERTANDINGAN SENI PRESTASI (IPSI)';

    doc.text(docTitle, pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;

    doc.setFontSize(10.5);
    doc.text((state.namaEvent || 'KEJUARAAN PENCAK SILAT NASIONAL').toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
    currentY += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`SISTEM PERTANDINGAN: ${sistemSeni === 'pool' ? 'SISTEM POOL (RANKING NILAI)' : 'SISTEM PRESTASI (VS / BAGAN GUGUR)'} | GELANGGANG: ${(state.gelanggang || 'GELANGGANG A').toUpperCase()}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 4;

    // Divider line
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(marginX, currentY, marginX + contentWidth, currentY);
    currentY += 5;

    // Info panel
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(marginX, currentY, contentWidth, 9, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`KATEGORI: ${(selectedBaganId || 'SEMUA KATEGORI').toUpperCase()}`, marginX + 4, currentY + 6);
    doc.text(`FILTER POOL: ${selectedPoolFilter.toUpperCase()}`, marginX + 75, currentY + 6);
    doc.text(`TANGGAL: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'medium' })}`, marginX + 130, currentY + 6);
    currentY += 13;

    // Table Header
    doc.setFillColor(15, 23, 42);
    doc.rect(marginX, currentY, contentWidth, 7.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);

    const colUndian = 12;
    const colNama = 56;
    const colKontingen = 44;
    const colPool = 22;
    const colKategori = 26;
    const colRank = 22;

    let x = marginX;
    doc.text('NO', x + 2, currentY + 5); x += colUndian;
    doc.text('NAMA ATLIT / TIM', x + 2, currentY + 5); x += colNama;
    doc.text('KONTINGEN', x + 2, currentY + 5); x += colKontingen;
    doc.text('POOL', x + 2, currentY + 5); x += colPool;
    doc.text('KATEGORI', x + 2, currentY + 5); x += colKategori;
    doc.text('PERINGKAT', x + 2, currentY + 5);
    currentY += 7.5;

    const dataToPrint = activeTab === 'manajemen' && sistemSeni === 'pool' 
      ? poolFilteredAthletes 
      : athletes;

    dataToPrint.forEach((ath, i) => {
      if (currentY > pageHeight - 35) {
        doc.addPage('a4', 'p');
        currentY = 16;
        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.6);
        doc.rect(8, 8, pageWidth - 16, pageHeight - 16);
      }

      const rowHeight = 7;
      if (i % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(marginX, currentY, contentWidth, rowHeight, 'F');
      }

      doc.setDrawColor(226, 232, 240);
      doc.line(marginX, currentY + rowHeight, marginX + contentWidth, currentY + rowHeight);

      doc.setTextColor(15, 23, 42);
      let rx = marginX;
      doc.setFont('helvetica', 'bold');
      doc.text((ath.noUndian || i + 1).toString(), rx + 2, currentY + 4.5); rx += colUndian;

      doc.setFont('helvetica', 'bold');
      doc.text(ath.nama.toUpperCase().slice(0, 30), rx + 2, currentY + 4.5); rx += colNama;

      doc.setFont('helvetica', 'normal');
      doc.text(ath.kontingen.toUpperCase().slice(0, 24), rx + 2, currentY + 4.5); rx += colKontingen;
      doc.text((ath.pool || 'Pool A').toUpperCase(), rx + 2, currentY + 4.5); rx += colPool;
      doc.text(ath.kelas.slice(0, 16), rx + 2, currentY + 4.5); rx += colKategori;
      
      // Match with live arena score if any
      const liveP = state.pesertaList.find(p => p.nama.toLowerCase() === ath.nama.toLowerCase() || p.id === ath.id);
      const rankText = liveP?.rankingInPool ? `Juara ${liveP.rankingInPool}` : liveP?.ranking ? `Peringkat ${liveP.ranking}` : '—';
      doc.setFont('helvetica', 'bold');
      doc.text(rankText, rx + 2, currentY + 4.5);

      currentY += rowHeight;
    });

    // Signatures
    const sigY = Math.max(currentY + 6, pageHeight - 36);
    if (sigY < pageHeight - 16) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);

      doc.text('Ketua Pertandingan,', marginX + 30, sigY, { align: 'center' });
      doc.text('(........................................)', marginX + 30, sigY + 16, { align: 'center' });

      doc.text('Sekretaris Pertandingan,', marginX + contentWidth - 30, sigY, { align: 'center' });
      doc.text('(........................................)', marginX + contentWidth - 30, sigY + 16, { align: 'center' });
    }

    doc.save(`Dokumen_Seni_${sistemSeni.toUpperCase()}_${Date.now()}.pdf`);
  };

  return (
    <div className={`min-h-screen w-full flex flex-col font-sans transition-colors duration-300 ${
      theme === 'dark' ? 'bg-[#020207] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* 1. TOP SYSTEM MODE BAR */}
      <div className={`px-6 py-3 border-b flex flex-wrap justify-between items-center gap-4 ${
        theme === 'dark' ? 'bg-slate-950/95 border-slate-900' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className={`p-2 rounded-xl cursor-pointer transition-all border ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800 text-amber-500 hover:text-amber-400' : 'bg-slate-100 border-slate-200 text-amber-600 hover:text-amber-700'
            }`}
            title="Kembali ke Sekretaris"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase text-amber-500 tracking-wider">MODUL REGISTRASI & BAGAN SENI (TGR)</span>
              <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-black uppercase border ${
                sistemSeni === 'pool' 
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-400' 
                  : 'bg-purple-500/15 border-purple-500/40 text-purple-400'
              }`}>
                {sistemSeni === 'pool' ? '🏊 SISTEM POOL AKTIF' : '⚔️ SISTEM PRESTASI (VS) AKTIF'}
              </span>
            </div>
            <h2 className="text-lg font-black uppercase tracking-tight leading-none mt-0.5">
              PENGATURAN & BAGAN PERTANDINGAN SENI
            </h2>
          </div>
        </div>

        {/* MODE SWITCHER: POOL VS PRESTASI */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 p-1 rounded-xl border bg-slate-950/40 border-slate-800">
            <button
              onClick={() => handleToggleSistemSeni('pool')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide cursor-pointer transition-all flex items-center gap-1.5 ${
                sistemSeni === 'pool'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-950/40 scale-102'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-300" />
              <span>Sistem Pool (Nilai)</span>
            </button>
            <button
              onClick={() => handleToggleSistemSeni('prestasi')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide cursor-pointer transition-all flex items-center gap-1.5 ${
                sistemSeni === 'prestasi'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-950/40 scale-102'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Swords className="w-3.5 h-3.5 text-purple-300" />
              <span>Sistem Prestasi (VS)</span>
            </button>
          </div>

          <button
            onClick={handleDownloadPDFReport}
            className="px-3 py-1.5 rounded-xl border border-indigo-500/40 bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 text-xs font-bold font-mono uppercase cursor-pointer flex items-center gap-1.5"
            title="Cetak Laporan PDF"
          >
            <FileText className="w-4 h-4 text-indigo-400" />
            <span>Cetak PDF</span>
          </button>
        </div>
      </div>

      {/* 2. SUB NAVIGATION TABS */}
      <div className={`px-6 py-2 border-b flex justify-between items-center ${
        theme === 'dark' ? 'bg-[#060913] border-slate-900' : 'bg-slate-100 border-slate-200'
      }`}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { playBeep('click'); setActiveTab('input'); }}
            className={`px-4 py-2 text-xs font-black uppercase rounded-xl cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'input' 
                ? 'bg-amber-600 text-white shadow shadow-amber-900/40' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>1. Data & Roster Peserta</span>
          </button>

          <button
            onClick={() => { playBeep('click'); setActiveTab('manajemen'); }}
            className={`px-4 py-2 text-xs font-black uppercase rounded-xl cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'manajemen' 
                ? 'bg-amber-600 text-white shadow shadow-amber-900/40' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {sistemSeni === 'pool' ? (
              <>
                <Layers className="w-4 h-4 text-amber-300" />
                <span>2. Manajemen & Ranking Pool</span>
              </>
            ) : (
              <>
                <Trophy className="w-4 h-4 text-purple-300" />
                <span>2. Bagan Pertandingan (VS)</span>
              </>
            )}
          </button>

          <button
            onClick={() => { playBeep('click'); setActiveTab('kontrol'); }}
            className={`px-4 py-2 text-xs font-black uppercase rounded-xl cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'kontrol' 
                ? 'bg-amber-600 text-white shadow shadow-amber-900/40' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="w-4 h-4" />
            <span>3. Kontrol Jadwal & Arena</span>
          </button>
        </div>

        <div className="text-xs font-mono text-slate-400">
          Total Terdaftar: <span className="font-extrabold text-amber-400">{athletes.length} Atlet</span>
        </div>
      </div>

      {/* 3. MAIN BODY CONTENT */}
      <div className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: INPUT DATA PESERTA */}
          {activeTab === 'input' && (
            <motion.div 
              key="input-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Form Input Section */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                <div className={`p-5 rounded-2xl border ${
                  theme === 'dark' ? 'bg-[#080c16] border-slate-900' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <h3 className="text-xs font-black uppercase text-amber-500 tracking-wider font-mono mb-4 flex items-center gap-1.5">
                    <Plus className="w-4 h-4" />
                    {editingAthleteId ? 'EDIT DATA ATLET SENI' : 'TAMBAH ATLET SENI BARU'}
                  </h3>

                  <form onSubmit={handleSaveAthlete} className="flex flex-col gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Nama Lengkap Atlet / Tim
                      </label>
                      <input 
                        type="text" 
                        value={formNama} 
                        onChange={(e) => setFormNama(e.target.value)}
                        placeholder="Contoh: Iko Uwais / Trio Padang"
                        className={`w-full text-xs font-bold px-3 py-2 border rounded-xl focus:outline-none ${
                          theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white focus:border-amber-500' : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                        }`}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Kontingen / Perguruan / Daerah
                      </label>
                      <input 
                        type="text" 
                        value={formKontingen} 
                        onChange={(e) => setFormKontingen(e.target.value)}
                        placeholder="Contoh: Tapak Suci / DKI Jakarta"
                        className={`w-full text-xs font-bold px-3 py-2 border rounded-xl focus:outline-none ${
                          theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white focus:border-amber-500' : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                        }`}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Kategori Seni TGR
                      </label>
                      <select
                        value={formKelas}
                        onChange={(e) => setFormKelas(e.target.value)}
                        className={`w-full text-xs font-bold px-3 py-2 border rounded-xl focus:outline-none ${
                          theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white focus:border-amber-500' : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                        }`}
                      >
                        {TGR_CATEGORIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          Kategori Usia
                        </label>
                        <select
                          value={formUsia}
                          onChange={(e) => setFormUsia(e.target.value)}
                          className={`w-full text-xs font-bold px-3 py-2 border rounded-xl focus:outline-none ${
                            theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white focus:border-amber-500' : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                          }`}
                        >
                          {AGE_CATEGORIES.map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          Gender
                        </label>
                        <select
                          value={formGender}
                          onChange={(e) => setFormGender(e.target.value as 'Putra' | 'Putri')}
                          className={`w-full text-xs font-bold px-3 py-2 border rounded-xl focus:outline-none ${
                            theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white focus:border-amber-500' : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                          }`}
                        >
                          <option value="Putra">Putra</option>
                          <option value="Putri">Putri</option>
                        </select>
                      </div>
                    </div>

                    {/* POOL & NO UNDIAN FIELDS */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          Pembagian Pool
                        </label>
                        <select
                          value={formPool}
                          onChange={(e) => setFormPool(e.target.value)}
                          className={`w-full text-xs font-bold px-3 py-2 border rounded-xl focus:outline-none ${
                            theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white focus:border-amber-500' : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                          }`}
                        >
                          {AVAILABLE_POOLS.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          No. Undian Tampil
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={formNoUndian}
                          onChange={(e) => setFormNoUndian(parseInt(e.target.value, 10) || 1)}
                          className={`w-full text-xs font-bold px-3 py-2 border rounded-xl focus:outline-none ${
                            theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white focus:border-amber-500' : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3">
                      <button
                        type="submit"
                        className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase text-xs rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-95 cursor-pointer shadow-md shadow-amber-950/40 flex items-center justify-center gap-1.5"
                      >
                        <Save className="w-4 h-4" />
                        <span>{editingAthleteId ? 'Simpan Perubahan' : 'Daftarkan Atlet'}</span>
                      </button>

                      {editingAthleteId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAthleteId(null);
                            setFormNama('');
                            setFormKontingen('');
                          }}
                          className="px-3 py-2.5 bg-slate-800 text-slate-300 font-bold uppercase text-xs rounded-xl hover:bg-slate-700 cursor-pointer"
                        >
                          Batal
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Import / Export & Tools Card */}
                <div className={`p-4 rounded-2xl border ${
                  theme === 'dark' ? 'bg-[#080c16] border-slate-900' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono mb-3">
                    TOOLS & IMPORT/EXPORT DATA
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleExportAthletesCSV}
                      className="p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-[10px] font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-500" />
                      <span>Export CSV</span>
                    </button>
                    <button
                      onClick={handleDownloadTemplate}
                      className="p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-[10px] font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Template</span>
                    </button>
                  </div>
                  <label className="mt-2 w-full p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-[10px] font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1 block text-center">
                    <Upload className="w-3.5 h-3.5 text-blue-500" />
                    <span>Upload CSV Atlet</span>
                    <input type="file" accept=".csv" onChange={handleImportAthletesCSV} className="hidden" />
                  </label>

                  {sistemSeni === 'pool' && (
                    <button
                      onClick={() => setShowAutoPoolModal(true)}
                      className="mt-2 w-full p-2 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/40 text-amber-300 text-[10px] font-black rounded-lg cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Bagi Pool Otomatis</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Registered Athletes List Table */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                <div className={`p-5 rounded-2xl border ${
                  theme === 'dark' ? 'bg-[#080c16] border-slate-900' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div className="flex justify-between items-center mb-4 border-b border-slate-850 pb-3">
                    <div>
                      <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider font-mono">
                        DAFTAR ATLET SENI TERDAFTAR
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">Daftar seluruh atlet seni yang siap dipertandingkan.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-amber-600/20 border border-amber-500/30 text-amber-400 font-extrabold text-xs rounded-full">
                        {athletes.length} Atlet
                      </span>
                    </div>
                  </div>

                  {athletes.length === 0 ? (
                    <div className="py-16 text-center text-slate-500 text-xs font-mono">
                      Belum ada data atlet seni. Silakan tambahkan atlet di form sebelah kiri atau upload CSV.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                            <th className="py-2.5 px-3">NO</th>
                            <th className="py-2.5 px-3">NAMA ATLIT</th>
                            <th className="py-2.5 px-3">KONTINGEN</th>
                            <th className="py-2.5 px-3">KATEGORI</th>
                            <th className="py-2.5 px-3">POOL</th>
                            <th className="py-2.5 px-3 text-center">UNDIAN</th>
                            <th className="py-2.5 px-3 text-right">AKSI</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900">
                          {athletes.map((ath, idx) => (
                            <tr key={ath.id} className="hover:bg-slate-900/40 transition-colors">
                              <td className="py-2 px-3 font-mono font-bold text-slate-500">{idx + 1}</td>
                              <td className="py-2 px-3 font-extrabold uppercase text-slate-200">
                                {ath.nama}
                                <div className="text-[9px] text-slate-500 font-normal">{ath.gender} - {ath.usia}</div>
                              </td>
                              <td className="py-2 px-3 text-slate-400 font-semibold">{ath.kontingen}</td>
                              <td className="py-2 px-3 font-medium text-amber-300">{ath.kelas}</td>
                              <td className="py-2 px-3">
                                <span className="px-2 py-0.5 bg-amber-950/40 border border-amber-800/40 text-amber-300 rounded font-mono font-bold text-[10px]">
                                  {ath.pool || 'Pool A'}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center font-mono font-extrabold text-amber-400">
                                #{ath.noUndian || (idx + 1)}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleStartEdit(ath)}
                                    className="p-1 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                                    title="Edit Atlet"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAthlete(ath.id)}
                                    className="p-1 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                    title="Hapus Atlet"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: MANAJEMEN POOL & RANKING (IF SISTEM POOL) OR BAGAN PERTANDINGAN (IF SISTEM PRESTASI) */}
          {activeTab === 'manajemen' && (
            <motion.div 
              key="manajemen-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex flex-col gap-6"
            >
              {/* Category & Filter Selector */}
              <div className={`p-4 rounded-2xl border flex flex-wrap justify-between items-center gap-4 ${
                theme === 'dark' ? 'bg-[#080c16] border-slate-900' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-slate-400 uppercase">PILIH KATEGORI:</span>
                  <select
                    value={selectedBaganId}
                    onChange={(e) => {
                      playBeep('click');
                      setSelectedBaganId(e.target.value);
                      setSelectedPoolFilter('Semua Pool');
                    }}
                    className={`text-xs font-bold px-3 py-2 border rounded-xl focus:outline-none ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white focus:border-amber-500' : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                    }`}
                  >
                    {derivedCategoriesList.map(cat => (
                      <option key={cat.name} value={cat.name}>
                        {cat.name} ({cat.athletesCount} atlet)
                      </option>
                    ))}
                  </select>
                </div>

                {sistemSeni === 'pool' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-400 uppercase">FILTER POOL:</span>
                    <select
                      value={selectedPoolFilter}
                      onChange={(e) => {
                        playBeep('click');
                        setSelectedPoolFilter(e.target.value);
                      }}
                      className={`text-xs font-bold px-3 py-2 border rounded-xl focus:outline-none ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white focus:border-amber-500' : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                      }`}
                    >
                      <option value="Semua Pool">Semua Pool ({currentCategoryAthletes.length})</option>
                      {currentCategoryPools.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>

                    <button
                      onClick={handleShufflePoolDraw}
                      className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-black uppercase rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-950/30"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      <span>Kocok No Undian</span>
                    </button>
                  </div>
                )}

                {sistemSeni === 'prestasi' && (
                  <button
                    onClick={handleShuffleBagan}
                    className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-950/30"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>Kocok Bagan VS</span>
                  </button>
                )}
              </div>

              {/* IF SISTEM POOL: SHOW POOL LEADERBOARD & DRAW LIST */}
              {sistemSeni === 'pool' && (
                <div className="flex flex-col gap-6">
                  <div className={`p-5 rounded-2xl border ${
                    theme === 'dark' ? 'bg-[#080c16] border-slate-900' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex justify-between items-center mb-4 border-b border-slate-850 pb-3">
                      <div>
                        <h3 className="text-xs font-black uppercase text-amber-500 tracking-wider font-mono">
                          TABEL URUTAN TAMPIL & HASIL NILAI POOL
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">Urutan tampil lotting, skor juri, dan penentuan juara pool.</p>
                      </div>
                      <span className="px-3 py-1 bg-amber-600/20 text-amber-400 font-mono font-extrabold text-xs rounded-full">
                        {poolFilteredAthletes.length} Peserta
                      </span>
                    </div>

                    {poolFilteredAthletes.length === 0 ? (
                      <div className="py-16 text-center text-slate-500 text-xs font-mono">
                        Tidak ada atlet pada kategori atau pool yang dipilih.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                              <th className="py-2.5 px-3">UNDIAN</th>
                              <th className="py-2.5 px-3">NAMA PESERTA</th>
                              <th className="py-2.5 px-3">KONTINGEN</th>
                              <th className="py-2.5 px-3">POOL</th>
                              <th className="py-2.5 px-3 text-center">STATUS NILAI</th>
                              <th className="py-2.5 px-3 text-center">NILAI AKHIR</th>
                              <th className="py-2.5 px-3 text-center">PERINGKAT JUARA</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-900">
                            {poolFilteredAthletes.map((ath) => {
                              const liveP = state.pesertaList.find(p => p.nama.toLowerCase() === ath.nama.toLowerCase() || p.id === ath.id);
                              const rankInPool = liveP?.rankingInPool || (liveP?.ranking);
                              const isPodium = rankInPool && rankInPool <= 3;

                              return (
                                <tr 
                                  key={ath.id} 
                                  className={`transition-colors ${
                                    isPodium 
                                      ? rankInPool === 1 
                                        ? 'bg-amber-950/20 hover:bg-amber-950/30' 
                                        : rankInPool === 2 
                                          ? 'bg-slate-800/20 hover:bg-slate-800/30' 
                                          : 'bg-orange-950/15 hover:bg-orange-950/25'
                                      : 'hover:bg-slate-900/40'
                                  }`}
                                >
                                  <td className="py-3 px-3 font-mono font-black text-amber-400 text-sm">
                                    #{ath.noUndian || 1}
                                  </td>
                                  <td className="py-3 px-3">
                                    <div className="font-extrabold uppercase text-slate-200">{ath.nama}</div>
                                    <div className="text-[10px] text-slate-500">{ath.kelas}</div>
                                  </td>
                                  <td className="py-3 px-3 text-slate-400 font-semibold">{ath.kontingen}</td>
                                  <td className="py-3 px-3">
                                    <span className="px-2.5 py-1 bg-amber-950/50 border border-amber-800/50 text-amber-300 font-mono font-black rounded-lg text-xs">
                                      {ath.pool || 'Pool A'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    {liveP?.status === 'Sudah Menilai' ? (
                                      <span className="px-2 py-0.5 bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-[10px] font-bold rounded">
                                        Sudah Tampil
                                      </span>
                                    ) : liveP?.id === state.activePesertaId ? (
                                      <span className="px-2 py-0.5 bg-amber-950/40 border border-amber-800/40 text-amber-400 text-[10px] font-bold rounded animate-pulse">
                                        Sedang Tampil
                                      </span>
                                    ) : (
                                      <span className="text-slate-500 text-[10px] font-mono">Belum Tampil</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 text-center font-mono font-black text-sm text-slate-100">
                                    {liveP?.finalScore !== undefined ? liveP.finalScore.toFixed(3) : '—'}
                                  </td>
                                  <td className="py-3 px-3 text-center font-mono font-extrabold text-xs">
                                    {rankInPool ? (
                                      <span className={`px-2.5 py-1 rounded-lg inline-flex items-center gap-1 font-black ${
                                        rankInPool === 1 
                                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/50' 
                                          : rankInPool === 2 
                                            ? 'bg-slate-300 text-slate-950' 
                                            : rankInPool === 3 
                                              ? 'bg-amber-800 text-white' 
                                              : 'text-slate-400'
                                      }`}>
                                        {rankInPool === 1 ? '🥇 Juara 1' : rankInPool === 2 ? '🥈 Juara 2' : rankInPool === 3 ? '🥉 Juara 3' : `Peringkat ${rankInPool}`}
                                      </span>
                                    ) : (
                                      <span className="text-slate-600">—</span>
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
                </div>
              )}

              {/* IF SISTEM PRESTASI: SHOW TOURNAMENT BRACKET (VS MERAH VS BIRU) */}
              {sistemSeni === 'prestasi' && (
                <div className={`p-6 rounded-2xl border ${
                  theme === 'dark' ? 'bg-[#080c16] border-slate-900' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  {(() => {
                    const columns = getBaganColumns(currentMatches);
                    const finalMatch = currentMatches.find(m => m.round === 'final');
                    const champion = finalMatch && finalMatch.winner ? (finalMatch.winner === 'merah' ? finalMatch.atletMerah : finalMatch.atletBiru) : null;

                    if (columns.length === 0) {
                      return (
                        <div className="py-16 text-center text-slate-500 text-xs font-mono">
                          Belum ada peserta yang cukup untuk membentuk bagan turnamen.
                        </div>
                      );
                    }

                    return (
                      <div className="flex flex-col gap-6">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                          <div>
                            <span className="text-[10px] font-mono uppercase text-purple-400 font-bold">BAGAN SISTEM GUGUR (PRESTASI)</span>
                            <h3 className="font-extrabold text-sm uppercase text-slate-200">{selectedBaganId}</h3>
                          </div>
                          <span className="text-xs font-mono text-slate-400">Klik sudut pemenang untuk memajukan atlet</span>
                        </div>

                        {/* Interactive Bracket Grid */}
                        <div className="flex gap-6 overflow-x-auto pb-4 justify-around min-w-[700px]">
                          {columns.map((col, cIdx) => (
                            <div key={cIdx} className="flex-1 flex flex-col gap-4 min-w-[200px]">
                              <div className="text-center py-1.5 rounded-lg bg-purple-950/30 border border-purple-900/40 text-[10px] font-mono font-black uppercase text-purple-300">
                                {col.title}
                              </div>
                              <div className="flex flex-col justify-around flex-1 gap-4">
                                {col.matches.map((m) => {
                                  const isMerahWinner = m.winner === 'merah';
                                  const isBiruWinner = m.winner === 'biru';
                                  const hasMerah = !!m.atletMerah.nama;
                                  const hasBiru = !!m.atletBiru.nama;

                                  return (
                                    <div 
                                      key={m.id} 
                                      className={`border rounded-xl p-2.5 transition-all relative flex flex-col gap-2 ${
                                        theme === 'dark' ? 'bg-slate-950/60 border-slate-850' : 'bg-white border-slate-200 shadow-sm'
                                      }`}
                                    >
                                      <span className="text-[8px] font-mono text-slate-500 font-bold uppercase tracking-wider block">
                                        {m.partai}
                                      </span>

                                      {/* Sudut Merah */}
                                      <div 
                                        onClick={() => hasMerah && handleSelectBaganWinner(m.id, 'merah')}
                                        className={`p-2 rounded-lg border text-left transition-all relative ${
                                          hasMerah ? 'cursor-pointer active:scale-98' : ''
                                        } ${
                                          isMerahWinner 
                                            ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300 font-extrabold' 
                                            : isBiruWinner 
                                              ? 'opacity-40 border-transparent text-slate-600'
                                              : 'bg-red-950/15 border-red-950/40 text-slate-300 hover:bg-red-950/25'
                                        }`}
                                      >
                                        <span className="text-[7px] font-mono font-bold bg-red-600 text-white rounded px-1">MERAH</span>
                                        <div className="text-[11px] font-bold truncate mt-0.5">{m.atletMerah.nama || '— Menunggu —'}</div>
                                        <div className="text-[9px] text-slate-500 truncate">{m.atletMerah.kontingen || ''}</div>
                                        {isMerahWinner && <span className="absolute right-2 top-2 text-[8px] font-black uppercase text-emerald-400">🏆 Win</span>}
                                      </div>

                                      <div className="text-center text-[8px] font-mono font-bold text-slate-600 leading-none">VS</div>

                                      {/* Sudut Biru */}
                                      <div 
                                        onClick={() => hasBiru && handleSelectBaganWinner(m.id, 'biru')}
                                        className={`p-2 rounded-lg border text-left transition-all relative ${
                                          hasBiru ? 'cursor-pointer active:scale-98' : ''
                                        } ${
                                          isBiruWinner 
                                            ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300 font-extrabold' 
                                            : isMerahWinner 
                                              ? 'opacity-40 border-transparent text-slate-600'
                                              : 'bg-blue-950/15 border-blue-950/40 text-slate-300 hover:bg-blue-950/25'
                                        }`}
                                      >
                                        <span className="text-[7px] font-mono font-bold bg-blue-600 text-white rounded px-1">BIRU</span>
                                        <div className="text-[11px] font-bold truncate mt-0.5">{m.atletBiru.nama || '— Menunggu —'}</div>
                                        <div className="text-[9px] text-slate-500 truncate">{m.atletBiru.kontingen || ''}</div>
                                        {isBiruWinner && <span className="absolute right-2 top-2 text-[8px] font-black uppercase text-emerald-400">🏆 Win</span>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Champion Golden Banner */}
                        {champion && (
                          <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="border-2 border-amber-500/40 p-4 rounded-xl bg-amber-500/10 text-center max-w-sm w-full mx-auto flex flex-col items-center gap-1.5 shadow-lg shadow-amber-950/20"
                          >
                            <Trophy className="w-8 h-8 text-amber-400 animate-bounce" />
                            <span className="text-[8px] font-mono font-black uppercase tracking-widest text-amber-400">JUARA 1 SENI PRESTASI</span>
                            <div className="font-extrabold text-sm uppercase text-slate-100">{champion.nama}</div>
                            <div className="text-xs text-slate-400 font-mono font-semibold uppercase">{champion.kontingen}</div>
                          </motion.div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 3: KONTROL JADWAL & PARTAI ARENA */}
          {activeTab === 'kontrol' && (
            <motion.div 
              key="kontrol-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex flex-col gap-6"
            >
              <div className={`p-5 rounded-2xl border ${
                theme === 'dark' ? 'bg-[#080c16] border-slate-900' : 'bg-white border-slate-200'
              }`}>
                <div className="flex justify-between items-center mb-4 border-b border-slate-850 pb-3">
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider font-mono">
                      PENJADWALAN URUTAN TAMPIL ARENA SENI
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {sistemSeni === 'pool' 
                        ? 'Susun jadwal urutan tampil pool untuk dikirimkan secara sinkron ke seluruh juri dan layar monitor arena.'
                        : 'Susun partai pertandingan head-to-head (VS) untuk dikirimkan ke layar arena.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-amber-600/20 border border-amber-500/30 text-amber-400 font-extrabold text-xs rounded-full">
                      {scheduledMatches.length} Terjadwal
                    </span>
                    <button
                      onClick={handleSyncToArena}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-950/40 flex items-center gap-1.5"
                    >
                      <span>🚀 Terapkan ke Arena</span>
                    </button>
                  </div>
                </div>

                {athletes.length === 0 ? (
                  <div className="py-16 text-center text-slate-500 text-xs font-mono">
                    Belum ada atlet terdaftar untuk dijadwalkan.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                          <th className="py-3 px-3 w-[6%]">SCHED</th>
                          <th className="py-3 px-3 w-[10%]">URUTAN</th>
                          <th className="py-3 px-3 w-[26%]">NAMA ATLIT</th>
                          <th className="py-3 px-3 w-[20%]">KONTINGEN</th>
                          <th className="py-3 px-3 w-[20%]">KATEGORI</th>
                          <th className="py-3 px-3 w-[18%]">POOL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900">
                        {athletes.map((ath) => {
                          const isChecked = scheduledIds.includes(ath.id);
                          const idx = scheduledIds.indexOf(ath.id);
                          return (
                            <tr 
                              key={ath.id} 
                              className={`h-12 transition-all ${
                                isChecked 
                                  ? 'bg-amber-950/15' 
                                  : 'hover:bg-slate-900/40'
                              }`}
                            >
                              <td className="py-2 px-3">
                                <button
                                  onClick={() => handleToggleSchedule(ath.id)}
                                  className={`p-1 rounded cursor-pointer ${isChecked ? 'text-amber-500' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                  {isChecked ? <CheckSquare className="w-5 h-5 fill-current text-amber-500" /> : <Square className="w-5 h-5" />}
                                </button>
                              </td>
                              <td className="py-2 px-3 font-mono font-extrabold text-amber-500">
                                {isChecked ? `Partai ${idx + 1}` : '—'}
                              </td>
                              <td className="py-2 px-3 font-extrabold uppercase">{ath.nama}</td>
                              <td className="py-2 px-3 text-slate-400 font-semibold">{ath.kontingen}</td>
                              <td className="py-2 px-3 font-medium text-amber-300">{ath.kelas}</td>
                              <td className="py-2 px-3 font-mono font-bold text-slate-400">{ath.pool || 'Pool A'}</td>
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

        {/* Modal Bagi Pool Otomatis */}
        <AnimatePresence>
          {showAutoPoolModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-slate-900 border border-slate-800 max-w-md w-full p-6 rounded-2xl shadow-2xl"
              >
                <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
                  <h3 className="text-xs font-mono font-black uppercase text-amber-500 tracking-wider">
                    BAGI POOL OTOMATIS
                  </h3>
                  <button onClick={() => setShowAutoPoolModal(false)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <p className="text-xs text-slate-300 mb-4">
                  Sistem akan membagi seluruh atlet pada kategori <strong className="text-amber-400">{selectedBaganId}</strong> secara acak ke dalam Pool A, Pool B, Pool C, dst.
                </p>

                <div className="mb-4">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                    KAPASITAS MAKSIMAL ATLET PER POOL
                  </label>
                  <select
                    value={autoPoolSize}
                    onChange={(e) => setAutoPoolSize(parseInt(e.target.value, 10))}
                    className="w-full text-xs font-bold font-mono px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value={2}>2 Atlet per Pool</option>
                    <option value={3}>3 Atlet per Pool (Standar IPSI Pool)</option>
                    <option value={4}>4 Atlet per Pool</option>
                    <option value={5}>5 Atlet per Pool</option>
                    <option value={8}>8 Atlet per Pool</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleAutoDividePools}
                    className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-amber-950/40"
                  >
                    Bagi Pool Sekarang
                  </button>
                  <button
                    onClick={() => setShowAutoPoolModal(false)}
                    className="px-4 py-2.5 bg-slate-800 text-slate-400 font-bold uppercase text-xs rounded-xl hover:bg-slate-700 cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom Confirmation Dialog */}
        <AnimatePresence>
          {customConfirm && customConfirm.show && (
            <motion.div
              key="custom-confirm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[99999] flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-slate-900 border border-slate-800 max-w-sm w-full p-6 rounded-2xl shadow-2xl text-center"
              >
                <h3 className="text-sm font-black text-amber-500 uppercase tracking-widest mb-2 font-mono">
                  {customConfirm.title}
                </h3>
                <p className="text-xs text-slate-300 mb-6 font-medium">
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
        </AnimatePresence>

        {/* Custom Alert Dialog */}
        <AnimatePresence>
          {customAlert && customAlert.show && (
            <motion.div
              key="custom-alert"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[99999] flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-slate-900 border border-slate-800 max-w-sm w-full p-6 rounded-2xl shadow-2xl text-center"
              >
                <h3 className="text-sm font-black text-amber-500 uppercase tracking-widest mb-2 font-mono">
                  {customAlert.title}
                </h3>
                <p className="text-xs text-slate-300 mb-6 font-medium">
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
      </div>

    </div>
  );
}

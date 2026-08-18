/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Plus, Trash2, Edit2, Download, Upload, Play, Trophy, CheckSquare, Square, RefreshCw, FileText, Save, Users, X
} from 'lucide-react';
import { TGRState } from '../types';
import { playBeep } from '../utils/sound';
import safeHtml2canvas from '../utils/safeHtml2canvas';
import { jsPDF } from 'jspdf';

// Define structure for registered TGR athletes
interface TGRRegistrasiAthlete {
  id: string;
  nama: string;
  kontingen: string;
  kelas: string;       // Representing category (e.g., "Jurus Tunggal Tangan Kosong")
  usia: string;        // e.g. "Remaja", "Dewasa"
  gender: 'Putra' | 'Putri';
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
  atletMerah: { nama: string; kontingen: string };
  atletBiru: { nama: string; kontingen: string };
  winner: 'merah' | 'biru' | null;
}

// Available custom TGR categories
const TGR_CATEGORIES = [
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
  "Regu"
];

const AGE_CATEGORIES = ['Remaja', 'Dewasa', 'Pra-Remaja', 'Usia Dini'];

export default function TGRRegistrasiDataPanel({ theme, state, dispatch, onClose }: TGRRegistrasiDataPanelProps) {
  const [activeTab, setActiveTab] = useState<'input' | 'bagan' | 'kontrol'>('input');
  
  // Local persistence states
  const [athletes, setAthletes] = useState<TGRRegistrasiAthlete[]>([]);
  const [scheduledIds, setScheduledIds] = useState<string[]>([]);
  const [selectedBaganId, setSelectedBaganId] = useState<string>('');

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
        atletMerah: { nama: athletesList[0]?.nama || '', kontingen: athletesList[0]?.kontingen || '' },
        atletBiru: { nama: athletesList[1]?.nama || '', kontingen: athletesList[1]?.kontingen || '' },
        winner: null
      });
    } else if (size === 4) {
      matches.push(
        {
          id: 1,
          round: 'semi',
          partai: 'Semifinal 1',
          atletMerah: { nama: athletesList[0]?.nama || '', kontingen: athletesList[0]?.kontingen || '' },
          atletBiru: { nama: athletesList[1]?.nama || '', kontingen: athletesList[1]?.kontingen || '' },
          winner: null
        },
        {
          id: 2,
          round: 'semi',
          partai: 'Semifinal 2',
          atletMerah: { nama: athletesList[2]?.nama || '', kontingen: athletesList[2]?.kontingen || '' },
          atletBiru: { nama: athletesList[3]?.nama || '', kontingen: athletesList[3]?.kontingen || '' },
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
          atletMerah: { nama: athletesList[0]?.nama || '', kontingen: athletesList[0]?.kontingen || '' },
          atletBiru: { nama: athletesList[1]?.nama || '', kontingen: athletesList[1]?.kontingen || '' },
          winner: null
        },
        {
          id: 2,
          round: 'quarter',
          partai: 'Penyisihan 2',
          atletMerah: { nama: athletesList[2]?.nama || '', kontingen: athletesList[2]?.kontingen || '' },
          atletBiru: { nama: athletesList[3]?.nama || '', kontingen: athletesList[3]?.kontingen || '' },
          winner: null
        },
        {
          id: 3,
          round: 'quarter',
          partai: 'Penyisihan 3',
          atletMerah: { nama: athletesList[4]?.nama || '', kontingen: athletesList[4]?.kontingen || '' },
          atletBiru: { nama: athletesList[5]?.nama || '', kontingen: athletesList[5]?.kontingen || '' },
          winner: null
        },
        {
          id: 4,
          round: 'quarter',
          partai: 'Penyisihan 4',
          atletMerah: { nama: athletesList[6]?.nama || '', kontingen: athletesList[6]?.kontingen || '' },
          atletBiru: { nama: athletesList[7]?.nama || '', kontingen: athletesList[7]?.kontingen || '' },
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
          atletMerah: { nama: athletesList[mIdx]?.nama || '', kontingen: athletesList[mIdx]?.kontingen || '' },
          atletBiru: { nama: athletesList[mIdx + 1]?.nama || '', kontingen: athletesList[mIdx + 1]?.kontingen || '' },
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
  const [editingAthleteId, setEditingAthleteId] = useState<string | null>(null);

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
      // Default initial mock data
      const defaultData: TGRRegistrasiAthlete[] = [
        { id: 'tgr_1', nama: 'Bambang Pamungkas', kontingen: 'DKI Jakarta', kelas: 'Jurus Tunggal IPSI', usia: 'Dewasa', gender: 'Putra' },
        { id: 'tgr_2', nama: 'Siti Aminah', kontingen: 'Jawa Barat', kelas: 'Jurus Tunggal Tangan Kosong', usia: 'Remaja', gender: 'Putri' },
        { id: 'tgr_3', nama: 'Ganda Putra Utama', kontingen: 'Bali', kelas: 'Jurus Ganda Senjata', usia: 'Dewasa', gender: 'Putra' }
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
          ? { ...a, nama: formNama.trim(), kontingen: formKontingen.trim(), kelas: formKelas, usia: formUsia, gender: formGender }
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
        gender: formGender
      };
      saveAthletesLocal([...athletes, newAthlete]);
    }

    // Reset fields
    setFormNama('');
    setFormKontingen('');
  };

  const handleStartEdit = (ath: TGRRegistrasiAthlete) => {
    playBeep('click');
    setEditingAthleteId(ath.id);
    setFormNama(ath.nama);
    setFormKontingen(ath.kontingen);
    setFormKelas(ath.kelas);
    setFormUsia(ath.usia);
    setFormGender(ath.gender);
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
    })).sort((a, b) => a.kelas.localeCompare(b.kelas) || a.gender.localeCompare(b.gender));
  }, [athletes]);

  const currentMatches = React.useMemo(() => {
    if (!selectedBaganId) return [];
    const existing = baganMatchesMap[selectedBaganId];
    
    const currentCategory = derivedCategoriesList.find(c => c.name === selectedBaganId);
    if (!currentCategory) return [];

    const categoryAthletes = athletes.filter(a => 
      a.kelas === currentCategory.kelas && 
      a.usia === currentCategory.usia && 
      a.gender === currentCategory.gender
    );

    if (categoryAthletes.length === 0) return [];

    let size = 2;
    if (categoryAthletes.length <= 2) size = 2;
    else if (categoryAthletes.length <= 4) size = 4;
    else if (categoryAthletes.length <= 8) size = 8;
    else size = 16;

    const expectedMatchCount = size === 2 ? 1 : size === 4 ? 3 : size === 8 ? 7 : 15;

    if (!existing || existing.length !== expectedMatchCount) {
      const generated = generateBaganForAthletes(categoryAthletes);
      setTimeout(() => {
        saveBaganMatchesMap({
          ...baganMatchesMap,
          [selectedBaganId]: generated
        });
      }, 0);
      return generated;
    }
    
    return existing;
  }, [selectedBaganId, athletes, derivedCategoriesList, baganMatchesMap]);

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

  const handleShuffleBagan = () => {
    if (!selectedBaganId) return;
    const currentCategory = derivedCategoriesList.find(c => c.name === selectedBaganId);
    if (!currentCategory) return;

    const categoryAthletes = athletes.filter(a => 
      a.kelas === currentCategory.kelas && 
      a.usia === currentCategory.usia && 
      a.gender === currentCategory.gender
    );
    if (categoryAthletes.length === 0) return;

    playBeep('valid');
    showCustomConfirm(
      'KOCAK POSISI BAGAN',
      `Apakah Anda yakin ingin mengocok urutan bagan untuk kategori ${selectedBaganId}? Semua hasil pemenang babak sebelumnya akan direset.`,
      () => {
        const shuffled = [...categoryAthletes].sort(() => Math.random() - 0.5);
        const generated = generateBaganForAthletes(shuffled);
        saveBaganMatchesMap({
          ...baganMatchesMap,
          [selectedBaganId]: generated
        });
      }
    );
  };

  const getBaganColumns = (matches: TGRBaganMatch[]) => {
    if (matches.length === 1) {
      return [
        { title: 'Babak Final', matches: [matches[0]] }
      ];
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

  // Handle default selected category for Bagan tab
  useEffect(() => {
    if (derivedCategoriesList.length > 0 && !selectedBaganId) {
      setSelectedBaganId(derivedCategoriesList[0].name);
    }
  }, [derivedCategoriesList, selectedBaganId]);

  // Export Athletes as CSV File
  const handleExportAthletesCSV = () => {
    playBeep('valid');
    let csv = '\uFEFF'; // UTF-8 BOM
    csv += 'NO,NAMA ATLIT,KONTINGEN,KATEGORI SENI,KATEGORI USIA,GENDER\n';
    athletes.forEach((a, i) => {
      csv += `${i + 1},"${a.nama}","${a.kontingen}","${a.kelas}","${a.usia}","${a.gender}"\n`;
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
    csv += 'NAMA ATLIT,KONTINGEN,KATEGORI SENI,KATEGORI USIA,GENDER\n';
    csv += 'Iko Uwais,Sinar Silat,Jurus Tunggal Tangan Kosong,Remaja,Putra\n';
    csv += 'Yayan Ruhian,Harimau Singgalang,Jurus Tunggal Senjata,Dewasa,Putra\n';
    csv += 'Cecep Arif Rahman,Panglipur,Jurus Bebas,Dewasa,Putra\n';

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

        const imported: TGRRegistrasiAthlete[] = [];
        // Detect headers
        const headers = rows[0].toLowerCase().split(',');
        const nameIdx = headers.findIndex(h => h.includes('nama'));
        const kontIdx = headers.findIndex(h => h.includes('kontingen'));
        const kelasIdx = headers.findIndex(h => h.includes('kategori') || h.includes('kelas'));
        const usiaIdx = headers.findIndex(h => h.includes('usia') || h.includes('umur'));
        const gendIdx = headers.findIndex(h => h.includes('gender') || h.includes('jenis'));

        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i].split(',').map(c => c.replace(/^["']|["']$/g, '').trim());
          if (cols.length < 2) continue;

          const nama = cols[nameIdx !== -1 ? nameIdx : 0] || 'Atlit Baru';
          const kontingen = cols[kontIdx !== -1 ? kontIdx : 1] || 'Umum';
          const kelas = cols[kelasIdx !== -1 ? kelasIdx : 2] || TGR_CATEGORIES[0];
          const usia = cols[usiaIdx !== -1 ? usiaIdx : 3] || 'Dewasa';
          const gender = (cols[gendIdx !== -1 ? gendIdx : 4] || 'Putra') as 'Putra' | 'Putri';

          imported.push({
            id: `tgr_ath_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`,
            nama,
            kontingen,
            kelas,
            usia,
            gender
          });
        }

        if (imported.length > 0) {
          playBeep('valid');
          saveAthletesLocal([...athletes, ...imported]);
          showCustomAlert('IMPORT BERHASIL', `Berhasil mengimpor ${imported.length} data atlet Seni/TGR!`);
        }
      } catch (err) {
        console.error(err);
        showCustomAlert('IMPORT GAGAL', 'Format file CSV tidak valid.');
      }
    };
    reader.readAsText(file);
  };

  // Generate PDF report
  const handleDownloadPDFReport = async () => {
    playBeep('valid');
    const doc = new jsPDF('p', 'mm', 'a4');

    if (activeTab === 'bagan' && selectedBaganId && currentMatches.length > 0) {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('LAPORAN BAGAN PERTANDINGAN TGR (SENI)', 105, 20, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Event: ${state.namaEvent}`, 105, 26, { align: 'center' });
      doc.text(`Kategori: ${selectedBaganId.toUpperCase()}`, 105, 32, { align: 'center' });
      doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString()}`, 105, 38, { align: 'center' });

      doc.line(15, 42, 195, 42);

      let y = 50;
      const columns = getBaganColumns(currentMatches);
      
      columns.forEach(col => {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }
        
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(12);
        doc.setFillColor(30, 41, 59);
        doc.rect(15, y, 180, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(col.title.toUpperCase(), 18, y + 6);
        doc.setTextColor(0, 0, 0);
        y += 12;

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10);
        
        col.matches.forEach(m => {
          if (y > 250) {
            doc.addPage();
            y = 20;
          }
          
          doc.setFont('Helvetica', 'bold');
          doc.text(`${m.partai}`, 18, y);
          doc.setFont('Helvetica', 'normal');
          
          const mNama = m.atletMerah.nama ? `${m.atletMerah.nama} (${m.atletMerah.kontingen})` : '—';
          const bNama = m.atletBiru.nama ? `${m.atletBiru.nama} (${m.atletBiru.kontingen})` : '—';
          
          doc.text(`SUDUT MERAH : ${mNama} ${m.winner === 'merah' ? '[PEMENANG]' : ''}`, 25, y + 5);
          doc.text(`SUDUT BIRU  : ${bNama} ${m.winner === 'biru' ? '[PEMENANG]' : ''}`, 25, y + 10);
          
          y += 18;
        });
        
        y += 4;
      });

      const finalMatch = currentMatches.find(m => m.round === 'final');
      const champion = finalMatch && finalMatch.winner 
        ? (finalMatch.winner === 'merah' ? finalMatch.atletMerah : finalMatch.atletBiru)
        : null;

      if (champion) {
        if (y > 240) {
          doc.addPage();
          y = 20;
        }
        doc.line(15, y, 195, y);
        y += 8;
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('JUARA / CHAMPION', 105, y, { align: 'center' });
        y += 8;
        doc.setFontSize(12);
        doc.text(champion.nama.toUpperCase(), 105, y, { align: 'center' });
        y += 5;
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(champion.kontingen.toUpperCase(), 105, y, { align: 'center' });
      }

      doc.save(`Bagan_TGR_${selectedBaganId.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
      return;
    }

    playBeep('valid');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('LAPORAN REGISTRASI & KONTROL DATA TGR (SENI)', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Event: ${state.namaEvent}`, 105, 26, { align: 'center' });
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 32, { align: 'center' });

    doc.line(15, 36, 195, 36);

    let y = 44;
    doc.setFontSize(11);
    doc.text('DAFTAR ATLIT TERDAFTAR', 15, y);
    y += 6;

    // Headers
    doc.setFontSize(9);
    doc.setFillColor(240, 240, 240);
    doc.rect(15, y, 180, 7, 'F');
    doc.text('NO', 18, y + 5);
    doc.text('NAMA ATLIT', 30, y + 5);
    doc.text('KONTINGEN', 85, y + 5);
    doc.text('KATEGORI SENI', 135, y + 5);
    doc.text('GENDER', 178, y + 5);
    y += 7;

    doc.setFont('Helvetica', 'normal');
    athletes.forEach((ath, i) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text((i + 1).toString(), 18, y + 5);
      doc.text(ath.nama, 30, y + 5);
      doc.text(ath.kontingen, 85, y + 5);
      doc.text(ath.kelas, 135, y + 5);
      doc.text(ath.gender, 178, y + 5);
      doc.line(15, y + 7, 195, y + 7);
      y += 7;
    });

    doc.save(`Laporan_Registrasi_TGR_${Date.now()}.pdf`);
  };

  // Bagan tab athlete matching
  const currentBaganCategory = derivedCategoriesList.find(c => c.name === selectedBaganId);
  const matchedAthletes = athletes.filter(a => 
    currentBaganCategory && 
    a.kelas === currentBaganCategory.kelas && 
    a.usia === currentBaganCategory.usia && 
    a.gender === currentBaganCategory.gender
  );

  // Scheduled matches list computed based on checked boxes in Kontrol Partai
  const scheduledMatches = React.useMemo(() => {
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

  const mapKelasToKategori = (kelas: string): "Tunggal" | "Ganda" | "Regu" => {
    const k = kelas.toLowerCase();
    if (k.includes("ganda")) return "Ganda";
    if (k.includes("regu")) return "Regu";
    return "Tunggal";
  };

  const handleSyncToArena = async () => {
    const targetList = scheduledMatches.length > 0 ? scheduledMatches : athletes;
    if (targetList.length === 0) {
      showCustomAlert("SINKRONISASI ARENA", "Belum ada data atlet untuk dikirim ke arena!");
      return;
    }
    
    showCustomConfirm(
      "SINKRONISASI ROSTER ARENA",
      `Apakah Anda yakin ingin mengirim ${targetList.length} atlet ke arena utama dan memperbarui seluruh tampilan layar monitor juri dan dewan?`,
      async () => {
        playBeep('valid');
        const payloadList = targetList.map((m, index) => ({
          id: m.id,
          noUrut: index + 1,
          nama: m.nama,
          kontingen: m.kontingen,
          kategori: m.kelas // Directly use registered jurus/category name!
        }));

        try {
          await dispatch('TGR_UPDATE_PESERTA', {
            action: 'sync_list',
            pesertaList: payloadList
          });

          await dispatch('TGR_ADD_AUDIT_LOG', {
            user: 'Sekretaris',
            action: `Sinkronisasi roster arena: Mengimpor ${payloadList.length} atlet dari database registrasi`
          });

          showCustomAlert("SINKRONISASI BERHASIL", `Berhasil mengirimkan ${payloadList.length} atlet ke arena utama! Sekarang seluruh panel juri, dewan, dan monitor telah diperbarui.`);
        } catch (err: any) {
          console.error(err);
          showCustomAlert("GAGAL SINKRONISASI", `Gagal sinkronisasi data: ${err.message}`);
        }
      }
    );
  };

  return (
    <div className={`min-h-screen w-full flex flex-col font-sans transition-colors duration-300 ${
      theme === 'dark' ? 'bg-[#020207] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* HEADER BAR */}
      <header className={`px-6 py-4 border-b flex justify-between items-center ${
        theme === 'dark' ? 'bg-slate-950/90 border-slate-900' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className={`p-2 rounded-lg cursor-pointer transition-all border ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800 text-amber-500 hover:text-amber-400' : 'bg-slate-100 border-slate-200 text-amber-600 hover:text-amber-700'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-xs font-mono font-bold uppercase text-amber-500 tracking-wider">PORTAL REGISTRASI DATA</span>
            <h2 className="text-xl font-black uppercase tracking-tight leading-none mt-0.5">TGR SEKRETARIS SENI</h2>
          </div>
        </div>

        {/* TAB NAVIGATION SELECTION */}
        <div className={`flex p-1 rounded-xl border ${
          theme === 'dark' ? 'bg-slate-900 border-slate-850' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            onClick={() => { playBeep('click'); setActiveTab('input'); }}
            className={`px-4 py-2 text-xs font-black uppercase rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'input' 
                ? 'bg-amber-600 text-white shadow shadow-amber-900/40' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Users className="w-4 h-4" />
            Input Data Atlit
          </button>
          <button
            onClick={() => { playBeep('click'); setActiveTab('bagan'); }}
            className={`px-4 py-2 text-xs font-black uppercase rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'bagan' 
                ? 'bg-amber-600 text-white shadow shadow-amber-900/40' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Trophy className="w-4 h-4" />
            Bagan Pertandingan
          </button>
          <button
            onClick={() => { playBeep('click'); setActiveTab('kontrol'); }}
            className={`px-4 py-2 text-xs font-black uppercase rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'kontrol' 
                ? 'bg-amber-600 text-white shadow shadow-amber-900/40' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            Kontrol Partai
          </button>
        </div>
      </header>

      {/* WORKSPACE AREA */}
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
              {/* Form Input Left Column */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                <div className={`p-5 rounded-2xl border ${
                  theme === 'dark' ? 'bg-[#080c16] border-slate-900' : 'bg-white border-slate-200'
                }`}>
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-500" />
                    REGISTRASI ATLET BARU
                  </h3>

                  <form onSubmit={handleSaveAthlete} className="flex flex-col gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 font-mono mb-1">Nama Lengkap Atlit</label>
                      <input 
                        type="text" 
                        value={formNama}
                        onChange={e => setFormNama(e.target.value)}
                        className={`w-full text-xs font-bold px-3 py-2 rounded-lg outline-none border focus:border-amber-500 ${
                          theme === 'dark' ? 'bg-slate-950 border-slate-850 text-white' : 'bg-slate-50 border-slate-250 text-slate-900'
                        }`}
                        placeholder="Nama Lengkap"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 font-mono mb-1">Kontingen / Asal Daerah</label>
                      <input 
                        type="text" 
                        value={formKontingen}
                        onChange={e => setFormKontingen(e.target.value)}
                        className={`w-full text-xs font-bold px-3 py-2 rounded-lg outline-none border focus:border-amber-500 ${
                          theme === 'dark' ? 'bg-slate-950 border-slate-850 text-white' : 'bg-slate-50 border-slate-250 text-slate-900'
                        }`}
                        placeholder="Asal Kontingen/Daerah"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 font-mono mb-1">Kategori Seni</label>
                        <select 
                          value={formKelas}
                          onChange={e => setFormKelas(e.target.value)}
                          className={`w-full text-xs font-bold px-3 py-2 rounded-lg outline-none border focus:border-amber-500 ${
                            theme === 'dark' ? 'bg-slate-950 border-slate-850 text-white' : 'bg-slate-50 border-slate-250 text-slate-900'
                          }`}
                        >
                          {TGR_CATEGORIES.map(k => (
                            <option key={k} value={k}>{k}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 font-mono mb-1">Gender</label>
                        <select 
                          value={formGender}
                          onChange={e => setFormGender(e.target.value as any)}
                          className={`w-full text-xs font-bold px-3 py-2 rounded-lg outline-none border focus:border-amber-500 ${
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
                        className={`w-full text-xs font-bold px-3 py-2 rounded-lg outline-none border focus:border-amber-500 ${
                          theme === 'dark' ? 'bg-slate-950 border-slate-850 text-white' : 'bg-slate-50 border-slate-250 text-slate-900'
                        }`}
                      >
                        {AGE_CATEGORIES.map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="mt-2 w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                    >
                      <Save className="w-4 h-4" />
                      {editingAthleteId ? 'Simpan Perubahan' : 'Simpan Atlet'}
                    </button>
                  </form>
                </div>

                {/* Import / Export toolbox */}
                <div className={`p-5 rounded-2xl border flex flex-col gap-3 ${
                  theme === 'dark' ? 'bg-[#080c16] border-slate-900' : 'bg-white border-slate-200'
                }`}>
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono mb-1">INTEGRASI DATA EXCEL / PDF</h3>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleDownloadTemplate}
                      className={`py-2 px-3 border rounded-lg text-xs font-extrabold uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-250 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      Template Excel
                    </button>

                    <label className={`py-2 px-3 border rounded-lg text-xs font-extrabold uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer text-center ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800' : 'bg-white border-slate-250 text-amber-600 hover:bg-amber-50/50'
                    }`}>
                      <Upload className="w-3.5 h-3.5" />
                      Impor Excel
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
                    className="w-full py-2 bg-amber-900/20 hover:bg-amber-900/40 border border-amber-500/30 text-amber-400 hover:text-amber-300 font-extrabold text-xs uppercase rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export Excel
                  </button>

                  <button
                    onClick={handleDownloadPDFReport}
                    className="w-full py-2 bg-purple-900/20 hover:bg-purple-900/40 border border-purple-500/30 text-purple-400 hover:text-purple-300 font-extrabold text-xs uppercase rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Unduh Laporan PDF
                  </button>
                </div>
              </div>

              {/* Grid Filtered Athletes (Right 8 columns) */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                <div className={`p-5 rounded-2xl border flex-1 flex flex-col ${
                  theme === 'dark' ? 'bg-[#080c16] border-slate-900' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex justify-between items-center mb-4 border-b border-slate-850 pb-2">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono">GRID DAFTAR ATLIT ({athletes.length} REGISTERED)</h3>
                    {athletes.length > 0 && (
                      <button
                        onClick={() => {
                          showCustomConfirm(
                            "HAPUS SEMUA ATLET SENI",
                            "Apakah Anda yakin menghapus semua data atlet Seni? Semua data terdaftar dan penjadwalan akan dikosongkan.",
                            () => {
                              saveAthletesLocal([]);
                              saveScheduleLocal([]);
                            }
                          );
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
                      <p className="text-xs text-slate-500 max-w-sm">Belum ada atlet yang terdaftar. Gunakan formulir di sebelah kiri atau impor data lewat template.</p>
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
                              <span className="text-xs font-black uppercase tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
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
              {/* Category selector panel on Left */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                <div className={`p-5 rounded-2xl border ${
                  theme === 'dark' ? 'bg-[#080c16] border-slate-900' : 'bg-white border-slate-200'
                }`}>
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono mb-3">
                    KATEGORI PERTANDINGAN
                  </h3>

                  {derivedCategoriesList.length === 0 ? (
                    <p className="text-xs text-slate-500">Belum ada kategori yang terdaftar.</p>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto">
                      {derivedCategoriesList.map(cat => (
                        <button
                          key={cat.name}
                          onClick={() => { playBeep('click'); setSelectedBaganId(cat.name); }}
                          className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                            selectedBaganId === cat.name
                              ? 'bg-amber-600/10 border-amber-500 text-amber-400 font-extrabold'
                              : theme === 'dark'
                                ? 'bg-slate-900/60 border-slate-850 hover:bg-slate-900 text-slate-300'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <div className="text-xs uppercase">{cat.kelas}</div>
                          <div className="text-[10px] text-slate-550 font-semibold mt-1">
                            {cat.usia} &bull; {cat.gender} &bull; {cat.athletesCount} Atlit
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Tournament bracket presentation on Right */}
              <div className="lg:col-span-8 flex flex-col">
                <div className={`p-6 rounded-2xl border flex-1 min-h-[550px] flex flex-col justify-between ${
                  theme === 'dark' ? 'bg-[#080c16] border-slate-900' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-900/40">
                    <div>
                      <h3 className="text-[10px] font-mono font-bold text-slate-500 uppercase">DASHBOARD BAGAN SENI</h3>
                      <h2 className="text-sm font-black uppercase tracking-tight text-amber-500 mt-0.5">
                        {currentBaganCategory ? currentBaganCategory.name : '—'}
                      </h2>
                    </div>
                    {currentBaganCategory && matchedAthletes.length > 0 && (
                      <button
                        onClick={handleShuffleBagan}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-black text-[10px] uppercase rounded-lg transition-all duration-200 active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-950/20"
                        title="Kocok ulang urutan bagan secara acak"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Acak Posisi Bagan
                      </button>
                    )}
                  </div>

                  {(() => {
                    const finalMatch = currentMatches.find(m => m.round === 'final');
                    const champion = finalMatch && finalMatch.winner 
                      ? (finalMatch.winner === 'merah' ? finalMatch.atletMerah : finalMatch.atletBiru)
                      : null;

                    return matchedAthletes.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center py-20 text-center gap-3">
                        <Trophy className="w-12 h-12 text-slate-650" />
                        <p className="text-xs text-slate-500 max-w-sm">Daftarkan beberapa atlet untuk melihat diagram bagan kualifikasi kelas ini.</p>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col justify-between py-6 gap-6 w-full min-h-0 select-none">
                        <div className="text-[10px] text-amber-500/85 font-bold mb-2 bg-amber-500/5 border border-amber-500/20 px-3 py-1.5 rounded-lg text-center max-w-md mx-auto">
                          💡 Klik pada kotak nama atlet untuk menentukan pemenang dan meloloskannya ke babak berikutnya.
                        </div>

                        {/* Responsive Round Columns Side-by-Side */}
                        <div className="flex gap-4 items-stretch justify-center w-full min-h-[380px] overflow-x-auto pb-4">
                          {getBaganColumns(currentMatches).map((col) => (
                            <div key={col.title} className="flex flex-col flex-1 min-w-[180px] max-w-[240px] justify-between">
                              <div className="text-[10px] font-mono tracking-widest text-slate-500 font-extrabold uppercase text-center border-b border-slate-800/40 pb-2 mb-4">
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
                                      className={`border rounded-xl p-2.5 transition-all duration-300 relative flex flex-col gap-2 ${
                                        theme === 'dark' 
                                          ? 'bg-slate-950/40 border-slate-900 hover:border-slate-800' 
                                          : 'bg-white border-slate-200 hover:shadow-sm'
                                      }`}
                                    >
                                      {/* Match label (Partai) */}
                                      <span className="text-[8px] font-mono text-slate-550 font-bold uppercase tracking-wider block">
                                        {m.partai}
                                      </span>

                                      {/* Sudut Merah Node */}
                                      <div 
                                        onClick={() => hasMerah && handleSelectBaganWinner(m.id, 'merah')}
                                        className={`p-2 rounded-lg border text-left transition-all duration-200 relative ${
                                          hasMerah ? 'cursor-pointer active:scale-98' : ''
                                        } ${
                                          isMerahWinner 
                                            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 font-extrabold' 
                                            : isBiruWinner
                                              ? 'opacity-40 border-transparent text-slate-600'
                                              : theme === 'dark'
                                                ? 'bg-red-950/10 border-red-950/40 text-slate-300 hover:bg-red-950/15'
                                                : 'bg-red-50/50 border-red-100 text-slate-700 hover:bg-red-50'
                                        }`}
                                      >
                                        <span className="absolute -top-2 left-2 text-[6px] font-mono font-bold bg-red-600 text-white rounded px-1 scale-90">
                                          MERAH
                                        </span>
                                        <div className="text-[11px] font-bold truncate">
                                          {m.atletMerah.nama || '— Waiting —'}
                                        </div>
                                        <div className="text-[9px] text-slate-500 truncate mt-0.5">
                                          {m.atletMerah.kontingen || ''}
                                        </div>
                                        {isMerahWinner && (
                                          <span className="absolute right-2 top-2.5 text-[8px] font-black uppercase text-emerald-500">🏆 Win</span>
                                        )}
                                      </div>

                                      {/* VS Divider */}
                                      <div className="text-center text-[8px] font-mono font-bold text-slate-655 leading-none">VS</div>

                                      {/* Sudut Biru Node */}
                                      <div 
                                        onClick={() => hasBiru && handleSelectBaganWinner(m.id, 'biru')}
                                        className={`p-2 rounded-lg border text-left transition-all duration-200 relative ${
                                          hasBiru ? 'cursor-pointer active:scale-98' : ''
                                        } ${
                                          isBiruWinner 
                                            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 font-extrabold' 
                                            : isMerahWinner
                                              ? 'opacity-40 border-transparent text-slate-600'
                                              : theme === 'dark'
                                                ? 'bg-blue-950/10 border-blue-950/40 text-slate-300 hover:bg-blue-950/15'
                                                : 'bg-blue-50/50 border-blue-100 text-slate-700 hover:bg-blue-50'
                                        }`}
                                      >
                                        <span className="absolute -top-2 left-2 text-[6px] font-mono font-bold bg-blue-600 text-white rounded px-1 scale-90">
                                          BIRU
                                        </span>
                                        <div className="text-[11px] font-bold truncate">
                                          {m.atletBiru.nama || '— Waiting —'}
                                        </div>
                                        <div className="text-[9px] text-slate-500 truncate mt-0.5">
                                          {m.atletBiru.kontingen || ''}
                                        </div>
                                        {isBiruWinner && (
                                          <span className="absolute right-2 top-2.5 text-[8px] font-black uppercase text-emerald-500">🏆 Win</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Champion Golden Box */}
                        {champion && (
                          <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="border-2 border-amber-500/40 p-4 rounded-xl bg-amber-500/5 text-center max-w-sm w-full mx-auto mt-4 flex flex-col items-center gap-1.5 shadow-lg shadow-amber-950/10"
                          >
                            <Trophy className="w-8 h-8 text-amber-400 animate-bounce" />
                            <span className="text-[8px] font-mono font-black uppercase tracking-widest text-amber-500">CONGRATULATIONS CHAMPION</span>
                            <div className="font-extrabold text-sm uppercase text-slate-100">{champion.nama}</div>
                            <div className="text-xs text-slate-400 font-mono font-semibold uppercase">{champion.kontingen}</div>
                          </motion.div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="flex justify-end gap-2 border-t border-slate-900 pt-4 mt-4">
                    <button
                      onClick={handleDownloadPDFReport}
                      className="py-2 px-4 rounded bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs uppercase cursor-pointer"
                    >
                      Cetak PDF Bagan
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB C: KONTROL PARTAI */}
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
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono">
                      PENJADWALAN PARTAI PERTANDINGAN TGR
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Centang kotak pada atlit untuk menyusun jadwal urutan tampil secara otomatis.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-amber-600/25 border border-amber-500/40 text-amber-400 font-extrabold text-xs rounded-full">
                      {scheduledMatches.length} Terjadwal
                    </span>
                    <button
                      onClick={handleSyncToArena}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-95 cursor-pointer shadow-md shadow-emerald-950/40 flex items-center gap-1.5"
                    >
                      🚀 Terapkan ke Arena
                    </button>
                  </div>
                </div>

                {athletes.length === 0 ? (
                  <div className="py-16 text-center text-slate-500 text-xs">
                    Belum ada atlet terdaftar untuk dijadwalkan.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono">
                          <th className="py-3 px-4 w-[8%]">SCHED</th>
                          <th className="py-3 px-4 w-[8%]">URUTAN</th>
                          <th className="py-3 px-4 w-[25%]">NAMA ATLIT</th>
                          <th className="py-3 px-4 w-[20%]">KONTINGEN</th>
                          <th className="py-3 px-4 w-[25%]">KATEGORI SENI</th>
                          <th className="py-3 px-4 w-[14%]">GENDER</th>
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
                                  ? theme === 'dark' ? 'bg-amber-950/10' : 'bg-amber-50/20' 
                                  : 'hover:bg-slate-950/20'
                              }`}
                            >
                              <td className="py-2 px-4">
                                <button
                                  onClick={() => handleToggleSchedule(ath.id)}
                                  className={`p-1 rounded cursor-pointer ${isChecked ? 'text-amber-500' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                  {isChecked ? <CheckSquare className="w-5 h-5 fill-current text-amber-500 text-white" /> : <Square className="w-5 h-5" />}
                                </button>
                              </td>
                              <td className="py-2 px-4 font-mono font-extrabold text-amber-500">
                                {isChecked ? `Partai ${idx + 1}` : '—'}
                              </td>
                              <td className="py-2 px-4 font-extrabold uppercase">{ath.nama}</td>
                              <td className="py-2 px-4 text-slate-400 font-semibold">{ath.kontingen}</td>
                              <td className="py-2 px-4 font-medium">{ath.kelas}</td>
                              <td className="py-2 px-4 font-bold">{ath.gender}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Scheduled Output Display Block */}
              {scheduledMatches.length > 0 && (
                <div className={`p-6 rounded-2xl border ${
                  theme === 'dark' ? 'bg-[#080c16] border-slate-900' : 'bg-white border-slate-200'
                }`}>
                  <h3 className="text-xs font-mono font-bold text-slate-500 uppercase mb-4">DAFTAR JADWAL PARTAI YANG DISUSUN</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {scheduledMatches.map((match, index) => (
                      <div 
                        key={match.id}
                        className="p-4 rounded-xl border border-slate-800 bg-slate-950/30 flex flex-col gap-2 relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 bg-amber-600 text-white font-mono px-3 py-1 rounded-bl-lg font-black text-xs">
                          Partai {index + 1}
                        </div>

                        <div>
                          <span className="text-[10px] font-mono uppercase text-slate-500">Kategori Tampil</span>
                          <h4 className="font-extrabold text-sm uppercase text-slate-300 mt-0.5">{match.nama}</h4>
                          <span className="text-xs text-amber-500 font-bold">{match.kontingen}</span>
                        </div>

                        <div className="border-t border-slate-900 pt-2 mt-1 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase">
                          <span>{match.kelas}</span>
                          <span>{match.gender}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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

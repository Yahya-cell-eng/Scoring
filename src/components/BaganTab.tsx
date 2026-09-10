/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, Plus, Trash2, Award, Play, RotateCcw, Edit, X, Save, Users, HelpCircle, Sparkles
} from 'lucide-react';
import { MatchState, BaganMatch, BaganCategory } from '../types';
import { playBeep } from '../utils/sound';
import AturUrutanPartaiModal from './AturUrutanPartaiModal';
import { 
  getNextMatchTarget, 
  getPreviousSourceMatches, 
  propagateBracketWithAutoAdvance, 
  isByeAthlete 
} from '../utils/bracketProgression';

interface BaganTabProps {
  theme: 'dark' | 'light';
  state: MatchState;
  dispatch: (type: string, payload?: any) => Promise<any>;
  setActiveTab: (tab: 'config' | 'control' | 'all') => void;
}

const defaultBaganData: BaganCategory[] = [
  {
    id: "cat_1",
    name: "Kelas A Putra (45 - 50 kg)",
    gender: "Putra",
    size: 4,
    matches: [
      {
        id: 1,
        round: "semi",
        partai: "Partai 01",
        atletMerah: { nama: "Fajar Ramadhan", kontingen: "Banten" },
        atletBiru: { nama: "Galang Perkasa", kontingen: "Sumatra Barat" },
        winner: null
      },
      {
        id: 2,
        round: "semi",
        partai: "Partai 02",
        atletMerah: { nama: "Andi Wijaya", kontingen: "DKI Jakarta" },
        atletBiru: { nama: "Rian Hidayat", kontingen: "Jawa Barat" },
        winner: null
      },
      {
        id: 3,
        round: "final",
        partai: "Partai 05",
        atletMerah: { nama: "", kontingen: "" },
        atletBiru: { nama: "", kontingen: "" },
        winner: null
      }
    ]
  },
  {
    id: "cat_2",
    name: "Kelas B Putra (50 - 55 kg)",
    gender: "Putra",
    size: 8,
    matches: [
      {
        id: 1,
        round: "quarter",
        partai: "Partai 03",
        atletMerah: { nama: "Budi Santoso", kontingen: "Jawa Timur" },
        atletBiru: { nama: "Made Wirawan", kontingen: "Bali" },
        winner: null
      },
      {
        id: 2,
        round: "quarter",
        partai: "Partai 04",
        atletMerah: { nama: "Hendra Wijaya", kontingen: "Jawa Tengah" },
        atletBiru: { nama: "Zulfikar", kontingen: "DI Yogyakarta" },
        winner: null
      },
      {
        id: 3,
        round: "quarter",
        partai: "Partai 06",
        atletMerah: { nama: "Ahmad Fauzi", kontingen: "Sumatra Utara" },
        atletBiru: { nama: "Eko Prasetyo", kontingen: "Lampung" },
        winner: null
      },
      {
        id: 4,
        round: "quarter",
        partai: "Partai 07",
        atletMerah: { nama: "Rizal Gibran", kontingen: "Kaltim" },
        atletBiru: { nama: "Dimas Anggara", kontingen: "Sulsel" },
        winner: null
      },
      {
        id: 5,
        round: "semi",
        partai: "Partai 08",
        atletMerah: { nama: "", kontingen: "" },
        atletBiru: { nama: "", kontingen: "" },
        winner: null
      },
      {
        id: 6,
        round: "semi",
        partai: "Partai 09",
        atletMerah: { nama: "", kontingen: "" },
        atletBiru: { nama: "", kontingen: "" },
        winner: null
      },
      {
        id: 7,
        round: "final",
        partai: "Partai 10",
        atletMerah: { nama: "", kontingen: "" },
        atletBiru: { nama: "", kontingen: "" },
        winner: null
      }
    ]
  }
];

export default function BaganTab({ theme, state, dispatch, setActiveTab }: BaganTabProps) {
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
    return defaultBaganData;
  });

  // Sync state from server real-time updates
  useEffect(() => {
    if (state.baganCategories && state.baganCategories.length > 0) {
      setCategories(state.baganCategories);
    }
  }, [state.baganCategories]);

  // Centralized helper to update categories locally and broadcast to other devices
  const updateCategories = (newCategories: BaganCategory[]) => {
    setCategories(newCategories);
    localStorage.setItem('silat_bagan_data', JSON.stringify(newCategories));
    dispatch('UPDATE_BAGAN_CATEGORIES', { categories: newCategories });
  };

  const generateMatchesForSize = (size: number): BaganMatch[] => {
    const matches: BaganMatch[] = [];
    if (size === 2) {
      matches.push(
        { id: 1, round: 'final', partai: 'Partai 1', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null }
      );
    } else if (size === 4) {
      matches.push(
        { id: 1, round: 'semi', partai: 'Partai 1', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null },
        { id: 2, round: 'semi', partai: 'Partai 2', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null },
        { id: 3, round: 'final', partai: 'Partai 3', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null }
      );
    } else if (size === 8) {
      matches.push(
        { id: 1, round: 'quarter', partai: 'Partai 1', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null },
        { id: 2, round: 'quarter', partai: 'Partai 2', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null },
        { id: 3, round: 'quarter', partai: 'Partai 3', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null },
        { id: 4, round: 'quarter', partai: 'Partai 4', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null },
        { id: 5, round: 'semi', partai: 'Partai 5', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null },
        { id: 6, round: 'semi', partai: 'Partai 6', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null },
        { id: 7, round: 'final', partai: 'Partai 7', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null }
      );
    } else if (size === 16) {
      // 15 matches total
      // Round 1 (Octo Final) - Matches 1 to 8
      for (let i = 1; i <= 8; i++) {
        matches.push({ id: i, round: 'quarter', partai: `Partai ${i}`, atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null });
      }
      // Round 2 (Quarter Final) - Matches 9 to 12
      for (let i = 9; i <= 12; i++) {
        matches.push({ id: i, round: 'quarter', partai: `Partai ${i}`, atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null });
      }
      // Round 3 (Semi Final) - Matches 13 to 14
      for (let i = 13; i <= 14; i++) {
        matches.push({ id: i, round: 'semi', partai: `Partai ${i}`, atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null });
      }
      // Round 4 (Final) - Match 15
      matches.push({ id: 15, round: 'final', partai: 'Partai 15', atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null });
    }
    return matches;
  };

  const propagateBracket = (initialMatches: BaganMatch[], size: number): BaganMatch[] => {
    const updated = initialMatches.map(m => ({
      ...m,
      atletMerah: { ...m.atletMerah },
      atletBiru: { ...m.atletBiru },
      winner: m.winner
    }));

    // Clear all downstream matches first to prevent stale participants
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

    // Propagate winners step-by-step
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

  const handleChangeActiveCategorySize = (catId: string, newSize: 2 | 4 | 8 | 16) => {
    playBeep('click');
    if (confirm(`Mengubah ukuran bagan menjadi ${newSize} peserta akan mengatur ulang semua pertandingan di bagan ini. Lanjutkan?`)) {
      const newCats = categories.map(cat => {
        if (cat.id !== catId) return cat;
        return {
          ...cat,
          size: newSize,
          matches: generateMatchesForSize(newSize)
        };
      });
      updateCategories(newCats);
    }
  };

  const [selectedCatId, setSelectedCatId] = useState<string>(categories[0]?.id || "");
  const [newCatName, setNewCatName] = useState("");
  const [newCatGender, setNewCatGender] = useState<'Putra' | 'Putri'>('Putra');
  const [newCatSize, setNewCatSize] = useState<2 | 4 | 8 | 16>(4);
  const [newCatKelas, setNewCatKelas] = useState("Kelas A");
  const [newCatUsia, setNewCatUsia] = useState("Remaja");

  const [showLottingModal, setShowLottingModal] = useState(false);
  const [showAturUrutanModal, setShowAturUrutanModal] = useState(false);
  const [lottingInput, setLottingInput] = useState("");
  const [lottingMode, setLottingMode] = useState<'single' | 'split' | 'manual'>('single');
  const [lottingMaxPerBagan, setLottingMaxPerBagan] = useState<4 | 8 | 16>(4);
  const [manualPoolsCount, setManualPoolsCount] = useState<number>(2);
  const [manualPoolsInputs, setManualPoolsInputs] = useState<string[]>(["", "", "", "", "", "", "", ""]);

  const handleDistributeEvenly = () => {
    playBeep('click');
    const rawLines = lottingInput.split("\n").map(l => l.trim()).filter(Boolean);
    if (rawLines.length === 0) {
      alert("Masukkan daftar nama peserta di kotak utama terlebih dahulu sebelum membagi.");
      return;
    }
    
    // Distribute lines into manualPoolsCount groups
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

  const [showManageAthletesModal, setShowManageAthletesModal] = useState(false);
  const [manageAthletesList, setManageAthletesList] = useState<{ id: number; merahNama: string; merahKont: string; biruNama: string; biruKont: string; partai: string }[]>([]);

  const handleOpenManageAthletesModal = () => {
    if (!activeCategory) return;
    const numInitialMatches = activeCategory.size / 2;
    const list = [];
    for (let i = 0; i < numInitialMatches; i++) {
      const m = activeCategory.matches[i];
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
    if (!activeCategory) return;
    playBeep('valid');

    const newCats = categories.map(cat => {
      if (cat.id !== activeCategory.id) return cat;

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

    updateCategories(newCats);
    setShowManageAthletesModal(false);
  };

  // Auto-generate suggest bracket name
  useEffect(() => {
    setNewCatName(`${newCatKelas} ${newCatUsia} ${newCatGender}`);
  }, [newCatKelas, newCatUsia, newCatGender]);

  const [editingMatch, setEditingMatch] = useState<{ catId: string; matchId: number } | null>(null);
  const [editPartai, setEditPartai] = useState("");
  const [editMerahNama, setEditMerahNama] = useState("");
  const [editMerahKont, setEditMerahKont] = useState("");
  const [editBiruNama, setEditBiruNama] = useState("");
  const [editBiruKont, setEditBiruKont] = useState("");

  const [isLoadingMatch, setIsLoadingMatch] = useState<number | null>(null);

  const activeCategory = categories.find(c => c.id === selectedCatId);

  // Helper to trigger cascading winner update
  const handleMatchWinner = (catId: string, matchId: number, winner: 'merah' | 'biru' | null) => {
    playBeep('click');
    const newCats = categories.map(cat => {
      if (cat.id !== catId) return cat;

      // Deep copy matches
      const updatedMatches = cat.matches.map(m => ({
        ...m,
        atletMerah: { ...m.atletMerah },
        atletBiru: { ...m.atletBiru },
        winner: m.id === matchId ? winner : m.winner
      }));

      // Automatically flow winners through all bracket stages
      const propagated = propagateBracketWithAutoAdvance(updatedMatches, cat.size);

      return {
        ...cat,
        matches: propagated
      };
    });
    updateCategories(newCats);
  };

  // Open inline edit dialog
  const startEditMatch = (catId: string, match: BaganMatch) => {
    playBeep('click');
    setEditingMatch({ catId, matchId: match.id });
    setEditPartai(match.partai);
    setEditMerahNama(match.atletMerah.nama);
    setEditMerahKont(match.atletMerah.kontingen);
    setEditBiruNama(match.atletBiru.nama);
    setEditBiruKont(match.atletBiru.kontingen);
  };

  // Save edited match
  const saveEditMatch = () => {
    if (!editingMatch) return;
    playBeep('valid');

    const newCats = categories.map(cat => {
      if (cat.id !== editingMatch.catId) return cat;

      const updatedMatches = cat.matches.map(m => {
        if (m.id !== editingMatch.matchId) return m;
        return {
          ...m,
          partai: editPartai,
          atletMerah: { nama: editMerahNama, kontingen: editMerahKont },
          atletBiru: { nama: editBiruNama, kontingen: editBiruKont }
        };
      });

      return {
        ...cat,
        matches: updatedMatches
      };
    });

    updateCategories(newCats);

    // Trigger potential cascades
    const updatedCat = newCats.find(c => c.id === editingMatch.catId);
    if (updatedCat) {
      const matchObj = updatedCat.matches.find(m => m.id === editingMatch.matchId);
      if (matchObj && matchObj.winner) {
        // Re-apply winner to propagate changes if names were modified
        handleMatchWinner(editingMatch.catId, editingMatch.matchId, matchObj.winner);
      }
    }

    setEditingMatch(null);
  };

  // Add Category
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    playBeep('valid');
    const newId = `cat_${Date.now()}`;
    const matches = generateMatchesForSize(newCatSize);

    const newCategory: BaganCategory = {
      id: newId,
      name: newCatName.trim(),
      gender: newCatGender,
      size: newCatSize,
      kelas: newCatKelas,
      usia: newCatUsia,
      matches
    };

    updateCategories([...categories, newCategory]);
    setSelectedCatId(newId);
    setNewCatName("");
  };

  // Delete Category
  const handleDeleteCategory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Apakah Anda yakin menghapus bagan kelas ini?")) {
      playBeep('warning');
      const filtered = categories.filter(c => c.id !== id);
      updateCategories(filtered);
      if (selectedCatId === id) {
        setSelectedCatId(filtered[0]?.id || "");
      }
    }
  };

  // Reset to default sample
  const handleResetDefault = () => {
    if (confirm("Reset seluruh bagan ke contoh bawaan pabrik?")) {
      playBeep('warning');
      updateCategories(defaultBaganData);
      setSelectedCatId(defaultBaganData[0].id);
    }
  };

  // Delete all bracket categories
  const handleDeleteAllCategories = () => {
    if (confirm("Apakah Anda yakin ingin menghapus SEMUA bagan kelas tanding yang terdaftar? Tindakan ini tidak dapat dibatalkan.")) {
      playBeep('warning');
      updateCategories([]);
      setSelectedCatId("");
    }
  };

  // Load a match to scoring!
  const loadMatchToScoring = async (match: BaganMatch, category: BaganCategory) => {
    playBeep('valid');
    setIsLoadingMatch(match.id);

    try {
      // Clean up the category name for 'kelas' by stripping parenthetical kg specs
      const cleanKelas = category.name.replace(/\s*\(.*\)/, '');
      
      // Dispatch single consolidated action to reset and update the active match
      await dispatch('LOAD_BAGAN_MATCH', {
        namaEvent: state.namaEvent || "Kejuaraan Pencak Silat",
        partai: match.partai.replace(/Partai\s+/i, ''),
        kelas: cleanKelas,
        gender: category.gender,
        selectedWaktu: state.selectedWaktu || 120,
        activeBaganCategoryId: category.id,
        activeBaganMatchId: match.id,
        atletMerah: {
          nama: match.atletMerah.nama || "Sudut Merah",
          kontingen: match.atletMerah.kontingen || "SUDUT MERAH"
        },
        atletBiru: {
          nama: match.atletBiru.nama || "Sudut Biru",
          kontingen: match.atletBiru.kontingen || "SUDUT BIRU"
        }
      });

      // Redirect Secretary to the main control screen
      setActiveTab('control');
    } catch (err) {
      console.error("Failed loading match details into server active state", err);
      alert("Gagal memuat pertandingan ke scoring nirkabel.");
    } finally {
      setIsLoadingMatch(null);
    }
  };

  // Helper to generate preset athletes for Lotting
  const handleGeneratePresetLotting = () => {
    if (!activeCategory) return;
    playBeep('click');
    const size = activeCategory.size;
    const gender = activeCategory.gender;
    const usia = activeCategory.usia || "Remaja";
    
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
    
    // Choose pool
    const namePool = gender === 'Putra' ? putraNames : putriNames;
    
    // Shuffle lists
    const shuffledNames = [...namePool].sort(() => Math.random() - 0.5);
    const shuffledRegions = [...regions].sort(() => Math.random() - 0.5);
    
    // Make athletes
    const lines: string[] = [];
    for (let i = 0; i < size; i++) {
      const name = shuffledNames[i % shuffledNames.length];
      const region = shuffledRegions[i % shuffledRegions.length];
      lines.push(`${name} - ${region}`);
    }
    
    setLottingInput(lines.join("\n"));
  };

  const populateBracketWithAthletes = (
    matches: BaganMatch[], 
    athletes: { nama: string; kontingen: string }[], 
    size: number
  ): BaganMatch[] => {
    // Deep copy matches
    const updated = matches.map(m => ({
      ...m,
      atletMerah: { ...m.atletMerah },
      atletBiru: { ...m.atletBiru },
      winner: m.winner
    }));

    // Clear matches
    for (let i = 0; i < updated.length; i++) {
      updated[i].atletMerah = { nama: '', kontingen: '' };
      updated[i].atletBiru = { nama: '', kontingen: '' };
      updated[i].winner = null;
    }

    if (size === 2) {
      if (athletes[0]) updated[0].atletMerah = athletes[0];
      if (athletes[1]) updated[0].atletBiru = athletes[1];
    } else if (size === 4) {
      if (athletes[0]) updated[0].atletMerah = athletes[0];
      if (athletes[1]) updated[0].atletBiru = athletes[1];
      if (athletes[2]) updated[1].atletMerah = athletes[2];
      if (athletes[3]) updated[1].atletBiru = athletes[3];
    } else if (size === 8) {
      if (athletes[0]) updated[0].atletMerah = athletes[0];
      if (athletes[1]) updated[0].atletBiru = athletes[1];
      if (athletes[2]) updated[1].atletMerah = athletes[2];
      if (athletes[3]) updated[1].atletBiru = athletes[3];
      if (athletes[4]) updated[2].atletMerah = athletes[4];
      if (athletes[5]) updated[2].atletBiru = athletes[5];
      if (athletes[6]) updated[3].atletMerah = athletes[6];
      if (athletes[7]) updated[3].atletBiru = athletes[7];
    } else if (size === 16) {
      for (let i = 0; i < 8; i++) {
        if (athletes[i * 2]) updated[i].atletMerah = athletes[i * 2];
        if (athletes[i * 2 + 1]) updated[i].atletBiru = athletes[i * 2 + 1];
      }
    }

    // Auto-handling BYE in bracket paths for initial matches
    const numInitialMatches = size / 2;
    for (let i = 0; i < numInitialMatches; i++) {
      const m = updated[i];
      if (m.atletMerah.nama && !m.atletBiru.nama) {
        m.atletBiru = { nama: "BYE", kontingen: "AUTOMATIC" };
      }
      if (!m.atletMerah.nama && m.atletBiru.nama) {
        m.atletMerah = { nama: "BYE", kontingen: "AUTOMATIC" };
      }
    }

    // Propagate the bracket so BYE matches are advanced automatically!
    return propagateBracket(updated, size);
  };

  // Helper to parse athlete list text
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

  // Helper to execute Lotting (Random drawing)
  const handleExecuteLotting = () => {
    if (!activeCategory) return;
    playBeep('valid');
    
    if (lottingMode === 'manual') {
      const poolsToCreate: { nameSuffix: string; athletes: { nama: string; kontingen: string }[] }[] = [];
      let totalAthletesCount = 0;

      for (let i = 0; i < manualPoolsCount; i++) {
        const poolAthletes = parseAthletes(manualPoolsInputs[i] || "");
        if (poolAthletes.length > 0) {
          totalAthletesCount += poolAthletes.length;
          poolsToCreate.push({
            nameSuffix: ` - Pool ${String.fromCharCode(64 + i + 1)}`, // Pool A, Pool B, etc.
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
        // Note: passing manual pool athletes directly WITHOUT shuffling
        const populatedMatches = populateBracketWithAthletes(poolMatches, pool.athletes, bracketSize);

        return {
          id: `cat_${Date.now()}_pool_manual_${idx + 1}`,
          name: `${activeCategory.name}${pool.nameSuffix}`,
          gender: activeCategory.gender,
          size: bracketSize,
          kelas: activeCategory.kelas,
          usia: activeCategory.usia,
          matches: populatedMatches
        };
      });

      // Replace the active category with newly generated manual pools
      const activeIndex = categories.findIndex(c => c.id === activeCategory.id);
      if (activeIndex !== -1) {
        const updatedCategories = [...categories];
        updatedCategories.splice(activeIndex, 1, ...newPoolCategories);
        updateCategories(updatedCategories);
        setSelectedCatId(newPoolCategories[0].id);
      }
      setShowLottingModal(false);
      return;
    }

    // Parse the main textarea lines
    const parsedAthletes = parseAthletes(lottingInput);
    
    if (parsedAthletes.length === 0) {
      alert("Masukkan minimal 1 nama atlet untuk diundi.");
      return;
    }
    
    // Shuffle the athletes
    const shuffled = [...parsedAthletes].sort(() => Math.random() - 0.5);
    
    if (lottingMode === 'split') {
      const maxPerBagan = lottingMaxPerBagan;
      const athleteGroups: { nama: string; kontingen: string }[][] = [];
      for (let i = 0; i < shuffled.length; i += maxPerBagan) {
        athleteGroups.push(shuffled.slice(i, i + maxPerBagan));
      }

      // Generate pool categories
      const newPoolCategories: BaganCategory[] = athleteGroups.map((group, index) => {
        const poolNum = index + 1;
        const count = group.length;

        // Determine closest standard bracket size that is <= maxPerBagan and fits the count
        let bracketSize: 2 | 4 | 8 | 16 = maxPerBagan;
        if (count <= 2) bracketSize = 2;
        else if (count <= 4) bracketSize = 4;
        else if (count <= 8) bracketSize = 8;
        else bracketSize = 16;

        if (bracketSize > maxPerBagan) {
          bracketSize = maxPerBagan;
        }

        const poolMatches = generateMatchesForSize(bracketSize);
        const populatedMatches = populateBracketWithAthletes(poolMatches, group, bracketSize);

        const suffix = athleteGroups.length > 1 ? ` - Pool ${String.fromCharCode(64 + poolNum)}` : ''; // Pool A, Pool B, etc.

        return {
          id: `cat_${Date.now()}_pool_${poolNum}`,
          name: `${activeCategory.name}${suffix}`,
          gender: activeCategory.gender,
          size: bracketSize,
          kelas: activeCategory.kelas,
          usia: activeCategory.usia,
          matches: populatedMatches
        };
      });

      // Replace the active category with newly generated pools
      const activeIndex = categories.findIndex(c => c.id === activeCategory.id);
      if (activeIndex !== -1) {
        const updatedCategories = [...categories];
        updatedCategories.splice(activeIndex, 1, ...newPoolCategories);
        updateCategories(updatedCategories);
        setSelectedCatId(newPoolCategories[0].id);
      }
      setShowLottingModal(false);
      return;
    }

    // Default 'single' single bagan mode
    const size = activeCategory.size;
    const newCats = categories.map(cat => {
      if (cat.id !== activeCategory.id) return cat;
      
      const poolMatches = generateMatchesForSize(size);
      const populatedMatches = populateBracketWithAthletes(poolMatches, shuffled, size);
      
      return {
        ...cat,
        matches: populatedMatches
      };
    });
    
    updateCategories(newCats);
    setShowLottingModal(false);
  };

  return (
    <div className="grid grid-cols-12 gap-3 flex-1 my-2 min-h-0 overflow-hidden">
      
      {/* LEFT COLUMN: Categories list and creation (Col 3) */}
      <div className={`col-span-12 lg:col-span-3 flex flex-col gap-3 min-h-0 h-full p-3 rounded-xl border overflow-y-auto ${
        theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-100/60 border-slate-200'
      }`}>
        <div className="flex justify-between items-center border-b border-slate-800/60 pb-2 flex-shrink-0 gap-1">
          <h4 className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
            <Users className="w-4 h-4" /> Daftar Kelas
          </h4>
          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={() => { playBeep('click'); setShowAturUrutanModal(true); }}
              className="px-1.5 py-0.5 text-[9px] font-bold tracking-tight bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 rounded border border-indigo-700/50 transition-colors uppercase cursor-pointer flex items-center gap-0.5"
              title="Atur & Nomor Ulang Seluruh Partai"
            >
              <Sparkles className="w-2.5 h-2.5" /> Urut Partai
            </button>
            <button
              onClick={handleDeleteAllCategories}
              className="px-1.5 py-0.5 text-[9px] font-bold tracking-tight bg-red-950/60 hover:bg-red-900 text-red-400 hover:text-red-300 rounded border border-red-900/50 transition-colors uppercase cursor-pointer"
              title="Hapus semua bagan kelas"
            >
              Hapus Semua
            </button>
            <button
              onClick={handleResetDefault}
              className="px-1.5 py-0.5 text-[9px] font-bold tracking-tight bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors uppercase cursor-pointer"
              title="Reset ke setelan pabrik"
            >
              Reset Default
            </button>
          </div>
        </div>

        {/* Categories Scroller list */}
        <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[220px] lg:max-h-none flex-1">
          {categories.map((cat) => {
            const isActive = cat.id === selectedCatId;
            return (
              <div
                key={cat.id}
                onClick={() => setSelectedCatId(cat.id)}
                className={`p-2.5 rounded-lg border text-left cursor-pointer flex justify-between items-center gap-1 transition-all ${
                  isActive 
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow shadow-emerald-700/20 font-bold'
                    : theme === 'dark'
                    ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-900/60'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="truncate flex-1">
                  <div className="text-xs font-bold truncate">{cat.name}</div>
                  <div className={`text-[10px] font-mono mt-0.5 flex gap-2 items-center uppercase ${isActive ? 'text-emerald-100' : 'text-slate-500'}`}>
                    <span>{cat.gender}</span>
                    <span>•</span>
                    <span>{cat.size} Peserta</span>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteCategory(cat.id, e)}
                  className={`p-1 rounded cursor-pointer transition-colors ${
                    isActive ? 'hover:bg-emerald-700 text-emerald-100 hover:text-white' : 'hover:bg-red-500/10 text-slate-500 hover:text-red-500'
                  }`}
                  title="Hapus bagan kelas ini"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
          {categories.length === 0 && (
            <div className="text-center py-6 text-xs text-slate-500 italic">
              Tidak ada bagan kelas. Silakan tambah di bawah.
            </div>
          )}
        </div>

        {/* Create Category Form */}
        <form onSubmit={handleAddCategory} className={`p-3 rounded-lg border flex flex-col gap-2.5 flex-shrink-0 ${
          theme === 'dark' ? 'bg-slate-950/40 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            Tambah Bagan Baru
          </span>

          <div>
            <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Nama Bagan / Kelas</label>
            <input
              type="text"
              required
              placeholder="Contoh: Kelas C Putri"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="w-full text-xs bg-slate-900 border border-slate-800 focus:border-emerald-500 px-2 py-1.5 rounded outline-none text-white font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Kelas Tanding</label>
              <select
                value={newCatKelas}
                onChange={(e) => setNewCatKelas(e.target.value)}
                className="w-full text-xs bg-slate-900 border border-slate-800 px-1 py-1.5 rounded outline-none text-white font-bold"
              >
                <option value="Kelas A">Kelas A</option>
                <option value="Kelas B">Kelas B</option>
                <option value="Kelas C">Kelas C</option>
                <option value="Kelas D">Kelas D</option>
                <option value="Kelas E">Kelas E</option>
                <option value="Kelas F">Kelas F</option>
                <option value="Kelas G">Kelas G</option>
                <option value="Kelas H">Kelas H</option>
                <option value="Kelas I">Kelas I</option>
                <option value="Kelas J">Kelas J</option>
                <option value="Kelas Bebas">Bebas</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Golongan Usia</label>
              <select
                value={newCatUsia}
                onChange={(e) => setNewCatUsia(e.target.value)}
                className="w-full text-xs bg-slate-900 border border-slate-800 px-1 py-1.5 rounded outline-none text-white font-bold"
              >
                <option value="Usia Dini">Usia Dini</option>
                <option value="Pra-Remaja">Pra-Remaja</option>
                <option value="Remaja">Remaja</option>
                <option value="Dewasa">Dewasa</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Gender</label>
              <select
                value={newCatGender}
                onChange={(e) => setNewCatGender(e.target.value as any)}
                className="w-full text-xs bg-slate-900 border border-slate-800 px-1 py-1.5 rounded outline-none text-white font-bold"
              >
                <option value="Putra">Putra</option>
                <option value="Putri">Putri</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Ukuran (Peserta)</label>
              <select
                value={newCatSize}
                onChange={(e) => setNewCatSize(parseInt(e.target.value, 10) as any)}
                className="w-full text-xs bg-slate-900 border border-slate-800 px-1 py-1.5 rounded outline-none text-white font-bold"
              >
                <option value={2}>2 Peserta (Final)</option>
                <option value={4}>4 Peserta (Semifinal)</option>
                <option value={8}>8 Peserta (Perempat Final)</option>
                <option value={16}>16 Peserta (Perdelapan Final)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded flex items-center justify-center gap-1 transition-all shadow-sm shadow-emerald-800/10"
          >
            <Plus className="w-3.5 h-3.5" /> Buat Bagan
          </button>
        </form>

      </div>

      {/* RIGHT COLUMN: Interactive Visual Bracket tree (Col 9) */}
      <div className={`col-span-12 lg:col-span-9 flex flex-col min-h-0 h-full p-4 rounded-xl border ${
        theme === 'dark' ? 'bg-slate-900/10 border-slate-800/80' : 'bg-white border-slate-250'
      }`}>
        
        {activeCategory ? (
          <div className="flex flex-col h-full min-h-0">
            {/* Header info */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-800/40 mb-4 flex-shrink-0">
              <div>
                <h3 className="text-sm font-black uppercase tracking-tight text-slate-100 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>{activeCategory.name}</span>
                </h3>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Gunakan tombol mahkota untuk mengaktifkan pemenang. Pemenang otomatis lanjut ke babak selanjutnya. Klik tombol PLAY (Muat ke Skoring) untuk mengisi data tanding secara instan.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {activeCategory.kelas && (
                  <span className="px-2 py-0.5 text-[9px] uppercase font-black tracking-wider bg-amber-950/50 text-amber-400 border border-amber-900/40 rounded-md">
                    {activeCategory.kelas}
                  </span>
                )}
                {activeCategory.usia && (
                  <span className="px-2 py-0.5 text-[9px] uppercase font-black tracking-wider bg-purple-950/50 text-purple-400 border border-purple-900/40 rounded-md">
                    {activeCategory.usia}
                  </span>
                )}
                <span className={`px-2 py-0.5 text-[9px] uppercase font-black tracking-wider rounded-md ${
                  activeCategory.gender === 'Putra' ? 'bg-blue-950/50 text-blue-400 border border-blue-900/40' : 'bg-pink-950/50 text-pink-400 border border-pink-900/40'
                }`}>
                  Kategori {activeCategory.gender}
                </span>
                {/* Dynamic bracket size adjuster */}
                <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded-md">
                  <span className="text-[9px] uppercase font-black text-slate-400">Ukuran:</span>
                  <select
                    value={activeCategory.size}
                    onChange={(e) => handleChangeActiveCategorySize(activeCategory.id, parseInt(e.target.value, 10) as any)}
                    className="bg-transparent text-[10px] font-black uppercase text-emerald-400 outline-none cursor-pointer border-none p-0 font-sans leading-none"
                    title="Ubah jumlah peserta bagan ini"
                  >
                    <option value={2} className="bg-slate-900 text-slate-300">2 Atlet</option>
                    <option value={4} className="bg-slate-900 text-slate-300">4 Atlet</option>
                    <option value={8} className="bg-slate-900 text-slate-300">8 Atlet</option>
                    <option value={16} className="bg-slate-900 text-slate-300">16 Atlet</option>
                  </select>
                </div>

                <button
                  onClick={() => { playBeep('click'); setShowAturUrutanModal(true); }}
                  className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-md flex items-center gap-1 transition-all shadow shadow-purple-900/30 cursor-pointer"
                  title="Atur & Nomor Ulang Seluruh Urutan Partai Secara Berurutan (Standar IPSI)"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Atur Urutan Partai</span>
                </button>

                <button
                  onClick={() => { playBeep('click'); handleOpenManageAthletesModal(); }}
                  className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-indigo-650 hover:bg-indigo-600 text-white rounded-md flex items-center gap-1 transition-all shadow shadow-indigo-900/20 cursor-pointer"
                  title="Atur Susunan Peserta Manual"
                >
                  <Users className="w-3.5 h-3.5" /> Atur Peserta
                </button>

                <button
                  onClick={() => { playBeep('click'); setShowLottingModal(true); setLottingInput(""); }}
                  className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white rounded-md flex items-center gap-1 transition-all shadow shadow-emerald-800/20 cursor-pointer"
                  title="Undi Atlet Secara Acak"
                >
                  🎯 Lotting Atlet
                </button>
              </div>
            </div>

            {/* Bracket columns display */}
            <div className="flex-1 overflow-x-auto overflow-y-auto pb-4 flex gap-6 items-center min-h-0 justify-start px-2">
              
              {/* OCTO FINALS column (only for size 16) */}
              {activeCategory.size === 16 && (
                <div className="flex flex-col gap-6 min-w-[240px] flex-shrink-0">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 font-mono text-center border-b border-slate-800 pb-1">
                    Babak Perdelapan Final
                  </div>
                  <div className="flex flex-col gap-6 justify-around">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(id => {
                      const m = activeCategory.matches.find(match => match.id === id)!;
                      return renderMatchCard(m, activeCategory);
                    })}
                  </div>
                </div>
              )}

              {/* QUARTER FINALS column (for size 8 and 16) */}
              {(activeCategory.size === 8 || activeCategory.size === 16) && (
                <div className="flex flex-col gap-10 min-w-[240px] flex-shrink-0">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 font-mono text-center border-b border-slate-800 pb-1">
                    Babak Perempat Final
                  </div>
                  <div className="flex flex-col gap-12 justify-around">
                    {activeCategory.size === 16 ? (
                      [9, 10, 11, 12].map(id => {
                        const m = activeCategory.matches.find(match => match.id === id)!;
                        return renderMatchCard(m, activeCategory);
                      })
                    ) : (
                      [1, 2, 3, 4].map(id => {
                        const m = activeCategory.matches.find(match => match.id === id)!;
                        return renderMatchCard(m, activeCategory);
                      })
                    )}
                  </div>
                </div>
              )}

              {/* SEMI FINALS column (only for size 4, 8, 16) */}
              {activeCategory.size > 2 && (
                <div className="flex flex-col gap-10 min-w-[240px] flex-shrink-0">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 font-mono text-center border-b border-slate-800 pb-1">
                    Babak Semifinal
                  </div>
                  <div className="flex flex-col gap-24 justify-around py-4">
                    {activeCategory.size === 16 ? (
                      [13, 14].map(id => {
                        const m = activeCategory.matches.find(match => match.id === id)!;
                        return renderMatchCard(m, activeCategory);
                      })
                    ) : activeCategory.size === 8 ? (
                      [5, 6].map(id => {
                        const m = activeCategory.matches.find(match => match.id === id)!;
                        return renderMatchCard(m, activeCategory);
                      })
                    ) : (
                      [1, 2].map(id => {
                        const m = activeCategory.matches.find(match => match.id === id)!;
                        return renderMatchCard(m, activeCategory);
                      })
                    )}
                  </div>
                </div>
              )}

              {/* FINALS column */}
              <div className="flex flex-col gap-10 min-w-[240px] flex-shrink-0">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 font-mono text-center border-b border-slate-800 pb-1">
                  Babak Final
                </div>
                <div className="flex flex-col justify-center py-12">
                  {activeCategory.size === 16 ? (
                    renderMatchCard(activeCategory.matches.find(match => match.id === 15)!, activeCategory)
                  ) : activeCategory.size === 8 ? (
                    renderMatchCard(activeCategory.matches.find(match => match.id === 7)!, activeCategory)
                  ) : activeCategory.size === 4 ? (
                    renderMatchCard(activeCategory.matches.find(match => match.id === 3)!, activeCategory)
                  ) : (
                    renderMatchCard(activeCategory.matches.find(match => match.id === 1)!, activeCategory)
                  )}
                </div>
              </div>

              {/* CHAMPION DISPLAY COLUMN */}
              <div className="flex flex-col gap-10 min-w-[220px] flex-shrink-0">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 font-mono text-center border-b border-slate-800 pb-1">
                  Juara Tanding
                </div>
                <div className="flex justify-center py-12">
                  {renderChampionCard(activeCategory)}
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <Trophy className="w-16 h-16 text-slate-700 animate-pulse mb-3" />
            <p className="text-slate-400 font-bold">Belum ada bagan kelas yang dipilih.</p>
            <p className="text-xs text-slate-650 mt-1 max-w-sm">
              Silakan pilih kelas dari daftar di sebelah kiri, atau tambahkan kelas turnamen tanding yang baru.
            </p>
          </div>
        )}

      </div>

      {/* EDIT MODAL FOR MATCH */}
      <AnimatePresence>
        {editingMatch && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-slate-900 border border-slate-800 max-w-md w-full p-6 rounded-2xl shadow-2xl relative text-slate-100"
            >
              <button
                onClick={() => setEditingMatch(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-base font-black text-emerald-400 uppercase tracking-tight mb-4 flex items-center gap-2">
                <Edit className="w-5 h-5 text-emerald-400" /> EDIT DETAIL PERTANDINGAN BAGAN
              </h3>

              <div className="flex flex-col gap-4">
                {/* Partai Number input */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Nomor Partai (Tanding)</label>
                  <input
                    type="text"
                    value={editPartai}
                    onChange={(e) => setEditPartai(e.target.value)}
                    className="w-full text-xs bg-slate-950 border border-slate-800 focus:border-emerald-500 px-3 py-2 rounded-lg outline-none text-white font-bold"
                  />
                </div>

                {/* RED ATHLETE INFO */}
                <div className="p-3 bg-red-950/10 border border-red-900/30 rounded-xl">
                  <span className="text-[9px] uppercase font-mono font-black text-red-400 tracking-wider block mb-2">● SUDUT MERAH</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[8px] uppercase font-bold text-slate-500 mb-1">Nama Atlet</label>
                      <input
                        type="text"
                        value={editMerahNama}
                        onChange={(e) => setEditMerahNama(e.target.value)}
                        className="w-full text-xs bg-slate-950 border border-slate-800 focus:border-red-500 px-2.5 py-1.5 rounded outline-none text-white font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] uppercase font-bold text-slate-500 mb-1">Kontingen</label>
                      <input
                        type="text"
                        value={editMerahKont}
                        onChange={(e) => setEditMerahKont(e.target.value)}
                        className="w-full text-xs bg-slate-950 border border-slate-800 focus:border-red-500 px-2.5 py-1.5 rounded outline-none text-white font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* BLUE ATHLETE INFO */}
                <div className="p-3 bg-blue-950/10 border border-blue-900/30 rounded-xl">
                  <span className="text-[9px] uppercase font-mono font-black text-blue-400 tracking-wider block mb-2">● SUDUT BIRU</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[8px] uppercase font-bold text-slate-500 mb-1">Nama Atlet</label>
                      <input
                        type="text"
                        value={editBiruNama}
                        onChange={(e) => setEditBiruNama(e.target.value)}
                        className="w-full text-xs bg-slate-950 border border-slate-800 focus:border-blue-500 px-2.5 py-1.5 rounded outline-none text-white font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] uppercase font-bold text-slate-500 mb-1">Kontingen</label>
                      <input
                        type="text"
                        value={editBiruKont}
                        onChange={(e) => setEditBiruKont(e.target.value)}
                        className="w-full text-xs bg-slate-950 border border-slate-800 focus:border-blue-500 px-2.5 py-1.5 rounded outline-none text-white font-semibold"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-2">
                  <button
                    onClick={saveEditMatch}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 font-bold text-xs uppercase tracking-wider rounded-lg transition-transform active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Save className="w-4 h-4" /> Simpan Perubahan
                  </button>
                  <button
                    onClick={() => setEditingMatch(null)}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-350 text-xs font-bold uppercase tracking-wider border border-slate-700/50 rounded-lg transition-transform active:scale-95 cursor-pointer"
                  >
                    Batal
                  </button>
                </div>

              </div>
            </motion.div>
          </div>
        )}

        {showLottingModal && activeCategory && (
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
                    <span className="font-extrabold text-white">{activeCategory.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Golongan Usia</span>
                    <span className="font-extrabold text-amber-400">{activeCategory.usia || "Remaja"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Jenis Kelamin</span>
                    <span className="font-extrabold text-blue-400">{activeCategory.gender}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Kapasitas Bagan</span>
                    <span className="font-extrabold text-emerald-400">{activeCategory.size} Atlet ({activeCategory.size === 4 ? 'Semifinal' : 'Perempat'})</span>
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
                        <option value="single">Satu Bagan Tunggal ({activeCategory.size} Atlet)</option>
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
                {lottingMode !== 'manual' ? (
                  <>
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] uppercase font-bold text-slate-400">
                        Daftar Nama Peserta ({parseAthletes(lottingInput).length} / {activeCategory.size})
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
                      💡 *Tips*: Anda bisa langsung menyalin daftar nama atlet dari Excel atau Notepad. Jika jumlah atlet yang dimasukkan kurang dari kapasitas bagan ({activeCategory.size}), sistem akan mengisi slot kosong dengan <strong className="text-amber-500">BYE</strong> secara otomatis.
                    </p>
                  </>
                ) : (
                  <div className="flex flex-col gap-3 flex-1 min-h-0">
                    {/* Master list input first */}
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
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

        {showManageAthletesModal && activeCategory && (
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
                    Kelas: {activeCategory.name}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-850 border border-slate-800 font-extrabold text-purple-400">
                    Usia: {activeCategory.usia || "Remaja"}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-850 border border-slate-800 font-extrabold text-blue-400">
                    Gender: {activeCategory.gender}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-850 border border-slate-800 font-extrabold text-emerald-400">
                    Kapasitas: {activeCategory.size} Atlet
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
                            className="text-[8px] uppercase font-black px-1.5 py-0.5 bg-red-955/40 hover:bg-red-900/30 text-red-400 rounded border border-red-900/30 cursor-pointer"
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
                            className="text-[8px] uppercase font-black px-1.5 py-0.5 bg-blue-955/40 hover:bg-blue-900/30 text-blue-400 rounded border border-blue-900/30 cursor-pointer"
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
                  className="px-3 py-2 bg-slate-850 hover:bg-red-955/40 hover:text-red-400 hover:border-red-900/40 border border-slate-800 text-slate-400 text-xs font-bold uppercase rounded-lg cursor-pointer transition-all"
                >
                  Bersihkan Semua
                </button>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowManageAthletesModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold uppercase border border-slate-700/50 rounded-lg cursor-pointer"
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
      </AnimatePresence>

      {/* Atur & Perbaiki Urutan Partai Modal */}
      <AturUrutanPartaiModal
        isOpen={showAturUrutanModal}
        onClose={() => setShowAturUrutanModal(false)}
        categories={categories}
        onSave={(updated) => {
          updateCategories(updated);
        }}
      />

    </div>
  );

  // Helper to render individual match node cards
  function renderMatchCard(match: BaganMatch, category: BaganCategory) {
    if (!match) return null;

    const winnerMerah = match.winner === 'merah';
    const winnerBiru = match.winner === 'biru';

    const nextTarget = getNextMatchTarget(category, match.id);
    const { merahSource, biruSource } = getPreviousSourceMatches(category, match.id);

    const getSlotDisplay = (slot: 'merah' | 'biru') => {
      const athlete = slot === 'merah' ? match.atletMerah : match.atletBiru;
      const source = slot === 'merah' ? merahSource : biruSource;
      const isBye = isByeAthlete(athlete.nama);

      if (athlete.nama && athlete.nama.trim() !== '' && athlete.nama !== 'Belum ada atlet') {
        return {
          nama: athlete.nama,
          kontingen: athlete.kontingen || (isBye ? 'AUTOMATIC' : '—'),
          isPending: false,
          isBye,
          sourceBadge: source ? `Lolos dari ${source.sourcePartaiLabel}` : null
        };
      }

      if (source) {
        return {
          nama: source.placeholderText,
          kontingen: `Menunggu Hasil ${source.sourceRoundLabel}`,
          isPending: true,
          isBye: false,
          sourceBadge: null
        };
      }

      return {
        nama: "Belum ada atlet",
        kontingen: "—",
        isPending: true,
        isBye: false,
        sourceBadge: null
      };
    };

    const merahDisp = getSlotDisplay('merah');
    const biruDisp = getSlotDisplay('biru');

    return (
      <div 
        key={match.id} 
        className={`w-64 p-3 rounded-xl border flex flex-col gap-2 relative shadow-lg group transition-all duration-300 hover:scale-[1.02] ${
          theme === 'dark' 
            ? 'bg-slate-950/90 border-slate-800/80 hover:border-slate-700' 
            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
        }`}
      >
        {/* Partai Header badge and round info */}
        <div className="flex justify-between items-center text-[9px] font-mono font-black uppercase text-slate-500 pb-1 border-b border-slate-800/40">
          <span className="text-indigo-400 font-bold">{match.partai}</span>
          <span className="text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">
            {match.round.toUpperCase()}
          </span>
        </div>

        {/* Competitors listing */}
        <div className="flex flex-col gap-1.5">
          {/* Merah row */}
          <div className={`flex items-center justify-between p-1.5 rounded-lg border text-left transition-all relative overflow-hidden ${
            winnerMerah 
              ? 'bg-red-950/30 border-red-600 font-bold text-red-100 shadow-sm shadow-red-900/20' 
              : merahDisp.isPending
              ? 'bg-slate-900/20 border-dashed border-slate-800 text-slate-400'
              : theme === 'dark'
              ? 'bg-slate-900/50 border-slate-850 text-slate-300'
              : 'bg-white border-slate-200 text-slate-700'
          }`}>
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600" />
            <div className="pl-2 truncate flex-1 leading-tight">
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-extrabold truncate uppercase">
                  {merahDisp.nama}
                </span>
                {merahDisp.isBye && (
                  <span className="text-[8px] bg-amber-950/60 text-amber-400 border border-amber-800/60 px-1 rounded font-black">
                    BYE
                  </span>
                )}
              </div>
              <div className="text-[9px] font-semibold text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                <span>{merahDisp.kontingen}</span>
                {merahDisp.sourceBadge && (
                  <span className="text-[8px] text-emerald-400 font-mono">
                    • {merahDisp.sourceBadge}
                  </span>
                )}
              </div>
            </div>
            {winnerMerah && (
              <Trophy className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 animate-bounce ml-1" />
            )}
          </div>

          {/* Biru row */}
          <div className={`flex items-center justify-between p-1.5 rounded-lg border text-left transition-all relative overflow-hidden ${
            winnerBiru 
              ? 'bg-blue-950/30 border-blue-600 font-bold text-blue-100 shadow-sm shadow-blue-900/20' 
              : biruDisp.isPending
              ? 'bg-slate-900/20 border-dashed border-slate-800 text-slate-400'
              : theme === 'dark'
              ? 'bg-slate-900/50 border-slate-850 text-slate-300'
              : 'bg-white border-slate-200 text-slate-700'
          }`}>
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />
            <div className="pl-2 truncate flex-1 leading-tight">
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-extrabold truncate uppercase">
                  {biruDisp.nama}
                </span>
                {biruDisp.isBye && (
                  <span className="text-[8px] bg-amber-950/60 text-amber-400 border border-amber-800/60 px-1 rounded font-black">
                    BYE
                  </span>
                )}
              </div>
              <div className="text-[9px] font-semibold text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                <span>{biruDisp.kontingen}</span>
                {biruDisp.sourceBadge && (
                  <span className="text-[8px] text-emerald-400 font-mono">
                    • {biruDisp.sourceBadge}
                  </span>
                )}
              </div>
            </div>
            {winnerBiru && (
              <Trophy className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 animate-bounce ml-1" />
            )}
          </div>
        </div>

        {/* PROGRESSION NOTIFICATION BADGE */}
        {nextTarget && !nextTarget.isFinal && nextTarget.targetMatchId && (
          <div className={`text-[9px] font-semibold px-2 py-1 rounded-md flex items-center justify-between gap-1 transition-all ${
            match.winner 
              ? 'bg-emerald-950/60 border border-emerald-700/60 text-emerald-300' 
              : 'bg-slate-900/70 border border-slate-800 text-slate-400'
          }`}>
            <span className="truncate">
              {match.winner 
                ? `➔ ${nextTarget.winnerAdvancementBadge}`
                : `➔ ${nextTarget.advancementText}`}
            </span>
            {nextTarget.isFinal && (
              <span className="px-1 py-0.2 bg-amber-500 text-slate-950 font-black text-[8px] rounded uppercase flex-shrink-0">
                FINAL
              </span>
            )}
          </div>
        )}

        {/* FINAL ROUND SPECIAL BADGE */}
        {nextTarget && nextTarget.isFinal && (
          <div className="text-[9px] font-bold px-2 py-0.5 bg-amber-950/40 border border-amber-800/40 text-amber-400 rounded flex items-center justify-center gap-1">
            <Trophy className="w-3 h-3 text-amber-400" />
            <span>Perebutan Juara 1 & 2</span>
          </div>
        )}

        {/* Actions overlay footer */}
        <div className="flex gap-1 justify-between items-center mt-0.5 border-t border-slate-850 pt-2 font-mono">
          {/* Winner declaring buttons */}
          <div className="flex gap-1.5">
            <button
              onClick={() => handleMatchWinner(category.id, match.id, 'merah')}
              className={`px-2 py-1 rounded text-[9px] font-black cursor-pointer transition-all ${
                winnerMerah ? 'bg-red-600 text-white shadow shadow-red-700/50' : 'bg-red-955/30 hover:bg-red-900/50 text-red-300 border border-red-900/40'
              }`}
              title="Set Sudut Merah Menang"
            >
              🏆 MERAH
            </button>
            <button
              onClick={() => handleMatchWinner(category.id, match.id, 'biru')}
              className={`px-2 py-1 rounded text-[9px] font-black cursor-pointer transition-all ${
                winnerBiru ? 'bg-blue-600 text-white shadow shadow-blue-700/50' : 'bg-blue-955/30 hover:bg-blue-900/50 text-blue-300 border border-blue-900/40'
              }`}
              title="Set Sudut Biru Menang"
            >
              🏆 BIRU
            </button>
            {match.winner && (
              <button
                onClick={() => handleMatchWinner(category.id, match.id, null)}
                className="p-1 hover:bg-slate-800 text-[9px] text-slate-400 hover:text-white rounded cursor-pointer"
                title="Reset Pemenang"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Load match trigger */}
          <div className="flex gap-1">
            <button
              onClick={() => startEditMatch(category.id, match)}
              className="px-1.5 py-1 text-[9px] uppercase font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded cursor-pointer"
              title="Edit Atlet"
            >
              Edit
            </button>
            
            <button
              onClick={() => loadMatchToScoring(match, category)}
              disabled={isLoadingMatch === match.id}
              className={`px-2 py-0.5 rounded cursor-pointer text-[9px] font-black uppercase flex items-center gap-0.5 transition-all ${
                isLoadingMatch === match.id
                  ? 'bg-slate-800 text-slate-550'
                  : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/40'
              }`}
              title="Muat ke scoring tanding live"
            >
              <Play className="w-2.5 h-2.5 fill-current" />
              <span>PLAY</span>
            </button>
          </div>
        </div>

      </div>
    );
  }

  // Render champion displays
  function renderChampionCard(category: BaganCategory) {
    // Find final match (for any size S, final match ID is S - 1)
    const finalId = category.size - 1;
    const finalMatch = category.matches.find(m => m.id === finalId);

    if (!finalMatch || !finalMatch.winner) {
      return (
        <div className={`w-48 p-5 rounded-2xl border text-center flex flex-col items-center justify-center gap-2 ${
          theme === 'dark' ? 'bg-slate-950/40 border-slate-850/60' : 'bg-slate-50 border-slate-200'
        }`}>
          <Trophy className="w-8 h-8 text-slate-700 mb-1" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">JUARA KELAS</span>
          <span className="text-[9px] text-slate-600 italic">Menunggu pemenang final...</span>
        </div>
      );
    }

    const champion = finalMatch.winner === 'merah' ? finalMatch.atletMerah : finalMatch.atletBiru;
    const isMerah = finalMatch.winner === 'merah';

    return (
      <div className={`w-48 p-5 rounded-2xl border text-center flex flex-col items-center justify-center gap-2 shadow-2xl relative overflow-hidden group hover:scale-105 transition-all duration-300 ${
        isMerah
          ? 'bg-red-950/20 border-red-700 text-red-200'
          : 'bg-blue-950/20 border-blue-700 text-blue-200'
      }`}>
        {/* Shiny glow back */}
        <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/10 via-transparent to-transparent pointer-events-none" />
        
        <Trophy className="w-10 h-10 text-yellow-500 mb-1 animate-bounce" />
        <span className="text-[9px] font-black uppercase tracking-widest text-yellow-500 font-mono">JUARA KELAS</span>
        
        <div className="mt-1 leading-tight">
          <span className="text-sm font-black uppercase block truncate">{champion.nama || "—"}</span>
          <span className="text-[10px] font-semibold text-slate-400 block truncate">{champion.kontingen || "—"}</span>
        </div>

        <div className={`mt-2 text-[8px] font-mono px-2 py-0.5 rounded-full uppercase ${
          isMerah ? 'bg-red-900/30 text-red-400' : 'bg-blue-900/30 text-blue-400'
        }`}>
          Sudut {isMerah ? 'Merah' : 'Biru'}
        </div>
      </div>
    );
  }
}

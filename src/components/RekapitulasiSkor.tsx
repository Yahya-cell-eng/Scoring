import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy,
  Medal,
  Award,
  Search,
  Filter,
  Download,
  CheckCircle2,
  Users,
  Shield,
  Flame,
  Printer,
  ChevronRight,
  Sparkles,
  FileSpreadsheet,
  X,
  Star
} from 'lucide-react';
import { MatchHistory, TGRPeserta, TGRState, MatchState } from '../types';
import { playBeep } from '../utils/sound';

interface RekapitulasiSkorProps {
  histories?: MatchHistory[];
  tgrPeserta?: TGRPeserta[];
  tgrState?: TGRState | null;
  state?: MatchState | null;
  title?: string;
  subtitle?: string;
  className?: string;
  isEmbedded?: boolean;
}

export default function RekapitulasiSkor({
  histories = [],
  tgrPeserta = [],
  tgrState,
  state,
  title = "REKAPITULASI SKOR & PEMENANG TURNAMEN",
  subtitle = "GAMBARAN UMUM HASIL PARTAI SELESAI & KLASEMEN PEROLEHAN SKOR REAL-TIME",
  className = "",
  isEmbedded = false
}: RekapitulasiSkorProps) {
  const [activeTab, setActiveTab] = useState<'semua' | 'tanding' | 'seni' | 'klasemen_kontingen' | 'klasemen_kategori'>('klasemen_kontingen');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('semua');
  const [selectedKontingenFilter, setSelectedKontingenFilter] = useState<string>('semua');
  const [expandedKontingen, setExpandedKontingen] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<{ type: 'tanding' | 'seni'; data: any } | null>(null);

  // Fallback to tgrState.pesertaList if tgrPeserta prop not passed directly
  const effectiveTgrPeserta = useMemo(() => {
    if (tgrPeserta && tgrPeserta.length > 0) return tgrPeserta;
    if (tgrState?.pesertaList) return tgrState.pesertaList;
    return [];
  }, [tgrPeserta, tgrState]);

  // Completed TGR participants (status === 'Sudah Menilai' or having finalScore)
  const completedTgr = useMemo(() => {
    return effectiveTgrPeserta
      .filter(p => p.status === 'Sudah Menilai' || p.finalScore !== undefined)
      .sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));
  }, [effectiveTgrPeserta]);

  // Extract all unique Kontingen list
  const allKontingens = useMemo(() => {
    const set = new Set<string>();
    histories.forEach(h => {
      if (h.atletMerah.kontingen) set.add(h.atletMerah.kontingen.toUpperCase().trim());
      if (h.atletBiru.kontingen) set.add(h.atletBiru.kontingen.toUpperCase().trim());
    });
    effectiveTgrPeserta.forEach(p => {
      if (p.kontingen) set.add(p.kontingen.toUpperCase().trim());
    });
    return Array.from(set).sort();
  }, [histories, effectiveTgrPeserta]);

  // Extract all unique Categories list
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    histories.forEach(h => {
      if (h.kelas) set.add(`TANDING - ${h.kelas.toUpperCase()}`);
    });
    effectiveTgrPeserta.forEach(p => {
      if (p.kategori) set.add(`SENI - ${p.kategori.toUpperCase()}`);
    });
    return Array.from(set).sort();
  }, [histories, effectiveTgrPeserta]);

  // Detailed Medal & Category Breakdown per Contingent
  const kontingenDetailedTally = useMemo(() => {
    interface CategoryMedal {
      category: string;
      atletNama: string;
      medalType: 'gold' | 'silver' | 'bronze';
      scoreOrDetail?: string;
    }

    interface KontingenRecord {
      kontingen: string;
      gold: number;
      silver: number;
      bronze: number;
      total: number;
      byCategory: {
        tanding: { gold: number; silver: number; bronze: number };
        tunggal: { gold: number; silver: number; bronze: number };
        ganda: { gold: number; silver: number; bronze: number };
        regu: { gold: number; silver: number; bronze: number };
        bebas: { gold: number; silver: number; bronze: number };
      };
      medalists: CategoryMedal[];
    }

    const tallyMap: { [kontingen: string]: KontingenRecord } = {};

    const getOrCreate = (kName: string): KontingenRecord => {
      const k = kName.toUpperCase().trim();
      if (!tallyMap[k]) {
        tallyMap[k] = {
          kontingen: k,
          gold: 0,
          silver: 0,
          bronze: 0,
          total: 0,
          byCategory: {
            tanding: { gold: 0, silver: 0, bronze: 0 },
            tunggal: { gold: 0, silver: 0, bronze: 0 },
            ganda: { gold: 0, silver: 0, bronze: 0 },
            regu: { gold: 0, silver: 0, bronze: 0 },
            bebas: { gold: 0, silver: 0, bronze: 0 },
          },
          medalists: []
        };
      }
      return tallyMap[k];
    };

    // 1. Process Tanding Matches (Winner = Gold, Runner-up = Silver)
    histories.forEach(h => {
      const categoryName = `TANDING ${h.kelas.toUpperCase()} (${h.gender.toUpperCase()})`;
      const mKontingen = h.atletMerah.kontingen?.toUpperCase().trim();
      const bKontingen = h.atletBiru.kontingen?.toUpperCase().trim();

      if (h.winner === 'merah') {
        if (mKontingen) {
          const rec = getOrCreate(mKontingen);
          rec.gold += 1;
          rec.total += 1;
          rec.byCategory.tanding.gold += 1;
          rec.medalists.push({
            category: categoryName,
            atletNama: h.atletMerah.nama,
            medalType: 'gold',
            scoreOrDetail: `Skor ${h.skorAkhirMerah} - ${h.skorAkhirBiru}`
          });
        }
        if (bKontingen) {
          const rec = getOrCreate(bKontingen);
          rec.silver += 1;
          rec.total += 1;
          rec.byCategory.tanding.silver += 1;
          rec.medalists.push({
            category: categoryName,
            atletNama: h.atletBiru.nama,
            medalType: 'silver',
            scoreOrDetail: `Skor ${h.skorAkhirBiru} - ${h.skorAkhirMerah}`
          });
        }
      } else if (h.winner === 'biru') {
        if (bKontingen) {
          const rec = getOrCreate(bKontingen);
          rec.gold += 1;
          rec.total += 1;
          rec.byCategory.tanding.gold += 1;
          rec.medalists.push({
            category: categoryName,
            atletNama: h.atletBiru.nama,
            medalType: 'gold',
            scoreOrDetail: `Skor ${h.skorAkhirBiru} - ${h.skorAkhirMerah}`
          });
        }
        if (mKontingen) {
          const rec = getOrCreate(mKontingen);
          rec.silver += 1;
          rec.total += 1;
          rec.byCategory.tanding.silver += 1;
          rec.medalists.push({
            category: categoryName,
            atletNama: h.atletMerah.nama,
            medalType: 'silver',
            scoreOrDetail: `Skor ${h.skorAkhirMerah} - ${h.skorAkhirBiru}`
          });
        }
      }
    });

    // 2. Process TGR Seni Matches (Rank 1 = Gold, Rank 2 = Silver, Rank 3 = Bronze)
    completedTgr.forEach((p, idx) => {
      const k = p.kontingen?.toUpperCase().trim();
      if (!k) return;

      const rank = p.ranking || (idx + 1);
      const katLower = p.kategori.toLowerCase();
      let katGroup: 'tunggal' | 'ganda' | 'regu' | 'bebas' = 'tunggal';
      if (katLower.includes('ganda')) katGroup = 'ganda';
      else if (katLower.includes('regu')) katGroup = 'regu';
      else if (katLower.includes('bebas') || katLower.includes('solo')) katGroup = 'bebas';

      const categoryName = `SENI ${p.kategori.toUpperCase()}`;
      const scoreStr = `Nilai ${p.finalScore ? p.finalScore.toFixed(3) : '-'}`;

      if (rank === 1) {
        const rec = getOrCreate(k);
        rec.gold += 1;
        rec.total += 1;
        rec.byCategory[katGroup].gold += 1;
        rec.medalists.push({ category: categoryName, atletNama: p.nama, medalType: 'gold', scoreOrDetail: scoreStr });
      } else if (rank === 2) {
        const rec = getOrCreate(k);
        rec.silver += 1;
        rec.total += 1;
        rec.byCategory[katGroup].silver += 1;
        rec.medalists.push({ category: categoryName, atletNama: p.nama, medalType: 'silver', scoreOrDetail: scoreStr });
      } else if (rank === 3) {
        const rec = getOrCreate(k);
        rec.bronze += 1;
        rec.total += 1;
        rec.byCategory[katGroup].bronze += 1;
        rec.medalists.push({ category: categoryName, atletNama: p.nama, medalType: 'bronze', scoreOrDetail: scoreStr });
      }
    });

    let list = Object.values(tallyMap);

    // Apply Filter Kontingen
    if (selectedKontingenFilter !== 'semua') {
      list = list.filter(item => item.kontingen === selectedKontingenFilter.toUpperCase());
    }

    // Apply Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item =>
        item.kontingen.toLowerCase().includes(q) ||
        item.medalists.some(m => m.atletNama.toLowerCase().includes(q) || m.category.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze || b.total - a.total);
  }, [histories, completedTgr, selectedKontingenFilter, searchQuery]);

  // Recapitulation Grouped by Category (Kategori Breakdown)
  const categoryMedalWinners = useMemo(() => {
    interface CategoryWinnerGroup {
      categoryKey: string;
      categoryName: string;
      type: 'TANDING' | 'SENI';
      goldWinner?: { nama: string; kontingen: string; scoreInfo: string };
      silverWinner?: { nama: string; kontingen: string; scoreInfo: string };
      bronzeWinners: { nama: string; kontingen: string; scoreInfo: string }[];
    }

    const groupsMap: { [key: string]: CategoryWinnerGroup } = {};

    // 1. Tanding categories
    histories.forEach(h => {
      const key = `TANDING_${h.kelas.toUpperCase()}_${h.gender.toUpperCase()}`;
      const name = `TANDING - KELAS ${h.kelas.toUpperCase()} (${h.gender.toUpperCase()})`;

      if (!groupsMap[key]) {
        groupsMap[key] = {
          categoryKey: key,
          categoryName: name,
          type: 'TANDING',
          bronzeWinners: []
        };
      }

      if (h.winner === 'merah') {
        groupsMap[key].goldWinner = {
          nama: h.atletMerah.nama,
          kontingen: h.atletMerah.kontingen,
          scoreInfo: `Partai ${h.partai} (Skor ${h.skorAkhirMerah}-${h.skorAkhirBiru})`
        };
        groupsMap[key].silverWinner = {
          nama: h.atletBiru.nama,
          kontingen: h.atletBiru.kontingen,
          scoreInfo: `Partai ${h.partai} (Skor ${h.skorAkhirBiru}-${h.skorAkhirMerah})`
        };
      } else if (h.winner === 'biru') {
        groupsMap[key].goldWinner = {
          nama: h.atletBiru.nama,
          kontingen: h.atletBiru.kontingen,
          scoreInfo: `Partai ${h.partai} (Skor ${h.skorAkhirBiru}-${h.skorAkhirMerah})`
        };
        groupsMap[key].silverWinner = {
          nama: h.atletMerah.nama,
          kontingen: h.atletMerah.kontingen,
          scoreInfo: `Partai ${h.partai} (Skor ${h.skorAkhirMerah}-${h.skorAkhirBiru})`
        };
      }
    });

    // 2. Seni TGR categories
    const seniByKat: { [kat: string]: TGRPeserta[] } = {};
    completedTgr.forEach(p => {
      const k = p.kategori.toUpperCase();
      if (!seniByKat[k]) seniByKat[k] = [];
      seniByKat[k].push(p);
    });

    Object.entries(seniByKat).forEach(([katName, pList]) => {
      const key = `SENI_${katName}`;
      const name = `SENI - ${katName}`;
      const sorted = [...pList].sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));

      const grp: CategoryWinnerGroup = {
        categoryKey: key,
        categoryName: name,
        type: 'SENI',
        bronzeWinners: []
      };

      if (sorted[0]) {
        grp.goldWinner = {
          nama: sorted[0].nama,
          kontingen: sorted[0].kontingen,
          scoreInfo: `Nilai: ${sorted[0].finalScore ? sorted[0].finalScore.toFixed(3) : '-'}`
        };
      }
      if (sorted[1]) {
        grp.silverWinner = {
          nama: sorted[1].nama,
          kontingen: sorted[1].kontingen,
          scoreInfo: `Nilai: ${sorted[1].finalScore ? sorted[1].finalScore.toFixed(3) : '-'}`
        };
      }
      if (sorted[2]) {
        grp.bronzeWinners.push({
          nama: sorted[2].nama,
          kontingen: sorted[2].kontingen,
          scoreInfo: `Nilai: ${sorted[2].finalScore ? sorted[2].finalScore.toFixed(3) : '-'}`
        });
      }

      groupsMap[key] = grp;
    });

    let result = Object.values(groupsMap);

    // Filter Category
    if (selectedCategoryFilter !== 'semua') {
      const filterLower = selectedCategoryFilter.toLowerCase();
      result = result.filter(g => g.categoryName.toLowerCase().includes(filterLower));
    }

    // Filter Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(g =>
        g.categoryName.toLowerCase().includes(q) ||
        g.goldWinner?.nama.toLowerCase().includes(q) ||
        g.goldWinner?.kontingen.toLowerCase().includes(q) ||
        g.silverWinner?.nama.toLowerCase().includes(q) ||
        g.silverWinner?.kontingen.toLowerCase().includes(q)
      );
    }

    return result;
  }, [histories, completedTgr, selectedCategoryFilter, searchQuery]);

  // Filtered Tanding Histories
  const filteredHistories = useMemo(() => {
    return histories.filter(h => {
      const matchQuery = searchQuery.toLowerCase();
      const namaM = h.atletMerah.nama.toLowerCase();
      const kontingenM = h.atletMerah.kontingen.toLowerCase();
      const namaB = h.atletBiru.nama.toLowerCase();
      const kontingenB = h.atletBiru.kontingen.toLowerCase();
      const partai = h.partai.toLowerCase();
      const kelas = h.kelas.toLowerCase();

      return (
        namaM.includes(matchQuery) ||
        kontingenM.includes(matchQuery) ||
        namaB.includes(matchQuery) ||
        kontingenB.includes(matchQuery) ||
        partai.includes(matchQuery) ||
        kelas.includes(matchQuery)
      );
    });
  }, [histories, searchQuery]);

  // Filtered TGR
  const filteredTgr = useMemo(() => {
    return completedTgr.filter(p => {
      const q = searchQuery.toLowerCase();
      return (
        p.nama.toLowerCase().includes(q) ||
        p.kontingen.toLowerCase().includes(q) ||
        p.kategori.toLowerCase().includes(q) ||
        `no ${p.noUrut}`.includes(q)
      );
    });
  }, [completedTgr, searchQuery]);

  // Quick stats metrics
  const totalSelesaiTanding = histories.length;
  const totalSelesaiSeni = completedTgr.length;
  const topKontingen = kontingenDetailedTally.length > 0 ? kontingenDetailedTally[0] : null;

  // Print/Export Report Function
  const handleExportCSV = () => {
    playBeep('click');
    let csvContent = "data:text/csv;charset=utf-8,";
    
    csvContent += "=== REKAPITULASI MEDALI PER KONTINGEN & BREAKDOWN KATEGORI ===\n";
    csvContent += "Peringkat,Nama Kontingen,Emas (Gold),Perak (Silver),Perunggu (Bronze),Total Medali,Tanding Gold,Seni Tunggal Gold,Seni Ganda Gold,Seni Regu Gold\n";

    kontingenDetailedTally.forEach((item, idx) => {
      csvContent += `${idx + 1},"${item.kontingen}",${item.gold},${item.silver},${item.bronze},${item.total},${item.byCategory.tanding.gold},${item.byCategory.tunggal.gold},${item.byCategory.ganda.gold},${item.byCategory.regu.gold}\n`;
    });

    csvContent += "\n=== REKAPITULASI PEMENANG MEDALI PER KATEGORI PERTANDINGAN ===\n";
    csvContent += "Kategori,Tipe,Juara 1 (Emas),Kontingen Emas,Juara 2 (Perak),Kontingen Perak,Juara 3 (Perunggu),Kontingen Perunggu\n";

    categoryMedalWinners.forEach(g => {
      const goldNama = g.goldWinner ? `"${g.goldWinner.nama}"` : '"-"';
      const goldKont = g.goldWinner ? `"${g.goldWinner.kontingen}"` : '"-"';
      const silverNama = g.silverWinner ? `"${g.silverWinner.nama}"` : '"-"';
      const silverKont = g.silverWinner ? `"${g.silverWinner.kontingen}"` : '"-"';
      const bronzeNama = g.bronzeWinners.length > 0 ? `"${g.bronzeWinners[0].nama}"` : '"-"';
      const bronzeKont = g.bronzeWinners.length > 0 ? `"${g.bronzeWinners[0].kontingen}"` : '"-"';

      csvContent += `"${g.categoryName}","${g.type}",${goldNama},${goldKont},${silverNama},${silverKont},${bronzeNama},${bronzeKont}\n`;
    });

    csvContent += "\n=== DETAIL REKAPITULASI HASIL LAGA TANDING ===\n";
    csvContent += "Partai,Kelas,Gender,Sudut Merah,Kontingen Merah,Skor Merah,Sudut Biru,Kontingen Biru,Skor Biru,Pemenang\n";

    histories.forEach(h => {
      const winnerName = h.winner === 'merah' ? h.atletMerah.nama : h.winner === 'biru' ? h.atletBiru.nama : 'DRAW';
      csvContent += `"${h.partai}","${h.kelas}","${h.gender}","${h.atletMerah.nama}","${h.atletMerah.kontingen}",${h.skorAkhirMerah},"${h.atletBiru.nama}","${h.atletBiru.kontingen}",${h.skorAkhirBiru},"${winnerName}"\n`;
    });

    csvContent += "\n=== DETAIL REKAPITULASI HASIL SENI TGR ===\n";
    csvContent += "Peringkat,No Urut,Nama Peserta,Kontingen,Kategori,Nilai Akhir\n";

    completedTgr.forEach((p, idx) => {
      csvContent += `${p.ranking || (idx + 1)},${p.noUrut},"${p.nama}","${p.kontingen}","${p.kategori}",${p.finalScore?.toFixed(3) || '-'}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rekapitulasi_Medali_Kategori_Kontingen_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    playBeep('click');
    window.print();
  };

  return (
    <div className={`w-full max-w-7xl mx-auto ${className}`}>
      
      {/* 1. COMPONENT HEADER BANNER */}
      <div className="relative border border-amber-500/30 rounded-3xl p-5 sm:p-7 bg-gradient-to-b from-[#0b081b]/90 via-[#070514]/90 to-[#03020b]/90 backdrop-blur-xl shadow-[0_0_50px_rgba(245,158,11,0.12)] overflow-hidden">
        
        {/* Visual background lights */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
        
        {/* Top Header Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 z-10 relative pb-6 border-b border-slate-800/80">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/40 bg-amber-950/40 text-[9px] font-mono font-black tracking-widest text-amber-300 uppercase mb-2">
              <Trophy className="w-3 h-3 text-amber-400 animate-pulse" />
              <span>TOURNAMENT OFFICIAL RECAP & RESULTS</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black font-sport tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-white to-amber-500 uppercase">
              {title}
            </h2>
            <p className="text-[10px] sm:text-xs font-mono font-bold text-slate-400 mt-1 uppercase tracking-wider">
              {subtitle}
            </p>
          </div>

          {/* Action Buttons: Export & Print */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/30 text-amber-300 hover:text-white text-[10px] font-mono font-black tracking-wider uppercase transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
              title="Ekspor data rekapitulasi ke file CSV/Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>EKSPOR CSV</span>
            </button>
            
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-sport font-black tracking-wider uppercase transition-all shadow-lg flex items-center gap-2 cursor-pointer active:scale-95"
              title="Cetak lembar rekapitulasi hasil"
            >
              <Printer className="w-4 h-4" />
              <span>CETAK HASIL</span>
            </button>
          </div>
        </div>

        {/* 2. STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 my-6 z-10 relative">
          {/* Card 1: Total Completed Tanding Matches */}
          <div className="border border-slate-800/90 rounded-2xl p-3.5 bg-slate-950/70 flex flex-col justify-between">
            <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">
              PARTAI TANDING SELESAI
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl sm:text-3xl font-black font-sport text-cyan-400 tracking-wider">
                {totalSelesaiTanding}
              </span>
              <span className="text-[9px] font-mono text-slate-500 uppercase">PARTAI</span>
            </div>
          </div>

          {/* Card 2: Total Completed Seni Participants */}
          <div className="border border-slate-800/90 rounded-2xl p-3.5 bg-slate-950/70 flex flex-col justify-between">
            <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">
              PESERTA SENI SELESAI
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl sm:text-3xl font-black font-sport text-purple-400 tracking-wider">
                {totalSelesaiSeni}
              </span>
              <span className="text-[9px] font-mono text-slate-500 uppercase">PENAMPILAN</span>
            </div>
          </div>

          {/* Card 3: Leading Contingent */}
          <div className="border border-amber-500/30 rounded-2xl p-3.5 bg-amber-950/20 flex flex-col justify-between">
            <span className="text-[9px] font-mono font-bold text-amber-400 uppercase tracking-wider block mb-1">
              KONTINGEN MEMIMPIN
            </span>
            <div className="flex items-center justify-between mt-1 truncate">
              <span className="text-sm sm:text-base font-black font-sport text-amber-300 truncate uppercase">
                {topKontingen ? topKontingen.kontingen : 'BELUM ADA'}
              </span>
              {topKontingen && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[9px] font-extrabold font-mono shrink-0">
                  {topKontingen.gold} 🥇
                </span>
              )}
            </div>
          </div>

          {/* Card 4: Total Match Categories */}
          <div className="border border-slate-800/90 rounded-2xl p-3.5 bg-slate-950/70 flex flex-col justify-between">
            <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">
              TOTAL KLASEMEN MEDALI
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl sm:text-3xl font-black font-sport text-emerald-400 tracking-wider">
                {kontingenDetailedTally.length}
              </span>
              <span className="text-[9px] font-mono text-slate-500 uppercase">KONTINGEN</span>
            </div>
          </div>
        </div>

        {/* 3. TABS & FILTER SELECTORS BAR */}
        <div className="flex flex-col gap-3 z-10 relative pt-2">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            
            {/* Main Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 overflow-x-auto">
              <button
                onClick={() => { playBeep('click'); setActiveTab('klasemen_kontingen'); }}
                className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black font-sport tracking-wider uppercase transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'klasemen_kontingen'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>MEDALI PER KONTINGEN</span>
              </button>

              <button
                onClick={() => { playBeep('click'); setActiveTab('klasemen_kategori'); }}
                className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black font-sport tracking-wider uppercase transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'klasemen_kategori'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Medal className="w-3.5 h-3.5" />
                <span>MEDALI PER KATEGORI</span>
              </button>

              <button
                onClick={() => { playBeep('click'); setActiveTab('tanding'); }}
                className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black font-sport tracking-wider uppercase transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'tanding'
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                HASIL TANDING ({histories.length})
              </button>

              <button
                onClick={() => { playBeep('click'); setActiveTab('seni'); }}
                className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black font-sport tracking-wider uppercase transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'seni'
                    ? 'bg-purple-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                HASIL SENI TGR ({completedTgr.length})
              </button>

              <button
                onClick={() => { playBeep('click'); setActiveTab('semua'); }}
                className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black font-sport tracking-wider uppercase transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'semua'
                    ? 'bg-slate-200 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                SEMUA REKAP
              </button>
            </div>

            {/* Filter Dropdowns & Search */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              
              {/* Filter Kontingen Dropdown */}
              <select
                value={selectedKontingenFilter}
                onChange={(e) => { playBeep('click'); setSelectedKontingenFilter(e.target.value); }}
                className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-[10px] font-mono font-bold text-slate-300 uppercase focus:outline-none focus:border-amber-500/60"
              >
                <option value="semua">SEMUA KONTINGEN ({allKontingens.length})</option>
                {allKontingens.map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>

              {/* Filter Kategori Dropdown */}
              <select
                value={selectedCategoryFilter}
                onChange={(e) => { playBeep('click'); setSelectedCategoryFilter(e.target.value); }}
                className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-[10px] font-mono font-bold text-slate-300 uppercase focus:outline-none focus:border-amber-500/60"
              >
                <option value="semua">SEMUA KATEGORI ({allCategories.length})</option>
                <option value="tanding">HANYA TANDING</option>
                <option value="tunggal">SENI TUNGGAL</option>
                <option value="ganda">SENI GANDA</option>
                <option value="regu">SENI REGU</option>
                <option value="bebas">SOLO CREATIVE / BEBAS</option>
              </select>

              {/* Search Bar */}
              <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari kontingen, atlet, kategori..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition-colors font-mono"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

            </div>

          </div>
        </div>

        {/* 4. CONTENT DISPLAY BY TAB */}
        <div className="mt-6 z-10 relative min-h-[280px]">

          {/* TAB: REKAP MEDALI BY KONTINGEN */}
          {(activeTab === 'klasemen_kontingen' || activeTab === 'semua') && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black font-sport tracking-wider text-amber-400 uppercase flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>KLASEMEN PEROLEHAN MEDALI KONTINGEN & BREAKDOWN KATEGORI</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-500 uppercase">
                  {kontingenDetailedTally.length} KONTINGEN TERINVENTARISASI
                </span>
              </div>

              {kontingenDetailedTally.length === 0 ? (
                <div className="p-8 text-center border border-slate-800/80 rounded-2xl bg-slate-950/50">
                  <Trophy className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs font-mono text-slate-400 uppercase">
                    Belum ada data perolehan medali kontingen yang cocok dengan kriteria filter.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-800/90 rounded-2xl bg-slate-950/80 overflow-hidden shadow-xl">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 bg-slate-900/90 text-[9.5px] font-black font-mono uppercase tracking-wider text-slate-400 py-3 px-3 border-b border-slate-800 text-center items-center">
                    <div className="col-span-1 text-left pl-2">NO</div>
                    <div className="col-span-4 lg:col-span-3 text-left">NAMA KONTINGEN</div>
                    <div className="hidden lg:block lg:col-span-4 text-center text-slate-500">BREAKDOWN KATEGORI (EMAS 🥇)</div>
                    <div className="col-span-2 lg:col-span-1 text-amber-400">EMAS 🥇</div>
                    <div className="col-span-2 lg:col-span-1 text-slate-300">PERAK 🥈</div>
                    <div className="col-span-2 lg:col-span-1 text-amber-600">PERUNGGU 🥉</div>
                    <div className="col-span-1 text-emerald-400 font-extrabold pr-2 text-right">TOTAL</div>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-slate-800/70">
                    {kontingenDetailedTally.map((item, idx) => {
                      const isExpanded = expandedKontingen === item.kontingen;

                      return (
                        <div key={item.kontingen} className="transition-colors">
                          <div
                            onClick={() => { playBeep('click'); setExpandedKontingen(isExpanded ? null : item.kontingen); }}
                            className={`grid grid-cols-12 items-center p-3 text-xs cursor-pointer hover:bg-slate-900/80 transition-colors ${
                              idx === 0 ? 'bg-amber-950/20' : ''
                            }`}
                          >
                            <div className="col-span-1 font-mono font-bold text-slate-500 pl-2 flex items-center gap-1">
                              <span>#{idx + 1}</span>
                              <ChevronRight className={`w-3 h-3 text-slate-500 transition-transform ${isExpanded ? 'rotate-90 text-amber-400' : ''}`} />
                            </div>

                            <div className="col-span-4 lg:col-span-3 font-black font-sport uppercase text-slate-100 truncate pr-2">
                              {item.kontingen}
                              {idx === 0 && (
                                <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 text-[8px] font-extrabold font-mono inline-block">
                                  CHAMPION
                                </span>
                              )}
                            </div>

                            {/* Category breakdown (Gold badges) */}
                            <div className="hidden lg:flex lg:col-span-4 items-center justify-center gap-1.5 text-[9px] font-mono">
                              {item.byCategory.tanding.gold > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300">
                                  Tanding: {item.byCategory.tanding.gold}
                                </span>
                              )}
                              {item.byCategory.tunggal.gold > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-purple-950 border border-purple-800 text-purple-300">
                                  Tunggal: {item.byCategory.tunggal.gold}
                                </span>
                              )}
                              {item.byCategory.ganda.gold > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-800 text-indigo-300">
                                  Ganda: {item.byCategory.ganda.gold}
                                </span>
                              )}
                              {item.byCategory.regu.gold > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300">
                                  Regu: {item.byCategory.regu.gold}
                                </span>
                              )}
                              {item.byCategory.bebas.gold > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300">
                                  Bebas: {item.byCategory.bebas.gold}
                                </span>
                              )}
                              {item.gold === 0 && (
                                <span className="text-slate-600 font-mono text-[9px]">-</span>
                              )}
                            </div>

                            <div className="col-span-2 lg:col-span-1 text-center font-black font-sport text-amber-400 text-sm">
                              {item.gold}
                            </div>
                            <div className="col-span-2 lg:col-span-1 text-center font-black font-sport text-slate-300 text-sm">
                              {item.silver}
                            </div>
                            <div className="col-span-2 lg:col-span-1 text-center font-black font-sport text-amber-600 text-sm">
                              {item.bronze}
                            </div>
                            <div className="col-span-1 text-right font-black font-sport text-emerald-400 text-sm pr-2">
                              {item.total}
                            </div>
                          </div>

                          {/* Expandable Medalists Detail */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-slate-900/90 border-t border-b border-slate-800 p-4 font-mono text-xs"
                              >
                                <h5 className="text-[10px] font-black font-sport text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                  <Medal className="w-3.5 h-3.5 text-amber-400" />
                                  DAFTAR PEROLEHAN MEDALIS KONTINGEN {item.kontingen}:
                                </h5>

                                {item.medalists.length === 0 ? (
                                  <p className="text-[10px] text-slate-500 uppercase">Belum ada medalis untuk kontingen ini.</p>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {item.medalists.map((m, mIdx) => (
                                      <div
                                        key={mIdx}
                                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                                          m.medalType === 'gold'
                                            ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                                            : m.medalType === 'silver'
                                            ? 'bg-slate-800/40 border-slate-700 text-slate-200'
                                            : 'bg-amber-950/20 border-amber-800/40 text-amber-400'
                                        }`}
                                      >
                                        <div className="truncate pr-2">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-sm">
                                              {m.medalType === 'gold' ? '🥇' : m.medalType === 'silver' ? '🥈' : '🥉'}
                                            </span>
                                            <span className="font-extrabold uppercase font-sport">{m.atletNama}</span>
                                          </div>
                                          <span className="text-[9.5px] text-slate-400 block truncate mt-0.5">
                                            {m.category} • {m.scoreOrDetail}
                                          </span>
                                        </div>
                                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-950 border border-slate-800 shrink-0">
                                          {m.medalType.toUpperCase()}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>

                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: REKAP MEDALI BY KATEGORI */}
          {(activeTab === 'klasemen_kategori' || activeTab === 'semua') && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black font-sport tracking-wider text-emerald-400 uppercase flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span>REKAPITULASI PEMENANG MEDALI PER KATEGORI PERTANDINGAN</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-500 uppercase">
                  {categoryMedalWinners.length} KATEGORI TERDATA
                </span>
              </div>

              {categoryMedalWinners.length === 0 ? (
                <div className="p-8 text-center border border-slate-800/80 rounded-2xl bg-slate-950/50">
                  <Award className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs font-mono text-slate-400 uppercase">
                    Belum ada data pemenang medali per kategori yang cocok dengan pencarian.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {categoryMedalWinners.map(catGroup => (
                    <div
                      key={catGroup.categoryKey}
                      className="border border-slate-800/90 rounded-2xl bg-slate-950/80 p-4 shadow-xl"
                    >
                      {/* Header Category Name */}
                      <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase ${
                            catGroup.type === 'TANDING'
                              ? 'bg-cyan-950 border border-cyan-800 text-cyan-300'
                              : 'bg-purple-950 border border-purple-800 text-purple-300'
                          }`}>
                            {catGroup.type}
                          </span>
                          <h4 className="text-sm font-black font-sport text-amber-300 uppercase tracking-wide">
                            {catGroup.categoryName}
                          </h4>
                        </div>
                      </div>

                      {/* Medalists Podium Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        
                        {/* 🥇 JUARA 1 (EMAS) */}
                        <div className="p-3 rounded-xl border border-amber-500/50 bg-amber-950/30 flex flex-col justify-between">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[9px] font-mono font-extrabold text-amber-400 uppercase flex items-center gap-1">
                              🥇 JUARA 1 (EMAS)
                            </span>
                            <span className="text-[9px] font-mono text-amber-300/80">{catGroup.goldWinner?.scoreInfo || '-'}</span>
                          </div>
                          <h5 className="text-xs font-black font-sport uppercase text-white truncate">
                            {catGroup.goldWinner ? catGroup.goldWinner.nama : 'BELUM SELESAI'}
                          </h5>
                          <p className="text-[10px] font-mono text-amber-300 uppercase truncate mt-0.5">
                            {catGroup.goldWinner ? catGroup.goldWinner.kontingen : '-'}
                          </p>
                        </div>

                        {/* 🥈 JUARA 2 (PERAK) */}
                        <div className="p-3 rounded-xl border border-slate-600/50 bg-slate-900/60 flex flex-col justify-between">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[9px] font-mono font-extrabold text-slate-300 uppercase flex items-center gap-1">
                              🥈 JUARA 2 (PERAK)
                            </span>
                            <span className="text-[9px] font-mono text-slate-400">{catGroup.silverWinner?.scoreInfo || '-'}</span>
                          </div>
                          <h5 className="text-xs font-black font-sport uppercase text-slate-200 truncate">
                            {catGroup.silverWinner ? catGroup.silverWinner.nama : 'BELUM SELESAI'}
                          </h5>
                          <p className="text-[10px] font-mono text-slate-400 uppercase truncate mt-0.5">
                            {catGroup.silverWinner ? catGroup.silverWinner.kontingen : '-'}
                          </p>
                        </div>

                        {/* 🥉 JUARA 3 (PERUNGGU) */}
                        <div className="p-3 rounded-xl border border-amber-800/50 bg-amber-950/10 flex flex-col justify-between">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[9px] font-mono font-extrabold text-amber-600 uppercase flex items-center gap-1">
                              🥉 JUARA 3 (PERUNGGU)
                            </span>
                            <span className="text-[9px] font-mono text-amber-700/80">
                              {catGroup.bronzeWinners[0]?.scoreInfo || '-'}
                            </span>
                          </div>
                          <h5 className="text-xs font-black font-sport uppercase text-amber-200/90 truncate">
                            {catGroup.bronzeWinners[0] ? catGroup.bronzeWinners[0].nama : 'BELUM SELESAI'}
                          </h5>
                          <p className="text-[10px] font-mono text-amber-600 uppercase truncate mt-0.5">
                            {catGroup.bronzeWinners[0] ? catGroup.bronzeWinners[0].kontingen : '-'}
                          </p>
                        </div>

                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* TAB 1: ALL OR TANDING MATCHES */}
          {(activeTab === 'semua' || activeTab === 'tanding') && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black font-sport tracking-wider text-cyan-400 uppercase flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span>DAFTAR PEMENANG PARTAI TANDING</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-500">
                  {filteredHistories.length} PARTAI DITEMUKAN
                </span>
              </div>

              {filteredHistories.length === 0 ? (
                <div className="p-8 text-center border border-slate-800/80 rounded-2xl bg-slate-950/50">
                  <Trophy className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs font-mono text-slate-400 uppercase">
                    {searchQuery ? 'Tidak ada data partai tanding yang cocok dengan pencarian.' : 'Belum ada partai tanding yang diselesaikan.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredHistories.map((h) => {
                    const isMerahWinner = h.winner === 'merah';
                    const isBiruWinner = h.winner === 'biru';

                    return (
                      <motion.div
                        key={h.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => setSelectedDetail({ type: 'tanding', data: h })}
                        className="border border-slate-800/90 rounded-2xl bg-slate-950/80 hover:bg-slate-900/90 p-4 transition-all duration-200 cursor-pointer shadow-lg hover:border-cyan-500/40 relative group overflow-hidden"
                      >
                        {/* Top Bar info */}
                        <div className="flex justify-between items-center pb-2 border-b border-slate-800/80 mb-3 text-[10px] font-mono">
                          <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800/50 text-cyan-300 font-extrabold uppercase">
                            {h.partai} • {h.kelas} ({h.gender})
                          </span>
                          <span className="text-slate-500">
                            {h.tanggal ? new Date(h.tanggal).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Selesai'}
                          </span>
                        </div>

                        {/* Athletes matchup display */}
                        <div className="grid grid-cols-12 items-center gap-2">
                          {/* Sudut Merah */}
                          <div className={`col-span-5 p-2.5 rounded-xl border transition-all ${
                            isMerahWinner
                              ? 'bg-rose-950/60 border-rose-500/70 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className="text-[8px] font-mono font-bold uppercase text-rose-400">MERAH</span>
                              {isMerahWinner && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 text-[8px] font-extrabold font-sport uppercase">
                                  <Trophy className="w-2.5 h-2.5" /> PEMENANG
                                </span>
                              )}
                            </div>
                            <h4 className={`text-xs font-black uppercase font-sport mt-1 truncate ${isMerahWinner ? 'text-white' : 'text-slate-300'}`}>
                              {h.atletMerah.nama}
                            </h4>
                            <p className="text-[9px] font-mono text-slate-400 truncate uppercase mt-0.5">
                              {h.atletMerah.kontingen}
                            </p>
                            <div className="mt-2 text-right">
                              <span className={`text-xl font-black font-sport ${isMerahWinner ? 'text-rose-400' : 'text-slate-400'}`}>
                                {h.skorAkhirMerah}
                              </span>
                            </div>
                          </div>

                          {/* VS Divider */}
                          <div className="col-span-2 text-center">
                            <span className="text-[10px] font-black font-sport text-slate-600 block">VS</span>
                          </div>

                          {/* Sudut Biru */}
                          <div className={`col-span-5 p-2.5 rounded-xl border transition-all ${
                            isBiruWinner
                              ? 'bg-blue-950/60 border-blue-500/70 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className="text-[8px] font-mono font-bold uppercase text-blue-400">BIRU</span>
                              {isBiruWinner && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 text-[8px] font-extrabold font-sport uppercase">
                                  <Trophy className="w-2.5 h-2.5" /> PEMENANG
                                </span>
                              )}
                            </div>
                            <h4 className={`text-xs font-black uppercase font-sport mt-1 truncate ${isBiruWinner ? 'text-white' : 'text-slate-300'}`}>
                              {h.atletBiru.nama}
                            </h4>
                            <p className="text-[9px] font-mono text-slate-400 truncate uppercase mt-0.5">
                              {h.atletBiru.kontingen}
                            </p>
                            <div className="mt-2 text-right">
                              <span className={`text-xl font-black font-sport ${isBiruWinner ? 'text-blue-400' : 'text-slate-400'}`}>
                                {h.skorAkhirBiru}
                              </span>
                            </div>
                          </div>
                        </div>

                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ALL OR SENI TGR PARTICIPANTS */}
          {(activeTab === 'semua' || activeTab === 'seni') && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black font-sport tracking-wider text-purple-400 uppercase flex items-center gap-2">
                  <Star className="w-4 h-4 text-purple-400" />
                  <span>KLASEMEN PEROLEHAN SKOR SENI TGR</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-500">
                  {filteredTgr.length} PESERTA SELESAI
                </span>
              </div>

              {filteredTgr.length === 0 ? (
                <div className="p-8 text-center border border-slate-800/80 rounded-2xl bg-slate-950/50">
                  <Award className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs font-mono text-slate-400 uppercase">
                    {searchQuery ? 'Tidak ada data peserta seni yang cocok dengan pencarian.' : 'Belum ada penilaian kategori seni TGR yang diselesaikan.'}
                  </p>
                </div>
              ) : (
                <div className="border border-slate-800/90 rounded-2xl bg-slate-950/80 overflow-hidden shadow-xl">
                  <div className="grid grid-cols-12 bg-slate-900/90 text-[9.5px] font-black font-mono uppercase tracking-wider text-slate-400 py-2 px-3 border-b border-slate-800 text-center">
                    <div className="col-span-2 text-left">PERINGKAT</div>
                    <div className="col-span-4 text-left">NAMA ATLET / KONTINGEN</div>
                    <div className="col-span-3">KATEGORI SENI</div>
                    <div className="col-span-3 text-right pr-2">SKOR AKHIR</div>
                  </div>

                  <div className="divide-y divide-slate-800/70">
                    {filteredTgr.map((p, idx) => {
                      const rank = p.ranking || (idx + 1);
                      const isGold = rank === 1;
                      const isSilver = rank === 2;
                      const isBronze = rank === 3;

                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedDetail({ type: 'seni', data: p })}
                          className={`grid grid-cols-12 items-center p-3 text-xs cursor-pointer hover:bg-slate-900/90 transition-colors ${
                            isGold ? 'bg-amber-950/20' : isSilver ? 'bg-slate-900/40' : isBronze ? 'bg-amber-950/10' : ''
                          }`}
                        >
                          {/* Rank */}
                          <div className="col-span-2 flex items-center gap-2">
                            {isGold && (
                              <span className="w-6 h-6 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black text-[10px] font-sport shadow">
                                🥇
                              </span>
                            )}
                            {isSilver && (
                              <span className="w-6 h-6 rounded-full bg-gradient-to-r from-slate-300 to-slate-400 text-slate-950 flex items-center justify-center font-black text-[10px] font-sport shadow">
                                🥈
                              </span>
                            )}
                            {isBronze && (
                              <span className="w-6 h-6 rounded-full bg-gradient-to-r from-amber-700 to-amber-800 text-white flex items-center justify-center font-black text-[10px] font-sport shadow">
                                🥉
                              </span>
                            )}
                            {!isGold && !isSilver && !isBronze && (
                              <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[10px] font-mono">
                                {rank}
                              </span>
                            )}
                            <span className="font-black font-sport uppercase text-slate-200">
                              JUARA {rank}
                            </span>
                          </div>

                          {/* Athlete & Contingent */}
                          <div className="col-span-4">
                            <h4 className="font-black font-sport uppercase text-slate-100 truncate">
                              {p.nama}
                            </h4>
                            <p className="text-[10px] font-mono text-slate-400 uppercase truncate">
                              {p.kontingen}
                            </p>
                          </div>

                          {/* Category */}
                          <div className="col-span-3 text-center">
                            <span className="px-2.5 py-1 rounded-full bg-purple-950 border border-purple-800/60 text-purple-300 font-mono text-[10px] font-extrabold uppercase">
                              {p.kategori}
                            </span>
                          </div>

                          {/* Final Score */}
                          <div className="col-span-3 text-right pr-2">
                            <span className="text-base sm:text-lg font-black font-sport text-amber-400 tracking-wider">
                              {p.finalScore ? p.finalScore.toFixed(3) : '-'}
                            </span>
                            <span className="text-[9px] font-mono text-slate-500 block uppercase">
                              Deductions: -{p.deductions.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* 5. INTERACTIVE DETAIL MODAL */}
      <AnimatePresence>
        {selectedDetail && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="border border-amber-500/40 rounded-3xl p-6 bg-slate-950 max-w-lg w-full shadow-2xl relative overflow-hidden"
            >
              <button
                onClick={() => setSelectedDetail(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              >
                <X className="w-4 h-4" />
              </button>

              {selectedDetail.type === 'tanding' ? (
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950 border border-cyan-800/50 text-cyan-300 font-mono text-[9px] font-bold uppercase mb-3">
                    <Shield className="w-3 h-3" /> RINCIAN HASIL PARTAI TANDING
                  </div>
                  <h3 className="text-xl font-black font-sport text-amber-400 uppercase">
                    {selectedDetail.data.partai} - {selectedDetail.data.kelas} ({selectedDetail.data.gender})
                  </h3>

                  <div className="mt-4 space-y-3 font-mono text-xs">
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                      <div>
                        <span className="text-[9px] text-rose-400 font-bold block">SUDUT MERAH</span>
                        <span className="font-bold text-white uppercase">{selectedDetail.data.atletMerah.nama}</span>
                        <span className="text-[10px] text-slate-400 block">{selectedDetail.data.atletMerah.kontingen}</span>
                      </div>
                      <span className="text-2xl font-black font-sport text-rose-400">
                        {selectedDetail.data.skorAkhirMerah}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                      <div>
                        <span className="text-[9px] text-blue-400 font-bold block">SUDUT BIRU</span>
                        <span className="font-bold text-white uppercase">{selectedDetail.data.atletBiru.nama}</span>
                        <span className="text-[10px] text-slate-400 block">{selectedDetail.data.atletBiru.kontingen}</span>
                      </div>
                      <span className="text-2xl font-black font-sport text-blue-400">
                        {selectedDetail.data.skorAkhirBiru}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 text-center">
                      <span className="text-[9px] font-bold text-amber-400 uppercase block">PEMENANG PARTAI</span>
                      <span className="text-sm font-black font-sport text-white uppercase mt-1 block">
                        {selectedDetail.data.winner === 'merah'
                          ? `${selectedDetail.data.atletMerah.nama} (${selectedDetail.data.atletMerah.kontingen})`
                          : `${selectedDetail.data.atletBiru.nama} (${selectedDetail.data.atletBiru.kontingen})`}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950 border border-purple-800/50 text-purple-300 font-mono text-[9px] font-bold uppercase mb-3">
                    <Award className="w-3 h-3" /> RINCIAN PENILAIAN SENI TGR
                  </div>
                  <h3 className="text-xl font-black font-sport text-amber-400 uppercase">
                    {selectedDetail.data.nama} ({selectedDetail.data.kontingen})
                  </h3>

                  <div className="mt-4 space-y-3 font-mono text-xs">
                    <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 uppercase">Kategori Seni:</span>
                      <span className="font-extrabold text-purple-400 uppercase">{selectedDetail.data.kategori}</span>
                    </div>

                    <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 uppercase">Peringkat / Juara:</span>
                      <span className="font-extrabold text-amber-400 uppercase">JUARA {selectedDetail.data.ranking || 1}</span>
                    </div>

                    <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 uppercase">Pengurangan Nilai Dewan:</span>
                      <span className="font-extrabold text-rose-400 font-mono">-{selectedDetail.data.deductions?.toFixed(3)}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-center">
                      <span className="text-[9px] font-bold text-amber-400 uppercase block">SKOR TOTAL AKHIR</span>
                      <span className="text-3xl font-black font-sport text-amber-300 block mt-1">
                        {selectedDetail.data.finalScore?.toFixed(3)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

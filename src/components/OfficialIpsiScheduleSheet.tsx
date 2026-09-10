/**
 * Official IPSI Match Schedule Sheet (Format Resmi Sesuai Gambar Kejuaraan Pencak Silat)
 * Mendukung 3 Layout Resmi:
 * 1. Seni Pool System (Sesuai Gambar Hal 1, 2, 8, 9)
 * 2. Tanding Standar Dua Sudut Biru-Merah (Sesuai Gambar Hal 3, 4, 5)
 * 3. Tanding Pool 4 & Alur Partai Final (Sesuai Gambar Hal 6, 7)
 * 4. Mode Terpadu / All-in-One
 */

import React from 'react';
import { UnifiedScheduleItem } from './PortalSekretarisJadwalModal';

export type ScheduleLayoutType = 'seni_pool' | 'tanding_standard' | 'tanding_pool_bracket' | 'auto';

interface OfficialIpsiScheduleSheetProps {
  headerTitle: string;
  headerSubtitle: string;
  headerLocationDate: string;
  gelanggang: string;
  hariTanggal: string;
  sesi: string;
  pukul?: string;
  kelasCategory?: string; // e.g. "SENI | PEMASALAN" or "TANDING | PEMASALAN"
  scheduleItems: UnifiedScheduleItem[];
  emptyRowsCount?: number;
  logoKiri?: string | null;
  logoKanan?: string | null;
  logoTengah?: string | null;
  layoutMode?: ScheduleLayoutType;
}

export default function OfficialIpsiScheduleSheet({
  headerTitle = "JOMBANG PENCAK SILAT CHAMPIONSHIP - II",
  headerSubtitle = "KEJUARAAN PENCAK SILAT",
  headerLocationDate = "Jombang, 16 s/d 18 Januari 2026",
  gelanggang = "ARENA 3",
  hariTanggal = "JUM'AT, 16 JANUARI 2026",
  sesi = "1 - PAGI",
  pukul = "07:00 - SELESAI",
  kelasCategory = "",
  scheduleItems = [],
  emptyRowsCount = 2,
  logoKiri = null,
  logoKanan = null,
  logoTengah = null,
  layoutMode = 'auto'
}: OfficialIpsiScheduleSheetProps) {

  // Auto-detect dominant type if auto
  const hasSeni = scheduleItems.some(item => item.type === 'seni');
  const hasTanding = scheduleItems.some(item => item.type === 'tanding');
  
  let activeLayout = layoutMode;
  if (activeLayout === 'auto') {
    if (hasSeni && !hasTanding) {
      activeLayout = 'seni_pool';
    } else if (hasTanding && !hasSeni) {
      // Check if bracket pool style (4 athletes) is preferred
      const has4Size = scheduleItems.some(item => item.rawTanding?.cat?.size === 4);
      activeLayout = has4Size ? 'tanding_pool_bracket' : 'tanding_standard';
    } else {
      activeLayout = 'tanding_standard';
    }
  }

  // Extract Arena clean label (e.g. "3" from "ARENA 3" or "GELANGGANG I" -> "1")
  const arenaClean = gelanggang.replace(/arena|gelanggang/i, '').trim() || '3';
  const defaultKelasCategory = kelasCategory || (activeLayout === 'seni_pool' ? 'SENI | PEMASALAN' : 'TANDING | PEMASALAN');

  // Group items for Seni Pool cards
  const seniPoolGroups = React.useMemo<{ [key: string]: UnifiedScheduleItem[] }>(() => {
    const groups: { [key: string]: UnifiedScheduleItem[] } = {};
    scheduleItems.filter(i => i.type === 'seni').forEach(item => {
      const poolKey = item.partaiLabel || `Partai ${item.orderNumber}`;
      if (!groups[poolKey]) groups[poolKey] = [];
      groups[poolKey].push(item);
    });
    return groups;
  }, [scheduleItems]);

  // Group items for Tanding Pool 4 Bracket (Hal 6, 7)
  const tandingPool4Groups = React.useMemo(() => {
    const pools: {
      key: string;
      kelas: string;
      poolLetter: string;
      partaiSemi1: string;
      partaiSemi2: string;
      partaiFinal: string;
      atlet1: { nama: string; kontingen: string };
      atlet2: { nama: string; kontingen: string };
      atlet3: { nama: string; kontingen: string };
      atlet4: { nama: string; kontingen: string };
    }[] = [];

    // Group by category id or name
    const catMap = new Map<string, UnifiedScheduleItem[]>();
    scheduleItems.filter(i => i.type === 'tanding').forEach(item => {
      const catId = item.rawTanding?.cat?.id || item.categoryName;
      if (!catMap.has(catId)) catMap.set(catId, []);
      catMap.get(catId)!.push(item);
    });

    catMap.forEach((items, catKey) => {
      const firstCat = items[0]?.rawTanding?.cat;
      const catName = firstCat?.name || items[0]?.categoryName || 'TANDING';
      const poolMatch = catName.match(/Pool\s+([A-Z0-9]+)/i);
      const poolLetter = poolMatch ? poolMatch[1] : (firstCat?.kelas ? 'A' : 'A');
      const baseKelas = (firstCat?.kelas || catName).replace(/Pool\s+[A-Z0-9]+/i, '').trim();
      const usiaGender = `${firstCat?.usia || ''} ${firstCat?.gender || ''}`.trim();
      const fullKelasDisplay = `${baseKelas} ${usiaGender}`.trim().toUpperCase();

      const match1 = items.find(i => i.rawTanding?.match?.id === 1);
      const match2 = items.find(i => i.rawTanding?.match?.id === 2);
      const match3 = items.find(i => i.rawTanding?.match?.id === 3 || i.rawTanding?.match?.round === 'final');

      const p1Number = match1 ? match1.partaiLabel.replace(/\D/g, '') || String(match1.orderNumber) : '—';
      const p2Number = match2 ? match2.partaiLabel.replace(/\D/g, '') || String(match2.orderNumber) : '—';
      const pFinalNumber = match3 ? match3.partaiLabel.replace(/\D/g, '') || String(match3.orderNumber) : '—';

      pools.push({
        key: catKey,
        kelas: fullKelasDisplay || 'PRA-REMAJA PUTRI',
        poolLetter: poolLetter || 'A',
        partaiSemi1: p1Number,
        partaiSemi2: p2Number,
        partaiFinal: pFinalNumber,
        atlet1: match1 ? { nama: match1.party1Name, kontingen: match1.party1Kontingen } : { nama: '', kontingen: '' },
        atlet2: match1 ? { nama: match1.party2Name, kontingen: match1.party2Kontingen } : { nama: '', kontingen: '' },
        atlet3: match2 ? { nama: match2.party1Name, kontingen: match2.party1Kontingen } : { nama: '', kontingen: '' },
        atlet4: match2 ? { nama: match2.party2Name, kontingen: match2.party2Kontingen } : { nama: '', kontingen: '' },
      });
    });

    return pools;
  }, [scheduleItems]);

  return (
    <div className="printable-schedule-area w-full max-w-5xl mx-auto bg-white text-black p-3 sm:p-5 md:p-8 font-sans select-none print:p-0 print:m-0 print:max-w-none print:shadow-none shadow-2xl border border-slate-300 transition-all">
      
      {/* ========================================================================= */}
      {/* 1. TOP OFFICIAL HEADER DENGAN 3 LOGO & TEKS RESMI (Sesuai Gambar 1 - 9)  */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between gap-3 mb-3 pb-2 border-b-2 border-black">
        {/* Left Logos (Daerah + IPSI) */}
        <div className="flex items-center gap-2">
          {/* Logo 1: Perisai Daerah / Logo Kiri */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 flex items-center justify-center">
            {logoKiri ? (
              <img src={logoKiri} alt="Logo Kiri" className="max-w-full max-h-full object-contain" />
            ) : (
              /* Official Regional Emblem Simulation */
              <div className="w-13 h-15 rounded-t-lg rounded-b-full border-2 border-emerald-700 bg-gradient-to-b from-emerald-500 via-yellow-400 to-emerald-600 flex flex-col items-center justify-center p-0.5 shadow-sm text-center">
                <div className="text-[7px] font-black text-white leading-none">JOMBANG</div>
                <div className="w-6 h-6 rounded-full border border-white bg-white/90 flex items-center justify-center my-0.5">
                  <span className="text-[8px]">⭐</span>
                </div>
                <div className="text-[6px] font-bold text-white leading-none">BERIMAN</div>
              </div>
            )}
          </div>

          {/* Logo 2: Lambang Resmi IPSI Indonesia */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 flex items-center justify-center">
            {logoTengah ? (
              <img src={logoTengah} alt="Logo IPSI" className="max-w-full max-h-full object-contain" />
            ) : (
              <div className="w-13 h-13 rounded-full border-2 border-red-700 bg-yellow-100 flex items-center justify-center p-0.5 shadow-sm relative">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <circle cx="50" cy="50" r="46" fill="#fef08a" stroke="#b91c1c" strokeWidth="4" />
                  <circle cx="50" cy="50" r="36" fill="none" stroke="#15803d" strokeWidth="3" />
                  {/* IPSI Rings */}
                  <circle cx="38" cy="40" r="8" fill="none" stroke="#dc2626" strokeWidth="2.5" />
                  <circle cx="50" cy="40" r="8" fill="none" stroke="#000000" strokeWidth="2.5" />
                  <circle cx="62" cy="40" r="8" fill="none" stroke="#16a34a" strokeWidth="2.5" />
                  <circle cx="44" cy="48" r="8" fill="none" stroke="#eab308" strokeWidth="2.5" />
                  <circle cx="56" cy="48" r="8" fill="none" stroke="#0284c7" strokeWidth="2.5" />
                  <text x="50" y="78" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#b91c1c" fontFamily="sans-serif">IPSI</text>
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Center: Official Title Block */}
        <div className="flex-1 text-center px-2">
          <div className="text-sm sm:text-base font-black uppercase tracking-wider text-black leading-tight">
            JADWAL PENTANDINGAN PENCAK SILAT
          </div>
          <div className="text-xs sm:text-sm font-black uppercase tracking-wide text-black leading-tight mt-0.5">
            {headerSubtitle || "KEJUARAAN PENCAK SILAT"}
          </div>
          <div className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-black leading-tight mt-0.5">
            {headerTitle || "JOMBANG PENCAK SILAT CHAMPIONSHIP - II"}
          </div>
          <div className="text-[11px] sm:text-xs font-semibold text-slate-800 leading-tight mt-0.5">
            {headerLocationDate || "Jombang, 16 s/d 18 Januari 2026"}
          </div>
        </div>

        {/* Right Logo: Tournament / Event Crest */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 flex items-center justify-center">
          {logoKanan ? (
            <img src={logoKanan} alt="Logo Kanan" className="max-w-full max-h-full object-contain" />
          ) : (
            <div className="w-14 h-14 rounded-full border-2 border-red-600 bg-amber-50 flex flex-col items-center justify-center p-1 text-center shadow-sm">
              <span className="text-[8px] font-black text-red-600 leading-none">JPSC</span>
              <span className="text-[12px] font-black text-slate-900 leading-none my-0.5">II</span>
              <span className="text-[7px] font-bold text-amber-800 leading-none">2026</span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP METADATA BOX (ARENA, KELAS, SESI, TANGGAL, PUKUL)                   */}
      {/* ========================================================================= */}
      {activeLayout !== 'tanding_pool_bracket' ? (
        <div className="border-2 border-black mb-3 grid grid-cols-12 text-xs font-bold divide-x-2 divide-black bg-white">
          {/* Arena Box with Red Highlight */}
          <div className="col-span-3 p-1.5 flex items-center justify-between gap-2">
            <span className="font-black uppercase text-black text-xs sm:text-sm">ARENA :</span>
            <span className="bg-[#e11d48] text-white font-black text-sm sm:text-base px-3 py-0.5 rounded shadow-inner">
              {arenaClean}
            </span>
          </div>

          {/* Kelas & Sesi */}
          <div className="col-span-4 p-1.5 flex flex-col justify-center gap-0.5 text-[11px] leading-tight">
            <div>
              <span className="text-slate-700">KELAS : </span>
              <span className="font-black text-black uppercase">{defaultKelasCategory}</span>
            </div>
            <div>
              <span className="text-slate-700">SESI : </span>
              <span className="font-black text-black uppercase">{sesi}</span>
            </div>
          </div>

          {/* Tanggal & Pukul */}
          <div className="col-span-5 p-1.5 flex flex-col justify-center gap-0.5 text-[11px] leading-tight">
            <div>
              <span className="text-slate-700">TANGGAL : </span>
              <span className="font-black text-black uppercase">{hariTanggal}</span>
            </div>
            <div>
              <span className="text-slate-700">PUKUL : </span>
              <span className="font-mono font-bold text-black uppercase">{pukul}</span>
            </div>
          </div>
        </div>
      ) : (
        /* Yellow Strip Header for Tanding Pool 4 Bracket (Sesuai Hal 6, 7) */
        <div className="bg-[#facc15] border-2 border-black mb-3 p-1.5 px-3 flex flex-wrap items-center justify-between gap-2 text-black font-black text-xs sm:text-sm uppercase tracking-wide">
          <span>{hariTanggal}</span>
          <span className="font-mono">{pukul || '13.00 WIB - SELESAI'}</span>
          <span>{gelanggang.toUpperCase() || 'ARENA 3'}</span>
          <span className="bg-black text-yellow-300 px-2 py-0.5 rounded text-[11px]">FINAL</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. BODY SCHEDULE TABLE BERDASARKAN FORMAT TERPILIH                       */}
      {/* ========================================================================= */}

      {/* ------------------------------------------------------------------------- */}
      {/* FORMAT A: SENI POOL SYSTEM (Sesuai Gambar Hal 1, 2, 8, 9)                 */}
      {/* ------------------------------------------------------------------------- */}
      {activeLayout === 'seni_pool' && (
        <div className="space-y-3">
          {(Object.entries(seniPoolGroups) as [string, UnifiedScheduleItem[]][]).map(([poolKey, poolItems], poolIdx) => {
            const firstItem = poolItems[0];
            const rawSeni = firstItem?.rawSeni;
            const categoryName = rawSeni?.kategori || firstItem?.categoryName || 'TUNGGAL TANGAN KOSONG';
            const gender = rawSeni?.gender || (categoryName.toLowerCase().includes('putri') ? 'PUTRI' : 'PUTRA');
            const usia = rawSeni?.usia || (categoryName.match(/DINI \d|PRA-REMAJA|REMAJA|DEWASA|USIA DINI/i)?.[0] || 'DINI 2').toUpperCase();
            const poolLetter = rawSeni?.pool || rawSeni?.poolName || (poolKey.match(/POOL\s*:?\s*([A-Z0-9]+)/i)?.[1] || String.fromCharCode(65 + (poolIdx % 26)));
            const partaiNum = firstItem?.partaiLabel?.replace(/\D/g, '') || `A${39 + poolIdx}`;

            // Clean category title
            const cleanCatTitle = categoryName
              .replace(/putra|putri/gi, '')
              .replace(/dini \d|pra-remaja|remaja|dewasa|usia dini/gi, '')
              .trim();

            const rowsCount = Math.max(poolItems.length, 2);

            return (
              <div key={poolKey} className="border-2 border-black overflow-x-auto bg-white rounded-sm shadow-sm">
                <table className="w-full min-w-[620px] sm:min-w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-black text-[10px] font-black uppercase text-black">
                      {/* Left Header Blocks */}
                      <th className="py-1 px-1.5 border-r-2 border-black text-center w-14 bg-white">
                        NO PARTAI
                      </th>
                      <th className="py-1 px-1.5 border-r-2 border-black text-center w-16 bg-white">
                        POOL : {poolLetter}
                      </th>
                      <th className="py-1 px-2 border-r-2 border-black text-center w-36 bg-white">
                        KATEGORI KELAS
                      </th>
                      
                      {/* Undian Number Header */}
                      <th className="py-1 px-1 border-r border-black text-center w-7 bg-white">
                        #
                      </th>

                      {/* Yellow Header NAMA & KONTINGEN */}
                      <th className="py-1 px-3 border-r-2 border-black text-center bg-[#ffff00] text-black font-black tracking-wider">
                        NAMA
                      </th>
                      <th className="py-1 px-3 border-r-2 border-black text-center bg-[#ffff00] text-black font-black tracking-wider w-48 sm:w-56">
                        KONTINGEN
                      </th>

                      {/* Black Header SCORE, WAKTU, NOTE */}
                      <th className="py-1 px-2 border-r border-black text-center bg-black text-white font-black w-14">
                        SCORE
                      </th>
                      <th className="py-1 px-2 border-r border-black text-center bg-black text-white font-black w-14">
                        WAKTU
                      </th>
                      <th className="py-1 px-2 text-center bg-black text-white font-black w-14">
                        NOTE
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: rowsCount }).map((_, rIdx) => {
                      const item = poolItems[rIdx];
                      const isFirstRow = rIdx === 0;

                      return (
                        <tr key={rIdx} className="border-b border-black text-black h-8 text-[11px]">
                          {/* Row 1: Merged NO PARTAI */}
                          {isFirstRow && (
                            <td 
                              rowSpan={rowsCount} 
                              className="py-1 px-1 border-r-2 border-black text-center font-black text-sm font-mono bg-white align-middle"
                            >
                              {partaiNum}
                            </td>
                          )}

                          {/* Row 1: Merged POOL / ROUND / USIA with Gender Badge */}
                          {isFirstRow && (
                            <td 
                              rowSpan={rowsCount} 
                              className="py-1 px-1 border-r-2 border-black text-center bg-white align-middle"
                            >
                              <div className="flex flex-col items-center justify-center gap-0.5">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black text-white uppercase ${
                                  gender.toUpperCase() === 'PUTRI' ? 'bg-[#dc2626]' : 'bg-[#0284c7]'
                                }`}>
                                  {gender}
                                </span>
                                <span className="text-[9px] font-bold text-slate-800">ROUND</span>
                                <span className="text-[10px] font-black text-black">FINAL</span>
                                <span className="text-[8.5px] font-extrabold text-slate-900 border-t border-slate-300 pt-0.5 w-full">
                                  {usia}
                                </span>
                              </div>
                            </td>
                          )}

                          {/* Row 1: Merged KATEGORI KELAS */}
                          {isFirstRow && (
                            <td 
                              rowSpan={rowsCount} 
                              className="py-1.5 px-2 border-r-2 border-black text-center font-black text-[10.5px] uppercase bg-white align-middle leading-tight"
                            >
                              {cleanCatTitle || 'TUNGGAL TANGAN KOSONG'}
                            </td>
                          )}

                          {/* Undian Number (1, 2, 3, 4) */}
                          <td className="py-1 px-1 border-r border-black text-center font-bold text-xs bg-white font-mono">
                            {rIdx + 1}
                          </td>

                          {/* NAMA ATLET (Bold Uppercase) */}
                          <td className="py-1 px-2.5 border-r-2 border-black text-left font-black text-xs uppercase bg-white">
                            {item?.party1Name || (item ? item.party1Name : '')}
                          </td>

                          {/* KONTINGEN (Bold Uppercase) */}
                          <td className="py-1 px-2.5 border-r-2 border-black text-left font-bold text-[11px] uppercase bg-white">
                            {item?.party1Kontingen || ''}
                          </td>

                          {/* SCORE Box */}
                          <td className="py-1 px-1 border-r border-black text-center font-mono font-bold text-xs bg-white">
                            {item?.winnerOrScore && item.winnerOrScore.includes('Skor:') 
                              ? item.winnerOrScore.replace('Skor:', '').trim() 
                              : ''}
                          </td>

                          {/* WAKTU Box */}
                          <td className="py-1 px-1 border-r border-black text-center font-mono text-[10px] bg-white">
                            {/* Fillable */}
                          </td>

                          {/* NOTE Box */}
                          <td className="py-1 px-1 text-center font-mono text-[10px] bg-white">
                            {item?.ranking ? `#${item.ranking}` : ''}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}

          {scheduleItems.filter(i => i.type === 'seni').length === 0 && (
            <div className="p-8 text-center border-2 border-dashed border-slate-300 text-slate-500 font-bold">
              Tidak ada data pertandingan seni dalam jadwal ini.
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* FORMAT B: TANDING STANDAR DUA SUDUT (Sesuai Gambar Hal 3, 4, 5)           */}
      {/* ------------------------------------------------------------------------- */}
      {activeLayout === 'tanding_standard' && (
        <div className="border-2 border-black overflow-x-auto bg-white rounded-sm shadow-sm">
          <table className="w-full min-w-[620px] sm:min-w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-black text-[11px] font-black uppercase text-black">
                <th className="py-2 px-1.5 border-r-2 border-black text-center w-9 bg-white">
                  NO
                </th>
                <th className="py-2 px-2 border-r-2 border-black text-center w-16 bg-white">
                  ROUND
                </th>
                <th className="py-2 px-2 border-r-2 border-black text-center w-14 bg-white">
                  PARTAI
                </th>
                <th className="py-2 px-2 border-r-2 border-black text-center w-28 bg-white">
                  KELAS
                </th>
                
                {/* Solid Blue BIRU Header */}
                <th className="py-2 px-3 border-r-2 border-black text-center bg-[#2563eb] text-white font-black tracking-wider">
                  BIRU
                </th>

                {/* Score Biru & Merah */}
                <th className="py-1 px-1.5 border-r border-black text-center w-14 bg-white text-[9.5px] font-black text-blue-700">
                  SCORE BIRU
                </th>
                <th className="py-1 px-1.5 border-r-2 border-black text-center w-14 bg-white text-[9.5px] font-black text-red-700">
                  SCORE MERAH
                </th>

                {/* Solid Red MERAH Header */}
                <th className="py-2 px-3 border-r-2 border-black text-center bg-[#dc2626] text-white font-black tracking-wider">
                  MERAH
                </th>

                {/* Winner */}
                <th className="py-2 px-2 text-center w-18 bg-white text-[10px] font-black">
                  WINNER
                </th>
              </tr>
            </thead>
            <tbody>
              {scheduleItems.filter(i => i.type === 'tanding').map((item, idx) => {
                const partaiNum = item.partaiLabel.replace(/\D/g, '') || String(item.orderNumber);
                const roundText = (item.roundOrJurus || 'FINAL').toUpperCase();
                
                // Format Kelas (e.g. "C DINI 2 PUTRA")
                let kelasFormatted = item.categoryName;
                if (item.rawTanding?.cat) {
                  const cat = item.rawTanding.cat;
                  const kLetter = (cat.kelas || cat.name).replace(/kelas\s*/i, '').trim();
                  kelasFormatted = `${kLetter} ${cat.usia || ''} ${cat.gender || ''}`.trim().toUpperCase();
                }

                const isNoParticipantMerah = !item.party1Name || item.party1Name.toLowerCase().includes('bye') || item.party1Name === 'Belum ada atlet';
                const isNoParticipantBiru = !item.party2Name || item.party2Name.toLowerCase().includes('bye') || item.party2Name === 'Belum ada atlet';

                return (
                  <tr key={item.id || idx} className="border-b-2 border-black text-black">
                    {/* NO */}
                    <td className="py-2 px-1.5 border-r-2 border-black text-center font-bold text-xs bg-white font-mono">
                      {idx + 1}
                    </td>

                    {/* ROUND */}
                    <td className="py-2 px-2 border-r-2 border-black text-center font-black text-[10.5px] uppercase bg-white">
                      {roundText}
                    </td>

                    {/* PARTAI */}
                    <td className="py-2 px-2 border-r-2 border-black text-center font-black text-sm font-mono bg-white">
                      {partaiNum}
                    </td>

                    {/* KELAS */}
                    <td className="py-2 px-2 border-r-2 border-black text-center font-black text-xs uppercase bg-white">
                      {kelasFormatted}
                    </td>

                    {/* BIRU (Nama bold baris 1, Kontingen bold baris 2) */}
                    <td className="py-1.5 px-3 border-r-2 border-black text-center bg-white">
                      {isNoParticipantBiru ? (
                        <div className="text-xs font-black text-red-600 uppercase tracking-tight py-1">
                          NO PARTICIPANT
                        </div>
                      ) : (
                        <>
                          <div className="text-xs uppercase font-extrabold text-black leading-tight">
                            {item.party2Name || '-'}
                          </div>
                          <div className="text-[11px] uppercase font-black text-blue-900 tracking-wide leading-tight mt-0.5">
                            {item.party2Kontingen || '-'}
                          </div>
                        </>
                      )}
                    </td>

                    {/* SCORE BIRU */}
                    <td className="py-1.5 px-1.5 border-r border-black text-center font-mono font-bold text-xs bg-white">
                      {/* Score writing box */}
                    </td>

                    {/* SCORE MERAH */}
                    <td className="py-1.5 px-1.5 border-r-2 border-black text-center font-mono font-bold text-xs bg-white">
                      {/* Score writing box */}
                    </td>

                    {/* MERAH (Nama bold baris 1, Kontingen bold baris 2) */}
                    <td className="py-1.5 px-3 border-r-2 border-black text-center bg-white">
                      {isNoParticipantMerah ? (
                        <div className="text-xs font-black text-red-600 uppercase tracking-tight py-1">
                          NO PARTICIPANT
                        </div>
                      ) : (
                        <>
                          <div className="text-xs uppercase font-extrabold text-black leading-tight">
                            {item.party1Name || '-'}
                          </div>
                          <div className="text-[11px] uppercase font-black text-red-900 tracking-wide leading-tight mt-0.5">
                            {item.party1Kontingen || '-'}
                          </div>
                        </>
                      )}
                    </td>

                    {/* WINNER */}
                    <td className="py-1.5 px-2 text-center font-mono font-black text-[11px] bg-white">
                      {item.winnerOrScore ? item.winnerOrScore.replace(/MENANG\s*/i, '') : ''}
                    </td>
                  </tr>
                );
              })}

              {/* Placeholder empty rows if needed */}
              {Array.from({ length: Math.max(0, emptyRowsCount) }).map((_, emptyIdx) => (
                <tr key={`empty_${emptyIdx}`} className="border-b-2 border-black h-10 bg-white">
                  <td className="border-r-2 border-black"></td>
                  <td className="border-r-2 border-black"></td>
                  <td className="border-r-2 border-black"></td>
                  <td className="border-r-2 border-black"></td>
                  <td className="border-r-2 border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r-2 border-black"></td>
                  <td className="border-r-2 border-black"></td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* FORMAT C: TANDING BAGAN POOL 4 DENGAN ALUR FINAL (Sesuai Gambar Hal 6, 7) */}
      {/* ------------------------------------------------------------------------- */}
      {activeLayout === 'tanding_pool_bracket' && (
        <div className="space-y-3">
          {tandingPool4Groups.map((pool, poolIdx) => {
            return (
              <div key={pool.key || poolIdx} className="border-2 border-black overflow-x-auto bg-white rounded-sm shadow-sm">
                <table className="w-full min-w-[720px] sm:min-w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-black text-[10px] font-black uppercase text-black">
                      <th className="py-1 px-1 border-r border-black text-center w-8 bg-white">UNDIAN</th>
                      <th className="py-1 px-2 border-r border-black text-center w-28 bg-white">KELAS</th>
                      <th className="py-1 px-1 border-r border-black text-center w-9 bg-white">POOL</th>
                      <th className="py-1 px-1 border-r border-black text-center w-8 bg-white">SUDUT</th>
                      <th className="py-1 px-1.5 border-r-2 border-black text-center w-14 bg-white">PARTAI</th>
                      <th className="py-1 px-3 border-r border-black text-center bg-white">NAMA</th>
                      <th className="py-1 px-3 border-r border-black text-center w-44 sm:w-52 bg-white">KONTINGEN</th>
                      <th className="py-1 px-1.5 border-r-2 border-black text-center w-10 bg-white">NILAI</th>
                      
                      {/* Final Progression Columns */}
                      <th className="py-1 px-1.5 border-r border-black text-center w-14 bg-white">PARTAI</th>
                      <th className="py-1 px-1 border-r border-black text-center w-8 bg-white">SUDUT</th>
                      <th className="py-1 px-3 border-r border-black text-center bg-white">FINAL</th>
                      <th className="py-1 px-1 border-r border-black text-center w-9 bg-white">UNDIAN</th>
                      <th className="py-1 px-1.5 text-center w-10 bg-white">NILAI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Row 1: Undian 1 (Sudut Biru Partai 1) */}
                    <tr className="border-b border-black text-black text-[11px] h-7">
                      <td className="py-1 px-1 border-r border-black text-center font-bold bg-white font-mono">1</td>
                      
                      {/* Merged KELAS (4 Rows) */}
                      <td rowSpan={4} className="py-1 px-2 border-r border-black text-center font-black text-xs uppercase bg-white align-middle leading-tight">
                        {pool.kelas}
                      </td>

                      {/* Merged POOL (4 Rows) */}
                      <td rowSpan={4} className="py-1 px-1 border-r border-black text-center font-black text-base uppercase bg-white align-middle">
                        {pool.poolLetter}
                      </td>

                      {/* Sudut Biru */}
                      <td className="py-0.5 px-0.5 border-r border-black text-center bg-white">
                        <span className="bg-[#2563eb] text-white font-black text-[10px] px-1.5 py-0.5 rounded">B</span>
                      </td>

                      {/* Merged PARTAI Semi 1 (Rows 1 & 2) */}
                      <td rowSpan={2} className="py-1 px-1 border-r-2 border-black text-center font-black text-sm font-mono bg-white align-middle">
                        {pool.partaiSemi1}
                      </td>

                      {/* Atlet 1 */}
                      <td className="py-1 px-2 border-r border-black text-left font-black text-xs uppercase bg-white">
                        {pool.atlet1.nama || '—'}
                      </td>
                      <td className="py-1 px-2 border-r border-black text-left font-bold text-[11px] uppercase bg-white">
                        {pool.atlet1.kontingen || '—'}
                      </td>
                      <td className="py-1 px-1 border-r-2 border-black text-center font-mono bg-white"></td>

                      {/* Merged PARTAI FINAL (4 Rows) */}
                      <td rowSpan={4} className="py-1 px-1 border-r border-black text-center font-black text-base font-mono bg-white align-middle">
                        {pool.partaiFinal}
                      </td>

                      {/* Final Sudut Biru (Rows 1 & 2) */}
                      <td rowSpan={2} className="py-1 px-0.5 border-r border-black text-center bg-white align-middle">
                        <span className="bg-[#2563eb] text-white font-black text-[10px] px-1.5 py-0.5 rounded">B</span>
                      </td>

                      {/* Final Pemenang Semi 1 (Rows 1 & 2) */}
                      <td rowSpan={2} className="py-1 px-2 border-r border-black text-center font-bold text-[10.5px] uppercase bg-white align-middle">
                        PEMENANG PARTAI {pool.partaiSemi1}
                      </td>
                      <td rowSpan={2} className="border-r border-black text-center bg-white align-middle font-mono"></td>
                      <td rowSpan={2} className="text-center bg-white align-middle font-mono"></td>
                    </tr>

                    {/* Row 2: Undian 2 (Sudut Merah Partai 1) */}
                    <tr className="border-b-2 border-black text-black text-[11px] h-7">
                      <td className="py-1 px-1 border-r border-black text-center font-bold bg-white font-mono">2</td>
                      <td className="py-0.5 px-0.5 border-r border-black text-center bg-white">
                        <span className="bg-[#dc2626] text-white font-black text-[10px] px-1.5 py-0.5 rounded">M</span>
                      </td>
                      <td className="py-1 px-2 border-r border-black text-left font-black text-xs uppercase bg-white">
                        {pool.atlet2.nama || '—'}
                      </td>
                      <td className="py-1 px-2 border-r border-black text-left font-bold text-[11px] uppercase bg-white">
                        {pool.atlet2.kontingen || '—'}
                      </td>
                      <td className="py-1 px-1 border-r-2 border-black text-center font-mono bg-white"></td>
                    </tr>

                    {/* Row 3: Undian 3 (Sudut Biru Partai 2) */}
                    <tr className="border-b border-black text-black text-[11px] h-7">
                      <td className="py-1 px-1 border-r border-black text-center font-bold bg-white font-mono">3</td>
                      <td className="py-0.5 px-0.5 border-r border-black text-center bg-white">
                        <span className="bg-[#2563eb] text-white font-black text-[10px] px-1.5 py-0.5 rounded">B</span>
                      </td>

                      {/* Merged PARTAI Semi 2 (Rows 3 & 4) */}
                      <td rowSpan={2} className="py-1 px-1 border-r-2 border-black text-center font-black text-sm font-mono bg-white align-middle">
                        {pool.partaiSemi2}
                      </td>

                      <td className="py-1 px-2 border-r border-black text-left font-black text-xs uppercase bg-white">
                        {pool.atlet3.nama || '—'}
                      </td>
                      <td className="py-1 px-2 border-r border-black text-left font-bold text-[11px] uppercase bg-white">
                        {pool.atlet3.kontingen || '—'}
                      </td>
                      <td className="py-1 px-1 border-r-2 border-black text-center font-mono bg-white"></td>

                      {/* Final Sudut Merah (Rows 3 & 4) */}
                      <td rowSpan={2} className="py-1 px-0.5 border-r border-black text-center bg-white align-middle">
                        <span className="bg-[#dc2626] text-white font-black text-[10px] px-1.5 py-0.5 rounded">M</span>
                      </td>

                      {/* Final Pemenang Semi 2 (Rows 3 & 4) */}
                      <td rowSpan={2} className="py-1 px-2 border-r border-black text-center font-bold text-[10.5px] uppercase bg-white align-middle">
                        PEMENANG PARTAI {pool.partaiSemi2}
                      </td>
                      <td rowSpan={2} className="border-r border-black text-center bg-white align-middle font-mono"></td>
                      <td rowSpan={2} className="text-center bg-white align-middle font-mono"></td>
                    </tr>

                    {/* Row 4: Undian 4 (Sudut Merah Partai 2) */}
                    <tr className="border-b-2 border-black text-black text-[11px] h-7">
                      <td className="py-1 px-1 border-r border-black text-center font-bold bg-white font-mono">4</td>
                      <td className="py-0.5 px-0.5 border-r border-black text-center bg-white">
                        <span className="bg-[#dc2626] text-white font-black text-[10px] px-1.5 py-0.5 rounded">M</span>
                      </td>
                      <td className="py-1 px-2 border-r border-black text-left font-black text-xs uppercase bg-white">
                        {pool.atlet4.nama || '—'}
                      </td>
                      <td className="py-1 px-2 border-r border-black text-left font-bold text-[11px] uppercase bg-white">
                        {pool.atlet4.kontingen || '—'}
                      </td>
                      <td className="py-1 px-1 border-r-2 border-black text-center font-mono bg-white"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. OFFICIAL FOOTER NOTE (Sesuai Gambar 1 - 9)                            */}
      {/* ========================================================================= */}
      <div className="mt-4 pt-2 border-t border-slate-300 text-[10.5px] text-black font-sans">
        <p className="font-extrabold italic text-black">Catatan untuk Official :</p>
        <p className="text-slate-800 text-[10px] leading-relaxed mt-0.5">
          Diharap meneliti secara cermat jadwal pertandingan di atas! Jika terdapat kesalahan, segera melaporkannya kepada Sekretaris Pertandingan untuk dibenarkan sebagaimana mestinya.
        </p>
      </div>

    </div>
  );
}

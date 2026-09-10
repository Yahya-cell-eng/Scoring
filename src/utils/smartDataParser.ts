/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { BaganCategory, BaganMatch, TGRPeserta, TGRPartaiPool } from '../types';
import { organizeSeniIntoPools } from './seniPoolManager';
import { propagateBracketWithAutoAdvance } from './bracketProgression';
import { distributeAthletesAvoidSameContingent, separateSeniByContingent } from './contingentDrawing';

/**
 * Utility for Smart Auto-Parsing Pencak Silat Athletes & Matches data.
 * Automatically extracts & classifies:
 * - Kategori Perlombaan (Tanding, Tunggal, Ganda, Regu, Solo Kreatif)
 * - Kategori Usia (Usia Dini 1, Usia Dini 2, Usia Dini, Pra Remaja, Remaja, Dewasa, Master)
 * - Kelas Tanding (Under, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, Bebas, Open)
 * - Gender / Jenis Kelamin (Putra / PA, Putri / PI)
 * - Nama Atlet / Peserta
 * - Kontingen / Perguruan / Asal Daerah
 */

export interface ParsedAthleteRecord {
  id: string;
  originalText: string;
  nama: string;
  kontingen: string;
  kategoriType: 'Tanding' | 'Tunggal' | 'Ganda' | 'Regu' | 'Solo Kreatif';
  kategoriUsia: string; // "Usia Dini 1", "Usia Dini 2", "Usia Dini", "Pra Remaja", "Remaja", "Dewasa", "Master"
  kelas: string;       // "Kelas A", "Kelas B", "Bebas", "Under", etc.
  gender: 'Putra' | 'Putri';
  kelasDisplay: string; // e.g. "B / PA", "A / PI", "TUNGGAL / PA"
  beratBadan?: string;
  isValid: boolean;
}

function cleanStr(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

/**
 * Accurately detect Gender from string and context
 */
export function detectGender(source: string, fallback: 'Putra' | 'Putri' = 'Putra'): 'Putra' | 'Putri' {
  const lower = source.toLowerCase();
  
  // Specific Putri patterns
  if (
    /\b(putri|pi|wanita|female|femme|girl|women)\b/i.test(lower) ||
    /\/(pi|putri)\b/i.test(lower) ||
    /-\s*(pi|putri)\b/i.test(lower) ||
    /\b(putri)\b/i.test(lower)
  ) {
    return 'Putri';
  }

  // Specific Putra patterns
  if (
    /\b(putra|pa|pria|male|homme|boy|men)\b/i.test(lower) ||
    /\/(pa|putra)\b/i.test(lower) ||
    /-\s*(pa|putra)\b/i.test(lower) ||
    /\b(putra)\b/i.test(lower)
  ) {
    return 'Putra';
  }

  return fallback;
}

/**
 * Accurately detect Kategori Usia from string
 */
export function detectKategoriUsia(source: string): string {
  const lower = source.toLowerCase();
  
  if (/usia\s*dini\s*1|dini\s*1|ud\s*1|sd\s*kecil|kelas\s*1-3/i.test(lower)) {
    return 'Usia Dini 1';
  }
  if (/usia\s*dini\s*2|dini\s*2|ud\s*2|sd\s*besar|kelas\s*4-6/i.test(lower)) {
    return 'Usia Dini 2';
  }
  if (/usia\s*dini|dini|sd\b/i.test(lower)) {
    return 'Usia Dini';
  }
  if (/pra\s*remaja|pra-remaja|smp\b/i.test(lower)) {
    return 'Pra Remaja';
  }
  if (/remaja|sma\b|smk\b|aliyah|junior/i.test(lower)) {
    return 'Remaja';
  }
  if (/master|veteran|senior\s*plus/i.test(lower)) {
    return 'Master';
  }
  if (/dewasa|senior|mahasiswa|umum\b/i.test(lower)) {
    return 'Dewasa';
  }

  return 'Dewasa';
}

/**
 * Accurately detect Kategori Perlombaan (Tanding or Seni variants)
 */
export function detectKategoriType(source: string): 'Tanding' | 'Tunggal' | 'Ganda' | 'Regu' | 'Solo Kreatif' {
  const lower = source.toLowerCase();

  if (/solo\s*kreatif|kreatif/i.test(lower)) {
    return 'Solo Kreatif';
  }
  if (/ganda/i.test(lower)) {
    return 'Ganda';
  }
  if (/regu/i.test(lower)) {
    return 'Regu';
  }
  if (/tunggal/i.test(lower)) {
    return 'Tunggal';
  }
  if (/seni/i.test(lower) && !/tanding/i.test(lower)) {
    return 'Tunggal';
  }

  return 'Tanding';
}

/**
 * Accurately detect Kelas Pertandingan (Under, A-S, Bebas, Open)
 */
export function detectKelas(source: string, kategoriType: string): string {
  if (kategoriType !== 'Tanding') {
    return kategoriType;
  }

  const clean = source.toUpperCase();

  // Under Class
  if (/\b(UNDER|DIBAWAH)\b/i.test(clean)) {
    return 'Under';
  }

  // Bebas or Open
  if (/\b(BEBAS\s*[1-2]?|OPEN)\b/i.test(clean)) {
    const match = clean.match(/\b(BEBAS\s*[1-2]?|OPEN)\b/i);
    return match ? (match[1].toUpperCase().includes('OPEN') ? 'Open' : match[1].toUpperCase()) : 'Bebas';
  }

  // Explicit "Kelas A", "Kelas B", "Kelas C", ..., "Kelas S"
  const explicitMatch = clean.match(/\bKELAS\s*([A-S])\b/i);
  if (explicitMatch && explicitMatch[1]) {
    return `Kelas ${explicitMatch[1].toUpperCase()}`;
  }

  // Abbreviated formats like "A / PA", "B/PI", "KLAS C", "KL. D"
  const slashMatch = clean.match(/\b([A-S])\s*\/\s*(?:PA|PI|PUTRA|PUTRI)\b/i);
  if (slashMatch && slashMatch[1]) {
    return `Kelas ${slashMatch[1].toUpperCase()}`;
  }

  // Loose letter pattern like " - A - ", " (B) ", " C "
  const singleLetterMatch = clean.match(/(?:[\s\-\/\(\[,]|\b)([A-S])(?:[\s\-\/\)\],]|\b)/i);
  if (singleLetterMatch && singleLetterMatch[1]) {
    return `Kelas ${singleLetterMatch[1].toUpperCase()}`;
  }

  return 'Kelas A';
}

/**
 * Parse structured Excel data (rows of objects or 2D array)
 */
export function parseExcelRows(rows: any[]): ParsedAthleteRecord[] {
  if (!rows || rows.length === 0) return [];

  const results: ParsedAthleteRecord[] = [];

  rows.forEach((row, idx) => {
    if (Array.isArray(row)) {
      const lineStr = row.map(cleanStr).filter(Boolean).join(' - ');
      if (!lineStr) return;
      const parsedSingle = parseRawAthletesData(lineStr);
      if (parsedSingle.length > 0) {
        results.push(parsedSingle[0]);
      }
      return;
    }

    const keys = Object.keys(row);
    if (keys.length === 0) return;

    const getVal = (regex: RegExp): string => {
      const key = keys.find(k => regex.test(k.toLowerCase().trim()));
      return key ? cleanStr(row[key]) : '';
    };

    let rawNama = getVal(/nama|atlet|peserta|name/i);
    let rawKontingen = getVal(/kontingen|perguruan|tim|team|daerah|asal|club|klub/i);
    let rawKategori = getVal(/kategori\s*tanding|kategori\s*seni|jenis\s*kategori|kategori|category/i);
    let rawKelas = getVal(/kelas|class|golongan/i);
    let rawUsia = getVal(/kategori\s*usia|usia|umur|tingkat|level|age/i);
    let rawGender = getVal(/jenis\s*kelamin|gender|jk|kelamin|seks/i);

    if (!rawNama && !rawKelas) {
      const combined = keys.map(k => `${k}: ${row[k]}`).join(' - ');
      const parsedSingle = parseRawAthletesData(combined);
      if (parsedSingle.length > 0) {
        results.push(parsedSingle[0]);
      }
      return;
    }

    // Gender detection
    const genderSrc = `${rawGender} ${rawKategori} ${rawKelas} ${rawUsia} ${rawNama}`;
    const gender = detectGender(genderSrc);

    // Usia detection
    const usiaSrc = `${rawUsia} ${rawKategori} ${rawKelas} ${rawNama}`;
    const kategoriUsia = detectKategoriUsia(usiaSrc);

    // Kategori Perlombaan
    const katSrc = `${rawKategori} ${rawKelas} ${rawNama}`;
    const kategoriType = detectKategoriType(katSrc);

    // Kelas Lomba
    const kelasSrc = `${rawKelas} ${rawKategori} ${rawNama}`;
    const kelas = detectKelas(kelasSrc, kategoriType);

    // Format display standard IPSI PON XX
    const kelasLetter = kelas.replace(/kelas\s*/i, '').trim().toUpperCase();
    const genderTag = gender === 'Putra' ? 'PA' : 'PI';
    const kelasDisplay = kategoriType === 'Tanding' 
      ? `${kelasLetter} / ${genderTag}` 
      : `${kategoriType.toUpperCase()} / ${genderTag}`;

    let namaClean = rawNama || `Pesilat ${idx + 1}`;
    let kontingenClean = rawKontingen || 'KONTINGEN';

    results.push({
      id: `parsed_excel_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
      originalText: JSON.stringify(row),
      nama: namaClean,
      kontingen: kontingenClean,
      kategoriType,
      kategoriUsia,
      kelas,
      gender,
      kelasDisplay,
      isValid: Boolean(namaClean)
    });
  });

  return results;
}

/**
 * Parse an Excel file (File or ArrayBuffer) directly
 */
export async function parseExcelFile(file: File): Promise<ParsedAthleteRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        if (jsonData.length === 0) {
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          const parsed = parseExcelRows(rows);
          resolve(parsed);
          return;
        }

        const parsed = parseExcelRows(jsonData);
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Generate and Download an Official Excel Template for IPSI Data Input
 */
export function downloadOfficialExcelTemplate() {
  const templateData = [
    {
      "No": 1,
      "Nama Atlet": "HIDAYAT LIMONU",
      "Kontingen": "SULAWESI UTARA",
      "Kategori": "Tanding",
      "Kelas": "Kelas B",
      "Kategori Usia": "Dewasa",
      "Jenis Kelamin": "Putra"
    },
    {
      "No": 2,
      "Nama Atlet": "YUDHA MAHENDRI",
      "Kontingen": "RIAU",
      "Kategori": "Tanding",
      "Kelas": "Kelas B",
      "Kategori Usia": "Dewasa",
      "Jenis Kelamin": "Putra"
    },
    {
      "No": 3,
      "Nama Atlet": "MUH ISKANDAR",
      "Kontingen": "PAPUA",
      "Kategori": "Tanding",
      "Kelas": "Kelas B",
      "Kategori Usia": "Dewasa",
      "Jenis Kelamin": "Putra"
    },
    {
      "No": 4,
      "Nama Atlet": "ALAMSYAH",
      "Kontingen": "KALIMANTAN TIMUR",
      "Kategori": "Tanding",
      "Kelas": "Kelas B",
      "Kategori Usia": "Dewasa",
      "Jenis Kelamin": "Putra"
    },
    {
      "No": 5,
      "Nama Atlet": "AFRIANI LAURENSIA",
      "Kontingen": "SUMATERA UTARA",
      "Kategori": "Tanding",
      "Kelas": "Kelas B",
      "Kategori Usia": "Dewasa",
      "Jenis Kelamin": "Putri"
    },
    {
      "No": 6,
      "Nama Atlet": "SUCI WULANDARI",
      "Kontingen": "SUMATERA BARAT",
      "Kategori": "Tanding",
      "Kelas": "Kelas B",
      "Kategori Usia": "Dewasa",
      "Jenis Kelamin": "Putri"
    },
    {
      "No": 7,
      "Nama Atlet": "NADIA HAQ U N C",
      "Kontingen": "JAWA TENGAH",
      "Kategori": "Tanding",
      "Kelas": "Kelas B",
      "Kategori Usia": "Dewasa",
      "Jenis Kelamin": "Putri"
    },
    {
      "No": 8,
      "Nama Atlet": "ADELA EARLENE S",
      "Kontingen": "JAWA TIMUR",
      "Kategori": "Tanding",
      "Kelas": "Kelas B",
      "Kategori Usia": "Dewasa",
      "Jenis Kelamin": "Putri"
    },
    {
      "No": 9,
      "Nama Atlet": "AHMAD FAUZI",
      "Kontingen": "JAWA BARAT",
      "Kategori": "Tunggal",
      "Kelas": "Tunggal",
      "Kategori Usia": "Dewasa",
      "Jenis Kelamin": "Putra"
    },
    {
      "No": 10,
      "Nama Atlet": "SITI RAHMA",
      "Kontingen": "JAWA TENGAH",
      "Kategori": "Tunggal",
      "Kelas": "Tunggal",
      "Kategori Usia": "Dewasa",
      "Jenis Kelamin": "Putri"
    }
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);
  ws['!cols'] = [
    { wch: 6 },  // No
    { wch: 25 }, // Nama Atlet
    { wch: 25 }, // Kontingen
    { wch: 15 }, // Kategori
    { wch: 15 }, // Kelas
    { wch: 18 }, // Kategori Usia
    { wch: 15 }  // Jenis Kelamin
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template_Data_Atlet');
  XLSX.writeFile(wb, 'Template_Input_Data_Silat_IPSI.xlsx');
}

/**
 * Export parsed athlete list to Excel file
 */
export function exportAthletesToExcelFile(athletes: ParsedAthleteRecord[], filename: string = 'Data_Atlet_Pencak_Silat.xlsx') {
  const exportData = athletes.map((a, i) => ({
    "No": i + 1,
    "Nama Atlet": a.nama,
    "Kontingen": a.kontingen,
    "Kategori": a.kategoriType,
    "Kelas": a.kelas,
    "Kategori Usia": a.kategoriUsia,
    "Jenis Kelamin": a.gender,
    "Format IPSI": a.kelasDisplay
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 25 },
    { wch: 25 },
    { wch: 15 },
    { wch: 15 },
    { wch: 18 },
    { wch: 15 },
    { wch: 15 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data_Atlet');
  XLSX.writeFile(wb, filename);
}

/**
 * Parse raw multi-line string input copied from WhatsApp, Word, or Web
 */
export function parseRawAthletesData(rawText: string): ParsedAthleteRecord[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const results: ParsedAthleteRecord[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    
    // Skip header lines
    const lower = rawLine.toLowerCase();
    if (
      (lower.includes('nama') && lower.includes('kontingen')) ||
      (lower.includes('partai') && lower.includes('merah') && lower.includes('biru')) ||
      lower.startsWith('no\t') || lower.startsWith('no,') || lower.startsWith('no.')
    ) {
      continue;
    }

    // Strip leading numbering
    let cleanLine = rawLine.replace(/^(\d+[\.\)\s\-\t]+|\(\d+\)\s*)/, '').trim();

    // 1. Detect Gender
    const gender = detectGender(cleanLine);

    // 2. Detect Kategori Usia
    const kategoriUsia = detectKategoriUsia(cleanLine);

    // 3. Detect Kategori Type
    const kategoriType = detectKategoriType(cleanLine);

    // 4. Detect Kelas
    const kelas = detectKelas(cleanLine, kategoriType);

    // Format IPSI
    const kelasLetter = kelas.replace(/kelas\s*/i, '').trim().toUpperCase();
    const genderTag = gender === 'Putra' ? 'PA' : 'PI';
    const kelasDisplay = kategoriType === 'Tanding' 
      ? `${kelasLetter} / ${genderTag}` 
      : `${kategoriType.toUpperCase()} / ${genderTag}`;

    // 5. Extract Nama and Kontingen
    let nama = '';
    let kontingen = '';

    if (cleanLine.includes('\t')) {
      const parts = cleanLine.split('\t').map(p => p.trim()).filter(Boolean);
      nama = parts[0] || '';
      kontingen = parts[1] || parts[parts.length - 1] || 'KONTINGEN';
    } else if (cleanLine.includes('|')) {
      const parts = cleanLine.split('|').map(p => p.trim()).filter(Boolean);
      nama = parts[0] || '';
      kontingen = parts[1] || parts[parts.length - 1] || 'KONTINGEN';
    } else if (cleanLine.includes(' - ')) {
      const parts = cleanLine.split(' - ').map(p => p.trim()).filter(Boolean);
      nama = parts[0] || '';
      kontingen = parts[1] || parts[parts.length - 1] || 'KONTINGEN';
    } else if (cleanLine.includes(' / ')) {
      const parts = cleanLine.split(' / ').map(p => p.trim()).filter(Boolean);
      nama = parts[0] || '';
      kontingen = parts[1] || parts[parts.length - 1] || 'KONTINGEN';
    } else if (cleanLine.includes(',')) {
      const parts = cleanLine.split(',').map(p => p.trim()).filter(Boolean);
      nama = parts[0] || '';
      kontingen = parts[1] || 'KONTINGEN';
    } else if (cleanLine.includes('(') && cleanLine.includes(')')) {
      const start = cleanLine.indexOf('(');
      const end = cleanLine.indexOf(')');
      nama = cleanLine.substring(0, start).trim();
      kontingen = cleanLine.substring(start + 1, end).trim();
    } else if (cleanLine.includes('[') && cleanLine.includes(']')) {
      const start = cleanLine.indexOf('[');
      const end = cleanLine.indexOf(']');
      nama = cleanLine.substring(0, start).trim();
      kontingen = cleanLine.substring(start + 1, end).trim();
    } else {
      const words = cleanLine.split(' ');
      if (words.length >= 3) {
        nama = words.slice(0, 2).join(' ');
        kontingen = words.slice(2).join(' ');
      } else {
        nama = cleanLine;
        kontingen = 'UMUM';
      }
    }

    // Clean up athlete name (strip noise tags)
    nama = nama
      .replace(/\b(kelas\s*[a-s]|remaja|dewasa|pra\s*remaja|usia\s*dini\s*[1-2]?|putra|putri|pa|pi|tanding|tunggal|ganda|regu|solo\s*kreatif)\b/gi, '')
      .replace(/[\(\)\[\]\-,\/]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    kontingen = kontingen
      .replace(/\b(kelas\s*[a-s]|remaja|dewasa|pra\s*remaja|usia\s*dini\s*[1-2]?|putra|putri|pa|pi|tanding|tunggal|ganda|regu)\b/gi, '')
      .replace(/[\(\)\[\]\-,\/]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!kontingen) kontingen = 'UMUM';

    const isValid = nama.length > 0;

    results.push({
      id: `parsed_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
      originalText: rawLine,
      nama: nama || `Pesilat ${idx + 1}`,
      kontingen: kontingen || 'UMUM',
      kategoriType,
      kategoriUsia,
      kelas,
      gender,
      kelasDisplay,
      isValid
    });
  }

  return results;
}

/**
 * Automatically group parsed athletes into Tanding Brackets & Seni Pools
 */
export function autoGroupAllAthletes(
  records: ParsedAthleteRecord[],
  optionsOrBracketSize: {
    bracketSizeLimit?: 2 | 4 | 8 | 16;
    seniParticipantsPerPool?: number;
    startPartaiNumber?: number;
  } | (2 | 4 | 8 | 16) = {},
  seniPoolLimitArg?: number,
  startPartaiArg?: number
): {
  tandingCategories: BaganCategory[];
  seniPesertaList: TGRPeserta[];
  seniPartaiPoolList: TGRPartaiPool[];
} {
  let bracketSizeLimit: 2 | 4 | 8 | 16 = 4;
  let seniParticipantsPerPool = 4;
  let partaiCounter = 1;

  if (typeof optionsOrBracketSize === 'number') {
    bracketSizeLimit = optionsOrBracketSize;
    if (seniPoolLimitArg !== undefined) seniParticipantsPerPool = seniPoolLimitArg;
    if (startPartaiArg !== undefined) partaiCounter = startPartaiArg;
  } else if (typeof optionsOrBracketSize === 'object') {
    bracketSizeLimit = optionsOrBracketSize.bracketSizeLimit || 4;
    seniParticipantsPerPool = optionsOrBracketSize.seniParticipantsPerPool || 4;
    partaiCounter = optionsOrBracketSize.startPartaiNumber || 1;
  }

  // Separate records
  const tandingRecords = records.filter(r => r.kategoriType === 'Tanding');
  const seniRecords = records.filter(r => r.kategoriType !== 'Tanding');

  // --- 1. TANDING CATEGORIES GENERATION ---
  const tandingGroups = new Map<string, ParsedAthleteRecord[]>();
  tandingRecords.forEach(rec => {
    // Unique key: KategoriUsia - Kelas - Gender
    const key = `${rec.kategoriUsia} - ${rec.kelas} - ${rec.gender}`;
    if (!tandingGroups.has(key)) {
      tandingGroups.set(key, []);
    }
    tandingGroups.get(key)!.push(rec);
  });

  const tandingCategories: BaganCategory[] = [];

  tandingGroups.forEach((groupAthletes, groupKey) => {
    const first = groupAthletes[0];
    const sizeLimit = bracketSizeLimit;

    // Split group into brackets with guaranteed contingent separation (no same contingent in first round!)
    const chunks: ParsedAthleteRecord[][] = distributeAthletesAvoidSameContingent(groupAthletes, sizeLimit);

    chunks.forEach((chunk, chunkIdx) => {
      const catName = chunks.length > 1 
        ? `${first.kelas} ${first.gender} ${first.kategoriUsia} (Bagan ${chunkIdx + 1})`
        : `${first.kelas} ${first.gender} ${first.kategoriUsia}`;

      const size = sizeLimit;
      const matches: BaganMatch[] = [];

      if (size === 2) {
        matches.push({
          id: 1,
          round: 'final',
          partai: `Partai ${partaiCounter++}`,
          atletMerah: chunk[0] ? { nama: chunk[0].nama, kontingen: chunk[0].kontingen } : { nama: '', kontingen: '' },
          atletBiru: chunk[1] ? { nama: chunk[1].nama, kontingen: chunk[1].kontingen } : { nama: '', kontingen: '' },
          winner: null
        });
      } else if (size === 4) {
        // Semi 1
        matches.push({
          id: 1,
          round: 'semi',
          partai: `Partai ${partaiCounter++}`,
          atletMerah: chunk[0] ? { nama: chunk[0].nama, kontingen: chunk[0].kontingen } : { nama: '', kontingen: '' },
          atletBiru: chunk[1] ? { nama: chunk[1].nama, kontingen: chunk[1].kontingen } : { nama: '', kontingen: '' },
          winner: null
        });
        // Semi 2
        matches.push({
          id: 2,
          round: 'semi',
          partai: `Partai ${partaiCounter++}`,
          atletMerah: chunk[2] ? { nama: chunk[2].nama, kontingen: chunk[2].kontingen } : { nama: '', kontingen: '' },
          atletBiru: chunk[3] ? { nama: chunk[3].nama, kontingen: chunk[3].kontingen } : { nama: '', kontingen: '' },
          winner: null
        });
        // Final
        matches.push({
          id: 3,
          round: 'final',
          partai: `Partai ${partaiCounter++}`,
          atletMerah: { nama: '', kontingen: '' },
          atletBiru: { nama: '', kontingen: '' },
          winner: null
        });
      } else if (size === 8) {
        // Quarters 1-4
        for (let q = 1; q <= 4; q++) {
          const mIdx = (q - 1) * 2;
          matches.push({
            id: q,
            round: 'quarter',
            partai: `Partai ${partaiCounter++}`,
            atletMerah: chunk[mIdx] ? { nama: chunk[mIdx].nama, kontingen: chunk[mIdx].kontingen } : { nama: '', kontingen: '' },
            atletBiru: chunk[mIdx + 1] ? { nama: chunk[mIdx + 1].nama, kontingen: chunk[mIdx + 1].kontingen } : { nama: '', kontingen: '' },
            winner: null
          });
        }
        // Semis 5-6
        matches.push({ id: 5, round: 'semi', partai: `Partai ${partaiCounter++}`, atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null });
        matches.push({ id: 6, round: 'semi', partai: `Partai ${partaiCounter++}`, atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null });
        // Final 7
        matches.push({ id: 7, round: 'final', partai: `Partai ${partaiCounter++}`, atletMerah: { nama: '', kontingen: '' }, atletBiru: { nama: '', kontingen: '' }, winner: null });
      }

      // Handle automatic BYE
      const initialCount = size / 2;
      for (let i = 0; i < initialCount; i++) {
        const m = matches[i];
        if (m.atletMerah.nama && !m.atletBiru.nama) {
          m.atletBiru = { nama: 'BYE', kontingen: 'AUTOMATIC' };
          m.winner = 'merah';
        } else if (!m.atletMerah.nama && m.atletBiru.nama) {
          m.atletMerah = { nama: 'BYE', kontingen: 'AUTOMATIC' };
          m.winner = 'biru';
        }
      }

      // Propagate any BYE winners automatically to subsequent rounds
      const finalMatches = propagateBracketWithAutoAdvance(matches, size);

      tandingCategories.push({
        id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: catName,
        gender: first.gender,
        size,
        kelas: first.kelas,
        usia: first.kategoriUsia,
        matches: finalMatches
      });
    });
  });

  // --- 2. SENI POOLS GENERATION ---
  const initialSeniPeserta: TGRPeserta[] = seniRecords.map((s, idx) => ({
    id: s.id,
    noUrut: idx + 1,
    nama: s.nama,
    kontingen: s.kontingen,
    kategori: s.kategoriType,
    gender: s.gender,
    usia: s.kategoriUsia,
    status: 'Belum Menilai',
    scores: {},
    kebenaranScores: {},
    isLocked: false,
    decisions: ['Sah'],
    deductions: 0
  }));

  const { updatedPesertaList, partaiPoolList } = organizeSeniIntoPools(
    initialSeniPeserta,
    seniParticipantsPerPool,
    partaiCounter
  );

  return {
    tandingCategories,
    seniPesertaList: updatedPesertaList,
    seniPartaiPoolList: partaiPoolList
  };
}

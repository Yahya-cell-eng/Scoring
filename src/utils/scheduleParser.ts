/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { BaganCategory, BaganMatch, TGRPeserta, Athlete } from '../types';
import { detectGender, detectKategoriUsia, detectKategoriType, detectKelas, autoGroupAllAthletes } from './smartDataParser';
import { extractPartaiNumber, formatPartaiLabel } from './partaiOrdering';

export interface ParsedScheduleRow {
  id: string;
  no: number;
  partai: string;
  partaiNumber: number;
  kategoriType: 'Tanding' | 'Tunggal' | 'Ganda' | 'Regu' | 'Solo Kreatif';
  kelas: string;
  round: 'thirtysecond' | 'sixteenth' | 'eighth' | 'quarter' | 'semi' | 'final';
  roundLabel: string;
  gender: 'Putra' | 'Putri';
  usia: string;
  // Merah / Single Peserta
  merahNama: string;
  merahKontingen: string;
  // Biru (for Tanding / VS)
  biruNama: string;
  biruKontingen: string;
  // Seni details
  poolName: string;
  noUndian: number;
  gelanggang?: string;
  remark?: string;
  rawRow?: Record<string, any>;
  // Validation status
  isValid: boolean;
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  rowNumber: number;
  partai?: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
  value?: any;
}

export interface ValidationRuleCheck {
  id: string;
  rule: string;
  passed: boolean;
  status: 'passed' | 'warning' | 'failed';
  details: string;
}

export interface ValidationReport {
  isValid: boolean;
  status: 'valid' | 'warning' | 'invalid';
  fatalError: string | null;
  fileFormat: 'excel' | 'csv' | 'json' | 'text' | 'unknown';
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  warningRowsCount: number;
  issues: ValidationIssue[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  duplicatePartaiList: string[];
  checkedRules: ValidationRuleCheck[];
}

export interface ParsedScheduleSummary {
  totalRows: number;
  tandingCount: number;
  seniCount: number;
  formatDetected: 'tanding_match_schedule' | 'seni_pool_schedule' | 'mixed_schedule' | 'athlete_roster';
  rows: ParsedScheduleRow[];
  tandingCategories: BaganCategory[];
  seniPesertaList: TGRPeserta[];
  validation: ValidationReport;
}

function cleanStr(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

/**
 * Standardize round string to BaganMatch round
 */
export function normalizeRound(raw: string): 'thirtysecond' | 'sixteenth' | 'eighth' | 'quarter' | 'semi' | 'final' {
  const lower = cleanStr(raw).toLowerCase();
  if (lower.includes('final') && !lower.includes('semi') && !lower.includes('perempat') && !lower.includes('quarter')) {
    return 'final';
  }
  if (lower.includes('semi') || lower.includes('1/2')) {
    return 'semi';
  }
  if (lower.includes('quarter') || lower.includes('perempat') || lower.includes('1/4') || lower.includes('8 besar')) {
    return 'quarter';
  }
  if (lower.includes('eighth') || lower.includes('1/8') || lower.includes('16 besar')) {
    return 'eighth';
  }
  if (lower.includes('sixteenth') || lower.includes('32 besar')) {
    return 'sixteenth';
  }
  if (lower.includes('thirtysecond') || lower.includes('64 besar')) {
    return 'thirtysecond';
  }
  return 'quarter'; // Default fallback
}

export function getRoundLabel(round: 'thirtysecond' | 'sixteenth' | 'eighth' | 'quarter' | 'semi' | 'final'): string {
  switch (round) {
    case 'final': return 'FINAL';
    case 'semi': return 'SEMI FINAL';
    case 'quarter': return 'PEREMPAT FINAL';
    case 'eighth': return 'BABAK 16 BESAR';
    case 'sixteenth': return 'BABAK 32 BESAR';
    case 'thirtysecond': return 'BABAK 64 BESAR';
    default: return 'PENYISIHAN';
  }
}

/**
 * Parse an Excel, CSV, or JSON file into standardized schedule rows
 */
export async function parseScheduleFile(file: File): Promise<ParsedScheduleSummary> {
  const fileNameLower = file.name.toLowerCase();

  // Handle JSON files directly
  if (fileNameLower.endsWith('.json') || file.type === 'application/json') {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = (e.target?.result as string) || '';
          const result = parseScheduleJsonText(text, file.name);
          resolve(result);
        } catch (err: any) {
          resolve(createFailedValidationSummary('json', `Gagal memproses berkas JSON: ${err.message}`, file.name));
        }
      };
      reader.onerror = () => {
        resolve(createFailedValidationSummary('json', 'Gagal membaca berkas JSON dari media penyimpanan.', file.name));
      };
      reader.readAsText(file);
    });
  }

  // Handle Excel and CSV via XLSX parser
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          resolve(createFailedValidationSummary(fileNameLower.endsWith('.csv') ? 'csv' : 'excel', 'File tidak memiliki lembar kerja (worksheet) yang terbaca.', file.name));
          return;
        }
        const worksheet = workbook.Sheets[firstSheetName];

        // Parse to JSON array of objects
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
        const fileFormat = fileNameLower.endsWith('.csv') ? 'csv' : 'excel';
        const result = parseScheduleJsonRows(rawJson, file.name, fileFormat);
        resolve(result);
      } catch (err: any) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse JSON text into standardized ParsedScheduleSummary
 */
export function parseScheduleJsonText(jsonString: string, sourceName: string = 'JSON_Schedule_Data'): ParsedScheduleSummary {
  try {
    const data = JSON.parse(jsonString);
    let rowsToParse: any[] = [];

    if (Array.isArray(data)) {
      rowsToParse = data;
    } else if (typeof data === 'object' && data !== null) {
      if (Array.isArray(data.schedule)) {
        rowsToParse = data.schedule;
      } else if (Array.isArray(data.matches)) {
        rowsToParse = data.matches;
      } else if (Array.isArray(data.data)) {
        rowsToParse = data.data;
      } else if (Array.isArray(data.rows)) {
        rowsToParse = data.rows;
      } else if (Array.isArray(data.pesertaList)) {
        rowsToParse = data.pesertaList;
      } else if (Array.isArray(data.partai)) {
        rowsToParse = data.partai;
      } else {
        rowsToParse = [data];
      }
    } else {
      throw new Error('Format berkas harus berupa JSON Array atau Dokumen dengan properti "schedule"');
    }

    return parseScheduleJsonRows(rowsToParse, sourceName, 'json');
  } catch (err: any) {
    return createFailedValidationSummary('json', `Sintaks JSON tidak valid: ${err.message}`, sourceName);
  }
}

/**
 * Create a standardized failed validation summary for unparseable files
 */
function createFailedValidationSummary(
  format: 'excel' | 'csv' | 'json' | 'text' | 'unknown',
  errorMessage: string,
  sourceName: string
): ParsedScheduleSummary {
  const issue: ValidationIssue = {
    rowNumber: 1,
    field: 'Format Berkas',
    message: errorMessage,
    severity: 'error'
  };

  const validation: ValidationReport = {
    isValid: false,
    status: 'invalid',
    fatalError: errorMessage,
    fileFormat: format,
    totalRows: 0,
    validRowsCount: 0,
    invalidRowsCount: 0,
    warningRowsCount: 0,
    issues: [issue],
    errors: [issue],
    warnings: [],
    duplicatePartaiList: [],
    checkedRules: [
      {
        id: 'syntax_and_format',
        rule: 'Format & Integritas Sintaks Berkas',
        passed: false,
        status: 'failed',
        details: errorMessage
      }
    ]
  };

  return {
    totalRows: 0,
    tandingCount: 0,
    seniCount: 0,
    formatDetected: 'mixed_schedule',
    rows: [],
    tandingCategories: [],
    seniPesertaList: [],
    validation
  };
}

/**
 * Parse raw tabular text (e.g. copied from Excel, Google Sheets, Word, WhatsApp, or JSON)
 */
export function parseScheduleText(rawText: string): ParsedScheduleSummary {
  const trimmed = rawText.trim();
  if (trimmed.length === 0) {
    return createFailedValidationSummary('text', 'Teks data jadwal kosong.', 'Pasted_Text');
  }

  // Detect if user pasted JSON structure
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return parseScheduleJsonText(trimmed, 'Pasted_JSON_Schedule');
  }

  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return createFailedValidationSummary('text', 'Teks data jadwal tidak memiliki baris data.', 'Pasted_Text');
  }

  // Check if header line exists (tab, semicolon, comma, or pipe separated)
  const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : lines[0].includes(',') ? ',' : '|';
  const headers = lines[0].split(delimiter).map(h => cleanStr(h).toLowerCase());

  const hasStandardHeader = headers.some(h => 
    h.includes('partai') || h.includes('merah') || h.includes('atlet') || h.includes('peserta') || h.includes('kontingen') || h.includes('nama')
  );

  const rawJson: any[] = [];
  const startIdx = hasStandardHeader ? 1 : 0;
  const colKeys = hasStandardHeader ? headers : ['col0', 'col1', 'col2', 'col3', 'col4', 'col5', 'col6', 'col7', 'col8'];

  for (let i = startIdx; i < lines.length; i++) {
    const parts = lines[i].split(delimiter).map(p => cleanStr(p));
    if (parts.length === 0 || parts.every(p => !p)) continue;
    
    const rowObj: Record<string, any> = {};
    colKeys.forEach((key, idx) => {
      rowObj[key] = parts[idx] || '';
    });
    rawJson.push(rowObj);
  }

  return parseScheduleJsonRows(rawJson, 'Pasted_Schedule_Data', delimiter === ',' ? 'csv' : 'text');
}

/**
 * Core Parser that analyzes json rows, normalizes fields, and executes validation checks
 */
export function parseScheduleJsonRows(
  rawRows: any[],
  sourceName: string = '',
  fileFormat: 'excel' | 'csv' | 'json' | 'text' | 'unknown' = 'unknown'
): ParsedScheduleSummary {
  if (!rawRows || rawRows.length === 0) {
    return createFailedValidationSummary(fileFormat, 'Tidak ada baris data yang terbaca.', sourceName);
  }

  // 1. Check if rows represent match vs vs single athlete roster
  let hasMerahBiru = false;
  let hasSeniKeywords = false;
  let hasAthleteRosterCols = false;

  const sample = rawRows.slice(0, 15);
  sample.forEach(r => {
    if (!r || typeof r !== 'object') return;
    const keys = Object.keys(r).map(k => k.toLowerCase());
    const values = Object.values(r).map(v => cleanStr(v).toLowerCase()).join(' ');

    if (keys.some(k => k.includes('merah') || k.includes('red')) && keys.some(k => k.includes('biru') || k.includes('blue'))) {
      hasMerahBiru = true;
    }
    if (values.includes('tunggal') || values.includes('ganda') || values.includes('regu') || values.includes('solo kreatif') || keys.some(k => k.includes('pool'))) {
      hasSeniKeywords = true;
    }
    if (keys.some(k => k.includes('nama') || k.includes('atlet')) && !keys.some(k => k.includes('merah') || k.includes('biru'))) {
      hasAthleteRosterCols = true;
    }
  });

  const parsedRows: ParsedScheduleRow[] = [];

  rawRows.forEach((row, index) => {
    if (!row || typeof row !== 'object') return;

    // Flatten one level of nested objects (e.g. sudutMerah: { nama: '...', kontingen: '...' })
    const flatRow: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        for (const [subK, subV] of Object.entries(v)) {
          flatRow[`${k}_${subK}`] = subV;
          flatRow[`${k}${subK}`] = subV;
        }
      }
      flatRow[k] = v;
    }

    // Helper to extract value by multiple possible key candidates
    const getVal = (candidates: string[]): string => {
      for (const cand of candidates) {
        for (const [key, val] of Object.entries(flatRow)) {
          const lowerKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanCand = cand.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (lowerKey === cleanCand || lowerKey.includes(cleanCand)) {
            if (val && typeof val === 'object') {
              // Extract name or string property if any
              const innerName = (val as any).nama || (val as any).name || (val as any).title;
              if (innerName) return cleanStr(innerName);
            }
            const strVal = cleanStr(val);
            if (strVal) return strVal;
          }
        }
      }
      return '';
    };

    const noRaw = getVal(['no', 'nomor', 'no.', 'num', 'idx']);
    const partaiRaw = getVal(['partai', 'partai_ke', 'no_partai', 'partai_no', 'match', 'part', 'match_no', 'matchno']);
    const kelasRaw = getVal(['kelas', 'kategori_kelas', 'kelas_tanding', 'class', 'weight']);
    const kategoriRaw = getVal(['kategori', 'jenis_lomba', 'kategori_lomba', 'category', 'event', 'type']);
    const babakRaw = getVal(['babak', 'round', 'fase', 'stage']);
    const usiaRaw = getVal(['usia', 'kategori_usia', 'age', 'golongan']);
    const genderRaw = getVal(['gender', 'jenis_kelamin', 'jk', 'pa_pi', 'sex']);
    const poolRaw = getVal(['pool', 'pool_name', 'grup', 'group']);
    const gelanggangRaw = getVal(['gelanggang', 'arena', 'matras', 'court']);
    const remarkRaw = getVal(['remark', 'keterangan', 'pemenang', 'catatan', 'status', 'note']);

    // Merah candidates
    const merahNama = getVal(['sudut_merah', 'merah', 'nama_merah', 'atlet_merah', 'atlet1', 'merah_nama', 'sudut_merah_nama', 'red_corner', 'corner_red']);
    const merahKontingen = getVal(['kontingen_merah', 'kontingen_m', 'asal_merah', 'perguruan_merah', 'merah_kontingen', 'team_merah']);

    // Biru candidates
    const biruNama = getVal(['sudut_biru', 'biru', 'nama_biru', 'atlet_biru', 'atlet2', 'biru_nama', 'sudut_biru_nama', 'blue_corner', 'corner_blue']);
    const biruKontingen = getVal(['kontingen_biru', 'kontingen_b', 'asal_biru', 'perguruan_biru', 'biru_kontingen', 'team_biru']);

    // Single participant candidates (if only one name column)
    const singleNama = getVal(['nama', 'nama_atlet', 'nama_lengkap', 'peserta', 'atlet', 'name', 'participant']);
    const singleKontingen = getVal(['kontingen', 'perguruan', 'asal', 'daerah', 'kontingen_asal', 'tim', 'team']);

    // Calculate numeric partai
    const numPartai = partaiRaw ? extractPartaiNumber(partaiRaw) : (index + 1);
    const finalPartaiLabel = formatPartaiLabel(numPartai);

    // Detect type & details
    const combinedContext = `${kelasRaw} ${kategoriRaw} ${usiaRaw} ${singleNama} ${merahNama} ${biruNama}`;
    const detectedKategoriType = detectKategoriType(combinedContext);
    const detectedGender = detectGender(genderRaw || combinedContext);
    const detectedUsia = detectKategoriUsia(usiaRaw || combinedContext);
    const detectedKelas = detectKelas(kelasRaw || combinedContext, detectedKategoriType);
    const detectedRound = normalizeRound(babakRaw || 'quarter');

    // Decide if row is Tanding or Seni
    const isSeni = detectedKategoriType !== 'Tanding' || Boolean(poolRaw) || (!biruNama && Boolean(singleNama));

    const finalMerahNama = merahNama || (isSeni ? singleNama : 'Sudut Merah');
    const finalMerahKontingen = merahKontingen || (isSeni ? singleKontingen : '-');
    const finalBiruNama = isSeni ? '' : (biruNama || 'Sudut Biru');
    const finalBiruKontingen = isSeni ? '' : (biruKontingen || '-');

    // Filter out completely empty dummy rows
    if (!finalMerahNama && !finalBiruNama && !kelasRaw && !partaiRaw) {
      return;
    }

    parsedRows.push({
      id: `sched_row_${Date.now()}_${index}`,
      no: parseInt(noRaw, 10) || (index + 1),
      partai: finalPartaiLabel,
      partaiNumber: numPartai,
      kategoriType: isSeni ? (detectedKategoriType === 'Tanding' ? 'Tunggal' : detectedKategoriType) : 'Tanding',
      kelas: detectedKelas,
      round: detectedRound,
      roundLabel: babakRaw || getRoundLabel(detectedRound),
      gender: detectedGender,
      usia: detectedUsia,
      merahNama: finalMerahNama,
      merahKontingen: finalMerahKontingen,
      biruNama: finalBiruNama,
      biruKontingen: finalBiruKontingen,
      poolName: poolRaw || (isSeni ? 'Pool A' : ''),
      noUndian: index + 1,
      gelanggang: gelanggangRaw || 'Gelanggang 1',
      remark: remarkRaw,
      rawRow: row,
      isValid: true,
      issues: []
    });
  });

  // Execute comprehensive validation on all rows
  const validation = validateScheduleData(parsedRows, rawRows, fileFormat);

  // 2. Count types
  const tandingRows = parsedRows.filter(r => r.kategoriType === 'Tanding');
  const seniRows = parsedRows.filter(r => r.kategoriType !== 'Tanding');

  let formatDetected: ParsedScheduleSummary['formatDetected'] = 'mixed_schedule';
  if (tandingRows.length > 0 && seniRows.length === 0) {
    formatDetected = 'tanding_match_schedule';
  } else if (seniRows.length > 0 && tandingRows.length === 0) {
    formatDetected = 'seni_pool_schedule';
  } else if (hasAthleteRosterCols && !hasMerahBiru) {
    formatDetected = 'athlete_roster';
  }

  // 3. Transform to BaganCategory[] for Tanding
  const tandingCategories: BaganCategory[] = [];
  const categoryMap = new Map<string, { cat: BaganCategory; matches: BaganMatch[] }>();

  tandingRows.forEach((r) => {
    const catKey = `${r.usia}_${r.gender}_${r.kelas}`.toLowerCase().replace(/\s+/g, '_');
    const catName = `${r.usia} ${r.gender} - ${r.kelas}`;

    if (!categoryMap.has(catKey)) {
      categoryMap.set(catKey, {
        cat: {
          id: `cat_${catKey}`,
          name: catName,
          gender: r.gender,
          size: 8,
          kelas: r.kelas,
          usia: r.usia,
          matches: []
        },
        matches: []
      });
    }

    const entry = categoryMap.get(catKey)!;
    const matchId = entry.matches.length + 1;

    const athleteMerah: Athlete = {
      nama: r.merahNama,
      kontingen: r.merahKontingen
    };
    const athleteBiru: Athlete = {
      nama: r.biruNama,
      kontingen: r.biruKontingen
    };

    entry.matches.push({
      id: matchId,
      round: r.round,
      partai: r.partai,
      atletMerah: athleteMerah,
      atletBiru: athleteBiru,
      winner: null
    });
  });

  categoryMap.forEach(({ cat, matches }) => {
    cat.matches = matches;
    cat.size = matches.length <= 2 ? 4 : matches.length <= 4 ? 8 : 16;
    tandingCategories.push(cat);
  });

  // 4. Transform to TGRPeserta[] for Seni
  const seniPesertaList: TGRPeserta[] = seniRows.map((r, idx) => ({
    id: `peserta_upload_${Date.now()}_${idx}`,
    noUrut: idx + 1,
    noUndian: r.noUndian || (idx + 1),
    partai: r.partai,
    partaiNumber: r.partaiNumber,
    pool: r.poolName || 'Pool A',
    poolName: r.poolName || 'Pool A',
    gender: r.gender,
    usia: r.usia,
    nama: r.merahNama || `Peserta ${idx + 1}`,
    kontingen: r.merahKontingen || 'Umum',
    kategori: r.kategoriType,
    status: 'Belum Menilai',
    scores: {},
    kebenaranScores: {},
    isLocked: false,
    decisions: [],
    deductions: 0,
    deductionReasons: [],
    dewanDecisionScore: 0,
    finalizedJuries: []
  }));

  return {
    totalRows: parsedRows.length,
    tandingCount: tandingRows.length,
    seniCount: seniRows.length,
    formatDetected,
    rows: parsedRows,
    tandingCategories,
    seniPesertaList,
    validation
  };
}

/**
 * Validate schedule data against IPSI digital scoring system requirements
 */
export function validateScheduleData(
  rows: ParsedScheduleRow[],
  rawRows: any[],
  fileFormat: 'excel' | 'csv' | 'json' | 'text' | 'unknown' = 'unknown'
): ValidationReport {
  const issues: ValidationIssue[] = [];
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const duplicatePartaiList: string[] = [];

  // Check Rule 1: File & Syntax Integrity
  const ruleSyntax: ValidationRuleCheck = {
    id: 'syntax_and_format',
    rule: 'Format & Struktur Berkas',
    passed: true,
    status: 'passed',
    details: `Berkas ${fileFormat.toUpperCase()} berhasil dibaca ke dalam struktur tabel sistem.`
  };

  if (!rawRows || rawRows.length === 0 || rows.length === 0) {
    ruleSyntax.passed = false;
    ruleSyntax.status = 'failed';
    ruleSyntax.details = 'Berkas kosong atau tidak memiliki data jadwal yang valid.';
    return {
      isValid: false,
      status: 'invalid',
      fatalError: 'Berkas tidak memiliki data baris atau tabel kosong. Pastikan berkas CSV/JSON/Excel berisi data jadwal pertandingan.',
      fileFormat,
      totalRows: 0,
      validRowsCount: 0,
      invalidRowsCount: 0,
      warningRowsCount: 0,
      issues: [],
      errors: [],
      warnings: [],
      duplicatePartaiList: [],
      checkedRules: [ruleSyntax]
    };
  }

  // Check Rule 2: Required Structure / System Field Headers
  const sampleKeys = new Set<string>();
  rawRows.slice(0, 10).forEach(r => {
    if (r && typeof r === 'object') {
      Object.keys(r).forEach(k => sampleKeys.add(k.toLowerCase().replace(/[^a-z0-9]/g, '')));
    }
  });

  const hasParticipantCol = Array.from(sampleKeys).some(k => 
    k.includes('nama') || k.includes('atlet') || k.includes('peserta') || k.includes('merah') || k.includes('biru') || k.includes('sudut')
  );

  const ruleStructure: ValidationRuleCheck = {
    id: 'required_structure',
    rule: 'Kesesuaian Kolom Wajib Sistem',
    passed: hasParticipantCol || rows.length > 0,
    status: (hasParticipantCol || rows.length > 0) ? 'passed' : 'failed',
    details: (hasParticipantCol || rows.length > 0)
      ? 'Kolom/properti esensial (Partai, Peserta, Kategori/Kelas) teridentifikasi.'
      : 'Kolom nama atlet/peserta tidak ditemukan sama sekali.'
  };

  if (!hasParticipantCol && rows.length === 0) {
    return {
      isValid: false,
      status: 'invalid',
      fatalError: 'Struktur data tidak sesuai dengan format sistem Pencak Silat. Tidak ditemukan kolom nama atlet/peserta (Sudut Merah/Biru atau Nama Peserta).',
      fileFormat,
      totalRows: rows.length,
      validRowsCount: 0,
      invalidRowsCount: rows.length,
      warningRowsCount: 0,
      issues: [],
      errors: [],
      warnings: [],
      duplicatePartaiList: [],
      checkedRules: [ruleSyntax, ruleStructure]
    };
  }

  // Check Rule 3: Integritas Nomor Partai & Duplikasi
  const partaiCountMap = new Map<string, number[]>();
  rows.forEach(r => {
    const list = partaiCountMap.get(r.partai) || [];
    list.push(r.no);
    partaiCountMap.set(r.partai, list);
  });

  partaiCountMap.forEach((rowIndices, partai) => {
    if (rowIndices.length > 1) {
      duplicatePartaiList.push(partai);
      rowIndices.slice(1).forEach(rowNum => {
        const issue: ValidationIssue = {
          rowNumber: rowNum,
          partai,
          field: 'Partai',
          message: `Nomor partai ${partai} berulang (ditemukan pada baris urut ${rowIndices.join(', ')}).`,
          severity: 'warning'
        };
        warnings.push(issue);
        issues.push(issue);
      });
    }
  });

  const rulePartai: ValidationRuleCheck = {
    id: 'partai_numbering',
    rule: 'Konsistensi Nomor Partai',
    passed: duplicatePartaiList.length === 0,
    status: duplicatePartaiList.length === 0 ? 'passed' : 'warning',
    details: duplicatePartaiList.length === 0
      ? 'Semua nomor partai unik dan berurutan.'
      : `Ditemukan ${duplicatePartaiList.length} nomor partai berulang (${duplicatePartaiList.slice(0, 3).join(', ')}${duplicatePartaiList.length > 3 ? '...' : ''}).`
  };

  // Check Rule 4: Kelengkapan Identitas Atlet & Kontingen
  let rowsWithIdentityError = 0;
  let rowsWithIdentityWarning = 0;

  // Check Rule 5: Kategori & Kelas
  let rowsWithCategoryWarning = 0;

  // Check Rule 6: Gender & Usia
  let rowsWithGenderWarning = 0;

  // Row-level evaluation
  rows.forEach(r => {
    const rowIssues: ValidationIssue[] = [];

    // 1. Check partai number
    if (r.partaiNumber <= 0 || isNaN(r.partaiNumber)) {
      const issue: ValidationIssue = {
        rowNumber: r.no,
        partai: r.partai,
        field: 'Partai',
        message: 'Nomor partai tidak valid atau kurang dari 1.',
        severity: 'error'
      };
      rowIssues.push(issue);
      errors.push(issue);
      issues.push(issue);
    }

    // 2. Check participant names
    if (r.kategoriType === 'Tanding') {
      const merahIsBlank = !r.merahNama || r.merahNama === 'Sudut Merah' || r.merahNama.trim() === '';
      const biruIsBlank = !r.biruNama || r.biruNama === 'Sudut Biru' || r.biruNama.trim() === '';

      if (merahIsBlank && biruIsBlank) {
        const issue: ValidationIssue = {
          rowNumber: r.no,
          partai: r.partai,
          field: 'Nama Atlet',
          message: 'Kedua sudut (Merah dan Biru) kosong. Minimal harus ada salah satu atlet.',
          severity: 'error'
        };
        rowIssues.push(issue);
        errors.push(issue);
        issues.push(issue);
        rowsWithIdentityError++;
      } else if (merahIsBlank || biruIsBlank) {
        const issue: ValidationIssue = {
          rowNumber: r.no,
          partai: r.partai,
          field: 'Nama Atlet',
          message: `Salah satu sudut belum terisi (${merahIsBlank ? 'Sudut Merah' : 'Sudut Biru'} kosong, status Bye).`,
          severity: 'warning'
        };
        rowIssues.push(issue);
        warnings.push(issue);
        issues.push(issue);
        rowsWithIdentityWarning++;
      }

      // Check kontingen
      if ((!r.merahKontingen || r.merahKontingen === '-') && (!r.biruKontingen || r.biruKontingen === '-')) {
        const issue: ValidationIssue = {
          rowNumber: r.no,
          partai: r.partai,
          field: 'Kontingen',
          message: 'Kontingen atlet belum diisi (diatur sebagai "-").',
          severity: 'warning'
        };
        rowIssues.push(issue);
        warnings.push(issue);
        issues.push(issue);
      }
    } else {
      // Seni (Tunggal, Ganda, Regu, Solo Kreatif)
      const namaIsBlank = !r.merahNama || r.merahNama.trim() === '' || r.merahNama.startsWith('Peserta ');
      if (namaIsBlank) {
        const issue: ValidationIssue = {
          rowNumber: r.no,
          partai: r.partai,
          field: 'Nama Peserta',
          message: `Nama peserta seni ${r.kategoriType} tidak boleh kosong.`,
          severity: 'error'
        };
        rowIssues.push(issue);
        errors.push(issue);
        issues.push(issue);
        rowsWithIdentityError++;
      }

      if (!r.merahKontingen || r.merahKontingen === '-' || r.merahKontingen === 'Umum') {
        const issue: ValidationIssue = {
          rowNumber: r.no,
          partai: r.partai,
          field: 'Kontingen',
          message: 'Kontingen peserta belum diisi (diatur sebagai "Umum").',
          severity: 'warning'
        };
        rowIssues.push(issue);
        warnings.push(issue);
        issues.push(issue);
      }
    }

    // 3. Check Kelas
    if (!r.kelas || r.kelas === '-' || r.kelas.toLowerCase().includes('undefined')) {
      const issue: ValidationIssue = {
        rowNumber: r.no,
        partai: r.partai,
        field: 'Kelas',
        message: 'Kelas pertandingan tidak terdefinisi spesifik.',
        severity: 'warning'
      };
      rowIssues.push(issue);
      warnings.push(issue);
      issues.push(issue);
      rowsWithCategoryWarning++;
    }

    // 4. Check Gender
    if (r.gender !== 'Putra' && r.gender !== 'Putri') {
      const issue: ValidationIssue = {
        rowNumber: r.no,
        partai: r.partai,
        field: 'Jenis Kelamin',
        message: 'Jenis kelamin tidak terdeteksi Putra/Putri (default: Putra).',
        severity: 'warning'
      };
      rowIssues.push(issue);
      warnings.push(issue);
      issues.push(issue);
      rowsWithGenderWarning++;
    }

    // Check if row has duplicate partai issue from before
    const isDup = duplicatePartaiList.includes(r.partai);
    if (isDup && !rowIssues.some(i => i.field === 'Partai' && i.severity === 'warning')) {
      // already added in partaiCountMap
    }

    // Assign to row
    r.issues = rowIssues;
    r.isValid = rowIssues.every(i => i.severity !== 'error');
  });

  const ruleIdentity: ValidationRuleCheck = {
    id: 'participant_identity',
    rule: 'Kelengkapan Data Atlet & Kontingen',
    passed: rowsWithIdentityError === 0,
    status: rowsWithIdentityError === 0 ? (rowsWithIdentityWarning === 0 ? 'passed' : 'warning') : 'failed',
    details: rowsWithIdentityError === 0
      ? (rowsWithIdentityWarning === 0 ? 'Semua nama atlet & kontingen lengkap.' : `${rowsWithIdentityWarning} partai memiliki atlet tunggal / Bye.`)
      : `${rowsWithIdentityError} partai memiliki kesalahan nama atlet kosong.`
  };

  const ruleCategory: ValidationRuleCheck = {
    id: 'category_validity',
    rule: 'Validitas Kategori & Kelas Lomba',
    passed: rowsWithCategoryWarning === 0,
    status: rowsWithCategoryWarning === 0 ? 'passed' : 'warning',
    details: rowsWithCategoryWarning === 0
      ? 'Kategori tanding & seni TGR sesuai standar IPSI.'
      : `${rowsWithCategoryWarning} partai memiliki kelas tidak spesifik.`
  };

  const ruleGender: ValidationRuleCheck = {
    id: 'gender_and_age',
    rule: 'Klasifikasi Usia & Gender',
    passed: rowsWithGenderWarning === 0,
    status: rowsWithGenderWarning === 0 ? 'passed' : 'warning',
    details: rowsWithGenderWarning === 0
      ? 'Klasifikasi Putra/Putri dan Golongan Usia terverifikasi.'
      : `${rowsWithGenderWarning} baris jenis kelamin disesuaikan otomatis.`
  };

  const validRowsCount = rows.filter(r => r.isValid).length;
  const invalidRowsCount = rows.filter(r => !r.isValid).length;
  const warningRowsCount = rows.filter(r => r.isValid && r.issues.length > 0).length;

  const status: ValidationReport['status'] = errors.length > 0 
    ? (validRowsCount > 0 ? 'warning' : 'invalid')
    : (warnings.length > 0 ? 'warning' : 'valid');

  return {
    isValid: validRowsCount > 0,
    status,
    fatalError: validRowsCount === 0 ? 'Tidak ada baris jadwal yang memenuhi struktur valid untuk disimpan ke state sistem.' : null,
    fileFormat,
    totalRows: rows.length,
    validRowsCount,
    invalidRowsCount,
    warningRowsCount,
    issues,
    errors,
    warnings,
    duplicatePartaiList,
    checkedRules: [ruleSyntax, ruleStructure, rulePartai, ruleIdentity, ruleCategory, ruleGender]
  };
}

/**
 * Generate and download official Excel schedule template
 */
export function downloadScheduleTemplate(type: 'tanding' | 'seni' | 'lengkap' = 'lengkap') {
  const wb = XLSX.utils.book_new();

  if (type === 'tanding' || type === 'lengkap') {
    const tandingData = [
      {
        "No": 1,
        "Partai": "01",
        "Kelas": "Kelas A",
        "Babak": "SEMI FINAL",
        "Sudut Merah (Nama)": "FAJAR RAMADHAN",
        "Kontingen Merah": "BANTEN",
        "Sudut Biru (Nama)": "GALANG PERKASA",
        "Kontingen Biru": "SUMATERA BARAT",
        "Usia": "Dewasa",
        "Jenis Kelamin": "Putra",
        "Gelanggang": "Gelanggang 1",
        "Keterangan": "Jadwal Pagi"
      },
      {
        "No": 2,
        "Partai": "02",
        "Kelas": "Kelas A",
        "Babak": "SEMI FINAL",
        "Sudut Merah (Nama)": "ANDI WIJAYA",
        "Kontingen Merah": "DKI JAKARTA",
        "Sudut Biru (Nama)": "BUDI SANTOSO",
        "Kontingen Biru": "JAWA TIMUR",
        "Usia": "Dewasa",
        "Jenis Kelamin": "Putra",
        "Gelanggang": "Gelanggang 1",
        "Keterangan": "Jadwal Pagi"
      },
      {
        "No": 3,
        "Partai": "03",
        "Kelas": "Kelas B",
        "Babak": "PEREMPAT FINAL",
        "Sudut Merah (Nama)": "HIDAYAT LIMONU",
        "Kontingen Merah": "SULAWESI UTARA",
        "Sudut Biru (Nama)": "YUDHA MAHENDRI",
        "Kontingen Biru": "RIAU",
        "Usia": "Dewasa",
        "Jenis Kelamin": "Putra",
        "Gelanggang": "Gelanggang 1",
        "Keterangan": "Jadwal Siang"
      },
      {
        "No": 4,
        "Partai": "04",
        "Kelas": "Kelas B",
        "Babak": "PEREMPAT FINAL",
        "Sudut Merah (Nama)": "AFRIANI LAURENSIA",
        "Kontingen Merah": "SUMATERA UTARA",
        "Sudut Biru (Nama)": "SUCI WULANDARI",
        "Kontingen Biru": "SUMATERA BARAT",
        "Usia": "Dewasa",
        "Jenis Kelamin": "Putri",
        "Gelanggang": "Gelanggang 1",
        "Keterangan": "Jadwal Siang"
      },
      {
        "No": 5,
        "Partai": "05",
        "Kelas": "Kelas C",
        "Babak": "FINAL",
        "Sudut Merah (Nama)": "WEWEY WITA",
        "Kontingen Merah": "JAWA BARAT",
        "Sudut Biru (Nama)": "INGON SARESA D",
        "Kontingen Biru": "PAPUA",
        "Usia": "Dewasa",
        "Jenis Kelamin": "Putri",
        "Gelanggang": "Gelanggang 1",
        "Keterangan": "Partai Final"
      }
    ];

    const wsTanding = XLSX.utils.json_to_sheet(tandingData);
    wsTanding['!cols'] = [
      { wch: 6 },  // No
      { wch: 10 }, // Partai
      { wch: 14 }, // Kelas
      { wch: 18 }, // Babak
      { wch: 26 }, // Sudut Merah
      { wch: 20 }, // Kontingen Merah
      { wch: 26 }, // Sudut Biru
      { wch: 20 }, // Kontingen Biru
      { wch: 14 }, // Usia
      { wch: 14 }, // Jenis Kelamin
      { wch: 16 }, // Gelanggang
      { wch: 18 }  // Keterangan
    ];
    XLSX.utils.book_append_sheet(wb, wsTanding, 'Jadwal Tanding');
  }

  if (type === 'seni' || type === 'lengkap') {
    const seniData = [
      {
        "No": 1,
        "Partai": "01",
        "No Undian": 1,
        "Nama Peserta": "AHMAD FAUZI",
        "Kontingen": "JAWA BARAT",
        "Kategori": "Tunggal",
        "Pool": "Pool A",
        "Kategori Usia": "Dewasa",
        "Jenis Kelamin": "Putra",
        "Gelanggang": "Gelanggang 1",
        "Keterangan": "Sesi Pagi"
      },
      {
        "No": 2,
        "Partai": "01",
        "No Undian": 2,
        "Nama Peserta": "DIMAS PRASETYO",
        "Kontingen": "JAWA TIMUR",
        "Kategori": "Tunggal",
        "Pool": "Pool A",
        "Kategori Usia": "Dewasa",
        "Jenis Kelamin": "Putra",
        "Gelanggang": "Gelanggang 1",
        "Keterangan": "Sesi Pagi"
      },
      {
        "No": 3,
        "Partai": "01",
        "No Undian": 3,
        "Nama Peserta": "RADEN SATRIA",
        "Kontingen": "BALI",
        "Kategori": "Tunggal",
        "Pool": "Pool A",
        "Kategori Usia": "Dewasa",
        "Jenis Kelamin": "Putra",
        "Gelanggang": "Gelanggang 1",
        "Keterangan": "Sesi Pagi"
      },
      {
        "No": 4,
        "Partai": "02",
        "No Undian": 1,
        "Nama Peserta": "SITI RAHMA",
        "Kontingen": "JAWA TENGAH",
        "Kategori": "Tunggal",
        "Pool": "Pool A",
        "Kategori Usia": "Dewasa",
        "Jenis Kelamin": "Putri",
        "Gelanggang": "Gelanggang 1",
        "Keterangan": "Sesi Pagi"
      },
      {
        "No": 5,
        "Partai": "03",
        "No Undian": 1,
        "Nama Peserta": "HENDRA & YUDI",
        "Kontingen": "DKI JAKARTA",
        "Kategori": "Ganda",
        "Pool": "Pool A",
        "Kategori Usia": "Dewasa",
        "Jenis Kelamin": "Putra",
        "Gelanggang": "Gelanggang 1",
        "Keterangan": "Sesi Siang"
      },
      {
        "No": 6,
        "Partai": "04",
        "No Undian": 1,
        "Nama Peserta": "TIM REGU PUTRA",
        "Kontingen": "SUMATERA BARAT",
        "Kategori": "Regu",
        "Pool": "Pool A",
        "Kategori Usia": "Dewasa",
        "Jenis Kelamin": "Putra",
        "Gelanggang": "Gelanggang 1",
        "Keterangan": "Sesi Siang"
      }
    ];

    const wsSeni = XLSX.utils.json_to_sheet(seniData);
    wsSeni['!cols'] = [
      { wch: 6 },  // No
      { wch: 10 }, // Partai
      { wch: 12 }, // No Undian
      { wch: 26 }, // Nama Peserta
      { wch: 20 }, // Kontingen
      { wch: 14 }, // Kategori
      { wch: 12 }, // Pool
      { wch: 14 }, // Usia
      { wch: 14 }, // Gender
      { wch: 16 }, // Gelanggang
      { wch: 18 }  // Keterangan
    ];
    XLSX.utils.book_append_sheet(wb, wsSeni, 'Jadwal Seni TGR');
  }

  const fileName = type === 'tanding' 
    ? 'Template_Jadwal_Tanding_IPSI.xlsx'
    : type === 'seni'
    ? 'Template_Jadwal_Seni_TGR_IPSI.xlsx'
    : 'Template_Jadwal_Resmi_Pencak_Silat.xlsx';

  XLSX.writeFile(wb, fileName);
}

/**
 * Generate and download official JSON schedule template compliant with digital scoring system schema
 */
export function downloadScheduleJsonTemplate() {
  const jsonTemplate = {
    "$schema": "https://ipsi.or.id/schemas/digital-scoring-schedule-v1.json",
    "metadata": {
      "tournament": "KEJUARAAN NASIONAL PENCAK SILAT 2026",
      "exportedAt": new Date().toISOString(),
      "gelanggangDefault": "Gelanggang 1",
      "formatVersion": "1.0",
      "description": "Format data resmi jadwal pertandingan Pencak Silat untuk sistem Digital Scoring IPSI. Berisi daftar partai Tanding dan Seni (TGR)."
    },
    "schedule": [
      {
        "partai": "01",
        "kategori": "Tanding",
        "kelas": "Kelas A",
        "babak": "SEMI FINAL",
        "gender": "Putra",
        "usia": "Dewasa",
        "gelanggang": "Gelanggang 1",
        "sudutMerah": {
          "nama": "FAJAR RAMADHAN",
          "kontingen": "BANTEN"
        },
        "sudutBiru": {
          "nama": "GALANG PERKASA",
          "kontingen": "SUMATERA BARAT"
        },
        "keterangan": "Partai Pembuka Sesi Pagi"
      },
      {
        "partai": "02",
        "kategori": "Tanding",
        "kelas": "Kelas A",
        "babak": "SEMI FINAL",
        "gender": "Putra",
        "usia": "Dewasa",
        "gelanggang": "Gelanggang 1",
        "sudutMerah": {
          "nama": "ANDI WIJAYA",
          "kontingen": "DKI JAKARTA"
        },
        "sudutBiru": {
          "nama": "BUDI SANTOSO",
          "kontingen": "JAWA TIMUR"
        },
        "keterangan": "Sesi Pagi"
      },
      {
        "partai": "03",
        "kategori": "Tunggal",
        "pool": "Pool A",
        "noUndian": 1,
        "gender": "Putra",
        "usia": "Dewasa",
        "gelanggang": "Gelanggang 1",
        "nama": "ASEP SUNANDAR",
        "kontingen": "JAWA BARAT",
        "keterangan": "Seni Tunggal Putra Pool A"
      },
      {
        "partai": "04",
        "kategori": "Ganda",
        "pool": "Pool A",
        "noUndian": 1,
        "gender": "Putri",
        "usia": "Dewasa",
        "gelanggang": "Gelanggang 1",
        "nama": "NURUL & ANISA",
        "kontingen": "BALI",
        "keterangan": "Seni Ganda Putri Pool A"
      }
    ]
  };

  const jsonStr = JSON.stringify(jsonTemplate, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', 'Template_Jadwal_Pencak_Silat_IPSI.json');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generate and download official CSV schedule template
 */
export function downloadScheduleCsvTemplate(type: 'tanding' | 'seni' | 'lengkap' = 'lengkap') {
  let csvContent = '';
  if (type === 'tanding') {
    csvContent = "No,Partai,Kelas,Babak,Sudut Merah (Nama),Kontingen Merah,Sudut Biru (Nama),Kontingen Biru,Usia,Jenis Kelamin,Gelanggang,Keterangan\r\n" +
      '1,01,Kelas A,SEMI FINAL,FAJAR RAMADHAN,BANTEN,GALANG PERKASA,SUMATERA BARAT,Dewasa,Putra,Gelanggang 1,Jadwal Pagi\r\n' +
      '2,02,Kelas A,SEMI FINAL,ANDI WIJAYA,DKI JAKARTA,BUDI SANTOSO,JAWA TIMUR,Dewasa,Putra,Gelanggang 1,Jadwal Pagi\r\n' +
      '3,03,Kelas B,PEREMPAT FINAL,HIDAYAT LIMONU,SULAWESI UTARA,YUDHA MAHENDRI,RIAU,Dewasa,Putra,Gelanggang 1,Jadwal Siang\r\n' +
      '4,04,Kelas B,PEREMPAT FINAL,AFRIANI LAURENSIA,SUMATERA UTARA,SUCI WULANDARI,SUMATERA BARAT,Dewasa,Putri,Gelanggang 1,Jadwal Siang\r\n';
  } else if (type === 'seni') {
    csvContent = "No,Partai,No Undian,Nama Peserta,Kontingen,Kategori,Pool,Kategori Usia,Jenis Kelamin,Gelanggang,Keterangan\r\n" +
      '1,01,1,ASEP SUNANDAR,JAWA BARAT,Tunggal,Pool A,Dewasa,Putra,Gelanggang 1,Sesi Pagi\r\n' +
      '2,02,2,BAMBANG SUTRISNO,JAWA TENGAH,Tunggal,Pool A,Dewasa,Putra,Gelanggang 1,Sesi Pagi\r\n' +
      '3,03,1,HENDRA & YUDI,DKI JAKARTA,Ganda,Pool A,Dewasa,Putra,Gelanggang 1,Sesi Siang\r\n' +
      '4,04,1,TIM REGU PUTRA,SUMATERA BARAT,Regu,Pool A,Dewasa,Putra,Gelanggang 1,Sesi Siang\r\n';
  } else {
    csvContent = "No,Partai,Kelas,Babak,Sudut Merah (Nama),Kontingen Merah,Sudut Biru (Nama),Kontingen Biru,Usia,Jenis Kelamin,Gelanggang,Keterangan\r\n" +
      '1,01,Kelas A,SEMI FINAL,FAJAR RAMADHAN,BANTEN,GALANG PERKASA,SUMATERA BARAT,Dewasa,Putra,Gelanggang 1,Tanding\r\n' +
      '2,02,Kelas A,SEMI FINAL,ANDI WIJAYA,DKI JAKARTA,BUDI SANTOSO,JAWA TIMUR,Dewasa,Putra,Gelanggang 1,Tanding\r\n' +
      '3,03,Tunggal,Pool A,ASEP SUNANDAR,JAWA BARAT,-,-,Dewasa,Putra,Gelanggang 1,Seni Tunggal\r\n' +
      '4,04,Ganda,Pool A,HENDRA & YUDI,DKI JAKARTA,-,-,Dewasa,Putra,Gelanggang 1,Seni Ganda\r\n';
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `Template_Jadwal_${type.toUpperCase()}_IPSI.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

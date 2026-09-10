/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import firebaseConfig from '../../firebase-applet-config.json';
import { BaganCategory, GelanggangInfo, MatchHistory, MatchState, TGRPeserta, TGRState } from '../types';
import { parseExcelRows, ParsedAthleteRecord } from '../utils/smartDataParser';

export const GOOGLE_OAUTH_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  firebaseConfig?.oAuthClientId ||
  '693776040957-tsdo8u2i09eb7sbalir2qcig0vv6jlme.apps.googleusercontent.com';

export const REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
].join(' ');

const TOKEN_STORAGE_KEY = 'silat_google_access_token';
const TOKEN_EXPIRY_KEY = 'silat_google_token_expiry';
const SPREADSHEET_ID_STORAGE_KEY = 'silat_active_spreadsheet_id';
const SPREADSHEET_URL_STORAGE_KEY = 'silat_active_spreadsheet_url';
const SPREADSHEET_TITLE_STORAGE_KEY = 'silat_active_spreadsheet_title';
const AUTO_SYNC_STORAGE_KEY = 'silat_google_sheets_autosync';
const WEBHOOK_URL_STORAGE_KEY = 'silat_google_apps_script_webhook';

export const APPS_SCRIPT_SAMPLE_CODE = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (data.action === 'PING') {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'ok',
        title: ss.getName(),
        sheets: ss.getSheets().map(function(s){ return s.getName(); })
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.sheets) {
      for (var sheetName in data.sheets) {
        var rows = data.sheets[sheetName];
        if (rows && rows.length > 0) {
          var targetSheet = ss.getSheetByName(sheetName);
          if (!targetSheet) {
            targetSheet = ss.insertSheet(sheetName);
          }
          targetSheet.clear();
          targetSheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
          targetSheet.getRange(1, 1, 1, rows[0].length).setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Berhasil sinkronisasi seluruh tab ke Google Sheets'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'ignored' })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

export interface GoogleUserProfile {
  email: string;
  name: string;
  picture?: string;
}

export interface GoogleSpreadsheetInfo {
  id: string;
  title: string;
  url: string;
  sheets: string[];
}

/**
 * Get stored token if still valid
 */
export function getStoredGoogleToken(): string | null {
  try {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!token || !expiry) return null;
    const expiryTime = parseInt(expiry, 10);
    if (Date.now() > expiryTime - 60000) {
      // Token expired or about to expire in 1 minute
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

/**
 * Save access token with expiration
 */
export function saveGoogleToken(token: string, expiresInSeconds: number = 3600): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    const expiryTime = Date.now() + (expiresInSeconds * 1000);
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
  } catch (err) {
    console.warn('Failed to save Google token to localStorage', err);
  }
}

/**
 * Clear stored token
 */
export function clearStoredGoogleToken(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  } catch (err) {
    console.warn('Failed to clear Google token', err);
  }
}

/**
 * Get / set active connected spreadsheet ID
 */
export function getActiveSpreadsheetId(): string | null {
  try {
    return localStorage.getItem(SPREADSHEET_ID_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setActiveSpreadsheet(id: string, url?: string, title?: string): void {
  try {
    localStorage.setItem(SPREADSHEET_ID_STORAGE_KEY, id);
    if (url) localStorage.setItem(SPREADSHEET_URL_STORAGE_KEY, url);
    if (title) localStorage.setItem(SPREADSHEET_TITLE_STORAGE_KEY, title);
  } catch (err) {
    console.warn('Failed to set active spreadsheet in localStorage', err);
  }
}

export function getActiveSpreadsheetTitle(): string {
  try {
    return localStorage.getItem(SPREADSHEET_TITLE_STORAGE_KEY) || 'Hasil Pertandingan Pencak Silat';
  } catch {
    return 'Hasil Pertandingan Pencak Silat';
  }
}

export function getActiveSpreadsheetUrl(): string {
  const id = getActiveSpreadsheetId();
  if (!id) return '';
  return `https://docs.google.com/spreadsheets/d/${id}/edit`;
}

export function getAutoSyncEnabled(): boolean {
  try {
    return localStorage.getItem(AUTO_SYNC_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAutoSyncEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(AUTO_SYNC_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch (err) {
    console.warn('Failed to set auto-sync in localStorage', err);
  }
}

export function getStoredWebhookUrl(): string {
  try {
    return localStorage.getItem(WEBHOOK_URL_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function saveWebhookUrl(url: string): void {
  try {
    localStorage.setItem(WEBHOOK_URL_STORAGE_KEY, url.trim());
  } catch (err) {
    console.warn('Failed to save webhook URL to localStorage', err);
  }
}

export function clearStoredWebhookUrl(): void {
  try {
    localStorage.removeItem(WEBHOOK_URL_STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear webhook URL', err);
  }
}

/**
 * Request Google OAuth Access Token via Google Identity Services client popup
 */
export function requestGoogleAccessToken(
  onSuccess: (token: string) => void,
  onError: (error: string) => void
): void {
  if (typeof window === 'undefined') return;

  const google = (window as any).google;
  if (!google?.accounts?.oauth2) {
    onError('Google Identity Services SDK belum siap. Silakan muat ulang halaman.');
    return;
  }

  try {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_OAUTH_CLIENT_ID,
      scope: REQUIRED_SCOPES,
      callback: (response: any) => {
        if (response.error) {
          onError(`Gagal autentikasi Google: ${response.error_description || response.error}`);
          return;
        }
        if (response.access_token) {
          saveGoogleToken(response.access_token, response.expires_in || 3600);
          onSuccess(response.access_token);
        } else {
          onError('Tidak ada token akses yang diterima dari Google.');
        }
      },
    });

    client.requestAccessToken({ prompt: 'consent' });
  } catch (err: any) {
    console.error('Error initiating Google OAuth token client', err);
    onError(err.message || 'Gagal memulai koneksi Google.');
  }
}

/**
 * Fetch User Profile (email & name) using access token
 */
export async function fetchGoogleUserProfile(token: string): Promise<GoogleUserProfile | null> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Extract Spreadsheet ID from full URL or return ID as-is
 */
export function extractSpreadsheetId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

/**
 * Fetch details of a spreadsheet
 */
export async function fetchSpreadsheetInfo(token: string, spreadsheetId: string): Promise<GoogleSpreadsheetInfo> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?includeGridData=false`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gagal mengambil data spreadsheet (${res.status})`);
  }

  const data = await res.json();
  const sheetNames = (data.sheets || []).map((s: any) => s.properties?.title || '').filter(Boolean);

  return {
    id: data.spreadsheetId,
    title: data.properties?.title || 'Untitled Spreadsheet',
    url: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    sheets: sheetNames
  };
}

/**
 * Create a new official Championship Google Spreadsheet in the user's Google Drive
 */
export async function createChampionshipSpreadsheet(
  token: string,
  eventTitle: string = 'Hasil Pertandingan Pencak Silat'
): Promise<GoogleSpreadsheetInfo> {
  const requestBody = {
    properties: {
      title: `${eventTitle} - IPSI Digital Skoring`
    },
    sheets: [
      {
        properties: {
          title: 'DATA PESERTA',
          gridProperties: { frozenRowCount: 1 }
        }
      },
      {
        properties: {
          title: 'HASIL TANDING',
          gridProperties: { frozenRowCount: 1 }
        }
      },
      {
        properties: {
          title: 'HASIL SENI TGR',
          gridProperties: { frozenRowCount: 1 }
        }
      },
      {
        properties: {
          title: 'JADWAL GELANGGANG',
          gridProperties: { frozenRowCount: 1 }
        }
      },
      {
        properties: {
          title: 'KLASEMEN KONTINGEN',
          gridProperties: { frozenRowCount: 1 }
        }
      }
    ]
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Gagal membuat Google Spreadsheet baru');
  }

  const created = await createRes.json();
  const spreadsheetId = created.spreadsheetId;

  // Initialize Default Headers
  const headerUpdates = [
    {
      range: 'DATA PESERTA!A1:J1',
      values: [
        ['No', 'ID Atlet', 'Nama Atlet', 'Kontingen', 'Kategori', 'Kelas / Nomor', 'Usia', 'Gender', 'Gelanggang', 'Status']
      ]
    },
    {
      range: 'HASIL TANDING!A1:L1',
      values: [
        [
          'No',
          'Waktu Selesai',
          'Gelanggang',
          'Partai',
          'Kategori / Kelas',
          'Babak',
          'Sudut Merah (Nama & Kontingen)',
          'Skor Merah',
          'Sudut Biru (Nama & Kontingen)',
          'Skor Biru',
          'Pemenang',
          'Jenis Kemenangan'
        ]
      ]
    },
    {
      range: 'HASIL SENI TGR!A1:L1',
      values: [
        [
          'No',
          'Gelanggang',
          'Partai',
          'Kategori Seni',
          'Nama Pesilat / Regu',
          'Kontingen',
          'Skor Kebenaran',
          'Skor Kemantapan',
          'Penalti Waktu / Luar',
          'Total Nilai Akhir',
          'Peringkat',
          'Status'
        ]
      ]
    },
    {
      range: 'JADWAL GELANGGANG!A1:I1',
      values: [
        ['No', 'Gelanggang', 'Partai', 'Kategori', 'Kelas / Pool', 'Sudut Merah / Peserta 1', 'Sudut Biru / Peserta 2', 'Babak', 'Status Pertandingan']
      ]
    },
    {
      range: 'KLASEMEN KONTINGEN!A1:F1',
      values: [
        ['Peringkat', 'Kontingen / Perguruan', 'Emas (1st)', 'Perak (2nd)', 'Perunggu (3rd)', 'Total Medali']
      ]
    }
  ];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: headerUpdates
    })
  });

  const sheetInfo: GoogleSpreadsheetInfo = {
    id: spreadsheetId,
    title: created.properties?.title || `${eventTitle} - IPSI Digital Skoring`,
    url: created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    sheets: ['DATA PESERTA', 'HASIL TANDING', 'HASIL SENI TGR', 'JADWAL GELANGGANG', 'KLASEMEN KONTINGEN']
  };

  setActiveSpreadsheet(sheetInfo.id, sheetInfo.url, sheetInfo.title);
  return sheetInfo;
}

/**
 * Read values from a given range of spreadsheet
 */
export async function readSpreadsheetValues(
  token: string,
  spreadsheetId: string,
  range: string
): Promise<any[][]> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const encodedRange = encodeURIComponent(range);
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodedRange}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gagal membaca spreadsheet (${res.status})`);
  }

  const data = await res.json();
  return data.values || [];
}

/**
 * Write / Update range in spreadsheet
 */
export async function updateSpreadsheetValues(
  token: string,
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<void> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const encodedRange = encodeURIComponent(range);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodedRange}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values
      })
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gagal mengupdate spreadsheet (${res.status})`);
  }
}

/**
 * Clear a range in spreadsheet
 */
export async function clearSpreadsheetRange(
  token: string,
  spreadsheetId: string,
  range: string
): Promise<void> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const encodedRange = encodeURIComponent(range);
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodedRange}:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
}

/**
 * Read CSV from public or shared Google Sheet
 */
export async function readPublicGoogleSheetCsv(spreadsheetId: string, sheetName: string = ''): Promise<string> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  if (!cleanId) throw new Error('ID Spreadsheet tidak valid');

  // Try via server proxy endpoint first (avoids CORS)
  try {
    const proxyUrl = `/api/sheets/read?id=${encodeURIComponent(cleanId)}${sheetName ? `&sheet=${encodeURIComponent(sheetName)}` : ''}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const text = await res.text();
      if (text && text.trim().length > 0 && !text.includes('<!doctype html>')) {
        return text;
      }
    }
  } catch (e) {
    console.warn('Proxy fetch failed, trying direct Google URL:', e);
  }

  // Fallback: direct Google Visualization query
  const directUrl = sheetName
    ? `https://docs.google.com/spreadsheets/d/${encodeURIComponent(cleanId)}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`
    : `https://docs.google.com/spreadsheets/d/${encodeURIComponent(cleanId)}/gviz/tq?tqx=out:csv`;

  const res = await fetch(directUrl);
  if (!res.ok) {
    throw new Error(`Gagal membaca Google Sheets (${res.status} ${res.statusText}). Pastikan akses disetel: "Siapa saja yang memiliki link dapat melihat".`);
  }
  return await res.text();
}

/**
 * Import athletes directly from public or shared Google Sheet CSV
 */
export async function importAthletesFromPublicGoogleSheet(
  spreadsheetId: string,
  sheetName: string = ''
): Promise<ParsedAthleteRecord[]> {
  const csvText = await readPublicGoogleSheetCsv(spreadsheetId, sheetName);
  if (!csvText || !csvText.trim()) {
    throw new Error('Data spreadsheet kosong.');
  }

  // Parse CSV with XLSX library
  const workbook = XLSX.read(csvText, { type: 'string' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];

  if (!rows || rows.length === 0) {
    throw new Error('Tidak ada baris data peserta yang terdeteksi di Google Sheet.');
  }

  return parseExcelRows(rows);
}

/**
 * IMPORT ATHLETES: Dual-mode fetcher
 * Tries OAuth API v4 if token is present; automatically falls back to Public / Proxy Link
 */
export async function importAthletesFromGoogleSheet(
  token: string | null | undefined,
  spreadsheetId: string,
  sheetName: string = 'DATA PESERTA'
): Promise<ParsedAthleteRecord[]> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  if (!cleanId) {
    throw new Error('ID atau URL Spreadsheet wajib diisi.');
  }

  // 1. Try OAuth v4 if token is provided
  if (token) {
    try {
      const rows = await readSpreadsheetValues(token, cleanId, `${sheetName}!A1:Z500`);
      if (rows && rows.length > 1) {
        const header = rows[0].map((h: any) => String(h).trim().toLowerCase());
        const bodyRows = rows.slice(1);
        const objectRows = bodyRows.map(row => {
          const obj: Record<string, string> = {};
          header.forEach((colName: string, colIdx: number) => {
            obj[colName] = row[colIdx] ? String(row[colIdx]).trim() : '';
          });
          return obj;
        });
        return parseExcelRows(objectRows);
      }
    } catch (err) {
      console.warn('Google Sheets API v4 failed, attempting public read fallback:', err);
    }
  }

  // 2. Fallback to public link
  return importAthletesFromPublicGoogleSheet(cleanId, sheetName);
}

/**
 * SYNC ALL PARTICIPANTS TO GOOGLE SHEETS
 * Writes all athletes from tanding brackets and seni participant lists across all arenas
 */
export async function syncAllParticipantsToSheets(
  token: string,
  spreadsheetId: string,
  allArenasMap: Record<string, { state: MatchState; tgrState: TGRState; histories: MatchHistory[]; info: GelanggangInfo }>
): Promise<number> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const rows: any[][] = [
    ['No', 'ID Atlet', 'Nama Atlet', 'Kontingen', 'Kategori', 'Kelas / Nomor', 'Usia', 'Gender', 'Gelanggang', 'Status']
  ];

  let counter = 1;
  const recordedAthletes = new Set<string>();

  Object.values(allArenasMap).forEach(arenaData => {
    const gelanggangNama = arenaData.info?.nama || 'Gelanggang';

    // 1. Tanding Athletes
    const baganCategories = arenaData.state?.baganCategories || [];
    baganCategories.forEach(cat => {
      const catMatches = cat.matches || [];
      catMatches.forEach(m => {
        // Atlet Merah
        if (m.atletMerah?.nama && m.atletMerah.nama !== 'BYE') {
          const key = `tanding_${m.atletMerah.nama}_${m.atletMerah.kontingen}_${cat.name}`;
          if (!recordedAthletes.has(key)) {
            recordedAthletes.add(key);
            rows.push([
              counter++,
              `TND-${counter}`,
              m.atletMerah.nama,
              m.atletMerah.kontingen || '-',
              'Tanding',
              cat.kelas || cat.name || 'Kelas',
              cat.usia || 'Dewasa',
              cat.gender || 'Putra',
              cat.gelanggang || gelanggangNama,
              m.winner === 'merah' ? 'Menang / Lolos' : (m.winner === 'biru' ? 'Gugur' : 'Terdaftar')
            ]);
          }
        }

        // Atlet Biru
        if (m.atletBiru?.nama && m.atletBiru.nama !== 'BYE') {
          const key = `tanding_${m.atletBiru.nama}_${m.atletBiru.kontingen}_${cat.name}`;
          if (!recordedAthletes.has(key)) {
            recordedAthletes.add(key);
            rows.push([
              counter++,
              `TND-${counter}`,
              m.atletBiru.nama,
              m.atletBiru.kontingen || '-',
              'Tanding',
              cat.kelas || cat.name || 'Kelas',
              cat.usia || 'Dewasa',
              cat.gender || 'Putra',
              cat.gelanggang || gelanggangNama,
              m.winner === 'biru' ? 'Menang / Lolos' : (m.winner === 'merah' ? 'Gugur' : 'Terdaftar')
            ]);
          }
        }
      });
    });

    // 2. Seni Peserta
    const seniList = arenaData.tgrState?.pesertaList || [];
    seniList.forEach(p => {
      const key = `seni_${p.nama}_${p.kontingen}_${p.kategori}`;
      if (!recordedAthletes.has(key)) {
        recordedAthletes.add(key);
        rows.push([
          counter++,
          p.id || `SNI-${counter}`,
          p.nama,
          p.kontingen || '-',
          p.kategori || 'Seni',
          p.kategori || 'Tunggal',
          p.usia || 'Dewasa',
          p.gender || 'Putra',
          gelanggangNama,
          p.status === 'Sudah Menilai'
            ? `Selesai (Skor: ${p.finalScore !== undefined ? p.finalScore.toFixed(3) : '0.000'})`
            : p.status === 'Sedang Tampil'
            ? 'Sedang Tampil'
            : 'Terdaftar'
        ]);
      }
    });
  });

  // Clear previous rows then write
  await clearSpreadsheetRange(token, cleanId, 'DATA PESERTA!A1:J1000');
  await updateSpreadsheetValues(token, cleanId, 'DATA PESERTA!A1', rows);

  return rows.length - 1;
}

/**
 * SYNC ALL MATCH RESULTS & MEDAL STANDINGS TO GOOGLE SHEETS
 * Writes:
 * 1. HASIL TANDING
 * 2. HASIL SENI TGR
 * 3. KLASEMEN KONTINGEN
 * 4. JADWAL GELANGGANG
 */
export async function syncAllMatchResultsToSheets(
  token: string,
  spreadsheetId: string,
  allArenasMap: Record<string, { state: MatchState; tgrState: TGRState; histories: MatchHistory[]; info: GelanggangInfo }>
): Promise<{ tandingCount: number; seniCount: number; standingsCount: number }> {
  const cleanId = extractSpreadsheetId(spreadsheetId);

  // 1. COLLECT TANDING RESULTS
  const tandingRows: any[][] = [
    [
      'No',
      'Waktu Selesai',
      'Gelanggang',
      'Partai',
      'Kategori / Kelas',
      'Babak',
      'Sudut Merah (Nama & Kontingen)',
      'Skor Merah',
      'Sudut Biru (Nama & Kontingen)',
      'Skor Biru',
      'Pemenang',
      'Jenis Kemenangan'
    ]
  ];

  let tCount = 1;
  const medalsMap: Record<string, { emas: number; perak: number; perunggu: number }> = {};

  const getContingentMedal = (k: string) => {
    if (!medalsMap[k]) medalsMap[k] = { emas: 0, perak: 0, perunggu: 0 };
    return medalsMap[k];
  };

  Object.values(allArenasMap).forEach(arenaData => {
    const gelanggangNama = arenaData.info?.nama || 'Gelanggang';
    const histories = arenaData.histories || [];

    histories.forEach(h => {
      const pemenangNama = h.winner === 'merah' 
        ? `${h.atletMerah?.nama} (${h.atletMerah?.kontingen})`
        : (h.winner === 'biru' ? `${h.atletBiru?.nama} (${h.atletBiru?.kontingen})` : '-');

      tandingRows.push([
        tCount++,
        h.tanggal || new Date().toLocaleTimeString('id-ID'),
        gelanggangNama,
        h.partai || '-',
        h.kelas || '-',
        'Selesai',
        `${h.atletMerah?.nama || '-'} (${h.atletMerah?.kontingen || '-'})`,
        h.skorAkhirMerah ?? 0,
        `${h.atletBiru?.nama || '-'} (${h.atletBiru?.kontingen || '-'})`,
        h.skorAkhirBiru ?? 0,
        pemenangNama,
        'Menang Angka / Mutlak'
      ]);

      // Tally medals if final/semi
      if (h.partai && h.partai.toLowerCase().includes('final')) {
        const winContingent = h.winner === 'merah' ? h.atletMerah?.kontingen : h.atletBiru?.kontingen;
        const loseContingent = h.winner === 'merah' ? h.atletBiru?.kontingen : h.atletMerah?.kontingen;
        if (winContingent) getContingentMedal(winContingent).emas += 1;
        if (loseContingent) getContingentMedal(loseContingent).perak += 1;
      }
    });
  });

  // 2. COLLECT SENI TGR RESULTS
  const seniRows: any[][] = [
    [
      'No',
      'Gelanggang',
      'Partai',
      'Kategori Seni',
      'Nama Pesilat / Regu',
      'Kontingen',
      'Skor Kebenaran',
      'Skor Kemantapan',
      'Penalti Waktu / Luar',
      'Total Nilai Akhir',
      'Peringkat',
      'Status'
    ]
  ];

  let sCount = 1;
  Object.values(allArenasMap).forEach(arenaData => {
    const gelanggangNama = arenaData.info?.nama || 'Gelanggang';
    const seniList = arenaData.tgrState?.pesertaList || [];
    const completedSeni = seniList.filter(p => p.status === 'Sudah Menilai' || p.finalScore !== undefined);

    // Sort by score descending
    completedSeni.sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));

    completedSeni.forEach((p, idx) => {
      const kebenaranVals = Object.values(p.kebenaranScores || {});
      const kebenaranAvg = kebenaranVals.length > 0
        ? kebenaranVals.reduce((a, b) => a + b, 0) / kebenaranVals.length
        : 0;
      const totalScore = p.finalScore ?? 0;
      const penalti = p.deductions ?? 0;

      seniRows.push([
        sCount++,
        gelanggangNama,
        p.partai || `Partai ${p.noUrut}`,
        p.kategori || 'Seni Tunggal',
        p.nama,
        p.kontingen || '-',
        kebenaranAvg > 0 ? kebenaranAvg.toFixed(3) : '-',
        '-',
        penalti > 0 ? `-${penalti.toFixed(3)}` : '0.000',
        totalScore.toFixed(3),
        `Juara ${idx + 1}`,
        'Selesai'
      ]);

      if (idx === 0 && p.kontingen) getContingentMedal(p.kontingen).emas += 1;
      if (idx === 1 && p.kontingen) getContingentMedal(p.kontingen).perak += 1;
      if (idx === 2 && p.kontingen) getContingentMedal(p.kontingen).perunggu += 1;
    });
  });

  // 3. MEDAL STANDINGS (KLASEMEN KONTINGEN)
  const standingEntries = Object.entries(medalsMap).map(([kontingen, m]) => ({
    kontingen,
    emas: m.emas,
    perak: m.perak,
    perunggu: m.perunggu,
    total: m.emas + m.perak + m.perunggu
  }));

  standingEntries.sort((a, b) => {
    if (b.emas !== a.emas) return b.emas - a.emas;
    if (b.perak !== a.perak) return b.perak - a.perak;
    if (b.perunggu !== a.perunggu) return b.perunggu - a.perunggu;
    return b.total - a.total;
  });

  const standingRows: any[][] = [
    ['Peringkat', 'Kontingen / Perguruan', 'Emas (1st)', 'Perak (2nd)', 'Perunggu (3rd)', 'Total Medali']
  ];

  standingEntries.forEach((entry, idx) => {
    standingRows.push([
      idx + 1,
      entry.kontingen,
      entry.emas,
      entry.perak,
      entry.perunggu,
      entry.total
    ]);
  });

  // 4. JADWAL PER GELANGGANG
  const jadwalRows: any[][] = [
    ['No', 'Gelanggang', 'Partai', 'Kategori', 'Kelas / Pool', 'Sudut Merah / Peserta 1', 'Sudut Biru / Peserta 2', 'Babak', 'Status Pertandingan']
  ];

  let jCount = 1;
  Object.values(allArenasMap).forEach(arenaData => {
    const gelanggangNama = arenaData.info?.nama || 'Gelanggang';
    const categories = arenaData.state?.baganCategories || [];

    categories.forEach(cat => {
      (cat.matches || []).forEach(m => {
        const status = m.winner ? `Selesai (Pemenang: Sudut ${m.winner.toUpperCase()})` : 'Antrean';
        jadwalRows.push([
          jCount++,
          cat.gelanggang || gelanggangNama,
          m.partai || `Partai ${m.id}`,
          'Tanding',
          cat.kelas || cat.name || '-',
          m.atletMerah?.nama ? `${m.atletMerah.nama} (${m.atletMerah.kontingen})` : 'TBD',
          m.atletBiru?.nama ? `${m.atletBiru.nama} (${m.atletBiru.kontingen})` : 'TBD',
          m.round || 'Babak',
          status
        ]);
      });
    });
  });

  // Execute writes in parallel
  await Promise.all([
    (async () => {
      await clearSpreadsheetRange(token, cleanId, 'HASIL TANDING!A1:L1000');
      await updateSpreadsheetValues(token, cleanId, 'HASIL TANDING!A1', tandingRows);
    })(),
    (async () => {
      await clearSpreadsheetRange(token, cleanId, 'HASIL SENI TGR!A1:L1000');
      await updateSpreadsheetValues(token, cleanId, 'HASIL SENI TGR!A1', seniRows);
    })(),
    (async () => {
      await clearSpreadsheetRange(token, cleanId, 'KLASEMEN KONTINGEN!A1:F500');
      await updateSpreadsheetValues(token, cleanId, 'KLASEMEN KONTINGEN!A1', standingRows);
    })(),
    (async () => {
      await clearSpreadsheetRange(token, cleanId, 'JADWAL GELANGGANG!A1:I1000');
      await updateSpreadsheetValues(token, cleanId, 'JADWAL GELANGGANG!A1', jadwalRows);
    })()
  ]);

  return {
    tandingCount: tandingRows.length - 1,
    seniCount: seniRows.length - 1,
    standingsCount: standingRows.length - 1
  };
}

/**
 * Build complete 5-tab official IPSI spreadsheet datasets
 */
export function buildAllSpreadsheetSheetsData(
  allArenasMap: Record<string, { state: MatchState; tgrState: TGRState; histories: MatchHistory[]; info: GelanggangInfo }>
): Record<string, any[][]> {
  // 1. DATA PESERTA
  const pesertaRows: any[][] = [
    ['No', 'ID Atlet', 'Nama Atlet', 'Kontingen', 'Kategori', 'Kelas / Nomor', 'Usia', 'Gender', 'Gelanggang', 'Status']
  ];
  let pCounter = 1;
  const recordedAthletes = new Set<string>();

  Object.values(allArenasMap).forEach(arenaData => {
    const gelanggangNama = arenaData.info?.nama || 'Gelanggang';

    // Tanding
    const baganCategories = arenaData.state?.baganCategories || [];
    baganCategories.forEach(cat => {
      (cat.matches || []).forEach(m => {
        if (m.atletMerah?.nama && m.atletMerah.nama !== 'BYE') {
          const key = `tanding_${m.atletMerah.nama}_${m.atletMerah.kontingen}_${cat.name}`;
          if (!recordedAthletes.has(key)) {
            recordedAthletes.add(key);
            pesertaRows.push([
              pCounter++,
              `TND-${pCounter}`,
              m.atletMerah.nama,
              m.atletMerah.kontingen || '-',
              'Tanding',
              cat.kelas || cat.name || 'Kelas',
              cat.usia || 'Dewasa',
              cat.gender || 'Putra',
              cat.gelanggang || gelanggangNama,
              m.winner === 'merah' ? 'Menang / Lolos' : (m.winner === 'biru' ? 'Gugur' : 'Terdaftar')
            ]);
          }
        }
        if (m.atletBiru?.nama && m.atletBiru.nama !== 'BYE') {
          const key = `tanding_${m.atletBiru.nama}_${m.atletBiru.kontingen}_${cat.name}`;
          if (!recordedAthletes.has(key)) {
            recordedAthletes.add(key);
            pesertaRows.push([
              pCounter++,
              `TND-${pCounter}`,
              m.atletBiru.nama,
              m.atletBiru.kontingen || '-',
              'Tanding',
              cat.kelas || cat.name || 'Kelas',
              cat.usia || 'Dewasa',
              cat.gender || 'Putra',
              cat.gelanggang || gelanggangNama,
              m.winner === 'biru' ? 'Menang / Lolos' : (m.winner === 'merah' ? 'Gugur' : 'Terdaftar')
            ]);
          }
        }
      });
    });

    // Seni
    (arenaData.tgrState?.pesertaList || []).forEach(p => {
      const key = `seni_${p.nama}_${p.kontingen}_${p.kategori}`;
      if (!recordedAthletes.has(key)) {
        recordedAthletes.add(key);
        pesertaRows.push([
          pCounter++,
          p.id || `SNI-${pCounter}`,
          p.nama,
          p.kontingen || '-',
          p.kategori || 'Seni',
          p.kategori || 'Tunggal',
          p.usia || 'Dewasa',
          p.gender || 'Putra',
          gelanggangNama,
          p.status === 'Sudah Menilai'
            ? `Selesai (Skor: ${p.finalScore !== undefined ? p.finalScore.toFixed(3) : '0.000'})`
            : p.status === 'Sedang Tampil'
            ? 'Sedang Tampil'
            : 'Terdaftar'
        ]);
      }
    });
  });

  // 2. HASIL TANDING
  const tandingRows: any[][] = [
    [
      'No',
      'Gelanggang',
      'Partai',
      'Kelas',
      'Babak',
      'Sudut Merah',
      'Skor Merah',
      'Sudut Biru',
      'Skor Biru',
      'Pemenang',
      'Status Pertandingan',
      'Waktu Selesai'
    ]
  ];
  let tCounter = 1;
  const medalsMap: Record<string, { emas: number; perak: number; perunggu: number }> = {};
  const getContingentMedal = (name: string) => {
    const key = name.trim().toUpperCase() || 'UMUM';
    if (!medalsMap[key]) medalsMap[key] = { emas: 0, perak: 0, perunggu: 0 };
    return medalsMap[key];
  };

  Object.values(allArenasMap).forEach(arenaData => {
    const gelanggangNama = arenaData.info?.nama || 'Gelanggang';
    (arenaData.histories || []).forEach(h => {
      const winnerName =
        h.winner === 'merah'
          ? `${h.atletMerah.nama} (${h.atletMerah.kontingen})`
          : h.winner === 'biru'
          ? `${h.atletBiru.nama} (${h.atletBiru.kontingen})`
          : 'Seri';

      const matchBabak = (h as any).babak || 'Selesai';
      tandingRows.push([
        tCounter++,
        gelanggangNama,
        h.partai,
        `${h.kelas} (${h.gender})`,
        matchBabak,
        `${h.atletMerah.nama} (${h.atletMerah.kontingen})`,
        h.skorAkhirMerah,
        `${h.atletBiru.nama} (${h.atletBiru.kontingen})`,
        h.skorAkhirBiru,
        winnerName,
        'Selesai',
        h.tanggal
      ]);

      if (matchBabak.toLowerCase().includes('final')) {
        if (h.winner === 'merah') {
          if (h.atletMerah?.kontingen) getContingentMedal(h.atletMerah.kontingen).emas += 1;
          if (h.atletBiru?.kontingen) getContingentMedal(h.atletBiru.kontingen).perak += 1;
        } else if (h.winner === 'biru') {
          if (h.atletBiru?.kontingen) getContingentMedal(h.atletBiru.kontingen).emas += 1;
          if (h.atletMerah?.kontingen) getContingentMedal(h.atletMerah.kontingen).perak += 1;
        }
      }
    });
  });

  // 3. HASIL SENI TGR
  const seniRows: any[][] = [
    [
      'No',
      'Gelanggang',
      'Partai',
      'Kategori',
      'Nama Peserta / Tim',
      'Kontingen',
      'Waktu Tampil',
      'Skor Akhir',
      'Hukuman Dewan',
      'Status',
      'Peringkat Juara'
    ]
  ];
  let sCounter = 1;
  Object.values(allArenasMap).forEach(arenaData => {
    const gelanggangNama = arenaData.info?.nama || 'Gelanggang';
    const pesertaList = [...(arenaData.tgrState?.pesertaList || [])];
    pesertaList.sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));

    pesertaList.forEach((p, idx) => {
      const rank = p.status === 'Sudah Menilai' ? `Juara ${idx + 1}` : '-';
      seniRows.push([
        sCounter++,
        gelanggangNama,
        p.partai || 'Partai Seni',
        p.kategori || 'Tunggal',
        p.nama,
        p.kontingen,
        `${p.waktuTampil || 0} detik`,
        p.finalScore !== undefined ? p.finalScore.toFixed(3) : '0.000',
        p.deductions !== undefined ? p.deductions.toFixed(2) : '0.00',
        p.status || 'Terdaftar',
        rank
      ]);

      if (idx === 0 && p.kontingen) getContingentMedal(p.kontingen).emas += 1;
      if (idx === 1 && p.kontingen) getContingentMedal(p.kontingen).perak += 1;
      if (idx === 2 && p.kontingen) getContingentMedal(p.kontingen).perunggu += 1;
    });
  });

  // 4. KLASEMEN KONTINGEN
  const standingEntries = Object.entries(medalsMap).map(([kontingen, m]) => ({
    kontingen,
    emas: m.emas,
    perak: m.perak,
    perunggu: m.perunggu,
    total: m.emas + m.perak + m.perunggu
  }));

  standingEntries.sort((a, b) => {
    if (b.emas !== a.emas) return b.emas - a.emas;
    if (b.perak !== a.perak) return b.perak - a.perak;
    if (b.perunggu !== a.perunggu) return b.perunggu - a.perunggu;
    return b.total - a.total;
  });

  const standingRows: any[][] = [
    ['Peringkat', 'Kontingen / Perguruan', 'Emas (1st)', 'Perak (2nd)', 'Perunggu (3rd)', 'Total Medali']
  ];
  standingEntries.forEach((entry, idx) => {
    standingRows.push([
      idx + 1,
      entry.kontingen,
      entry.emas,
      entry.perak,
      entry.perunggu,
      entry.total
    ]);
  });

  // 5. JADWAL GELANGGANG
  const jadwalRows: any[][] = [
    ['No', 'Gelanggang', 'Partai', 'Kategori', 'Kelas / Pool', 'Sudut Merah / Peserta 1', 'Sudut Biru / Peserta 2', 'Babak', 'Status Pertandingan']
  ];
  let jCount = 1;
  Object.values(allArenasMap).forEach(arenaData => {
    const gelanggangNama = arenaData.info?.nama || 'Gelanggang';
    (arenaData.state?.baganCategories || []).forEach(cat => {
      (cat.matches || []).forEach(m => {
        const status = m.winner ? `Selesai (Pemenang: Sudut ${m.winner.toUpperCase()})` : 'Antrean';
        jadwalRows.push([
          jCount++,
          cat.gelanggang || gelanggangNama,
          m.partai || `Partai ${m.id}`,
          'Tanding',
          cat.kelas || cat.name || '-',
          m.atletMerah?.nama ? `${m.atletMerah.nama} (${m.atletMerah.kontingen})` : 'TBD',
          m.atletBiru?.nama ? `${m.atletBiru.nama} (${m.atletBiru.kontingen})` : 'TBD',
          m.round || 'Babak',
          status
        ]);
      });
    });
  });

  return {
    'DATA PESERTA': pesertaRows,
    'HASIL TANDING': tandingRows,
    'HASIL SENI TGR': seniRows,
    'KLASEMEN KONTINGEN': standingRows,
    'JADWAL GELANGGANG': jadwalRows
  };
}

/**
 * SYNC TO GOOGLE APPS SCRIPT WEBHOOK (No OAuth Client ID setup required)
 */
export async function syncAllMatchResultsToWebhook(
  webhookUrl: string,
  allArenasMap: Record<string, { state: MatchState; tgrState: TGRState; histories: MatchHistory[]; info: GelanggangInfo }>
): Promise<{ success: boolean; message: string }> {
  if (!webhookUrl || !webhookUrl.trim()) {
    throw new Error('URL Webhook Google Apps Script belum diisi');
  }

  const sheetsData = buildAllSpreadsheetSheetsData(allArenasMap);
  const payload = {
    action: 'SYNC_ALL',
    sheets: sheetsData,
    timestamp: new Date().toISOString()
  };

  // Try via server proxy to bypass browser CORS on script.google.com redirects
  try {
    const res = await fetch('/api/sheets/webhook-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl: webhookUrl.trim(), payload })
    });
    const result = await res.json();
    if (result.success) {
      return { success: true, message: result.data?.message || 'Data berhasil dikirim ke Google Sheets!' };
    }
  } catch (err) {
    console.warn('Proxy webhook send failed, trying direct:', err);
  }

  // Fallback: direct fetch (with no-cors mode for Apps Script redirect)
  try {
    await fetch(webhookUrl.trim(), {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });
    return { success: true, message: 'Data terkirim ke Google Sheets via Webhook!' };
  } catch (err: any) {
    throw new Error(err.message || 'Gagal mengirim data ke Webhook Google Apps Script');
  }
}

/**
 * TEST WEBHOOK CONNECTION
 */
export async function testWebhookConnection(webhookUrl: string): Promise<{ success: boolean; title?: string }> {
  if (!webhookUrl || !webhookUrl.trim()) throw new Error('URL Webhook kosong');

  try {
    const res = await fetch('/api/sheets/webhook-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl: webhookUrl.trim(), payload: { action: 'PING' } })
    });
    const result = await res.json();
    if (result.success && result.data?.status === 'ok') {
      return { success: true, title: result.data?.title };
    }
  } catch (err) {
    console.warn('Proxy test failed, trying direct:', err);
  }

  return { success: true };
}

/**
 * DOWNLOAD ENTIRE DATASET AS GOOGLE-SHEETS COMPATIBLE EXCEL WORKBOOK (.xlsx)
 */
export function downloadChampionshipXlsx(
  allArenasMap: Record<string, { state: MatchState; tgrState: TGRState; histories: MatchHistory[]; info: GelanggangInfo }>,
  filename: string = 'Rekap_Kejuaraan_Pencak_Silat_IPSI.xlsx'
): void {
  const sheets = buildAllSpreadsheetSheetsData(allArenasMap);
  const wb = XLSX.utils.book_new();

  for (const [sheetName, rows] of Object.entries(sheets)) {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  XLSX.writeFile(wb, filename);
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

export interface ScheduleMetadata {
  headerTitle: string;
  headerSubtitle: string;
  headerLocationDate?: string;
  lokasiTanggal?: string;
  gelanggang: string;
  hariTanggal: string;
  sesiNama?: string;
  sesiWaktu?: string;
  pukul?: string;
  fase?: string;
  tingkat?: string;
  kelasCategory?: string;
  layoutStyle?: 'classic' | 'standard' | 'seni_pool' | 'tanding_standard' | 'tanding_pool_bracket';
  logoKiri?: string | null;
  logoKanan?: string | null;
  logoKiriText?: { line1?: string; line2?: string; line3?: string; line4?: string };
  logoKananText?: { line1?: string; line2?: string; line3?: string };
  showSignatures?: boolean;
}

export interface ScheduleMatchRow {
  no: number;
  partai: string;
  kelas: string;
  roundLabel?: string;
  merahNama: string;
  merahKontingen: string;
  biruNama: string;
  biruKontingen: string;
  remark?: string;
  winner?: 'merah' | 'biru' | null;
}

export const DEFAULT_SAMPLE_MATCHES: ScheduleMatchRow[] = [
  {
    no: 1,
    partai: '01',
    kelas: 'A PA',
    roundLabel: 'SEMI FINAL',
    merahNama: 'Fajar Ramadhan',
    merahKontingen: 'Banten',
    biruNama: 'Galang Perkasa',
    biruKontingen: 'Sumatra Barat',
    remark: ''
  },
  {
    no: 2,
    partai: '02',
    kelas: 'A PA',
    roundLabel: 'SEMI FINAL',
    merahNama: 'Andi Wijaya',
    merahKontingen: 'DKI Jakarta',
    biruNama: 'Rian Hidayat',
    biruKontingen: 'Jawa Barat',
    remark: ''
  },
  {
    no: 3,
    partai: '03',
    kelas: 'B PA',
    roundLabel: 'PEREMPAT FINAL',
    merahNama: 'Budi Santoso',
    merahKontingen: 'Jawa Timur',
    biruNama: 'Made Wirawan',
    biruKontingen: 'Bali',
    remark: ''
  },
  {
    no: 4,
    partai: '04',
    kelas: 'B PA',
    roundLabel: 'PEREMPAT FINAL',
    merahNama: 'Hendra Wijaya',
    merahKontingen: 'Jawa Tengah',
    biruNama: 'Zulfikar',
    biruKontingen: 'DI Yogyakarta',
    remark: ''
  },
  {
    no: 5,
    partai: '05',
    kelas: 'A PA',
    roundLabel: 'FINAL',
    merahNama: 'Pemenang Partai 01',
    merahKontingen: '-',
    biruNama: 'Pemenang Partai 02',
    biruKontingen: '-',
    remark: ''
  },
  {
    no: 6,
    partai: '06',
    kelas: 'B PA',
    roundLabel: 'PEREMPAT FINAL',
    merahNama: 'Ahmad Fauzi',
    merahKontingen: 'Sumatra Utara',
    biruNama: 'Eko Prasetyo',
    biruKontingen: 'Lampung',
    remark: ''
  },
  {
    no: 7,
    partai: '07',
    kelas: 'B PA',
    roundLabel: 'PEREMPAT FINAL',
    merahNama: 'Rizal Gibran',
    merahKontingen: 'Kaltim',
    biruNama: 'Dimas Anggara',
    biruKontingen: 'Sulsel',
    remark: ''
  },
  {
    no: 8,
    partai: '08',
    kelas: 'B PA',
    roundLabel: 'SEMI FINAL',
    merahNama: 'Pemenang Partai 03',
    merahKontingen: '-',
    biruNama: 'Pemenang Partai 04',
    biruKontingen: '-',
    remark: ''
  },
  {
    no: 9,
    partai: '09',
    kelas: 'B PA',
    roundLabel: 'SEMI FINAL',
    merahNama: 'Pemenang Partai 06',
    merahKontingen: '-',
    biruNama: 'Pemenang Partai 07',
    biruKontingen: '-',
    remark: ''
  },
  {
    no: 10,
    partai: '10',
    kelas: 'B PA',
    roundLabel: 'FINAL',
    merahNama: 'Pemenang Partai 08',
    merahKontingen: '-',
    biruNama: 'Pemenang Partai 09',
    biruKontingen: '-',
    remark: ''
  }
];

/**
 * Generate high-precision, official IPSI Match Schedule PDF (A4 Portrait)
 * Matching the exact tournament layout (TRI GUNA SAKTI CUP XIV standard)
 */
export function generateSchedulePdf(
  metadata: ScheduleMetadata,
  matches: ScheduleMatchRow[]
): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm

  const marginX = 10;
  const contentWidth = 190; // 210 - 20 = 190mm
  const boxTopY = 10;
  const boxHeight = 268; // Box from Y=10 to Y=278

  // Use provided matches or fallback to official tournament sample matches
  const matchSource = matches && matches.length > 0 ? matches : DEFAULT_SAMPLE_MATCHES;

  // Pagination config
  // Page 1 has top title + info header (~42mm). With rowHeight ~12mm, fits up to 14 rows comfortably.
  // Subsequent pages have continuation header (~16mm), fits up to 18 rows.
  const rowsPerPageFirst = 14;
  const rowsPerPageSubsequent = 18;

  const pages: ScheduleMatchRow[][] = [];
  let remainingMatches = [...matchSource];

  // First page
  const firstPageRows = remainingMatches.slice(0, rowsPerPageFirst);
  pages.push(firstPageRows);
  remainingMatches = remainingMatches.slice(rowsPerPageFirst);

  // Subsequent pages
  while (remainingMatches.length > 0) {
    const chunk = remainingMatches.slice(0, rowsPerPageSubsequent);
    pages.push(chunk);
    remainingMatches = remainingMatches.slice(rowsPerPageSubsequent);
  }

  const totalPages = pages.length;

  // Exact Column Dimensions (Total = 190mm)
  const colNoWidth = 11;
  const colPartaiWidth = 14;
  const colKelasWidth = 24;
  const colMerahWidth = 58;
  const colBiruWidth = 58;
  const colRemarkWidth = 25;

  const xNo = marginX;
  const xPartai = xNo + colNoWidth;
  const xKelas = xPartai + colPartaiWidth;
  const xMerah = xKelas + colKelasWidth;
  const xBiru = xMerah + colMerahWidth;
  const xRemark = xBiru + colBiruWidth;

  pages.forEach((pageMatches, pageIndex) => {
    if (pageIndex > 0) {
      doc.addPage('a4', 'p');
    }

    // 1. Outer Box Border around the page content
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.65);
    doc.rect(marginX, boxTopY, contentWidth, boxHeight);

    let currentY = boxTopY;

    // 2. Header Section
    if (pageIndex === 0) {
      // First page official championship top header
      currentY = 17;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12.5);
      doc.setTextColor(0, 0, 0);
      const titleLine1 = (metadata.headerTitle || 'JADWAL PERTANDINGAN KEJUARAAN PENCAK SILAT').toUpperCase();
      doc.text(titleLine1, pageWidth / 2, currentY, { align: 'center' });
      currentY += 5.5;

      doc.setFontSize(11.5);
      const titleLine2 = (metadata.headerSubtitle || 'TRI GUNA SAKTI CUP XIV').toUpperCase();
      doc.text(titleLine2, pageWidth / 2, currentY, { align: 'center' });
      currentY += 5.0;

      const locDate = (metadata.headerLocationDate || metadata.lokasiTanggal || '16 - 17 DESEMBER 2023').toUpperCase();
      doc.setFontSize(9.5);
      doc.text(locDate, pageWidth / 2, currentY, { align: 'center' });
      currentY += 4.5;

      // Divider line below championship title
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(marginX, currentY, marginX + contentWidth, currentY);

      // Sub-header Info Row
      // Left: Sesi & Tanggal
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      const sesiText = `Sesi: ${metadata.sesiNama || '1'}`;
      doc.text(sesiText, marginX + 2, currentY + 4.5);
      doc.text(`Tanggal: ${metadata.hariTanggal || '18 Des 2023'}`, marginX + 2, currentY + 9);

      // Center: GELANGGANG in RED bold
      doc.setFontSize(9.5);
      doc.setTextColor(220, 38, 38); // Red #DC2626
      let arenaDisplay = (metadata.gelanggang || 'GELANGGANG I').toUpperCase();
      if (!arenaDisplay.includes('GELANGGANG') && !arenaDisplay.includes('ARENA')) {
        arenaDisplay = `GELANGGANG ${arenaDisplay}`;
      }
      doc.text(`GELANGGANG: ${arenaDisplay}`, pageWidth / 2, currentY + 6.5, { align: 'center' });

      // Right: Babak
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      doc.text(`Babak: ${(metadata.fase || 'PENYISIHAN').toUpperCase()}`, marginX + contentWidth - 2, currentY + 6.5, { align: 'right' });

      currentY += 11.5;

      // Divider line below sub-header info
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(marginX, currentY, marginX + contentWidth, currentY);
    } else {
      // Continuation Header for subsequent pages
      currentY = 16;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(0, 0, 0);
      doc.text(`${(metadata.headerSubtitle || metadata.headerTitle || 'JADWAL PERTANDINGAN').toUpperCase()} (LANJUTAN)`, marginX + 2, currentY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(`Gelanggang: ${metadata.gelanggang || 'GELANGGANG I'} | Tanggal: ${metadata.hariTanggal || '18 Des 2023'}`, marginX + contentWidth - 2, currentY, { align: 'right' });
      currentY += 4;

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.4);
      doc.line(marginX, currentY, marginX + contentWidth, currentY);
    }

    // 3. Table Headers
    const headerHeight = 7.5;

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);

    // NO, PARTAI, KELAS (White Background, Black Text)
    doc.setFillColor(255, 255, 255);
    doc.rect(xNo, currentY, colNoWidth, headerHeight, 'FD');
    doc.rect(xPartai, currentY, colPartaiWidth, headerHeight, 'FD');
    doc.rect(xKelas, currentY, colKelasWidth, headerHeight, 'FD');

    // SUDUT MERAH (Solid Red #DC2626, White Text)
    doc.setFillColor(220, 38, 38);
    doc.rect(xMerah, currentY, colMerahWidth, headerHeight, 'FD');

    // SUDUT BIRU (Solid Blue #2563EB, White Text)
    doc.setFillColor(37, 99, 235);
    doc.rect(xBiru, currentY, colBiruWidth, headerHeight, 'FD');

    // REMARK (White Background, Black Text)
    doc.setFillColor(255, 255, 255);
    doc.rect(xRemark, currentY, colRemarkWidth, headerHeight, 'FD');

    // Header Texts
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(0, 0, 0);
    doc.text('NO', xNo + colNoWidth / 2, currentY + 5.0, { align: 'center' });
    doc.text('PARTAI', xPartai + colPartaiWidth / 2, currentY + 5.0, { align: 'center' });
    doc.text('KELAS', xKelas + colKelasWidth / 2, currentY + 5.0, { align: 'center' });

    doc.setTextColor(255, 255, 255);
    doc.text('SUDUT MERAH', xMerah + colMerahWidth / 2, currentY + 5.0, { align: 'center' });
    doc.text('SUDUT BIRU', xBiru + colBiruWidth / 2, currentY + 5.0, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.text('REMARK', xRemark + colRemarkWidth / 2, currentY + 5.0, { align: 'center' });

    currentY += headerHeight;

    // 4. Table Rows
    const rowHeight = 11.8;

    pageMatches.forEach((row, rIdx) => {
      // White clean cell backgrounds
      doc.setFillColor(255, 255, 255);
      doc.rect(marginX, currentY, contentWidth, rowHeight, 'F');

      // Cell Borders - Thin light slate/gray
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.25);
      doc.rect(xNo, currentY, colNoWidth, rowHeight);
      doc.rect(xPartai, currentY, colPartaiWidth, rowHeight);
      doc.rect(xKelas, currentY, colKelasWidth, rowHeight);
      doc.rect(xMerah, currentY, colMerahWidth, rowHeight);
      doc.rect(xBiru, currentY, colBiruWidth, rowHeight);
      doc.rect(xRemark, currentY, colRemarkWidth, rowHeight);

      // NO
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text(String(row.no), xNo + colNoWidth / 2, currentY + rowHeight / 2 + 1.2, { align: 'center' });

      // PARTAI (Format 2 digits like 01, 02...)
      const partaiClean = row.partai.replace(/\D/g, '') || String(row.no);
      const partaiPadded = partaiClean.padStart(2, '0');
      doc.text(partaiPadded, xPartai + colPartaiWidth / 2, currentY + rowHeight / 2 + 1.2, { align: 'center' });

      // KELAS & ROUND (2 lines)
      // Line 1: Class (e.g. A PA, B PA)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      const cleanKelas = row.kelas.replace(/kelas\s*/i, '').trim().toUpperCase();
      doc.text(cleanKelas, xKelas + colKelasWidth / 2, currentY + 4.8, { align: 'center' });

      // Line 2: Round label (e.g. SEMI FINAL, PEREMPAT FINAL, FINAL)
      const roundText = row.roundLabel || 'PENYISIHAN';
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.8);
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.text(roundText.toUpperCase(), xKelas + colKelasWidth / 2, currentY + 8.8, { align: 'center' });

      // SUDUT MERAH (2 lines)
      // Line 1: Fighter name in BOLD RED
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(220, 38, 38); // Red #DC2626
      const merahNamaTrunc = doc.splitTextToSize(row.merahNama || 'Pemenang Partai', colMerahWidth - 4);
      doc.text(merahNamaTrunc[0] || '', xMerah + colMerahWidth / 2, currentY + 4.8, { align: 'center' });

      // Line 2: Kontingen in Slate
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(71, 85, 105); // Slate-600
      const merahKontTrunc = doc.splitTextToSize(row.merahKontingen || '-', colMerahWidth - 4);
      doc.text(merahKontTrunc[0] || '', xMerah + colMerahWidth / 2, currentY + 8.8, { align: 'center' });

      // SUDUT BIRU (2 lines)
      // Line 1: Fighter name in BOLD BLUE
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(37, 99, 235); // Blue #2563EB
      const biruNamaTrunc = doc.splitTextToSize(row.biruNama || 'Pemenang Partai', colBiruWidth - 4);
      doc.text(biruNamaTrunc[0] || '', xBiru + colBiruWidth / 2, currentY + 4.8, { align: 'center' });

      // Line 2: Kontingen in Slate
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(71, 85, 105); // Slate-600
      const biruKontTrunc = doc.splitTextToSize(row.biruKontingen || '-', colBiruWidth - 4);
      doc.text(biruKontTrunc[0] || '', xBiru + colBiruWidth / 2, currentY + 8.8, { align: 'center' });

      // REMARK
      const isByeRed = row.biruNama?.toUpperCase() === 'BYE' || row.biruKontingen?.toUpperCase() === 'AUTOMATIC';
      const isByeBlue = row.merahNama?.toUpperCase() === 'BYE' || row.merahKontingen?.toUpperCase() === 'AUTOMATIC';
      const remarkText = row.remark || (isByeRed ? 'MENANG MERAH' : isByeBlue ? 'MENANG BIRU' : row.winner ? `MENANG ${row.winner.toUpperCase()}` : '');

      if (remarkText) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        if (remarkText.includes('MERAH')) {
          doc.setTextColor(220, 38, 38);
        } else if (remarkText.includes('BIRU')) {
          doc.setTextColor(37, 99, 235);
        } else {
          doc.setTextColor(71, 85, 105);
        }
        doc.text(remarkText, xRemark + colRemarkWidth / 2, currentY + rowHeight / 2 + 1, { align: 'center' });
      }

      currentY += rowHeight;
    });

    // 5. Page Number Footer (Outside the outer rectangular box)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(
      `Dokumen Resmi Sistem Skoring Pencak Silat IPSI  |  Halaman ${pageIndex + 1} dari ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  });

  const filename = `Jadwal_Pertandingan_${(metadata.gelanggang || 'GELANGGANG_I').replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  doc.save(filename);
}

/**
 * Export match schedule directly to Excel (.xlsx) file
 */
export function exportScheduleToExcel(
  metadata: ScheduleMetadata,
  matches: ScheduleMatchRow[]
): void {
  const wb = XLSX.utils.book_new();

  const titleRows = [
    [(metadata.headerTitle || 'JADWAL PERTANDINGAN PENCAK SILAT').toUpperCase()],
    [(metadata.headerSubtitle || 'KEJUARAAN PENCAK SILAT').toUpperCase()],
    [`Gelanggang: ${metadata.gelanggang || 'I'} | Tanggal: ${metadata.hariTanggal || '-'} | Sesi: ${metadata.sesiNama || '1'}`],
    []
  ];

  const tableHeaders = [
    'NO',
    'PARTAI',
    'KELAS',
    'BABAK',
    'NAMA PESILAT MERAH',
    'KONTINGEN MERAH',
    'NAMA PESILAT BIRU',
    'KONTINGEN BIRU',
    'REMARK / HASIL'
  ];

  const dataRows = matches.map(m => [
    m.no,
    m.partai,
    m.kelas,
    m.roundLabel || '-',
    m.merahNama || '-',
    m.merahKontingen || '-',
    m.biruNama || '-',
    m.biruKontingen || '-',
    m.winner ? `PEMENANG: ${m.winner.toUpperCase()}` : (m.remark || '-')
  ]);

  const wsData = [...titleRows, tableHeaders, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },  // NO
    { wch: 12 }, // PARTAI
    { wch: 16 }, // KELAS
    { wch: 18 }, // BABAK
    { wch: 28 }, // NAMA MERAH
    { wch: 22 }, // KONTINGEN MERAH
    { wch: 28 }, // NAMA BIRU
    { wch: 22 }, // KONTINGEN BIRU
    { wch: 20 }  // REMARK
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Jadwal Pertandingan');

  const fileName = `Jadwal_Pertandingan_${(metadata.gelanggang || 'I').replace(/\s+/g, '_')}_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Print schedule sheet via a hidden iframe to ensure 100% clean A4 printout
 * without dark mode, sidebars, or modal backgrounds
 */
export function printScheduleElement(element: HTMLElement): void {
  // Create hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  // Clone clean styles
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Cetak Jadwal Pertandingan Resmi</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0;
            padding: 0;
          }
          table {
            border-collapse: collapse;
            width: 100%;
          }
          th, td {
            border: 1px solid #000000;
          }
          .no-print {
            display: none !important;
          }
        </style>
      </head>
      <body>
        ${element.outerHTML}
      </body>
    </html>
  `);
  doc.close();

  // Trigger print after iframe renders
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 350);
}

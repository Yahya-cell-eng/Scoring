/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { MatchState, MatchHistory } from '../types';

export function generateMatchReportPdf(state: MatchState, histories: MatchHistory[] = []): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let currentY = 16;

  // Outer border
  doc.setDrawColor(15, 23, 42); // slate-900
  doc.setLineWidth(0.7);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('LAPORAN RESMI HASIL SKORING PERTANDINGAN', pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('IKATAN PENCAK SILAT INDONESIA (IPSI) - DIGITAL MATCH COMMISSION', pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;

  // Double line header divider
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(12, currentY, pageWidth - 12, currentY);
  doc.line(12, currentY + 0.8, pageWidth - 12, currentY + 0.8);
  currentY += 6;

  // 1. Metadata Event & General Info Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(12, currentY, pageWidth - 24, 18, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('NAMA EVENT / TURNAMEN :', 16, currentY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${state.namaEvent || 'Kejuaraan Pencak Silat Digital'}`, 65, currentY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.text('WAKTU CETAK DOKUMEN   :', 16, currentY + 11.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'medium' })} WIB`, 65, currentY + 11.5);

  currentY += 23;

  // 2. Active Match Details (Partai, Atlet, Skor, Hukuman, Durasi)
  if (state.partai) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text('A. DETAIL PERTANDINGAN AKTIF / TERAKHIR', 12, currentY);
    currentY += 4.5;

    // Header banner of active match
    doc.setFillColor(15, 23, 42);
    doc.rect(12, currentY, pageWidth - 24, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`PARTAI: ${state.partai}   |   KELAS: ${state.kelas}   |   GENDER: ${state.gender.toUpperCase()}`, 16, currentY + 4.8);
    doc.text(`STATUS: ${state.matchStatus.toUpperCase()}`, pageWidth - 16, currentY + 4.8, { align: 'right' });
    currentY += 9;

    // Athlete Profile Bar (Merah vs Biru)
    const cardHeight = 16;
    doc.setFillColor(254, 242, 242); // Red tint
    doc.setDrawColor(254, 202, 202);
    doc.rect(12, currentY, (pageWidth - 26) / 2, cardHeight, 'FD');

    doc.setFillColor(239, 246, 255); // Blue tint
    doc.setDrawColor(191, 219, 254);
    doc.rect(12 + (pageWidth - 26) / 2 + 2, currentY, (pageWidth - 26) / 2, cardHeight, 'FD');

    // Red Corner Details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(220, 38, 38);
    doc.text('SUDUT MERAH', 15, currentY + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${state.atletMerah.nama || 'Atlet Merah'}`, 15, currentY + 9);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Kontingen: ${state.atletMerah.kontingen || '-'}`, 15, currentY + 13.5);

    // Blue Corner Details
    const blueLeft = 12 + (pageWidth - 26) / 2 + 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(37, 99, 235);
    doc.text('SUDUT BIRU', blueLeft + 3, currentY + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${state.atletBiru.nama || 'Atlet Biru'}`, blueLeft + 3, currentY + 9);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Kontingen: ${state.atletBiru.kontingen || '-'}`, blueLeft + 3, currentY + 13.5);

    currentY += cardHeight + 4;

    // 2.1 Durasi Pertandingan Info Box
    const durasiMenit = Math.floor(state.selectedWaktu / 60);
    const durasiDetik = state.selectedWaktu % 60;
    const timerMins = Math.floor(state.timerSeconds / 60).toString().padStart(2, '0');
    const timerSecs = (state.timerSeconds % 60).toString().padStart(2, '0');
    const totalEstimasiMenit = Math.floor((state.selectedWaktu * 3) / 60);

    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.rect(12, currentY, pageWidth - 24, 13, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('INFORMASI DURASI PERTANDINGAN :', 15, currentY + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Alokasi per Babak: ${durasiMenit}m ${durasiDetik}s (${state.selectedWaktu} detik)  |  Jumlah Babak: 3 Babak (Total: ${totalEstimasiMenit} Menit)`,
      70,
      currentY + 4.5
    );

    doc.setFont('helvetica', 'bold');
    doc.text('STATUS WAKTU & BABAK AKTIF   :', 15, currentY + 9.5);
    doc.setFont('helvetica', 'normal');
    const timerStatusLabel = state.timerActive ? 'WAKTU BERJALAN' : state.matchStatus === 'selesai' ? 'SELESAI' : 'BERHENTI / JEDA';
    doc.text(
      `Babak ${state.currentBabak} dari 3  |  Sisa Waktu Timer: ${timerMins}:${timerSecs}  |  Status Timer: ${timerStatusLabel}`,
      70,
      currentY + 9.5
    );

    currentY += 17;

    // 2.2 Table: Detail Skor Akhir & Rincian Babak
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('RINCIAN SKOR TIAP BABAK & POIN JATUHAN', 12, currentY);
    currentY += 3.5;

    // Table Header
    doc.setFillColor(30, 41, 59);
    doc.rect(12, currentY, pageWidth - 24, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('Kategori Nilai', 15, currentY + 4.2);
    doc.text('Babak 1', 65, currentY + 4.2, { align: 'center' });
    doc.text('Babak 2', 90, currentY + 4.2, { align: 'center' });
    doc.text('Babak 3', 115, currentY + 4.2, { align: 'center' });
    doc.text('Poin Jatuhan (+3)', 145, currentY + 4.2, { align: 'center' });
    doc.text('TOTAL AKHIR', 180, currentY + 4.2, { align: 'center' });
    currentY += 6;

    // Row: Sudut Merah
    doc.setFillColor(254, 242, 242);
    doc.rect(12, currentY, pageWidth - 24, 6, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(12, currentY + 6, pageWidth - 12, currentY + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(220, 38, 38);
    doc.text(`MERAH: ${state.atletMerah.nama}`, 15, currentY + 4.2);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(`${state.scores.merah.babak1}`, 65, currentY + 4.2, { align: 'center' });
    doc.text(`${state.scores.merah.babak2}`, 90, currentY + 4.2, { align: 'center' });
    doc.text(`${state.scores.merah.babak3}`, 115, currentY + 4.2, { align: 'center' });
    doc.text(`+${state.directPoints.merah}`, 145, currentY + 4.2, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text(`${state.scores.merah.total}`, 180, currentY + 4.2, { align: 'center' });
    currentY += 6;

    // Row: Sudut Biru
    doc.setFillColor(239, 246, 255);
    doc.rect(12, currentY, pageWidth - 24, 6, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(12, currentY + 6, pageWidth - 12, currentY + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(37, 99, 235);
    doc.text(`BIRU: ${state.atletBiru.nama}`, 15, currentY + 4.2);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(`${state.scores.biru.babak1}`, 65, currentY + 4.2, { align: 'center' });
    doc.text(`${state.scores.biru.babak2}`, 90, currentY + 4.2, { align: 'center' });
    doc.text(`${state.scores.biru.babak3}`, 115, currentY + 4.2, { align: 'center' });
    doc.text(`+${state.directPoints.biru}`, 145, currentY + 4.2, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text(`${state.scores.biru.total}`, 180, currentY + 4.2, { align: 'center' });
    currentY += 9;

    // 2.3 Table: Detail Hukuman & Sanksi Dewan Hakim
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('RINCIAN HUKUMAN & SANKSI DEWAN HAKIM (PENALTIES)', 12, currentY);
    currentY += 3.5;

    // Penalty Table Header
    doc.setFillColor(30, 41, 59);
    doc.rect(12, currentY, pageWidth - 24, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('Sudut Atlet', 15, currentY + 4.2);
    doc.text('Binaan I / II', 55, currentY + 4.2, { align: 'center' });
    doc.text('Teguran I (-1)', 82, currentY + 4.2, { align: 'center' });
    doc.text('Teguran II (-2)', 108, currentY + 4.2, { align: 'center' });
    doc.text('Peringatan I (-5)', 136, currentY + 4.2, { align: 'center' });
    doc.text('Peringatan II (-10)', 164, currentY + 4.2, { align: 'center' });
    doc.text('Diskualifikasi', 188, currentY + 4.2, { align: 'center' });
    currentY += 6;

    const redPen = state.dewanPenalties.merah;
    const bluePen = state.dewanPenalties.biru;

    const calcPenaltyDeduction = (p: typeof redPen) => {
      let deduction = 0;
      if (p.teguran1) deduction += 1;
      if (p.teguran2) deduction += 2;
      if (p.peringatan1) deduction += 5;
      if (p.peringatan2) deduction += 10;
      return deduction;
    };

    // Row: Hukuman Merah
    doc.setFillColor(255, 255, 255);
    doc.rect(12, currentY, pageWidth - 24, 5.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(12, currentY + 5.5, pageWidth - 12, currentY + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(220, 38, 38);
    doc.text('SUDUT MERAH', 15, currentY + 3.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const binaanMerahStr = `${redPen.binaan1 ? 'B1' : '-'}${redPen.binaan2 ? ', B2' : ''}`;
    doc.text(binaanMerahStr, 55, currentY + 3.8, { align: 'center' });
    doc.text(redPen.teguran1 ? 'YA (-1)' : '-', 82, currentY + 3.8, { align: 'center' });
    doc.text(redPen.teguran2 ? 'YA (-2)' : '-', 108, currentY + 3.8, { align: 'center' });
    doc.text(redPen.peringatan1 ? 'YA (-5)' : '-', 136, currentY + 3.8, { align: 'center' });
    doc.text(redPen.peringatan2 ? 'YA (-10)' : '-', 164, currentY + 3.8, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(redPen.disqualified ? 220 : 15, redPen.disqualified ? 38 : 23, redPen.disqualified ? 38 : 42);
    doc.text(redPen.disqualified ? 'DISKUALIFIKASI' : 'TIDAK', 188, currentY + 3.8, { align: 'center' });
    currentY += 5.5;

    // Row: Hukuman Biru
    doc.setFillColor(248, 250, 252);
    doc.rect(12, currentY, pageWidth - 24, 5.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(12, currentY + 5.5, pageWidth - 12, currentY + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(37, 99, 235);
    doc.text('SUDUT BIRU', 15, currentY + 3.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const binaanBiruStr = `${bluePen.binaan1 ? 'B1' : '-'}${bluePen.binaan2 ? ', B2' : ''}`;
    doc.text(binaanBiruStr, 55, currentY + 3.8, { align: 'center' });
    doc.text(bluePen.teguran1 ? 'YA (-1)' : '-', 82, currentY + 3.8, { align: 'center' });
    doc.text(bluePen.teguran2 ? 'YA (-2)' : '-', 108, currentY + 3.8, { align: 'center' });
    doc.text(bluePen.peringatan1 ? 'YA (-5)' : '-', 136, currentY + 3.8, { align: 'center' });
    doc.text(bluePen.peringatan2 ? 'YA (-10)' : '-', 164, currentY + 3.8, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(bluePen.disqualified ? 220 : 15, bluePen.disqualified ? 38 : 23, bluePen.disqualified ? 38 : 42);
    doc.text(bluePen.disqualified ? 'DISKUALIFIKASI' : 'TIDAK', 188, currentY + 3.8, { align: 'center' });
    currentY += 8;

    // Winner Summary Box
    doc.setFillColor(254, 252, 232); // Amber light
    doc.setDrawColor(250, 204, 21);
    doc.rect(12, currentY, pageWidth - 24, 10, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('KEPUTUSAN PEMENANG :', 16, currentY + 6.5);

    const winnerCorner = state.winner;
    const winnerName = winnerCorner === 'biru' ? state.atletBiru.nama : winnerCorner === 'merah' ? state.atletMerah.nama : 'BELUM DITETAPKAN / SERI';
    const winnerColor = winnerCorner === 'merah' ? [220, 38, 38] : winnerCorner === 'biru' ? [37, 99, 235] : [100, 116, 139];
    doc.setTextColor(winnerColor[0], winnerColor[1], winnerColor[2]);
    doc.text(
      `${winnerCorner ? `SUDUT ${winnerCorner.toUpperCase()} - ${winnerName.toUpperCase()}` : 'PERTANDINGAN SERI / SEDANG BERLANGSUNG'} (SKOR ${state.scores.merah.total} : ${state.scores.biru.total})`,
      65,
      currentY + 6.5
    );

    currentY += 15;
  }

  // 3. Historical entries table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('B. RIWAYAT HASIL PERTANDINGAN SEBELUMNYA (HISTORY LOGS)', 12, currentY);
  currentY += 4;

  // History Table Header
  doc.setFillColor(30, 41, 59);
  doc.rect(12, currentY, pageWidth - 24, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('No', 15, currentY + 4.2);
  doc.text('Partai', 23, currentY + 4.2);
  doc.text('Kelas', 34, currentY + 4.2);
  doc.text('Gender', 47, currentY + 4.2);
  doc.text('Sudut Merah (Skor)', 62, currentY + 4.2);
  doc.text('Sudut Biru (Skor)', 115, currentY + 4.2);
  doc.text('Pemenang', 168, currentY + 4.2);
  currentY += 6;

  if (histories.length === 0) {
    doc.setDrawColor(203, 213, 225);
    doc.rect(12, currentY, pageWidth - 24, 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Belum ada riwayat pertarungan resmi lain yang tersimpan.', pageWidth / 2, currentY + 4.8, { align: 'center' });
    currentY += 7;
  } else {
    histories.slice(0, 8).forEach((h, idx) => {
      if (currentY > pageHeight - 38) {
        doc.addPage();
        currentY = 16;
        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.7);
        doc.rect(8, 8, pageWidth - 16, pageHeight - 16);
      }

      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(12, currentY, pageWidth - 24, 6, 'F');
      }

      doc.setDrawColor(226, 232, 240);
      doc.line(12, currentY + 6, pageWidth - 12, currentY + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text((idx + 1).toString(), 15, currentY + 4.2);
      doc.text(h.partai, 23, currentY + 4.2);
      doc.text(h.kelas, 34, currentY + 4.2);
      doc.text(h.gender === 'Putra' ? 'PA' : 'PI', 47, currentY + 4.2);
      doc.text(`${h.atletMerah.nama} (${h.skorAkhirMerah})`, 62, currentY + 4.2);
      doc.text(`${h.atletBiru.nama} (${h.skorAkhirBiru})`, 115, currentY + 4.2);

      const winLabel = h.winner === 'merah' ? 'MERAH' : h.winner === 'biru' ? 'BIRU' : 'SERI';
      const winColor = h.winner === 'merah' ? [220, 38, 38] : h.winner === 'biru' ? [37, 99, 235] : [100, 116, 139];
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(winColor[0], winColor[1], winColor[2]);
      doc.text(winLabel, 168, currentY + 4.2);

      currentY += 6;
    });
  }

  // 4. Signatures Section at bottom
  currentY = Math.max(currentY + 10, pageHeight - 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  doc.text('Ketua Dewan Pertandingan,', 18, currentY);
  doc.text('Sekretaris Pertandingan,', pageWidth - 68, currentY);

  doc.setDrawColor(148, 163, 184);
  doc.line(18, currentY + 16, 68, currentY + 16);
  doc.line(pageWidth - 68, currentY + 16, pageWidth - 18, currentY + 16);

  doc.setFont('helvetica', 'bold');
  doc.text('( ________________________ )', 18, currentY + 20);
  doc.text('( ________________________ )', pageWidth - 68, currentY + 20);

  // Save the PDF
  const filename = `Laporan_Hasil_Pertandingan_Partai_${state.partai || '0'}_${Date.now()}.pdf`;
  doc.save(filename);
}

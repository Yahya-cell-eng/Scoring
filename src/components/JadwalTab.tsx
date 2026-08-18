import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Download, FileText, Calendar, Clock, MapPin, Printer, Eye, RefreshCw, CheckSquare, Square, Info, Upload, Image as ImageIcon
} from 'lucide-react';
import { MatchState, BaganCategory, BaganMatch } from '../types';
import { playBeep } from '../utils/sound';
import safeHtml2canvas from '../utils/safeHtml2canvas';
import { jsPDF } from 'jspdf';

interface JadwalTabProps {
  theme: 'dark' | 'light';
  state: MatchState;
  dispatch: (type: string, payload?: any) => void;
}

export default function JadwalTab({ theme, state, dispatch }: JadwalTabProps) {
  // Custom headers state
  const [headerTitle, setHeaderTitle] = useState("JADWAL PERTANDINGAN KEJUARAAN PENCAK SILAT");
  const [headerSubtitle, setHeaderSubtitle] = useState("TRI GUNA SAKTI CUP XIV");
  const [lokasiTanggal, setLokasiTanggal] = useState("16 - 17 Desember 2023");
  const [gelanggang, setGelanggang] = useState("I");
  const [hariTanggal, setHariTanggal] = useState("18 Des 2023");
  const [fase, setFase] = useState("Penyisihan");
  const [sesiWaktu, setSesiWaktu] = useState("");
  const [sesiNama, setSesiNama] = useState("1");
  const [tingkat, setTingkat] = useState("Pra Remaja");
  const [pdfLayout, setPdfLayout] = useState<'classic' | 'standard'>('classic');

  // Logo Customization state
  const [logoKiriType, setLogoKiriType] = useState<'default' | 'text' | 'image'>('default');
  const [logoKiriImage, setLogoKiriImage] = useState<string>("");
  const [logoKiriText1, setLogoKiriText1] = useState("POPDA");
  const [logoKiriText2, setLogoKiriText2] = useState("ACEH");
  const [logoKiriText3, setLogoKiriText3] = useState("XVII");
  const [logoKiriText4, setLogoKiriText4] = useState("TIMUR 2024");

  const [logoKananType, setLogoKananType] = useState<'default' | 'text' | 'image'>('default');
  const [logoKananImage, setLogoKananImage] = useState<string>("");
  const [logoKananText1, setLogoKananText1] = useState("IPSI");
  const [logoKananText2, setLogoKananText2] = useState("EST. 1948");
  const [logoKananText3, setLogoKananText3] = useState("OFFICIAL");

  const [showSignatures, setShowSignatures] = useState(false);

  // Sync with main applet state logos if they have been uploaded globally
  useEffect(() => {
    if (state?.logoKiri) {
      setLogoKiriImage(state.logoKiri);
      setLogoKiriType('image');
    }
    if (state?.logoKanan) {
      setLogoKananImage(state.logoKanan);
      setLogoKananType('image');
    }
  }, [state?.logoKiri, state?.logoKanan]);

  const fileInputKiriRef = useRef<HTMLInputElement>(null);
  const fileInputKananRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, position: 'kiri' | 'kanan') => {
    const file = e.target.files?.[0];
    if (!file) return;

    playBeep('valid');
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (position === 'kiri') {
        setLogoKiriImage(base64);
        setLogoKiriType('image');
      } else {
        setLogoKananImage(base64);
        setLogoKananType('image');
      }
    };
    reader.readAsDataURL(file);
  };

  // Filters
  const [roundFilter, setRoundFilter] = useState<'all' | 'quarter' | 'semi' | 'final'>('all');
  
  // Selection of matches to export
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);

  // Ref to the printed element
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Helper to get short class abbreviation from category name
  const getShortKelasAbbreviation = (categoryName: string, gender: string): string => {
    // Examples: "Kelas A Putra (45 - 50 kg)" -> "A PA", "Kelas B Putri (50 - 55 kg)" -> "B PI"
    const classMatch = categoryName.match(/Kelas\s+([A-Z0-9]+)/i);
    const letter = classMatch ? classMatch[1] : '';
    const isPutra = gender.toLowerCase().includes('putra') || categoryName.toLowerCase().includes('putra');
    const genderAbbr = isPutra ? 'PA' : 'PI';
    return letter ? `${letter} ${genderAbbr}` : categoryName.substring(0, 10);
  };

  const getRoundLabelIndo = (round: string): string => {
    switch (round.toLowerCase()) {
      case 'thirtysecond': return 'Babak 64 Besar';
      case 'sixteenth': return 'Babak 32 Besar';
      case 'eighth': return 'Babak 16 Besar';
      case 'quarter': return 'Perempat Final';
      case 'semi': return 'Semi Final';
      case 'final': return 'Final';
      default: return round;
    }
  };

  const getEmptySlotLabel = (catId: string, matchId: number, slot: 'merah' | 'biru', currentName: string): string => {
    if (currentName && currentName.trim() !== '' && !currentName.includes('...') && currentName !== '❔') {
      return currentName;
    }
    
    if (!state.baganCategories) return '................................';
    const cat = state.baganCategories.find(c => c.id === catId);
    if (!cat) return '................................';
    
    const size = cat.size;
    let sourceMatchId: number | null = null;
    
    if (size === 4) {
      if (matchId === 3) {
        sourceMatchId = slot === 'merah' ? 1 : 2;
      }
    } else if (size === 8) {
      if (matchId === 5) {
        sourceMatchId = slot === 'merah' ? 1 : 2;
      } else if (matchId === 6) {
        sourceMatchId = slot === 'merah' ? 3 : 4;
      } else if (matchId === 7) {
        sourceMatchId = slot === 'merah' ? 5 : 6;
      }
    } else if (size === 16) {
      if (matchId === 9) {
        sourceMatchId = slot === 'merah' ? 1 : 2;
      } else if (matchId === 10) {
        sourceMatchId = slot === 'merah' ? 3 : 4;
      } else if (matchId === 11) {
        sourceMatchId = slot === 'merah' ? 5 : 6;
      } else if (matchId === 12) {
        sourceMatchId = slot === 'merah' ? 7 : 8;
      } else if (matchId === 13) {
        sourceMatchId = slot === 'merah' ? 9 : 10;
      } else if (matchId === 14) {
        sourceMatchId = slot === 'merah' ? 11 : 12;
      } else if (matchId === 15) {
        sourceMatchId = slot === 'merah' ? 13 : 14;
      }
    }
    
    if (sourceMatchId !== null) {
      const srcMatch = cat.matches.find(m => m.id === sourceMatchId);
      if (srcMatch) {
        return `Pemenang Partai ${srcMatch.partai}`;
      }
    }
    
    return '................................';
  };

  const getNextMatchNote = (catId: string, matchId: number): string => {
    if (!state.baganCategories) return "";
    const cat = state.baganCategories.find(c => c.id === catId);
    if (!cat) return "";
    
    const size = cat.size;
    let targetMatchId: number | null = null;
    let side: 'Merah' | 'Biru' | null = null;
    let isFinal = false;
    
    if (size === 2) {
      isFinal = true;
    } else if (size === 4) {
      if (matchId === 1) { targetMatchId = 3; side = 'Merah'; }
      else if (matchId === 2) { targetMatchId = 3; side = 'Biru'; }
      else if (matchId === 3) { isFinal = true; }
    } else if (size === 8) {
      if (matchId === 1) { targetMatchId = 5; side = 'Merah'; }
      else if (matchId === 2) { targetMatchId = 5; side = 'Biru'; }
      else if (matchId === 3) { targetMatchId = 6; side = 'Merah'; }
      else if (matchId === 4) { targetMatchId = 6; side = 'Biru'; }
      else if (matchId === 5) { targetMatchId = 7; side = 'Merah'; }
      else if (matchId === 6) { targetMatchId = 7; side = 'Biru'; }
      else if (matchId === 7) { isFinal = true; }
    } else if (size === 16) {
      if (matchId === 1) { targetMatchId = 9; side = 'Merah'; }
      else if (matchId === 2) { targetMatchId = 9; side = 'Biru'; }
      else if (matchId === 3) { targetMatchId = 10; side = 'Merah'; }
      else if (matchId === 4) { targetMatchId = 10; side = 'Biru'; }
      else if (matchId === 5) { targetMatchId = 11; side = 'Merah'; }
      else if (matchId === 6) { targetMatchId = 11; side = 'Biru'; }
      else if (matchId === 7) { targetMatchId = 12; side = 'Merah'; }
      else if (matchId === 8) { targetMatchId = 12; side = 'Biru'; }
      else if (matchId === 9) { targetMatchId = 13; side = 'Merah'; }
      else if (matchId === 10) { targetMatchId = 13; side = 'Biru'; }
      else if (matchId === 11) { targetMatchId = 14; side = 'Merah'; }
      else if (matchId === 12) { targetMatchId = 14; side = 'Biru'; }
      else if (matchId === 13) { targetMatchId = 15; side = 'Merah'; }
      else if (matchId === 14) { targetMatchId = 15; side = 'Biru'; }
      else if (matchId === 15) { isFinal = true; }
    }
    
    if (isFinal) {
      return "🏆 Perebutan Juara 1";
    }
    
    if (targetMatchId !== null) {
      const targetMatch = cat.matches.find(m => m.id === targetMatchId);
      if (targetMatch) {
        const partaiClean = targetMatch.partai.replace(/Partai\s+/i, 'P.');
        const sideText = side === 'Merah' ? 'Merah' : 'Biru';
        return `Pemenang ke ${partaiClean} ${sideText}`;
      }
    }
    
    return "";
  };

  // Extract all matches and associate them with their category info
  interface FlattenedMatch {
    uniqueId: string; // "catId_matchId"
    catId: string;
    catName: string;
    shortKelas: string;
    gender: string;
    match: BaganMatch;
  }

  const [allMatches, setAllMatches] = useState<FlattenedMatch[]>([]);

  useEffect(() => {
    if (!state.baganCategories) return;

    const list: FlattenedMatch[] = [];
    state.baganCategories.forEach(cat => {
      cat.matches.forEach(m => {
        list.push({
          uniqueId: `${cat.id}_${m.id}`,
          catId: cat.id,
          catName: cat.name,
          shortKelas: getShortKelasAbbreviation(cat.name, cat.gender),
          gender: cat.gender,
          match: m
        });
      });
    });

    // Sort by Partai number numerically
    list.sort((a, b) => {
      const numA = parseInt(a.match.partai.replace(/\D/g, ''), 10) || 999;
      const numB = parseInt(b.match.partai.replace(/\D/g, ''), 10) || 999;
      return numA - numB;
    });

    setAllMatches(list);

    // Default select all matches
    setSelectedMatchIds(list.map(item => item.uniqueId));
  }, [state.baganCategories]);

  // Handle individual checkbox selection
  const toggleMatchSelection = (uniqueId: string) => {
    playBeep('click');
    setSelectedMatchIds(prev => 
      prev.includes(uniqueId) 
        ? prev.filter(id => id !== uniqueId) 
        : [...prev, uniqueId]
    );
  };

  const toggleSelectAll = () => {
    playBeep('click');
    const filteredList = getFilteredMatches();
    const filteredIds = filteredList.map(m => m.uniqueId);
    
    // If all filtered are already selected, deselect them. Otherwise, select all filtered.
    const allSelected = filteredIds.every(id => selectedMatchIds.includes(id));
    if (allSelected) {
      setSelectedMatchIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedMatchIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  // Apply filters to display
  const getFilteredMatches = () => {
    return allMatches.filter(item => {
      if (roundFilter !== 'all' && item.match.round !== roundFilter) return false;
      return true;
    });
  };

  const filteredMatches = getFilteredMatches();
  const selectedMatchesToPrint = filteredMatches.filter(item => selectedMatchIds.includes(item.uniqueId));

  // PDF Generator using html2canvas and jsPDF with offscreen cloning for maximum robustness
  const downloadPDF = async () => {
    if (selectedMatchesToPrint.length === 0) {
      alert("Harap pilih minimal 1 partai pertandingan untuk diunduh!");
      return;
    }

    playBeep('valid');
    setIsGeneratingPdf(true);

    // Add brief timeout to ensure browser has rendered everything correctly
    setTimeout(async () => {
      try {
        const element = printAreaRef.current;
        if (!element) return;

        // Clone the element to render offscreen safely to avoid iframe scroll or cut-off bugs
        const clone = element.cloneNode(true) as HTMLDivElement;
        
        // Ensure clone has standard white background, fixed positioning and is fully visible/expanded
        clone.style.position = 'fixed';
        clone.style.left = '0';
        clone.style.top = '0';
        clone.style.zIndex = '-99999';
        clone.style.opacity = '1';
        clone.style.visibility = 'visible';
        clone.style.width = '794px'; // Standard A4 width pixel equivalent at 96 DPI
        clone.style.minHeight = '1123px';
        clone.style.height = 'auto';
        clone.style.margin = '0';
        clone.style.padding = '32px'; // Match tailwind p-8 (32px)
        clone.style.backgroundColor = '#ffffff';
        clone.style.color = '#000000';
        
        document.body.appendChild(clone);

        // Render the clean offscreen clone
        const canvas = await safeHtml2canvas(clone, {
          scale: 2, // High resolution crisp text
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          logging: false,
          width: 794,
          height: clone.scrollHeight || 1123
        });

        // Clean up the offscreen clone immediately
        document.body.removeChild(clone);

        const imgData = canvas.toDataURL('image/png');
        
        // standard A4 size: 210mm x 297mm
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const pageHeight = 295;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0.5) { // use a threshold to avoid generating an extra empty page due to tiny rounding remainders
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        const fileName = `JADWAL_${gelanggang.replace(/\s+/g, '_')}_${hariTanggal.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        pdf.save(fileName);
        playBeep('valid');
      } catch (err) {
        console.error("Failed to generate PDF", err);
        alert("Gagal mengunduh PDF. Silakan coba lagi.");
      } finally {
        setIsGeneratingPdf(false);
      }
    }, 450);
  };

  return (
    <div className="grid grid-cols-12 gap-4 flex-1 my-2 min-h-0 overflow-hidden">
      
      {/* LEFT PANEL: Customization & Controls */}
      <div className={`col-span-4 flex flex-col gap-3 p-4 rounded-xl border overflow-y-auto ${
        theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-2 border-b pb-2">
          <FileText className="w-5 h-5 text-emerald-500 animate-pulse" />
          <div>
            <h3 className={`text-sm font-black uppercase ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
              Pengaturan Cetak Jadwal
            </h3>
            <p className="text-[10px] text-slate-500">Sesuaikan kop & data tabel jadwal pertandingan</p>
          </div>
        </div>

        {/* Gaya Desain PDF Selector */}
        <div className="space-y-2 border-b pb-3">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-400 block">
            Gaya Desain PDF
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { playBeep('click'); setPdfLayout('classic'); }}
              className={`text-[10px] py-1.5 px-2 rounded-lg border font-black uppercase transition-all cursor-pointer ${
                pdfLayout === 'classic'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm shadow-emerald-800/10'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Klasik (Sesuai Gambar)
            </button>
            <button
              onClick={() => { playBeep('click'); setPdfLayout('standard'); }}
              className={`text-[10px] py-1.5 px-2 rounded-lg border font-black uppercase transition-all cursor-pointer ${
                pdfLayout === 'standard'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm shadow-emerald-800/10'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Standar (Kop Logo)
            </button>
          </div>
        </div>

        {/* Kop Surat / Header Customization */}
        <div className="space-y-2.5">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-400">
            1. Kop Jadwal & Lokasi
          </span>
          
          <div>
            <label className="block text-[9px] uppercase font-mono font-bold text-slate-400 mb-1">
              {pdfLayout === 'classic' ? "Judul Kop Atas (Baris 1)" : "Nama Organisasi / Event Utama"}
            </label>
            <input 
              type="text" 
              value={headerTitle}
              onChange={(e) => setHeaderTitle(e.target.value)}
              className={`w-full text-xs px-2.5 py-1.5 rounded-md border font-bold ${
                theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-850'
              }`}
              placeholder="e.g. JADWAL PERTANDINGAN KEJUARAAN PENCAK SILAT"
            />
          </div>

          <div>
            <label className="block text-[9px] uppercase font-mono font-bold text-slate-400 mb-1">
              {pdfLayout === 'classic' ? "Nama Event (Baris 2)" : "Sub-Header Event"}
            </label>
            <input 
              type="text" 
              value={headerSubtitle}
              onChange={(e) => setHeaderSubtitle(e.target.value)}
              className={`w-full text-xs px-2.5 py-1.5 rounded-md border font-bold ${
                theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-850'
              }`}
            />
          </div>

          <div>
            <label className="block text-[9px] uppercase font-mono font-bold text-slate-400 mb-1">
              {pdfLayout === 'classic' ? "Tanggal Pelaksanaan (Baris 3)" : "Tempat & Tanggal Pelaksanaan"}
            </label>
            <input 
              type="text" 
              value={lokasiTanggal}
              onChange={(e) => setLokasiTanggal(e.target.value)}
              className={`w-full text-xs px-2.5 py-1.5 rounded-md border font-bold ${
                theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-850'
              }`}
            />
          </div>
        </div>

        {/* Logo Customization Section */}
        <div className="space-y-3 border-t pt-3">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-400">
            2. Kustomisasi Logo PDF
          </span>

          {/* Logo Kiri Controller */}
          <div className="p-2.5 rounded-lg bg-slate-950/20 border border-slate-800/40">
            <span className="text-[10px] uppercase font-bold text-amber-500 block mb-2">Logo Kiri (Awal)</span>
            <div className="grid grid-cols-3 gap-1 mb-2">
              {(['default', 'text', 'image'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => { playBeep('click'); setLogoKiriType(type); }}
                  className={`text-[9px] uppercase py-1 rounded transition-all font-bold cursor-pointer ${
                    logoKiriType === type 
                      ? 'bg-amber-650 text-white' 
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {type === 'default' ? 'POPDA' : type === 'text' ? 'Teks' : 'Gambar'}
                </button>
              ))}
            </div>

            {logoKiriType === 'text' && (
              <div className="space-y-1.5 mt-2">
                <input 
                  type="text" 
                  value={logoKiriText1} 
                  onChange={(e) => setLogoKiriText1(e.target.value)}
                  placeholder="Baris 1 (e.g. POPDA)"
                  className="w-full text-[10px] px-2 py-1 rounded border border-slate-800 bg-slate-950 text-white font-mono"
                />
                <input 
                  type="text" 
                  value={logoKiriText2} 
                  onChange={(e) => setLogoKiriText2(e.target.value)}
                  placeholder="Baris 2 (e.g. ACEH)"
                  className="w-full text-[10px] px-2 py-1 rounded border border-slate-800 bg-slate-950 text-white font-mono"
                />
                <input 
                  type="text" 
                  value={logoKiriText3} 
                  onChange={(e) => setLogoKiriText3(e.target.value)}
                  placeholder="Baris 3 (e.g. XVII)"
                  className="w-full text-[10px] px-2 py-1 rounded border border-slate-800 bg-slate-950 text-white font-mono"
                />
                <input 
                  type="text" 
                  value={logoKiriText4} 
                  onChange={(e) => setLogoKiriText4(e.target.value)}
                  placeholder="Baris 4 (e.g. TIMUR 2024)"
                  className="w-full text-[10px] px-2 py-1 rounded border border-slate-800 bg-slate-950 text-white font-mono"
                />
              </div>
            )}

            {logoKiriType === 'image' && (
              <div className="mt-2 space-y-2">
                <div 
                  onClick={() => fileInputKiriRef.current?.click()}
                  className="border border-dashed border-slate-700 rounded-lg p-3 text-center cursor-pointer hover:border-amber-500 hover:bg-slate-900/40 transition-all flex flex-col items-center justify-center gap-1"
                >
                  {logoKiriImage ? (
                    <img src={logoKiriImage} alt="Logo Kiri" className="h-10 w-10 object-contain rounded" />
                  ) : (
                    <Upload className="w-5 h-5 text-slate-500" />
                  )}
                  <span className="text-[10px] text-slate-400 font-medium">
                    {logoKiriImage ? 'Ganti Gambar' : 'Pilih Gambar'}
                  </span>
                  <span className="text-[8px] text-slate-500">PNG / JPEG / SVG</span>
                </div>
                <input 
                  ref={fileInputKiriRef}
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleLogoUpload(e, 'kiri')}
                  className="hidden" 
                />
              </div>
            )}
          </div>

          {/* Logo Kanan Controller */}
          <div className="p-2.5 rounded-lg bg-slate-950/20 border border-slate-800/40">
            <span className="text-[10px] uppercase font-bold text-emerald-500 block mb-2">Logo Kanan (Mascot)</span>
            <div className="grid grid-cols-3 gap-1 mb-2">
              {(['default', 'text', 'image'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => { playBeep('click'); setLogoKananType(type); }}
                  className={`text-[9px] uppercase py-1 rounded transition-all font-bold cursor-pointer ${
                    logoKananType === type 
                      ? 'bg-emerald-650 text-white' 
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {type === 'default' ? 'IPSI' : type === 'text' ? 'Teks' : 'Gambar'}
                </button>
              ))}
            </div>

            {logoKananType === 'text' && (
              <div className="space-y-1.5 mt-2">
                <input 
                  type="text" 
                  value={logoKananText1} 
                  onChange={(e) => setLogoKananText1(e.target.value)}
                  placeholder="Baris 1 (e.g. IPSI)"
                  className="w-full text-[10px] px-2 py-1 rounded border border-slate-800 bg-slate-950 text-white font-mono"
                />
                <input 
                  type="text" 
                  value={logoKananText2} 
                  onChange={(e) => setLogoKananText2(e.target.value)}
                  placeholder="Baris 2 (e.g. EST. 1948)"
                  className="w-full text-[10px] px-2 py-1 rounded border border-slate-800 bg-slate-950 text-white font-mono"
                />
                <input 
                  type="text" 
                  value={logoKananText3} 
                  onChange={(e) => setLogoKananText3(e.target.value)}
                  placeholder="Baris 3 (e.g. OFFICIAL)"
                  className="w-full text-[10px] px-2 py-1 rounded border border-slate-800 bg-slate-950 text-white font-mono"
                />
              </div>
            )}

            {logoKananType === 'image' && (
              <div className="mt-2 space-y-2">
                <div 
                  onClick={() => fileInputKananRef.current?.click()}
                  className="border border-dashed border-slate-700 rounded-lg p-3 text-center cursor-pointer hover:border-emerald-500 hover:bg-slate-900/40 transition-all flex flex-col items-center justify-center gap-1"
                >
                  {logoKananImage ? (
                    <img src={logoKananImage} alt="Logo Kanan" className="h-10 w-10 object-contain rounded" />
                  ) : (
                    <Upload className="w-5 h-5 text-slate-500" />
                  )}
                  <span className="text-[10px] text-slate-400 font-medium">
                    {logoKananImage ? 'Ganti Gambar' : 'Pilih Gambar'}
                  </span>
                  <span className="text-[8px] text-slate-500">PNG / JPEG / SVG</span>
                </div>
                <input 
                  ref={fileInputKananRef}
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleLogoUpload(e, 'kanan')}
                  className="hidden" 
                />
              </div>
            )}
          </div>
        </div>

        {/* Gelanggang & Sesi Info */}
        <div className="space-y-2.5 border-t pt-3">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-400">
            3. Informasi Sesi Pertandingan
          </span>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] uppercase font-mono font-bold text-slate-400 mb-1">
                {pdfLayout === 'classic' ? "Gelanggang (e.g. I)" : "Gelanggang"}
              </label>
              <input 
                type="text" 
                value={gelanggang}
                onChange={(e) => setGelanggang(e.target.value)}
                className={`w-full text-xs px-2.5 py-1.5 rounded-md border font-bold ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-850'
                }`}
              />
            </div>
            <div>
              <label className="block text-[9px] uppercase font-mono font-bold text-slate-400 mb-1">
                {pdfLayout === 'classic' ? "Tanggal (e.g. 18 Des 2023)" : "Hari & Tanggal"}
              </label>
              <input 
                type="text" 
                value={hariTanggal}
                onChange={(e) => setHariTanggal(e.target.value)}
                className={`w-full text-xs px-2.5 py-1.5 rounded-md border font-bold ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-850'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label className="block text-[9px] uppercase font-mono font-bold text-slate-400 mb-1">
                {pdfLayout === 'classic' ? "Babak (e.g. Penyisihan)" : "Babak/Fase"}
              </label>
              <input 
                type="text" 
                value={fase}
                onChange={(e) => setFase(e.target.value)}
                className={`w-full text-xs px-2.5 py-1.5 rounded-md border font-bold ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-850'
                }`}
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[9px] uppercase font-mono font-bold text-slate-400 mb-1">
                {pdfLayout === 'classic' ? "Waktu Sesi (Opsional)" : "Waktu Sesi"}
              </label>
              <input 
                type="text" 
                value={sesiWaktu}
                onChange={(e) => setSesiWaktu(e.target.value)}
                className={`w-full text-xs px-2.5 py-1.5 rounded-md border font-bold ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-850'
                }`}
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[9px] uppercase font-mono font-bold text-slate-400 mb-1">
                {pdfLayout === 'classic' ? "Sesi (e.g. 1)" : "Nama Sesi"}
              </label>
              <input 
                type="text" 
                value={sesiNama}
                onChange={(e) => setSesiNama(e.target.value)}
                className={`w-full text-xs px-2.5 py-1.5 rounded-md border font-bold ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-850'
                }`}
              />
            </div>
          </div>

          {pdfLayout === 'classic' && (
            <div>
              <label className="block text-[9px] uppercase font-mono font-bold text-slate-400 mb-1">Tingkat (e.g. Pra Remaja)</label>
              <input 
                type="text" 
                value={tingkat}
                onChange={(e) => setTingkat(e.target.value)}
                className={`w-full text-xs px-2.5 py-1.5 rounded-md border font-bold ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-850'
                }`}
              />
            </div>
          )}
        </div>

        {/* Tanda Tangan PDF Option */}
        <div className="space-y-2 border-t pt-3">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-400 block mb-1">
            4. Tanda Tangan PDF
          </span>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300 hover:text-white transition-colors">
            <input 
              type="checkbox"
              checked={showSignatures}
              onChange={(e) => { playBeep('click'); setShowSignatures(e.target.checked); }}
              className="rounded border-slate-800 text-emerald-650 focus:ring-emerald-500 bg-slate-950 w-4 h-4 cursor-pointer"
            />
            <span>Sertakan Kolom Tanda Tangan di Bawah PDF</span>
          </label>
        </div>

        {/* Filter Round */}
        <div className="space-y-2 border-t pt-3">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-400 block mb-1">
            5. Filter Babak di Bagan
          </span>
          <div className="grid grid-cols-4 gap-1.5 bg-slate-950/40 p-1 rounded-lg">
            {(['all', 'quarter', 'semi', 'final'] as const).map((r) => (
              <button
                key={r}
                onClick={() => { playBeep('click'); setRoundFilter(r); }}
                className={`text-[9px] uppercase py-1 rounded transition-all font-bold cursor-pointer ${
                  roundFilter === r 
                    ? 'bg-emerald-600 text-white' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r === 'all' ? 'Semua' : r === 'quarter' ? 'Penyisih' : r === 'semi' ? 'Semi' : 'Final'}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Match Selector Table */}
        <div className="flex-1 flex flex-col min-h-0 border-t pt-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-400">
              6. Daftar Partai ({filteredMatches.length})
            </span>
            <button 
              onClick={toggleSelectAll}
              className="text-[10px] text-emerald-505 hover:text-emerald-400 font-bold underline cursor-pointer"
            >
              Pilih Semua / Reset
            </button>
          </div>

          <div className="flex-1 overflow-y-auto border border-slate-800/60 rounded-lg bg-slate-950/30">
            {filteredMatches.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                Tidak ada partai pertandingan di bagan untuk filter ini.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-[10px] uppercase font-mono">
                    <th className="p-2 w-10">Pilih</th>
                    <th className="p-2 w-14">Partai</th>
                    <th className="p-2 w-14">Kelas</th>
                    <th className="p-2">Pesilat</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMatches.map((m) => {
                    const isSelected = selectedMatchIds.includes(m.uniqueId);
                    return (
                      <tr 
                        key={m.uniqueId}
                        onClick={() => toggleMatchSelection(m.uniqueId)}
                        className={`border-b border-slate-900/60 hover:bg-slate-900/40 cursor-pointer ${
                          isSelected ? 'bg-slate-900/20' : 'opacity-60'
                        }`}
                      >
                        <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => toggleMatchSelection(m.uniqueId)} className="text-emerald-500">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-600" />
                            )}
                          </button>
                        </td>
                        <td className="p-2 font-black font-mono text-amber-500">{m.match.partai}</td>
                        <td className="p-2 font-bold text-slate-300">{m.shortKelas}</td>
                        <td className="p-2">
                          <div className="text-[10px] leading-tight">
                            <span className="text-red-400 font-medium">
                              {getEmptySlotLabel(m.catId, m.match.id, 'merah', m.match.atletMerah.nama)}
                            </span>
                            <span className="text-slate-500 mx-1">vs</span>
                            <span className="text-blue-400 font-medium">
                              {getEmptySlotLabel(m.catId, m.match.id, 'biru', m.match.atletBiru.nama)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Download Button */}
        <button
          onClick={downloadPDF}
          disabled={isGeneratingPdf || selectedMatchesToPrint.length === 0}
          className={`w-full py-2.5 rounded-lg font-black text-xs uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
            isGeneratingPdf || selectedMatchesToPrint.length === 0
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-990/45'
          }`}
        >
          {isGeneratingPdf ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Menyusun PDF...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Unduh Jadwal Pertandingan PDF
            </>
          )}
        </button>
      </div>

      {/* RIGHT PANEL: Live PDF Page Preview */}
      <div className="col-span-8 flex flex-col gap-2 min-h-0">
        <div className="flex items-center justify-between px-2">
          <span className="text-xs uppercase font-mono font-black text-slate-400 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-indigo-400" /> Live PDF Page Layout Preview (A4 Scale)
          </span>
          <span className="text-[10px] text-slate-500">Hasil unduhan akan presisi 100% seperti di bawah</span>
        </div>

        {/* PDF Page Canvas Wrapper */}
        <div className={`flex-1 overflow-auto p-6 rounded-xl border flex justify-center bg-slate-950/50 border-slate-900`}>
          
          {/* Exact PDF Layout structured on A4 standard ratio */}
          <div 
            ref={printAreaRef}
            className="w-[794px] bg-white text-black p-8 font-sans shadow-2xl relative select-none"
            style={{ minHeight: '1123px', fontFamily: '"Arial", "Helvetica", sans-serif' }}
          >
            {pdfLayout === 'classic' ? (
              /* CLASSIC STYLE: Exactly matching the user-uploaded image */
              <div className="flex flex-col text-black h-full">
                {/* Header Section */}
                <div className="text-center mb-6">
                  <h1 className="text-[16px] font-extrabold uppercase tracking-wide text-black font-sans leading-tight">
                    {headerTitle}
                  </h1>
                  <h2 className="text-[15px] font-extrabold uppercase tracking-wide text-black font-sans leading-tight mt-1">
                    {headerSubtitle}
                  </h2>
                  <h3 className="text-[13px] font-extrabold text-black font-sans leading-tight mt-1">
                    {lokasiTanggal}
                  </h3>
                </div>

                {/* Metadata block */}
                <div className="flex justify-between items-start text-[11px] font-bold mb-4 px-1 leading-normal font-sans text-black">
                  <div className="text-left space-y-1">
                    <div>Sesi : {sesiNama}</div>
                    <div>Waktu : {sesiWaktu || '-'}</div>
                    <div>Tanggal : {hariTanggal}</div>
                  </div>
                  <div className="text-left space-y-1">
                    <div>Gelanggang : {gelanggang}</div>
                    <div>Babak : {fase}</div>
                    <div>Tingkat : {tingkat}</div>
                  </div>
                </div>

                {/* Table */}
                <table className="w-full border-collapse text-center font-sans border border-black">
                  <thead>
                    <tr className="border border-black text-[11px] font-extrabold uppercase text-black">
                      <th className="border border-black py-2 w-[6%] bg-slate-100 text-center text-black">NO</th>
                      <th className="border border-black py-2 w-[8%] bg-slate-100 text-center text-black">PARTAI</th>
                      <th className="border border-black py-2 w-[14%] bg-slate-100 text-center text-black">KELAS</th>
                      <th className="border border-black py-2 w-[32%] bg-[#FF0000] text-white text-center tracking-wider font-black">SUDUT MERAH</th>
                      <th className="border border-black py-2 w-[32%] bg-[#0066CC] text-white text-center tracking-wider font-black">SUDUT BIRU</th>
                      <th className="border border-black py-2 w-[8%] text-center text-black" colSpan={2}>NILAI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedMatchesToPrint.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="border border-black p-8 text-center text-xs text-slate-500 italic bg-white">
                          Harap pilih partai pertandingan di panel kiri untuk ditampilkan di lembar cetak
                        </td>
                      </tr>
                    ) : (
                      selectedMatchesToPrint.map((item, index) => {
                        const match = item.match;
                        return (
                          <tr key={item.uniqueId} className="border border-black text-[11px] text-black bg-white">
                            {/* NO */}
                            <td className="border border-black py-2.5 text-center font-bold text-black bg-white">
                              {index + 1}
                            </td>
                            
                            {/* PARTAI */}
                            <td className="border border-black py-2.5 text-center font-bold text-black bg-white">
                              {match.partai.replace(/Partai\s+/i, '')}
                            </td>
                            
                            {/* KELAS */}
                            <td className="border border-black py-2 px-1 text-center font-bold uppercase text-black bg-white">
                              <div className="font-extrabold text-[11px]">{item.shortKelas.toUpperCase()}</div>
                              <div className="text-[8px] text-slate-700 font-bold mt-0.5 leading-none">{getRoundLabelIndo(match.round).toUpperCase()}</div>
                            </td>
                            
                            {/* SUDUT MERAH (Name & Kontingen) */}
                            <td className="border border-black py-2 px-3 text-center text-black bg-white">
                              <div className="font-extrabold text-[11px] uppercase leading-tight text-black">
                                {getEmptySlotLabel(item.catId, match.id, 'merah', match.atletMerah.nama)}
                              </div>
                              <div className="text-[9px] font-bold text-slate-600 mt-1 leading-none uppercase">
                                {(!match.atletMerah.nama || match.atletMerah.nama.trim() === '' || match.atletMerah.nama.includes('...')) ? '' : (match.atletMerah.kontingen || '................................')}
                              </div>
                            </td>

                            {/* SUDUT BIRU (Name & Kontingen) */}
                            <td className="border border-black py-2 px-3 text-center text-black bg-white">
                              <div className="font-extrabold text-[11px] uppercase leading-tight text-black">
                                {getEmptySlotLabel(item.catId, match.id, 'biru', match.atletBiru.nama)}
                              </div>
                              <div className="text-[9px] font-bold text-slate-600 mt-1 leading-none uppercase">
                                {(!match.atletBiru.nama || match.atletBiru.nama.trim() === '' || match.atletBiru.nama.includes('...')) ? '' : (match.atletBiru.kontingen || '................................')}
                              </div>
                            </td>

                            {/* NILAI Split columns */}
                            <td className="border border-black w-7 bg-white"></td>
                            <td className="border border-black w-7 bg-white"></td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {/* Footnote (Conditional in classic) */}
                {showSignatures && (
                  <div className="mt-8 border-t border-dashed border-slate-400 pt-3 text-[10px] text-slate-700 leading-relaxed text-left font-sans">
                    <span className="font-bold uppercase block text-black mb-1">
                      Catatan untuk Official Tim :
                    </span>
                    <ol className="list-decimal pl-4 space-y-1">
                      <li>
                        Dimohon meneliti secara cermat jadwal pertandingan diatas! Jika terdapat kesalahan, segera melaporkannya kepada sekretaris pertandingan untuk dilakukan perbaikan sebagaimana mestinya.
                      </li>
                      <li>
                        Lembar ini merupakan rilis resmi komite pelaksana.
                      </li>
                    </ol>
                  </div>
                )}

                {/* Signatures (Conditional in classic) */}
                {showSignatures && (
                  <div className="mt-12 flex justify-between items-end text-[11px] px-4 text-left font-sans">
                    <div className="text-center">
                      <p className="text-slate-500">Mengetahui,</p>
                      <p className="font-bold text-black mt-0.5">Ketua Pertandingan</p>
                      <div className="h-16"></div>
                      <p className="font-bold text-black underline">............................................</p>
                    </div>

                    <div className="text-center">
                      <p className="text-slate-500">Tanggal: {hariTanggal}</p>
                      <p className="font-bold text-black mt-0.5">Sekretaris Pertandingan</p>
                      <div className="h-16"></div>
                      <p className="font-bold text-black underline">............................................</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* STANDARD STYLE: Original logo-heavy style with grids and colored cards */
              <div className="flex flex-col h-full text-black">
                {/* Header Logos & Text */}
                <div className="flex items-center justify-between border-b-4 border-double border-black pb-2.5">
                  {/* Left Logo Emblem */}
                  <div className="w-20 h-20 border border-slate-200 rounded flex flex-col items-center justify-center p-1 bg-slate-50 text-center overflow-hidden">
                    {logoKiriType === 'image' && logoKiriImage ? (
                      <img src={logoKiriImage} alt="Logo Kiri" className="max-w-full max-h-full object-contain" />
                    ) : logoKiriType === 'text' ? (
                      <div className="flex flex-col items-center justify-center">
                        {logoKiriText1 && <span className="text-[8px] font-black text-amber-600 uppercase leading-none">{logoKiriText1}</span>}
                        {logoKiriText2 && <span className="text-[14px] font-extrabold text-blue-900 tracking-tighter leading-none">{logoKiriText2}</span>}
                        {logoKiriText3 && <span className="text-[9px] font-bold text-red-650 leading-none mt-0.5">{logoKiriText3}</span>}
                        <div className="w-full h-0.5 bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 my-1" />
                        {logoKiriText4 && <span className="text-[7px] text-slate-600 uppercase font-bold leading-none">{logoKiriText4}</span>}
                      </div>
                    ) : (
                      <>
                        <span className="text-[8px] font-black text-amber-600 uppercase leading-none">POPDA</span>
                        <span className="text-[14px] font-extrabold text-blue-900 tracking-tighter leading-none">ACEH</span>
                        <span className="text-[9px] font-bold text-red-650 leading-none mt-0.5">XVII</span>
                        <div className="w-full h-0.5 bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 my-1" />
                        <span className="text-[7px] text-slate-600 uppercase font-bold leading-none">TIMUR 2024</span>
                      </>
                    )}
                  </div>

                  {/* Center Text Header */}
                  <div className="flex-1 text-center px-4">
                    <h1 className="text-[14px] font-extrabold uppercase leading-tight tracking-wider text-slate-900">
                      {headerTitle}
                    </h1>
                    <h2 className="text-[13px] font-black uppercase leading-tight text-slate-800">
                      {headerSubtitle}
                    </h2>
                    <h3 className="text-[12px] font-serif italic font-extrabold text-red-700 mt-0.5">
                      Cabang Olahraga Pencak Silat
                    </h3>
                    <p className="text-[10px] font-bold text-slate-600 mt-0.5">
                      {lokasiTanggal}
                    </p>
                  </div>

                  {/* Right Logo Mascot */}
                  <div className="w-20 h-20 border border-slate-200 rounded flex flex-col items-center justify-center bg-slate-50 relative p-1 overflow-hidden">
                    {logoKananType === 'image' && logoKananImage ? (
                      <img src={logoKananImage} alt="Logo Kanan" className="max-w-full max-h-full object-contain" />
                    ) : logoKananType === 'text' ? (
                      <div className="text-center">
                        {logoKananText1 && <div className="text-[18px] font-black text-slate-800 leading-none uppercase">{logoKananText1}</div>}
                        {logoKananText2 && <span className="text-[6px] font-black uppercase text-slate-500 leading-none tracking-widest block mt-0.5">{logoKananText2}</span>}
                        {logoKananText3 && (
                          <div className="border border-slate-300 rounded px-1 py-0.5 mt-1 text-[6px] font-extrabold text-emerald-700 uppercase bg-emerald-50 leading-none">
                            {logoKananText3}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="text-[20px] font-black text-slate-800 leading-none">IPSI</div>
                        <span className="text-[6px] font-black uppercase text-slate-500 leading-none tracking-widest block mt-0.5">EST. 1948</span>
                        <div className="border border-slate-300 rounded px-1 py-0.5 mt-1.5 text-[6px] font-extrabold text-emerald-700 uppercase bg-emerald-50">
                          OFFICIAL
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Title Bar */}
                <div className="text-center my-4 bg-slate-100 border-2 border-black py-1.5">
                  <h2 className="text-[17px] font-extrabold uppercase tracking-widest">
                    JADWAL PERTANDINGAN
                  </h2>
                </div>

                {/* Sesi Info Box Columns */}
                <div className="grid grid-cols-12 gap-1.5 mb-4">
                  <div className="col-span-4 border border-black p-1.5 text-center flex flex-col justify-center">
                    <div className="text-[12px] font-extrabold uppercase bg-slate-100 py-0.5 border-b border-black">
                      {fase}
                    </div>
                    <div className="text-[11px] font-bold mt-1 text-slate-700">
                      {hariTanggal}
                    </div>
                  </div>

                  <div className="col-span-4 border border-black p-1.5 text-center flex items-center justify-center bg-slate-100">
                    <h3 className="text-[16px] font-extrabold uppercase tracking-wider text-slate-900">
                      {gelanggang}
                    </h3>
                  </div>

                  <div className="col-span-4 border border-black p-1.5 text-center flex flex-col justify-center">
                    <div className="text-[12px] font-extrabold uppercase bg-slate-100 py-0.5 border-b border-black">
                      {sesiWaktu}
                    </div>
                    <div className="text-[11px] font-bold mt-1 text-slate-700">
                      {sesiNama}
                    </div>
                  </div>
                </div>

                {/* Matches Schedule Grid Table */}
                <table className="w-full border-2 border-black border-collapse text-center">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-black text-[11px] font-black uppercase">
                      <th className="border-r-2 border-black py-2.5 w-10">NO</th>
                      <th className="border-r-2 border-black py-2.5 w-16">PARTAI</th>
                      <th className="border-r-2 border-black py-2.5 w-16">KELAS</th>
                      <th className="border-r-2 border-black py-2.5 bg-red-650 text-white w-52">MERAH</th>
                      <th className="border-r-2 border-black py-2.5 bg-blue-650 text-white w-52">BIRU</th>
                      <th className="py-2.5 text-black" colSpan={2}>REMARK</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedMatchesToPrint.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-xs text-slate-400 italic">
                          Harap pilih partai pertandingan di panel kiri untuk ditampilkan di lembar cetak
                        </td>
                      </tr>
                    ) : (
                      selectedMatchesToPrint.map((item, index) => {
                        const match = item.match;
                        const isSelesai = match.winner !== null;
                        const isWinnerMerah = match.winner === 'merah';
                        const isWinnerBiru = match.winner === 'biru';

                        return (
                          <tr key={item.uniqueId} className="border-b border-black text-[11px] bg-white">
                            {/* No Index */}
                            <td className="border-r-2 border-black py-2 font-bold bg-slate-50 text-black">
                              {index + 1}
                            </td>
                            
                            {/* Partai */}
                            <td className="border-r-2 border-black py-2 font-black text-sm text-black">
                              {match.partai.replace(/Partai\s+/i, '')}
                            </td>
                            
                            {/* Kelas Abbreviation */}
                            <td className="border-r-2 border-black py-2 px-1 font-bold bg-slate-50 text-black">
                              <div className="font-extrabold text-[11px]">{item.shortKelas}</div>
                              <div className="text-[8px] text-slate-700 font-bold mt-0.5 leading-none">{getRoundLabelIndo(match.round).toUpperCase()}</div>
                            </td>
                            
                            {/* Athlete Merah Box */}
                            <td className="border-r-2 border-black p-1 text-left relative text-black bg-white">
                              <div className={`p-1.5 rounded border border-red-200 bg-red-50/40 h-full flex flex-col justify-center ${
                                isSelesai && !isWinnerMerah ? 'opacity-40' : ''
                              }`}>
                                <div className="font-extrabold uppercase text-slate-900 leading-tight">
                                  {getEmptySlotLabel(item.catId, match.id, 'merah', match.atletMerah.nama)}
                                </div>
                                <div className="text-[9px] font-bold text-red-850 mt-0.5 leading-none">
                                  {(!match.atletMerah.nama || match.atletMerah.nama.trim() === '' || match.atletMerah.nama.includes('...')) ? '' : (match.atletMerah.kontingen || '................................')}
                                </div>
                                {isWinnerMerah && (
                                  <span className="absolute top-1 right-2 text-[8px] bg-red-600 text-white font-extrabold px-1 rounded shadow">
                                    PEMENANG
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Athlete Biru Box */}
                            <td className="border-r-2 border-black p-1 text-left relative text-black bg-white">
                              <div className={`p-1.5 rounded border border-blue-200 bg-blue-50/40 h-full flex flex-col justify-center ${
                                isSelesai && !isWinnerBiru ? 'opacity-40' : ''
                              }`}>
                                <div className="font-extrabold uppercase text-slate-900 leading-tight">
                                  {getEmptySlotLabel(item.catId, match.id, 'biru', match.atletBiru.nama)}
                                </div>
                                <div className="text-[9px] font-bold text-blue-850 mt-0.5 leading-none">
                                  {(!match.atletBiru.nama || match.atletBiru.nama.trim() === '' || match.atletBiru.nama.includes('...')) ? '' : (match.atletBiru.kontingen || '................................')}
                                </div>
                                {isWinnerBiru && (
                                  <span className="absolute top-1 right-2 text-[8px] bg-blue-600 text-white font-extrabold px-1 rounded shadow">
                                    PEMENANG
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Remark double columns for offline sheets signature/scoring results */}
                            <td className="border-r border-black w-10 bg-white"></td>
                            <td className="w-10 bg-white"></td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {/* Footnote / Catatan Official */}
                <div className="mt-8 border-t border-dashed border-slate-400 pt-3 text-[10px] text-slate-700 leading-relaxed text-left">
                  <span className="font-bold uppercase block text-black mb-1">
                    Catatan untuk Official Tim :
                  </span>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>
                      Dimohon meneliti secara cermat jadwal pertandingan diatas! Jika terdapat kesalahan, segera melaporkannya kepada sekretaris pertandingan untuk dilakukan perbaikan sebagaimana mestinya.
                    </li>
                    <li>
                      Lembar ini merupakan rilis resmi komite pelaksana Pencak Silat POPDA XVII.
                    </li>
                  </ol>
                </div>

                {/* Official Stamp Signatures space */}
                {showSignatures && (
                  <div className="mt-12 flex justify-between items-end text-[11px] px-4 text-left">
                    <div className="text-center">
                      <p className="text-slate-500">Mengetahui,</p>
                      <p className="font-bold text-black mt-0.5">Ketua Pertandingan</p>
                      <div className="h-16"></div>
                      <p className="font-bold text-black underline">............................................</p>
                    </div>

                    <div className="text-center">
                      <p className="text-slate-500">Idi Rayeuk, {hariTanggal.split(',')[1]?.trim() || hariTanggal}</p>
                      <p className="font-bold text-black mt-0.5">Sekretaris Pertandingan</p>
                      <div className="h-16"></div>
                      <p className="font-bold text-black underline">............................................</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}

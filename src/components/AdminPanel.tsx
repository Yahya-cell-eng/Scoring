/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Lock,
  UserCheck,
  Trophy,
  Users,
  LayoutGrid,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  Save,
  RefreshCw,
  Search,
  Filter,
  Eye,
  EyeOff,
  LogOut,
  ArrowLeft,
  Shield,
  Award,
  Sliders,
  Download,
  Upload,
  Check,
  X,
  MapPin,
  Calendar,
  Building,
  User,
  KeyRound,
  ExternalLink,
  Database,
  HardDrive,
  FolderArchive,
  Server,
  Clock,
  FileCheck
} from 'lucide-react';
import {
  MasterTournamentInfo,
  MasterReferee,
  ArenaAssignment,
  MasterDataState,
  AdminUser,
  GelanggangInfo,
  StorageStatus,
  StorageFileInfo
} from '../types';

interface AdminPanelProps {
  onBackToPortal: () => void;
  masterData: MasterDataState | null;
  arenasList?: GelanggangInfo[];
  currentArenaId?: string;
  onSelectArena?: (id: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  onBackToPortal,
  masterData: liveMasterData,
  arenasList = [
    { id: 'arena_1', nama: 'Gelanggang 1', kode: '1', keterangan: 'Matras 1 - Arena Utama A', modeAktif: 'tanding', status: 'aktif' },
    { id: 'arena_2', nama: 'Gelanggang 2', kode: '2', keterangan: 'Matras 2 - Arena B', modeAktif: 'tanding', status: 'aktif' },
    { id: 'arena_3', nama: 'Gelanggang 3', kode: '3', keterangan: 'Matras 3 - Arena Seni C', modeAktif: 'seni', status: 'aktif' }
  ],
  currentArenaId = 'arena_1',
  onSelectArena
}) => {
  // Authentication state
  const [token, setToken] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? (sessionStorage.getItem('admin_auth_token') || localStorage.getItem('admin_auth_token')) : null;
  });
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Login form state
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('admin@silat2026');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  // Active Admin Tabs: 'tournament' | 'referees' | 'assignments' | 'storage' | 'security'
  const [activeTab, setActiveTab] = useState<'tournament' | 'referees' | 'assignments' | 'storage' | 'security'>('tournament');

  // Local Server Storage State
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);
  const [isLoadingStorage, setIsLoadingStorage] = useState<boolean>(false);
  const [isSavingDisk, setIsSavingDisk] = useState<boolean>(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState<boolean>(false);

  // Local Master Data State (initialized from liveMasterData or fetched via API)
  const [localTournament, setLocalTournament] = useState<MasterTournamentInfo>({
    namaEvent: "Kejuaraan Nasional Pencak Silat IPSI 2026",
    subJudul: "Piala Menpora RI & Ketua Umum Pengurus Besar IPSI",
    lokasi: "Padepokan Pencak Silat Indonesia, TMII, Jakarta Timur",
    tanggalMulai: "2026-09-15",
    tanggalSelesai: "2026-09-20",
    tingkatKejuaraan: "Nasional",
    penyelenggara: "Pengurus Besar Ikatan Pencak Silat Indonesia (PB IPSI)",
    delegasiTeknis: "Drs. H. M. Taufik, M.Si (Technical Delegate IPSI)",
    ketuaPertandinganUtama: "Dr. H. Suwandi, M.Pd (Wasit Juri Internasional)",
    dewanWasitUtama: "Drs. Bambang Sutrisno, M.M",
    aturanVersi: "Peraturan Pertandingan IPSI 2022 (Terbaru)"
  });

  const [localReferees, setLocalReferees] = useState<MasterReferee[]>([]);
  const [localAssignments, setLocalAssignments] = useState<Record<string, ArenaAssignment>>({});
  const [localLogs, setLocalLogs] = useState<any[]>([]);

  // Notification Toast / Alert
  const [alertNotice, setAlertNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const showAlert = (type: 'success' | 'error' | 'info', message: string) => {
    setAlertNotice({ type, message });
    setTimeout(() => setAlertNotice(null), 4500);
  };

  // Selected Arena for Arena Assignment tab
  const [selectedArenaForAssign, setSelectedArenaForAssign] = useState<string>(currentArenaId || 'arena_1');

  // Referee Filter & Search state
  const [searchRefQuery, setSearchRefQuery] = useState('');
  const [filterLisensi, setFilterLisensi] = useState<string>('Semua');
  const [filterKategori, setFilterKategori] = useState<string>('Semua');

  // Referee Modal (Add/Edit)
  const [showRefModal, setShowRefModal] = useState(false);
  const [editingReferee, setEditingReferee] = useState<MasterReferee | null>(null);
  const [refForm, setRefForm] = useState<Partial<MasterReferee>>({
    nama: '',
    lisensi: 'Nasional 1',
    pengprov: 'Jawa Barat',
    kategoriTugas: 'Semua',
    nomorRegistrasi: '',
    telepon: '',
    status: 'aktif',
    catatan: ''
  });

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 1. Verify token on mount or token change
  useEffect(() => {
    let isMounted = true;

    const verify = async () => {
      if (!token) {
        setAuthLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/admin/verify', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success) {
            setCurrentUser(data.user);
            if (data.masterData) {
              setLocalTournament(data.masterData.tournament || localTournament);
              setLocalReferees(data.masterData.referees || []);
              setLocalAssignments(data.masterData.assignments || {});
              setLocalLogs(data.masterData.auditLogs || []);
            }
          }
        } else {
          // Token expired or invalid
          sessionStorage.removeItem('admin_auth_token');
          localStorage.removeItem('admin_auth_token');
          setToken(null);
          setCurrentUser(null);
        }
      } catch (err) {
        console.warn("Admin token verification error:", err);
      } finally {
        if (isMounted) setAuthLoading(false);
      }
    };

    verify();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // 2. Sync with liveMasterData if available
  useEffect(() => {
    if (liveMasterData) {
      if (liveMasterData.tournament) setLocalTournament(liveMasterData.tournament);
      if (liveMasterData.referees) setLocalReferees(liveMasterData.referees);
      if (liveMasterData.assignments) setLocalAssignments(liveMasterData.assignments);
      if (liveMasterData.auditLogs) setLocalLogs(liveMasterData.auditLogs);
    }
  }, [liveMasterData]);

  // Fetch local server storage health & status
  const fetchStorageStatus = async () => {
    try {
      setIsLoadingStorage(true);
      const res = await fetch('/api/storage/status');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStorageStatus(data);
        }
      }
    } catch (err) {
      console.warn('Gagal memuat status penyimpanan lokal:', err);
    } finally {
      setIsLoadingStorage(false);
    }
  };

  useEffect(() => {
    fetchStorageStatus();
    const interval = setInterval(fetchStorageStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  // Force Save to Local Server Disk Now
  const handleSaveToLocalDisk = async () => {
    try {
      setIsSavingDisk(true);
      const res = await fetch('/api/storage/save', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showAlert('success', data.message || 'Data berhasil disimpan ke disk server lokal!');
        if (data.status) setStorageStatus(data.status);
      } else {
        showAlert('error', data.error || 'Gagal menyimpan ke server lokal.');
      }
    } catch (err: any) {
      showAlert('error', 'Error: ' + err.message);
    } finally {
      setIsSavingDisk(false);
    }
  };

  // Create Local Snapshot Backup on Server
  const handleCreateLocalBackup = async () => {
    try {
      setIsCreatingBackup(true);
      const res = await fetch('/api/storage/backup', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showAlert('success', data.message || 'Snapshot cadangan lokal berhasil dibuat!');
        if (data.status) setStorageStatus(data.status);
      } else {
        showAlert('error', data.error || 'Gagal membuat file cadangan.');
      }
    } catch (err: any) {
      showAlert('error', 'Error: ' + err.message);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // Restore Database from uploaded JSON file
  const handleRestoreDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm(`PERINGATAN: Memulihkan database dari file "${file.name}" akan menimpa seluruh data pertandingan dan pengaturan gelanggang saat ini. Lanjutkan?`)) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const raw = ev.target?.result as string;
        const parsed = JSON.parse(raw);
        const res = await fetch('/api/storage/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dump: parsed })
        });
        const data = await res.json();
        if (data.success) {
          showAlert('success', data.message || 'Database berhasil dipulihkan!');
          if (data.status) setStorageStatus(data.status);
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          showAlert('error', data.error || 'Gagal memulihkan database.');
        }
      } catch (err: any) {
        showAlert('error', 'Format file JSON tidak valid: ' + err.message);
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsSubmittingLogin(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      const data = await res.json();

      if (data.success && data.token) {
        sessionStorage.setItem('admin_auth_token', data.token);
        localStorage.setItem('admin_auth_token', data.token);
        setToken(data.token);
        setCurrentUser(data.user);
        if (data.masterData) {
          setLocalTournament(data.masterData.tournament || localTournament);
          setLocalReferees(data.masterData.referees || []);
          setLocalAssignments(data.masterData.assignments || {});
          setLocalLogs(data.masterData.auditLogs || []);
        }
        showAlert('success', `Selamat datang kembali, ${data.user.displayName}!`);
      } else {
        setAuthError(data.error || 'Login gagal. Periksa username dan password Anda.');
      }
    } catch (err: any) {
      setAuthError('Gagal menghubungi server autentikasi: ' + (err.message || 'Koneksi error'));
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    if (token) {
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        // ignore
      }
    }
    sessionStorage.removeItem('admin_auth_token');
    localStorage.removeItem('admin_auth_token');
    setToken(null);
    setCurrentUser(null);
    showAlert('info', 'Anda telah berhasil logout dari AdminPanel.');
  };

  // Quick autofill credentials helper
  const handleAutofillAdmin = () => {
    setLoginUsername('admin');
    setLoginPassword('admin@silat2026');
    setAuthError(null);
  };

  // -------------------------------------------------------------
  // Save Tournament Information
  // -------------------------------------------------------------
  const [isSavingTournament, setIsSavingTournament] = useState(false);
  const handleSaveTournament = async () => {
    if (!token) return;
    setIsSavingTournament(true);
    try {
      const res = await fetch('/api/admin/tournament', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ tournament: localTournament })
      });
      const data = await res.json();
      if (data.success) {
        setLocalTournament(data.tournament);
        showAlert('success', 'Data turnamen berhasil disimpan dan disinkronkan ke seluruh gelanggang!');
      } else {
        showAlert('error', data.error || 'Gagal menyimpan data turnamen.');
      }
    } catch (err: any) {
      showAlert('error', 'Error: ' + err.message);
    } finally {
      setIsSavingTournament(false);
    }
  };

  // Preset tournaments
  const applyTournamentPreset = (presetKey: string) => {
    if (presetKey === 'kejurnas') {
      setLocalTournament(prev => ({
        ...prev,
        namaEvent: "Kejuaraan Nasional Pencak Silat IPSI 2026",
        subJudul: "Piala Menpora RI & Ketua Umum Pengurus Besar IPSI",
        lokasi: "Padepokan Pencak Silat Indonesia, TMII, Jakarta Timur",
        tingkatKejuaraan: "Nasional",
        penyelenggara: "Pengurus Besar Ikatan Pencak Silat Indonesia (PB IPSI)",
        aturanVersi: "Peraturan Pertandingan IPSI 2022 (Terbaru)"
      }));
      showAlert('info', 'Preset Kejurnas IPSI diterapkan.');
    } else if (presetKey === 'pon') {
      setLocalTournament(prev => ({
        ...prev,
        namaEvent: "Pekan Olahraga Nasional (PON) XXI - Cabor Pencak Silat",
        subJudul: "Babak Final Perebutan Medali Emas & Juara Umum",
        lokasi: "GOR Veteran Disporasu, Medan, Sumatra Utara",
        tingkatKejuaraan: "Nasional",
        penyelenggara: "KONI & PB IPSI",
        aturanVersi: "Peraturan Pertandingan IPSI 2022 (Terbaru)"
      }));
      showAlert('info', 'Preset PON XXI diterapkan.');
    } else if (presetKey === 'kejurda') {
      setLocalTournament(prev => ({
        ...prev,
        namaEvent: "Kejuaraan Daerah Pencak Silat Jawa Barat 2026",
        subJudul: "Piala Gubernur & Seleksi Daerah Babak Kualifikasi",
        lokasi: "GOR Tri Lomba Juang Pajajaran, Kota Bandung",
        tingkatKejuaraan: "Provinsi",
        penyelenggara: "Pengprov IPSI Jawa Barat",
        aturanVersi: "Peraturan Pertandingan IPSI 2022 (Terbaru)"
      }));
      showAlert('info', 'Preset Kejurda Jabar diterapkan.');
    } else if (presetKey === 'presiden') {
      setLocalTournament(prev => ({
        ...prev,
        namaEvent: "Piala Presiden Pencak Silat International Championship 2026",
        subJudul: "World Pencak Silat Federation & IPSI",
        lokasi: "Istora Senayan, Gelora Bung Karno, Jakarta Pusat",
        tingkatKejuaraan: "Internasional",
        penyelenggara: "Persekutuan Pencak Silat Antarabangsa (PERSILAT) & PB IPSI",
        aturanVersi: "Peraturan Pertandingan IPSI 2022 (Terbaru)"
      }));
      showAlert('info', 'Preset Piala Presiden diterapkan.');
    }
  };

  // Handle Logo Upload
  const handleLogoUpload = (type: 'kiri' | 'tengah' | 'kanan', file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (type === 'kiri') setLocalTournament(prev => ({ ...prev, logoKiri: dataUrl }));
      if (type === 'tengah') setLocalTournament(prev => ({ ...prev, logoTengah: dataUrl }));
      if (type === 'kanan') setLocalTournament(prev => ({ ...prev, logoKanan: dataUrl }));
      showAlert('success', `Logo ${type} berhasil diunggah.`);
    };
    reader.readAsDataURL(file);
  };

  // -------------------------------------------------------------
  // Referee CRUD Operations
  // -------------------------------------------------------------
  const filteredReferees = useMemo(() => {
    return localReferees.filter(ref => {
      const matchQuery =
        ref.nama.toLowerCase().includes(searchRefQuery.toLowerCase()) ||
        (ref.nomorRegistrasi && ref.nomorRegistrasi.toLowerCase().includes(searchRefQuery.toLowerCase())) ||
        ref.pengprov.toLowerCase().includes(searchRefQuery.toLowerCase());

      const matchLisensi = filterLisensi === 'Semua' || ref.lisensi === filterLisensi;
      const matchKategori = filterKategori === 'Semua' || ref.kategoriTugas === filterKategori || ref.kategoriTugas === 'Semua';

      return matchQuery && matchLisensi && matchKategori;
    });
  }, [localReferees, searchRefQuery, filterLisensi, filterKategori]);

  const handleOpenAddReferee = () => {
    setEditingReferee(null);
    setRefForm({
      nama: '',
      lisensi: 'Nasional 1',
      pengprov: 'Jawa Barat',
      kategoriTugas: 'Semua',
      nomorRegistrasi: `WJ-${Math.floor(1000 + Math.random() * 9000)}`,
      telepon: '0812-',
      status: 'aktif',
      catatan: ''
    });
    setShowRefModal(true);
  };

  const handleOpenEditReferee = (ref: MasterReferee) => {
    setEditingReferee(ref);
    setRefForm({ ...ref });
    setShowRefModal(true);
  };

  const handleSaveRefereeModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!refForm.nama?.trim()) {
      showAlert('error', 'Nama wasit/juri wajib diisi!');
      return;
    }

    try {
      const action = editingReferee ? 'update' : 'add';
      const refereePayload = {
        ...(editingReferee || {}),
        ...refForm,
        id: editingReferee ? editingReferee.id : `ref_${Date.now()}`
      };

      const res = await fetch('/api/admin/referees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action, referee: refereePayload })
      });
      const data = await res.json();
      if (data.success) {
        setLocalReferees(data.referees);
        setShowRefModal(false);
        showAlert('success', `Wasit ${refForm.nama} berhasil ${editingReferee ? 'diperbarui' : 'ditambahkan'}!`);
      } else {
        showAlert('error', data.error || 'Gagal menyimpan data wasit.');
      }
    } catch (err: any) {
      showAlert('error', 'Error: ' + err.message);
    }
  };

  const handleDeleteReferee = async (id: string, nama: string) => {
    if (!window.confirm(`Yakin ingin menghapus wasit "${nama}" dari daftar master?`)) return;
    if (!token) return;

    try {
      const res = await fetch('/api/admin/referees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'delete', id })
      });
      const data = await res.json();
      if (data.success) {
        setLocalReferees(data.referees);
        showAlert('success', `Wasit ${nama} berhasil dihapus.`);
      } else {
        showAlert('error', data.error || 'Gagal menghapus wasit.');
      }
    } catch (err: any) {
      showAlert('error', 'Error: ' + err.message);
    }
  };

  // -------------------------------------------------------------
  // Arena Assignment Operations
  // -------------------------------------------------------------
  const activeAssignment: ArenaAssignment = useMemo(() => {
    return localAssignments[selectedArenaForAssign] || {
      arenaId: selectedArenaForAssign,
      namaGelanggang: arenasList.find(a => a.id === selectedArenaForAssign)?.nama || `Gelanggang ${selectedArenaForAssign}`,
      shift: 'Sesi 1 (Pagi - Siang)',
      status: 'bertugas'
    };
  }, [localAssignments, selectedArenaForAssign, arenasList]);

  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const handleSaveAssignment = async () => {
    if (!token) return;
    setIsSavingAssignment(true);
    try {
      const res = await fetch('/api/admin/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          arenaId: selectedArenaForAssign,
          assignment: activeAssignment
        })
      });
      const data = await res.json();
      if (data.success) {
        setLocalAssignments(data.assignments);
        showAlert('success', `Penugasan wasit/juri untuk ${activeAssignment.namaGelanggang} berhasil disimpan dan disinkronkan!`);
      } else {
        showAlert('error', data.error || 'Gagal menyimpan penugasan.');
      }
    } catch (err: any) {
      showAlert('error', 'Error: ' + err.message);
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const handleUpdateAssignmentField = (field: keyof ArenaAssignment, val: any) => {
    setLocalAssignments(prev => ({
      ...prev,
      [selectedArenaForAssign]: {
        ...activeAssignment,
        [field]: val
      }
    }));
  };

  const handleUpdateSeniJuri = (juriKey: string, refId: string | null) => {
    const currentSeni = activeAssignment.seniJuriIds || {};
    setLocalAssignments(prev => ({
      ...prev,
      [selectedArenaForAssign]: {
        ...activeAssignment,
        seniJuriIds: {
          ...currentSeni,
          [juriKey]: refId
        }
      }
    }));
  };

  // Auto-Assign (Smart Referee Rotation)
  const handleAutoAssign = () => {
    if (localReferees.length < 5) {
      showAlert('error', 'Diperlukan minimal 5 wasit terdaftar untuk menjalankan rotasi otomatis.');
      return;
    }

    const availableRefs = [...localReferees].filter(r => r.status === 'aktif');
    if (availableRefs.length === 0) {
      showAlert('error', 'Tidak ada wasit dengan status aktif.');
      return;
    }

    // Shuffle refs
    const shuffled = [...availableRefs].sort(() => 0.5 - Math.random());

    const ketua = shuffled.find(r => r.lisensi === 'Internasional' || r.lisensi === 'Nasional 1') || shuffled[0];
    const dewan = shuffled.find(r => r.id !== ketua.id && (r.lisensi === 'Nasional 1' || r.lisensi === 'Nasional 2')) || shuffled[1];
    const wasitPanggung = shuffled.find(r => r.id !== ketua.id && r.id !== dewan.id) || shuffled[2];
    const remain = shuffled.filter(r => r.id !== ketua.id && r.id !== dewan.id && r.id !== wasitPanggung.id);

    const juri1 = remain[0] || shuffled[0];
    const juri2 = remain[1] || shuffled[1];
    const juri3 = remain[2] || shuffled[2];
    const juriCad = remain[3] || null;

    const newAssignment: ArenaAssignment = {
      ...activeAssignment,
      ketuaPertandinganId: ketua.id,
      dewanId: dewan.id,
      wasitUtamaId: wasitPanggung.id,
      juri1Id: juri1.id,
      juri2Id: juri2.id,
      juri3Id: juri3.id,
      juriCadanganId: juriCad?.id || null,
      seniJuriIds: {
        juri1: juri1.id,
        juri2: juri2.id,
        juri3: juri3.id,
        juri4: remain[3]?.id || juri1.id,
        juri5: remain[4]?.id || juri2.id
      }
    };

    setLocalAssignments(prev => ({
      ...prev,
      [selectedArenaForAssign]: newAssignment
    }));

    showAlert('success', `Rotasi otomatis wasit berhasil diatur untuk ${activeAssignment.namaGelanggang}. Klik "Terapkan & Simpan" untuk konfirmasi.`);
  };

  // -------------------------------------------------------------
  // System Security: Change Password & Reset Master Data
  // -------------------------------------------------------------
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (newPassword.length < 4) {
      showAlert('error', 'Password baru minimal 4 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert('error', 'Konfirmasi password tidak cocok.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword, confirmPassword })
      });
      const data = await res.json();
      if (data.success) {
        setNewPassword('');
        setConfirmPassword('');
        showAlert('success', 'Password administrator berhasil diperbarui.');
      } else {
        showAlert('error', data.error || 'Gagal mengubah password.');
      }
    } catch (err: any) {
      showAlert('error', 'Error: ' + err.message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleResetMasterData = async () => {
    if (!window.confirm("PERINGATAN: Anda akan mereset seluruh data master (turnamen, wasit, penugasan) ke template resmi standar IPSI. Lanjutkan?")) {
      return;
    }
    if (!token) return;

    try {
      const res = await fetch('/api/admin/reset-master-data', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLocalTournament(data.masterData.tournament);
        setLocalReferees(data.masterData.referees);
        setLocalAssignments(data.masterData.assignments);
        setLocalLogs(data.masterData.auditLogs);
        showAlert('success', 'Master data berhasil direset ke standar resmi IPSI!');
      } else {
        showAlert('error', data.error || 'Gagal mereset data.');
      }
    } catch (err: any) {
      showAlert('error', 'Error: ' + err.message);
    }
  };

  // Helper to find referee by ID
  const getRefName = (id?: string | null) => {
    if (!id) return '- Belum Ditugaskan -';
    const found = localReferees.find(r => r.id === id);
    if (!found) return id;
    return `${found.nama} (${found.lisensi} - ${found.pengprov})`;
  };

  // =========================================================================
  // VIEW 1: UN-AUTHENTICATED LOGIN SCREEN
  // =========================================================================
  if (!token || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
        {/* Background Subtle Ambience */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Back to Portal Top Bar */}
        <div className="w-full max-w-md mb-6 flex justify-between items-center z-10">
          <button
            id="admin-login-back-btn"
            onClick={onBackToPortal}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white transition-colors bg-slate-900/80 border border-slate-800 px-3.5 py-2 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Portal
          </button>
          <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold rounded-full">
            <Shield className="w-3.5 h-3.5" />
            IPSI Master Control
          </div>
        </div>

        {/* Main Authentication Card */}
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl p-6 sm:p-8 z-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-amber-600 to-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20 border border-amber-300/30">
              <Lock className="w-8 h-8 text-slate-950 stroke-[2.5]" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-1.5">
              Portal Admin Sistem
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              Akses terproteksi pengelolaan data master kejuaraan, daftar wasit & juri, dan distribusi gelanggang.
            </p>
          </div>

          {/* Error Alert */}
          {authError && (
            <div className="mb-5 p-3.5 bg-red-950/60 border border-red-800/80 text-red-200 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Username Administrator
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="admin-username-input"
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password Administrator
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="admin-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="admin-submit-login-btn"
              type="submit"
              disabled={isSubmittingLogin}
              className="w-full mt-2 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.99] text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmittingLogin ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Memverifikasi Kredensial...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Masuk ke AdminPanel
                </>
              )}
            </button>
          </form>

          {/* Quick Credential Helper for Reviewers */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Kredensial Default Sistem
              </span>
              <button
                type="button"
                onClick={handleAutofillAdmin}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 cursor-pointer"
              >
                Isi Otomatis
              </button>
            </div>
            <div className="bg-slate-950/60 rounded-lg p-2.5 border border-slate-800/60 font-mono text-[11px] text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Username:</span>
                <span className="text-amber-300 font-semibold">admin</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Password:</span>
                <span className="text-amber-300 font-semibold">admin@silat2026</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="mt-6 text-xs text-slate-600 text-center">
          Sistem Skoring Digital & Manajemen Pertandingan Pencak Silat © 2026 IPSI
        </p>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: AUTHENTICATED SYSTEM ADMIN DASHBOARD
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Toast Alert Banner */}
      {alertNotice && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium flex items-center gap-3 animate-in slide-in-from-top-3 duration-200 ${
            alertNotice.type === 'success'
              ? 'bg-emerald-950 border-emerald-700 text-emerald-200'
              : alertNotice.type === 'error'
              ? 'bg-red-950 border-red-700 text-red-200'
              : 'bg-blue-950 border-blue-700 text-blue-200'
          }`}
        >
          {alertNotice.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          {alertNotice.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-400" />}
          {alertNotice.type === 'info' && <Shield className="w-5 h-5 text-blue-400" />}
          <span>{alertNotice.message}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              id="admin-header-back-btn"
              onClick={onBackToPortal}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
              title="Kembali ke Portal Gelanggang"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Portal Gelanggang</span>
            </button>
            <div className="h-6 w-px bg-slate-800" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white flex items-center gap-2">
                  AdminPanel
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    MASTER DATA
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400 truncate max-w-xs sm:max-w-md">
                  {localTournament.namaEvent}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Server Storage Status Indicator Badge */}
            <button
              onClick={() => {
                setActiveTab('storage');
                fetchStorageStatus();
              }}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-emerald-500/40 text-emerald-300 text-xs hover:border-emerald-400 hover:bg-emerald-950/40 transition-all cursor-pointer shadow-sm"
              title="Klik untuk membuka tab Penyimpanan Server Lokal"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-[11px] font-mono">SERVER LOKAL:</span>
              <span className="text-[11px] font-medium text-emerald-200">
                {storageStatus?.status === 'saving' ? 'Menyimpan...' : 'Tersimpan (Aktif)'}
              </span>
            </button>

            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-200">{currentUser.displayName}</span>
              <span className="text-[10px] text-emerald-400 flex items-center justify-end gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Sesi Terautentikasi ({currentUser.role})
              </span>
            </div>

            <button
              id="admin-logout-btn"
              onClick={handleLogout}
              className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 hover:text-red-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-2 overflow-x-auto border-t border-slate-800/60 py-2">
          <button
            id="tab-btn-tournament"
            onClick={() => setActiveTab('tournament')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'tournament'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Trophy className="w-4 h-4" />
            Master Turnamen
          </button>

          <button
            id="tab-btn-referees"
            onClick={() => setActiveTab('referees')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'referees'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            Master Wasit & Juri
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900 text-slate-300">
              {localReferees.length}
            </span>
          </button>

          <button
            id="tab-btn-assignments"
            onClick={() => setActiveTab('assignments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'assignments'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Penugasan Gelanggang
          </button>

          <button
            id="tab-btn-storage"
            onClick={() => {
              setActiveTab('storage');
              fetchStorageStatus();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'storage'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Database className="w-4 h-4" />
            Penyimpanan Server Lokal
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          <button
            id="tab-btn-security"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'security'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Shield className="w-4 h-4" />
            Keamanan & Audit Log
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {/* =================================================================== */}
        {/* TAB 1: MASTER TURNAMEN */}
        {/* =================================================================== */}
        {activeTab === 'tournament' && (
          <div className="space-y-6">
            {/* Quick Presets Banner */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <Sliders className="w-4 h-4" />
                  Preset Cepat Kejuaraan
                </h3>
                <p className="text-xs text-slate-400">
                  Gunakan template resmi untuk mengisi data turnamen secara instan:
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => applyTournamentPreset('kejurnas')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium rounded-lg border border-slate-700 transition-colors cursor-pointer"
                >
                  Kejurnas IPSI
                </button>
                <button
                  onClick={() => applyTournamentPreset('pon')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium rounded-lg border border-slate-700 transition-colors cursor-pointer"
                >
                  PON XXI
                </button>
                <button
                  onClick={() => applyTournamentPreset('kejurda')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium rounded-lg border border-slate-700 transition-colors cursor-pointer"
                >
                  Kejurda Jabar
                </button>
                <button
                  onClick={() => applyTournamentPreset('presiden')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium rounded-lg border border-slate-700 transition-colors cursor-pointer"
                >
                  Piala Presiden
                </button>
              </div>
            </div>

            {/* Tournament Details Form */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-amber-400" />
                      Informasi Utama Turnamen
                    </h2>
                    <p className="text-xs text-slate-400">
                      Data ini ditampilkan pada seluruh monitor gelanggang, papan skor, dan sertifikat resmi.
                    </p>
                  </div>
                  <button
                    id="save-tournament-btn"
                    onClick={handleSaveTournament}
                    disabled={isSavingTournament}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSavingTournament ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Simpan & Sinkronkan
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nama Resmi Turnamen / Kejuaraan <span className="text-amber-400">*</span>
                    </label>
                    <input
                      id="input-tournament-nama"
                      type="text"
                      required
                      value={localTournament.namaEvent}
                      onChange={(e) => setLocalTournament({ ...localTournament, namaEvent: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-amber-500"
                      placeholder="e.g. Kejuaraan Nasional Pencak Silat IPSI 2026"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Sub-Judul / Perebutan Piala
                      </label>
                      <input
                        type="text"
                        value={localTournament.subJudul || ''}
                        onChange={(e) => setLocalTournament({ ...localTournament, subJudul: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                        placeholder="e.g. Piala Menpora RI"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Tingkat Kejuaraan
                      </label>
                      <select
                        value={localTournament.tingkatKejuaraan || 'Nasional'}
                        onChange={(e) => setLocalTournament({ ...localTournament, tingkatKejuaraan: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                      >
                        <option value="Internasional">Internasional (PERSILAT)</option>
                        <option value="Nasional">Nasional (PB IPSI / Kejurnas)</option>
                        <option value="Provinsi">Provinsi (Pengprov IPSI / Kejurda / Porprov)</option>
                        <option value="Daerah">Kabupaten / Kota (Pengkab / Pengkot)</option>
                        <option value="Terbuka">Kejuaraan Terbuka / Open Tournament</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      Lokasi / Venue Pertandingan
                    </label>
                    <input
                      type="text"
                      value={localTournament.lokasi || ''}
                      onChange={(e) => setLocalTournament({ ...localTournament, lokasi: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                      placeholder="e.g. Padepokan Pencak Silat Indonesia, TMII Jakarta"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        Tanggal Mulai
                      </label>
                      <input
                        type="date"
                        value={localTournament.tanggalMulai || ''}
                        onChange={(e) => setLocalTournament({ ...localTournament, tanggalMulai: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        Tanggal Selesai
                      </label>
                      <input
                        type="date"
                        value={localTournament.tanggalSelesai || ''}
                        onChange={(e) => setLocalTournament({ ...localTournament, tanggalSelesai: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-amber-400" />
                        Penyelenggara Resmi
                      </label>
                      <input
                        type="text"
                        value={localTournament.penyelenggara || ''}
                        onChange={(e) => setLocalTournament({ ...localTournament, penyelenggara: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                        placeholder="Pengurus Besar IPSI"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Versi Aturan Pertandingan
                      </label>
                      <input
                        type="text"
                        value={localTournament.aturanVersi || ''}
                        onChange={(e) => setLocalTournament({ ...localTournament, aturanVersi: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                        placeholder="Peraturan Pertandingan IPSI 2022"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      Pejabat Teknis Tertinggi
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Delegasi Teknis (Technical Delegate)
                        </label>
                        <input
                          type="text"
                          value={localTournament.delegasiTeknis || ''}
                          onChange={(e) => setLocalTournament({ ...localTournament, delegasiTeknis: e.target.value })}
                          className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                          placeholder="Nama Technical Delegate"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Ketua Pertandingan Utama
                        </label>
                        <input
                          type="text"
                          value={localTournament.ketuaPertandinganUtama || ''}
                          onChange={(e) => setLocalTournament({ ...localTournament, ketuaPertandinganUtama: e.target.value })}
                          className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                          placeholder="Nama Ketua Pertandingan"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Logos & Live Preview Column */}
              <div className="space-y-6">
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    Logo Resmi Turnamen
                  </h3>
                  <p className="text-xs text-slate-400">
                    Logo didistribusikan ke seluruh layar gelanggang tanding dan seni.
                  </p>

                  {/* Logo Kiri */}
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">Logo Kiri (IPSI / Penyelenggara)</span>
                      {localTournament.logoKiri && (
                        <button
                          type="button"
                          onClick={() => setLocalTournament({ ...localTournament, logoKiri: null })}
                          className="text-[10px] text-red-400 hover:text-red-300"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                    {localTournament.logoKiri ? (
                      <div className="h-16 flex items-center justify-center bg-slate-900 rounded-lg p-2">
                        <img src={localTournament.logoKiri} alt="Logo Kiri" className="max-h-full object-contain" />
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-16 border border-dashed border-slate-700 hover:border-amber-500 rounded-lg cursor-pointer bg-slate-900/40 transition-colors">
                        <Upload className="w-4 h-4 text-slate-400 mb-1" />
                        <span className="text-[11px] text-slate-400">Unggah Gambar Logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleLogoUpload('kiri', e.target.files[0])}
                        />
                      </label>
                    )}
                  </div>

                  {/* Logo Kanan */}
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">Logo Kanan (Kemenpora / Sponsor)</span>
                      {localTournament.logoKanan && (
                        <button
                          type="button"
                          onClick={() => setLocalTournament({ ...localTournament, logoKanan: null })}
                          className="text-[10px] text-red-400 hover:text-red-300"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                    {localTournament.logoKanan ? (
                      <div className="h-16 flex items-center justify-center bg-slate-900 rounded-lg p-2">
                        <img src={localTournament.logoKanan} alt="Logo Kanan" className="max-h-full object-contain" />
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-16 border border-dashed border-slate-700 hover:border-amber-500 rounded-lg cursor-pointer bg-slate-900/40 transition-colors">
                        <Upload className="w-4 h-4 text-slate-400 mb-1" />
                        <span className="text-[11px] text-slate-400">Unggah Gambar Logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleLogoUpload('kanan', e.target.files[0])}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Banner Preview Card */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-amber-500/30 rounded-2xl p-4 shadow-xl">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-400" />
                    Preview Tampilan di Gelanggang
                  </div>
                  <div className="bg-black/60 p-4 rounded-xl border border-slate-800 text-center">
                    <h4 className="text-sm font-extrabold text-white tracking-wide uppercase">
                      {localTournament.namaEvent}
                    </h4>
                    {localTournament.subJudul && (
                      <p className="text-xs text-amber-300 font-medium mt-0.5">{localTournament.subJudul}</p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-2">
                      {localTournament.lokasi || 'Padepokan Silat'} • {localTournament.tingkatKejuaraan}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: MASTER WASIT & JURI */}
        {/* =================================================================== */}
        {activeTab === 'referees' && (
          <div className="space-y-6">
            {/* Top Stat Summary & Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Wasit / Juri</span>
                <p className="text-xl font-bold text-white mt-1">{localReferees.length}</p>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
                <span className="text-[11px] font-semibold text-emerald-400 uppercase">Status Aktif</span>
                <p className="text-xl font-bold text-emerald-400 mt-1">
                  {localReferees.filter(r => r.status === 'aktif').length}
                </p>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
                <span className="text-[11px] font-semibold text-amber-400 uppercase">Lisensi Nasional+</span>
                <p className="text-xl font-bold text-amber-400 mt-1">
                  {localReferees.filter(r => r.lisensi === 'Internasional' || r.lisensi === 'Nasional 1').length}
                </p>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
                <span className="text-[11px] font-semibold text-blue-400 uppercase">Pengprov Terwakili</span>
                <p className="text-xl font-bold text-blue-400 mt-1">
                  {new Set(localReferees.map(r => r.pengprov)).size}
                </p>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="flex-1 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchRefQuery}
                    onChange={(e) => setSearchRefQuery(e.target.value)}
                    placeholder="Cari nama wasit, no KTA, atau Pengprov..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex gap-2">
                  <select
                    value={filterLisensi}
                    onChange={(e) => setFilterLisensi(e.target.value)}
                    className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Semua">Semua Lisensi</option>
                    <option value="Internasional">Internasional</option>
                    <option value="Nasional 1">Nasional 1</option>
                    <option value="Nasional 2">Nasional 2</option>
                    <option value="Daerah">Daerah</option>
                  </select>

                  <select
                    value={filterKategori}
                    onChange={(e) => setFilterKategori(e.target.value)}
                    className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Semua">Semua Tugas</option>
                    <option value="Tanding">Tanding</option>
                    <option value="Seni">Seni (TGR)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  id="add-referee-btn"
                  onClick={handleOpenAddReferee}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Wasit Baru
                </button>
              </div>
            </div>

            {/* Referees Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4 font-bold">Nama & Gelar</th>
                      <th className="py-3 px-4 font-bold">No. Registrasi / KTA</th>
                      <th className="py-3 px-4 font-bold">Lisensi</th>
                      <th className="py-3 px-4 font-bold">Pengprov / Asal</th>
                      <th className="py-3 px-4 font-bold">Tugas</th>
                      <th className="py-3 px-4 font-bold">Status</th>
                      <th className="py-3 px-4 font-bold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredReferees.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          Tidak ada data wasit/juri yang sesuai dengan pencarian atau filter.
                        </td>
                      </tr>
                    ) : (
                      filteredReferees.map((ref) => (
                        <tr key={ref.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white text-sm">{ref.nama}</div>
                            {ref.catatan && <div className="text-[11px] text-slate-400">{ref.catatan}</div>}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                            {ref.nomorRegistrasi || '-'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                ref.lisensi === 'Internasional'
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : ref.lisensi === 'Nasional 1'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : ref.lisensi === 'Nasional 2'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  : 'bg-slate-700/50 text-slate-300'
                              }`}
                            >
                              {ref.lisensi}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-200">{ref.pengprov}</td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 bg-slate-800 rounded text-[10px] text-slate-300">
                              {ref.kategoriTugas}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                                ref.status === 'aktif'
                                  ? 'text-emerald-400'
                                  : ref.status === 'cadangan'
                                  ? 'text-amber-400'
                                  : 'text-slate-400'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  ref.status === 'aktif'
                                    ? 'bg-emerald-400'
                                    : ref.status === 'cadangan'
                                    ? 'bg-amber-400'
                                    : 'bg-slate-400'
                                }`}
                              />
                              {ref.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditReferee(ref)}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                                title="Edit Wasit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteReferee(ref.id, ref.nama)}
                                className="p-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-200 rounded-lg transition-colors cursor-pointer"
                                title="Hapus Wasit"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal: Add or Edit Referee */}
            {showRefModal && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
                <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 relative">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-amber-400" />
                      {editingReferee ? 'Edit Data Wasit / Juri' : 'Tambah Wasit / Juri Baru'}
                    </h3>
                    <button
                      onClick={() => setShowRefModal(false)}
                      className="text-slate-400 hover:text-white p-1 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveRefereeModal} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Nama Lengkap & Gelar <span className="text-amber-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={refForm.nama || ''}
                        onChange={(e) => setRefForm({ ...refForm, nama: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                        placeholder="e.g. Dr. H. Suwandi, M.Pd"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Lisensi Resmi
                        </label>
                        <select
                          value={refForm.lisensi || 'Nasional 1'}
                          onChange={(e: any) => setRefForm({ ...refForm, lisensi: e.target.value })}
                          className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                        >
                          <option value="Internasional">Internasional (PERSILAT)</option>
                          <option value="Nasional 1">Wasit Juri Nasional 1</option>
                          <option value="Nasional 2">Wasit Juri Nasional 2</option>
                          <option value="Daerah">Wasit Juri Daerah</option>
                          <option value="Kader">Kader / Magang</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Pengprov / Daerah Asal
                        </label>
                        <input
                          type="text"
                          required
                          value={refForm.pengprov || ''}
                          onChange={(e) => setRefForm({ ...refForm, pengprov: e.target.value })}
                          className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                          placeholder="e.g. Jawa Barat, DKI, dsb"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Kategori Tugas
                        </label>
                        <select
                          value={refForm.kategoriTugas || 'Semua'}
                          onChange={(e: any) => setRefForm({ ...refForm, kategoriTugas: e.target.value })}
                          className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                        >
                          <option value="Semua">Semua (Tanding & Seni)</option>
                          <option value="Tanding">Khusus Tanding</option>
                          <option value="Seni">Khusus Seni (TGR)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Status Kesiapan
                        </label>
                        <select
                          value={refForm.status || 'aktif'}
                          onChange={(e: any) => setRefForm({ ...refForm, status: e.target.value })}
                          className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                        >
                          <option value="aktif">Aktif Bertugas</option>
                          <option value="cadangan">Wasit Cadangan</option>
                          <option value="istirahat">Istirahat / Rotasi</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          No. KTA / Registrasi IPSI
                        </label>
                        <input
                          type="text"
                          value={refForm.nomorRegistrasi || ''}
                          onChange={(e) => setRefForm({ ...refForm, nomorRegistrasi: e.target.value })}
                          className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                          placeholder="e.g. WJ-NAS1-1029"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          No. Telepon / WhatsApp
                        </label>
                        <input
                          type="text"
                          value={refForm.telepon || ''}
                          onChange={(e) => setRefForm({ ...refForm, telepon: e.target.value })}
                          className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                          placeholder="0812-xxxx-xxxx"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Catatan Khusus
                      </label>
                      <input
                        type="text"
                        value={refForm.catatan || ''}
                        onChange={(e) => setRefForm({ ...refForm, catatan: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                        placeholder="e.g. Koordinator Matras Utama, Dewan Hakim"
                      />
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setShowRefModal(false)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20 cursor-pointer"
                      >
                        {editingReferee ? 'Perbarui Wasit' : 'Simpan Wasit'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: PENUGASAN GELANGGANG */}
        {/* =================================================================== */}
        {activeTab === 'assignments' && (
          <div className="space-y-6">
            {/* Arena Selection Bar */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Pilih Gelanggang:
                </span>
                <div className="flex gap-2">
                  {arenasList.map((arena) => (
                    <button
                      key={arena.id}
                      onClick={() => {
                        setSelectedArenaForAssign(arena.id);
                        if (onSelectArena) onSelectArena(arena.id);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedArenaForAssign === arena.id
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'bg-slate-950 border border-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      {arena.nama} ({arena.modeAktif === 'seni' ? 'Seni' : 'Tanding'})
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="auto-assign-btn"
                  onClick={handleAutoAssign}
                  className="px-3.5 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 hover:text-blue-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Rotasi Wasit Otomatis"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Rotasi Otomatis
                </button>
                <button
                  id="save-assignment-btn"
                  onClick={handleSaveAssignment}
                  disabled={isSavingAssignment}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingAssignment ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      Terapkan & Simpan
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Matras Layout & Assignment Board */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Assignment Slots */}
              <div className="lg:col-span-2 space-y-6">
                {/* General Session / Shift */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                    <LayoutGrid className="w-4 h-4 text-amber-400" />
                    Penugasan Pimpinan Gelanggang & Dewan ({activeAssignment.namaGelanggang})
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Sesi / Shift Tugas
                      </label>
                      <select
                        value={activeAssignment.shift || 'Sesi 1 (Pagi - Siang)'}
                        onChange={(e) => handleUpdateAssignmentField('shift', e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      >
                        <option value="Sesi 1 (Pagi - Siang)">Sesi 1 (Pagi - Siang: 08:00 - 12:00)</option>
                        <option value="Sesi 2 (Siang - Sore)">Sesi 2 (Siang - Sore: 13:00 - 17:30)</option>
                        <option value="Sesi 3 (Malam)">Sesi 3 (Malam: 19:00 - 22:30)</option>
                        <option value="Sepanjang Hari">Sepanjang Hari (All Day)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Status Kesiapan Gelanggang
                      </label>
                      <select
                        value={activeAssignment.status || 'bertugas'}
                        onChange={(e) => handleUpdateAssignmentField('status', e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      >
                        <option value="bertugas">Sedang Bertugas (Siap Memimpin)</option>
                        <option value="siap">Standby / Menunggu Partai</option>
                        <option value="rotasi">Proses Rotasi / Pergantian Shift</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-amber-300 mb-1">
                        Ketua Pertandingan Gelanggang
                      </label>
                      <select
                        value={activeAssignment.ketuaPertandinganId || ''}
                        onChange={(e) => handleUpdateAssignmentField('ketuaPertandinganId', e.target.value || null)}
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-medium focus:outline-none focus:border-amber-500"
                      >
                        <option value="">- Pilih dari Wasit Terdaftar -</option>
                        {localReferees.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.nama} ({r.lisensi} - {r.pengprov})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-amber-300 mb-1">
                        Dewan Wasit / Hakim Juri
                      </label>
                      <select
                        value={activeAssignment.dewanId || ''}
                        onChange={(e) => handleUpdateAssignmentField('dewanId', e.target.value || null)}
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-medium focus:outline-none focus:border-amber-500"
                      >
                        <option value="">- Pilih dari Wasit Terdaftar -</option>
                        {localReferees.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.nama} ({r.lisensi} - {r.pengprov})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* TANDING OFFICIALS */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      Perangkat Pertandingan Kategori TANDING
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 rounded-full">
                      1 Wasit Panggung + 3 Juri Sudut
                    </span>
                  </h3>

                  {/* Wasit Utama */}
                  <div>
                    <label className="block text-xs font-bold text-emerald-300 mb-1">
                      Wasit Utama (Wasit Panggung / Wasit Gelanggang)
                    </label>
                    <select
                      value={activeAssignment.wasitUtamaId || ''}
                      onChange={(e) => handleUpdateAssignmentField('wasitUtamaId', e.target.value || null)}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-medium focus:outline-none focus:border-amber-500"
                    >
                      <option value="">- Pilih Wasit Panggung -</option>
                      {localReferees.filter(r => r.kategoriTugas !== 'Seni').map(r => (
                        <option key={r.id} value={r.id}>
                          {r.nama} ({r.lisensi} - {r.pengprov})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Juri 1, 2, 3 */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Juri Sudut 1
                      </label>
                      <select
                        value={activeAssignment.juri1Id || ''}
                        onChange={(e) => handleUpdateAssignmentField('juri1Id', e.target.value || null)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="">- Pilih Juri 1 -</option>
                        {localReferees.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.nama} ({r.lisensi})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Juri Sudut 2
                      </label>
                      <select
                        value={activeAssignment.juri2Id || ''}
                        onChange={(e) => handleUpdateAssignmentField('juri2Id', e.target.value || null)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="">- Pilih Juri 2 -</option>
                        {localReferees.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.nama} ({r.lisensi})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Juri Sudut 3
                      </label>
                      <select
                        value={activeAssignment.juri3Id || ''}
                        onChange={(e) => handleUpdateAssignmentField('juri3Id', e.target.value || null)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="">- Pilih Juri 3 -</option>
                        {localReferees.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.nama} ({r.lisensi})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Cadangan */}
                  <div className="pt-2">
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Wasit / Juri Cadangan (Standby)
                    </label>
                    <select
                      value={activeAssignment.juriCadanganId || ''}
                      onChange={(e) => handleUpdateAssignmentField('juriCadanganId', e.target.value || null)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                    >
                      <option value="">- Tanpa Cadangan Khusus -</option>
                      {localReferees.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.nama} ({r.lisensi} - {r.pengprov})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* SENI OFFICIALS */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-purple-400" />
                      Perangkat Pertandingan Kategori SENI (TGR & Solo Kreatif)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-950/60 border border-purple-700/60 text-purple-300 rounded-full">
                      5 s/d 10 Juri Penilai
                    </span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5].map((num) => {
                      const key = `juri${num}`;
                      const val = activeAssignment.seniJuriIds?.[key] || '';
                      return (
                        <div key={key} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                          <label className="block text-[10px] font-bold uppercase text-purple-300 mb-1">
                            Juri Seni {num}
                          </label>
                          <select
                            value={val}
                            onChange={(e) => handleUpdateSeniJuri(key, e.target.value || null)}
                            className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                          >
                            <option value="">- Kosong -</option>
                            {localReferees.map(r => (
                              <option key={r.id} value={r.id}>
                                {r.nama} ({r.lisensi})
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Col: Visual Arena Status & Roster Board */}
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-amber-500/30 rounded-2xl p-5 shadow-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      Roster Terpasang di {activeAssignment.namaGelanggang}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-950 border border-emerald-700 text-emerald-300 rounded-full">
                      Siap
                    </span>
                  </div>

                  <div className="space-y-3 font-sans text-xs">
                    <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        Ketua Pertandingan
                      </span>
                      <p className="font-bold text-amber-300 text-sm">
                        {getRefName(activeAssignment.ketuaPertandinganId)}
                      </p>
                    </div>

                    <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        Dewan Wasit / Hakim
                      </span>
                      <p className="font-bold text-slate-200">
                        {getRefName(activeAssignment.dewanId)}
                      </p>
                    </div>

                    <div className="bg-slate-950/80 p-3 rounded-xl border border-emerald-900/60">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-0.5">
                        Wasit Panggung (Utama)
                      </span>
                      <p className="font-bold text-emerald-300">
                        {getRefName(activeAssignment.wasitUtamaId)}
                      </p>
                    </div>

                    <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Juri Sudut Tanding
                      </span>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Juri 1:</span>
                        <span className="font-semibold text-slate-200">{getRefName(activeAssignment.juri1Id)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Juri 2:</span>
                        <span className="font-semibold text-slate-200">{getRefName(activeAssignment.juri2Id)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Juri 3:</span>
                        <span className="font-semibold text-slate-200">{getRefName(activeAssignment.juri3Id)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveAssignment}
                    className="w-full mt-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    Simpan Perubahan Penugasan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: KEAMANAN & AUDIT LOG */}
        {/* =================================================================== */}
        {activeTab === 'security' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Col: Security Settings & Password Change */}
            <div className="space-y-6">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  Ganti Password Administrator
                </h3>

                <form onSubmit={handleChangePassword} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Password Baru
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 4 karakter"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Konfirmasi Password Baru
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ketik ulang password baru"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Simpan Password Baru
                  </button>
                </form>
              </div>

              {/* Reset to Factory Defaults */}
              <div className="bg-slate-900/80 border border-red-900/40 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  Zona Tindakan Kritis
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Mereset data master turnamen, wasit & juri, dan penugasan ke template resmi standar IPSI.
                </p>
                <button
                  onClick={handleResetMasterData}
                  className="w-full py-2.5 bg-red-950/60 hover:bg-red-900/80 border border-red-800 text-red-200 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset Master Data ke Standar IPSI
                </button>
              </div>
            </div>

            {/* Right 2 Cols: Real-time Audit Trail */}
            <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    Jejak Audit Sistem (Audit Log)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Catatan riwayat perubahan data master dan aktivitas administrator.
                  </p>
                </div>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                  {localLogs.length} Entri Tercatat
                </span>
              </div>

              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {localLogs.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">Belum ada riwayat aktivitas.</p>
                ) : (
                  localLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 text-xs flex items-start justify-between gap-3 hover:border-slate-700 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-300 font-mono text-[11px]">
                            [{log.action}]
                          </span>
                          <span className="text-[11px] font-semibold text-slate-300">
                            oleh <span className="text-white">{log.admin}</span>
                          </span>
                        </div>
                        {log.details && (
                          <p className="text-slate-300 text-xs leading-relaxed">{log.details}</p>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0 text-right">
                        {new Date(log.timestamp).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 5: PENYIMPANAN SERVER LOKAL */}
        {/* =================================================================== */}
        {activeTab === 'storage' && (
          <div className="space-y-6">
            {/* 1. Header Overview Card */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                      <HardDrive className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        Penyimpanan Data Server Lokal
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wide flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          Aktif & Tersimpan
                        </span>
                      </h2>
                      <p className="text-xs text-slate-400">
                        Sistem persistensi berkas lokal mandiri: Semua turnamen, wasit, dan penilaian arena disimpan di hard drive server.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    id="admin-storage-refresh-btn"
                    onClick={fetchStorageStatus}
                    disabled={isLoadingStorage}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    title="Segarkan status berkas"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStorage ? 'animate-spin' : ''}`} />
                    <span>Segarkan</span>
                  </button>

                  <button
                    id="admin-storage-save-now-btn"
                    onClick={handleSaveToLocalDisk}
                    disabled={isSavingDisk}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    title="Paksa tulis seluruh data memori ke disk server saat ini juga"
                  >
                    {isSavingDisk ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Menyimpan ke Disk...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Simpan ke Server Sekarang</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Status Metric Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-5 border-t border-slate-800/80 font-mono text-xs">
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/60">
                  <span className="text-[11px] text-slate-400 block font-sans">Direktori Penyimpanan</span>
                  <span className="text-xs font-bold text-amber-300 truncate block mt-1" title={storageStatus?.folderPath || './data'}>
                    📁 {storageStatus?.folderPath || './data'}
                  </span>
                </div>

                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/60">
                  <span className="text-[11px] text-slate-400 block font-sans">Terakhir Disimpan</span>
                  <span className="text-xs font-bold text-emerald-300 block mt-1">
                    {storageStatus?.lastSaved
                      ? new Date(storageStatus.lastSaved).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        }) + ' WIB'
                      : 'Baru saja'}
                  </span>
                </div>

                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/60">
                  <span className="text-[11px] text-slate-400 block font-sans">Frekuensi Auto-Save</span>
                  <span className="text-xs font-bold text-cyan-300 block mt-1">
                    {storageStatus?.saveCount || 1} kali flush
                  </span>
                </div>

                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/60">
                  <span className="text-[11px] text-slate-400 block font-sans">Jumlah Gelanggang</span>
                  <span className="text-xs font-bold text-white block mt-1">
                    {storageStatus?.stats.totalArenas || Object.keys(arenasList).length} Arena Aktif
                  </span>
                </div>
              </div>
            </div>

            {/* 2. File Database Registry Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    Daftar Berkas Basis Data Server Lokal
                  </h3>
                  <p className="text-xs text-slate-400">
                    Berkas JSON terstruktur yang tersimpan secara permanen pada direktori server lokal.
                  </p>
                </div>
                <span className="text-[11px] font-mono text-emerald-300 bg-emerald-950/60 px-3 py-1 rounded-lg border border-emerald-800/60 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Format JSON Terarsip
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Berkas</th>
                      <th className="py-2.5 px-3">Deskripsi Konten</th>
                      <th className="py-2.5 px-3 text-center">Ukuran</th>
                      <th className="py-2.5 px-3 text-center">Data Terdata</th>
                      <th className="py-2.5 px-3">Waktu Diperbarui</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {storageStatus?.files && storageStatus.files.length > 0 ? (
                      storageStatus.files.map((file: StorageFileInfo, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-amber-300 flex items-center gap-2">
                            <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>{file.name}</span>
                          </td>
                          <td className="py-3 px-3 text-slate-300">
                            {file.description}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-200">
                            {file.formattedSize}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-cyan-300">
                            {file.itemCount !== undefined ? `${file.itemCount} item` : '-'}
                          </td>
                          <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                            {file.lastModified ? new Date(file.lastModified).toLocaleString('id-ID') : '-'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 border border-emerald-700/60 text-emerald-300">
                              <CheckCircle2 className="w-3 h-3" />
                              Tersimpan
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-500">
                          Memuat rincian berkas penyimpanan server lokal...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Action Center: Backup, Export, and Restore */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Snapshot & Export */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FolderArchive className="w-4 h-4 text-cyan-400" />
                    Pencadangan Data (Backup Snapshot)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Buat salinan data ber-timestamp atau unduh arsip data turnamen untuk arsip panitia.
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    id="admin-create-backup-btn"
                    onClick={handleCreateLocalBackup}
                    disabled={isCreatingBackup}
                    className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isCreatingBackup ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Membuat Salinan Cadangan...</span>
                      </>
                    ) : (
                      <>
                        <FolderArchive className="w-4 h-4" />
                        <span>Buat Snapshot Cadangan di Server Lokal</span>
                      </>
                    )}
                  </button>

                  <a
                    id="admin-export-db-btn"
                    href="/api/storage/export"
                    download={`silat_backup_${new Date().toISOString().slice(0, 10)}.json`}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>Unduh Arsip Lengkap Database (.JSON)</span>
                  </a>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <span className="text-slate-300 font-semibold block">Lokasi Snapshot di Server:</span>
                  <span className="font-mono text-cyan-300">./data/backups/silat_backup_YYYYMMDD_HHMMSS.json</span>
                </div>
              </div>

              {/* Card 2: Restore from Backup */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Upload className="w-4 h-4 text-amber-400" />
                    Pemulihan Data (Restore Database)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Pulihkan seluruh data pertandingan, wasit, dan turnamen dari berkas cadangan JSON yang valid.
                  </p>
                </div>

                <div className="space-y-3">
                  <label
                    htmlFor="restore-file-input"
                    className="w-full py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:text-amber-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Pilih Berkas Cadangan JSON untuk Dipulihkan</span>
                  </label>
                  <input
                    id="restore-file-input"
                    type="file"
                    accept=".json"
                    onChange={handleRestoreDatabase}
                    className="hidden"
                  />

                  <div className="bg-amber-950/30 border border-amber-800/40 p-3 rounded-xl text-[11px] text-amber-200/90 leading-relaxed flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Perhatian:</strong> Pemulihan data akan menggantikan status turnamen, gelanggang, dan wasit saat ini di server lokal dengan isi berkas backup.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Technical Architecture Callout */}
            <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-3">
                <Server className="w-4 h-4 text-blue-400" />
                Arsitektur Ketahanan Penyimpanan Lokal (Local Persistence Engine)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-400 leading-relaxed">
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/70">
                  <span className="font-bold text-slate-200 block mb-1">🛡️ Penulisan Berkas Atomik</span>
                  Data ditulis ke berkas sementara (.tmp) sebelum diganti secara atomik (`fs.renameSync`). File database tidak akan pernah korup meskipun terjadi mati lampu mendadak.
                </div>
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/70">
                  <span className="font-bold text-slate-200 block mb-1">⚡ Auto-Debounce Non-Blocking</span>
                  Setiap aksi juri, wasit, dan timer dijadwalkan secara pintar (600ms debounce) sehingga I/O server tetap kencang tanpa lag pada perangkat juri.
                </div>
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/70">
                  <span className="font-bold text-slate-200 block mb-1">📶 Offline-First & Mandiri</span>
                  Berjalan 100% pada jaringan lokal (LAN / Router Wi-Fi) di arena pertandingan tanpa perlu koneksi internet cloud eksternal.
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

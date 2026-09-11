/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { MatchState, MatchHistory, TGRState, GelanggangInfo, ArenaSummary } from '../types';
import {
  getActiveSpreadsheetId,
  getAutoSyncEnabled,
  getStoredGoogleToken,
  syncAllMatchResultsToSheets
} from '../services/googleSheetsService';
import {
  isSupabaseConfigured,
  subscribeToSupabaseRealtime,
  syncArenaStateToSupabase,
  getSupabaseAutoSyncEnabled
} from '../services/supabaseService';

export function useSyncState() {
  // Initialize current arena from URL param or localStorage or default 'arena_1'
  const getInitialArenaId = () => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const paramArena = urlParams.get('arena');
      if (paramArena) return paramArena;
      const saved = localStorage.getItem('active_gelanggang_id');
      if (saved) return saved;
    }
    return 'arena_1';
  };

  const [currentArenaId, setCurrentArenaIdState] = useState<string>(getInitialArenaId);
  const [state, setState] = useState<MatchState | null>(null);
  const [tgrState, setTgrState] = useState<TGRState | null>(null);
  const [histories, setHistories] = useState<MatchHistory[]>([]);
  const [arenasList, setArenasList] = useState<GelanggangInfo[]>([
    { id: 'arena_1', nama: 'Gelanggang 1', kode: '1', keterangan: 'Matras 1 - Arena Utama A', modeAktif: 'tanding', status: 'aktif' },
    { id: 'arena_2', nama: 'Gelanggang 2', kode: '2', keterangan: 'Matras 2 - Arena B', modeAktif: 'tanding', status: 'aktif' },
    { id: 'arena_3', nama: 'Gelanggang 3', kode: '3', keterangan: 'Matras 3 - Arena Seni C', modeAktif: 'seni', status: 'aktif' }
  ]);
  const [allArenasSummary, setAllArenasSummary] = useState<ArenaSummary[]>([]);
  const [allArenasMap, setAllArenasMap] = useState<Record<string, { state: MatchState; tgrState: TGRState; histories: MatchHistory[]; info: GelanggangInfo }>>({});
  const [connected, setConnected] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const broadcastRef = useRef<BroadcastChannel | null>(null);
  const currentArenaIdRef = useRef<string>(currentArenaId);
  currentArenaIdRef.current = currentArenaId;

  const selectArena = useCallback((newArenaId: string) => {
    if (!newArenaId) return;
    setCurrentArenaIdState(newArenaId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('active_gelanggang_id', newArenaId);
      // Update URL query param quietly without reloading
      const url = new URL(window.location.href);
      url.searchParams.set('arena', newArenaId);
      window.history.replaceState({}, '', url.toString());
    }

    // If we already have the arena data locally in allArenasMap, switch immediately
    if (allArenasMap[newArenaId]) {
      setState(allArenasMap[newArenaId].state);
      setTgrState(allArenasMap[newArenaId].tgrState);
      setHistories(allArenasMap[newArenaId].histories || []);
    } else {
      // Fetch fresh state for this arena
      fetch(`/api/state?arena=${encodeURIComponent(newArenaId)}`)
        .then(res => res.json())
        .then(data => {
          if (data.state) setState(data.state);
          if (data.tgrState) setTgrState(data.tgrState);
          if (data.histories) setHistories(data.histories);
          if (data.arenasList) setArenasList(data.arenasList);
          if (data.allArenasSummary) setAllArenasSummary(data.allArenasSummary);
          if (data.arenas) setAllArenasMap(data.arenas);
        })
        .catch(err => console.warn('Failed to switch arena data:', err));
    }
  }, [allArenasMap]);

  useEffect(() => {
    // Setup local BroadcastChannel for zero-latency cross-tab synchronization
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const channel = new BroadcastChannel('silat_scoring_realtime_sync');
        broadcastRef.current = channel;
        channel.onmessage = (event) => {
          if (event.data && event.data.type === 'LOCAL_STATE_SYNC') {
            if (event.data.arenasList) setArenasList(event.data.arenasList);
            if (event.data.allArenasSummary) setAllArenasSummary(event.data.allArenasSummary);
            if (event.data.arenas) setAllArenasMap(event.data.arenas);

            // If the broadcast is for our current arena or all arenas, update current active view
            const activeId = currentArenaIdRef.current;
            if (event.data.arenaId === activeId || !event.data.arenaId) {
              if (event.data.state) setState(event.data.state);
              if (event.data.tgrState) setTgrState(event.data.tgrState);
              if (event.data.histories) setHistories(event.data.histories);
            } else if (event.data.arenas && event.data.arenas[activeId]) {
              setState(event.data.arenas[activeId].state);
              setTgrState(event.data.arenas[activeId].tgrState);
              setHistories(event.data.arenas[activeId].histories || []);
            }
          }
        };
      } catch (err) {
        console.warn("BroadcastChannel not supported or failed to initialize:", err);
      }
    }

    // Open SSE stream for network real-time syncing tied to currentArenaId
    let isSubscribed = true;
    const connect = () => {
      if (!isSubscribed) return;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const activeId = currentArenaId;
      const ev = new EventSource(`/api/events?arena=${encodeURIComponent(activeId)}`);
      eventSourceRef.current = ev;

      ev.onopen = () => {
        if (isSubscribed) setConnected(true);
      };

      ev.onmessage = (event) => {
        if (!isSubscribed) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'STATE_UPDATE') {
            if (data.arenasList) setArenasList(data.arenasList);
            if (data.allArenasSummary) setAllArenasSummary(data.allArenasSummary);
            if (data.arenas) {
              setAllArenasMap(data.arenas);
            }

            const currentActive = currentArenaIdRef.current;
            if (data.arenas && data.arenas[currentActive]) {
              setState(data.arenas[currentActive].state);
              setTgrState(data.arenas[currentActive].tgrState);
              setHistories(data.arenas[currentActive].histories || []);
            } else {
              if (data.state) setState(data.state);
              if (data.tgrState) setTgrState(data.tgrState);
              if (data.histories) setHistories(data.histories);
            }

            // Also notify local BroadcastChannel
            if (broadcastRef.current) {
              broadcastRef.current.postMessage({
                type: 'LOCAL_STATE_SYNC',
                arenaId: data.arenaId,
                state: data.state,
                tgrState: data.tgrState,
                histories: data.histories,
                arenasList: data.arenasList,
                allArenasSummary: data.allArenasSummary,
                arenas: data.arenas
              });
            }
          }
        } catch (e) {
          console.error("Failed to parse sync state package:", e);
        }
      };

      ev.onerror = () => {
        if (!isSubscribed) return;
        setConnected(false);
        ev.close();
        // Retry connection after delay
        setTimeout(connect, 4000);
      };
    };

    connect();

    // Setup Supabase Realtime subscription if configured
    let unsubSupabase: (() => void) | null = null;
    if (isSupabaseConfigured()) {
      unsubSupabase = subscribeToSupabaseRealtime((arenaId, payload) => {
        if (!isSubscribed) return;
        setConnected(true);
        if (arenaId === currentArenaIdRef.current) {
          if (payload.state) setState(payload.state);
          if (payload.tgrState) setTgrState(payload.tgrState);
        }
        setAllArenasMap(prev => ({
          ...prev,
          [arenaId]: {
            state: payload.state || prev[arenaId]?.state,
            tgrState: payload.tgrState || prev[arenaId]?.tgrState,
            histories: prev[arenaId]?.histories || [],
            info: payload.info || prev[arenaId]?.info
          }
        }));
      });
    }

    return () => {
      isSubscribed = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (broadcastRef.current) {
        broadcastRef.current.close();
      }
      if (unsubSupabase) {
        unsubSupabase();
      }
    };
  }, [currentArenaId]);

  const dispatch = useCallback(async (type: string, payload: any = {}) => {
    try {
      const targetArenaId = payload.arenaId || currentArenaIdRef.current || 'arena_1';
      const bodyPayload = {
        type,
        arenaId: targetArenaId,
        payload: {
          ...payload,
          arenaId: targetArenaId
        }
      };

      let data: any = null;
      try {
        const res = await fetch('/api/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload)
        });
        if (res.ok) {
          data = await res.json();
        }
      } catch (networkErr) {
        console.warn('Backend /api/action unreachable, running in client/Supabase mode:', networkErr);
      }

      if (data && data.success) {
        if (data.arenasList) setArenasList(data.arenasList);
        if (data.allArenasSummary) setAllArenasSummary(data.allArenasSummary);
        if (data.arenas) setAllArenasMap(data.arenas);

        if (targetArenaId === currentArenaIdRef.current) {
          if (data.state) setState(data.state);
          if (data.tgrState) setTgrState(data.tgrState);
          if (data.histories) setHistories(data.histories);
        }

        if (broadcastRef.current) {
          broadcastRef.current.postMessage({
            type: 'LOCAL_STATE_SYNC',
            arenaId: targetArenaId,
            state: data.state,
            tgrState: data.tgrState,
            histories: data.histories || histories,
            arenasList: data.arenasList,
            allArenasSummary: data.allArenasSummary,
            arenas: data.arenas
          });
        }

        // Live Auto-Sync to Supabase when enabled
        if (getSupabaseAutoSyncEnabled() && isSupabaseConfigured() && data.arenas && data.arenas[targetArenaId]) {
          syncArenaStateToSupabase(targetArenaId, data.arenas[targetArenaId]).catch(e => {
            console.warn('Background Supabase sync error:', e);
          });
        }

        // Live Auto-Sync to Google Sheets when match ends or scores are finalized
        const matchEndTypes = [
          'SELESAIKAN_PERTANDINGAN',
          'SAVE_MATCH_HISTORY',
          'SET_WINNER',
          'ADVANCE_WINNER',
          'TGR_SIMPAN_NILAI'
        ];
        if (matchEndTypes.includes(type)) {
          try {
            const autoSync = getAutoSyncEnabled();
            const token = getStoredGoogleToken();
            const spreadsheetId = getActiveSpreadsheetId();
            if (autoSync && token && spreadsheetId && data.arenas) {
              syncAllMatchResultsToSheets(token, spreadsheetId, data.arenas).catch(err => {
                console.warn('Background auto-sync to Google Sheets:', err);
              });
            }
          } catch {
            // Ignore non-blocking background error
          }
        }
      }
      return data || { success: true, localOnly: true };
    } catch (e) {
      console.error(`Failed to dispatch action ${type}:`, e);
      return { success: false, error: e };
    }
  }, [histories]);

  return {
    state,
    histories,
    connected,
    dispatch,
    tgrState,
    currentArenaId,
    selectArena,
    arenasList,
    allArenasSummary,
    allArenasMap
  };
}

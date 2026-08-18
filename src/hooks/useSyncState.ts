/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { MatchState, MatchHistory, TGRState } from '../types';

export function useSyncState() {
  const [state, setState] = useState<MatchState | null>(null);
  const [tgrState, setTgrState] = useState<TGRState | null>(null);
  const [histories, setHistories] = useState<MatchHistory[]>([]);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Open SSE stream
    const connect = () => {
      console.log("Connecting to score sync event stream...");
      const ev = new EventSource('/api/events');
      eventSourceRef.current = ev;

      ev.onopen = () => {
        setConnected(true);
        console.log("Score stream connected successfully.");
      };

      ev.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'STATE_UPDATE') {
            setState(data.state);
            setHistories(data.histories || []);
            if (data.tgrState) {
              setTgrState(data.tgrState);
            }
          }
        } catch (e) {
          console.error("Failed to parse sync state package:", e);
        }
      };

      ev.onerror = (err) => {
        setConnected(false);
        console.warn("Sync connection broke. Retrying in 3 seconds...", err);
        ev.close();
        setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const dispatch = useCallback(async (type: string, payload: any = {}) => {
    try {
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, payload })
      });
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        if (data.state) {
          setState(data.state);
        }
        if (data.tgrState) {
          setTgrState(data.tgrState);
        }
      }
      return data;
    } catch (e) {
      console.error(`Failed to dispatch action ${type}:`, e);
      throw e;
    }
  }, []);

  return { state, histories, connected, dispatch, tgrState };
}

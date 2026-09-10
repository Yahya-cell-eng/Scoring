/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TGRPeserta, TGRPartaiPool } from '../types';
import { separateSeniByContingent } from './contingentDrawing';

export interface SeniPoolGroup {
  poolName: string; // e.g. "Pool A", "Pool B", "Final"
  partaiNumber: number;
  partaiLabel: string;
  kategori: string;
  gender: 'Putra' | 'Putri';
  usia: string;
  babak: string;
  pesertaList: TGRPeserta[];
  isCompleted: boolean;
  isLive: boolean;
}

/**
 * Generate letter label for pool index (0 -> "Pool A", 1 -> "Pool B", etc.)
 */
export function getPoolName(index: number, isFinal: boolean = false): string {
  if (isFinal) return "Pool Final";
  return `Pool ${String.fromCharCode(65 + index)}`;
}

/**
 * Organize Seni Participants into Pool System
 * @param pesertaList Array of all Seni participants
 * @param participantsPerPool Max participants per pool (default 4)
 * @param startPartaiNum Starting partai number for Seni
 */
export function organizeSeniIntoPools(
  pesertaList: TGRPeserta[],
  participantsPerPool: number = 4,
  startPartaiNum: number = 1
): { pools: SeniPoolGroup[]; updatedPesertaList: TGRPeserta[]; partaiPoolList: TGRPartaiPool[] } {
  if (!pesertaList || pesertaList.length === 0) {
    return { pools: [], updatedPesertaList: [], partaiPoolList: [] };
  }

  // 1. Group by category (Kategori + Usia + Gender)
  const categoryGroups = new Map<string, TGRPeserta[]>();
  pesertaList.forEach(p => {
    const key = `${p.kategori || 'Tunggal'}__${p.usia || 'Dewasa'}__${p.gender || 'Putra'}`;
    if (!categoryGroups.has(key)) {
      categoryGroups.set(key, []);
    }
    categoryGroups.get(key)!.push(p);
  });

  const pools: SeniPoolGroup[] = [];
  const updatedPesertaList: TGRPeserta[] = [];
  const partaiPoolList: TGRPartaiPool[] = [];
  let currentPartai = startPartaiNum;

  categoryGroups.forEach((groupPeserta, groupKey) => {
    const [kategori, usia, genderStr] = groupKey.split('__');
    const gender = (genderStr === 'Putri' ? 'Putri' : 'Putra') as 'Putra' | 'Putri';
    const totalInGroup = groupPeserta.length;

    // Distribute participants into pools with contingent separation (same contingent into different pools)
    const separatedPools = separateSeniByContingent(groupPeserta, participantsPerPool);
    const numPools = separatedPools.length;

    for (let poolIdx = 0; poolIdx < numPools; poolIdx++) {
      const isMultiPool = numPools > 1;
      const poolName = isMultiPool ? getPoolName(poolIdx) : 'Pool A';
      const babak = isMultiPool ? 'Penyisihan' : 'Final';
      const partaiNum = currentPartai++;
      const partaiLabel = `Partai ${partaiNum < 10 ? '0' + partaiNum : partaiNum}`;

      const poolParticipants = separatedPools[poolIdx] || [];

      const modifiedPoolParticipants: TGRPeserta[] = poolParticipants.map((p, pIdx) => {
        const noUndian = p.noUndian || pIdx + 1;
        return {
          ...p,
          partai: partaiLabel,
          partaiNumber: partaiNum,
          pool: poolName,
          gender,
          usia,
          kategori,
          noUndian,
          noUrut: updatedPesertaList.length + pIdx + 1
        };
      });

      modifiedPoolParticipants.forEach(p => updatedPesertaList.push(p));

      const isLive = modifiedPoolParticipants.some(p => p.status === 'Sedang Tampil');
      const isCompleted = modifiedPoolParticipants.length > 0 && modifiedPoolParticipants.every(p => p.finalScore !== undefined || p.status === 'Sudah Menilai');

      pools.push({
        poolName,
        partaiNumber: partaiNum,
        partaiLabel,
        kategori,
        gender,
        usia,
        babak,
        pesertaList: modifiedPoolParticipants,
        isCompleted,
        isLive
      });

      partaiPoolList.push({
        id: `pool_${Date.now()}_${poolIdx}_${Math.random().toString(36).substr(2, 4)}`,
        partai: partaiLabel,
        partaiNumber: partaiNum,
        kategori,
        gender,
        usia,
        poolName,
        babak,
        pesertaIds: modifiedPoolParticipants.map(p => p.id),
        status: isLive ? 'live' : isCompleted ? 'selesai' : 'terjadwal'
      });
    }
  });

  return { pools, updatedPesertaList, partaiPoolList };
}

/**
 * Advance Top Qualifiers from Preliminary Pools into Final Pool
 * @param currentPesertaList Current participants with scores
 * @param topN Number of top athletes per pool to advance (e.g. 1 or 2)
 */
export function createFinalPoolFromQualifiers(
  currentPesertaList: TGRPeserta[],
  topN: number = 2,
  finalPartaiNum?: number
): { finalPool: SeniPoolGroup; newParticipants: TGRPeserta[] } {
  // Sort each pool's participants by ranking or finalScore descending
  const poolMap = new Map<string, TGRPeserta[]>();
  currentPesertaList.forEach(p => {
    const pool = p.pool || 'Pool A';
    if (!poolMap.has(pool)) poolMap.set(pool, []);
    poolMap.get(pool)!.push(p);
  });

  const qualifiers: TGRPeserta[] = [];

  poolMap.forEach((pList, poolName) => {
    // Sort by finalScore desc or ranking asc
    const sorted = [...pList].sort((a, b) => {
      const scoreA = a.finalScore ?? -1;
      const scoreB = b.finalScore ?? -1;
      return scoreB - scoreA;
    });

    const top = sorted.slice(0, topN);
    top.forEach(t => qualifiers.push(t));
  });

  const partaiNumber = finalPartaiNum || Math.max(...currentPesertaList.map(p => p.partaiNumber || 0), 0) + 1;
  const partaiLabel = `Partai ${partaiNumber < 10 ? '0' + partaiNumber : partaiNumber}`;

  const first = qualifiers[0];
  const finalParticipants: TGRPeserta[] = qualifiers.map((q, idx) => ({
    ...q,
    id: `final_${q.id}_${Date.now()}`,
    partai: partaiLabel,
    partaiNumber,
    pool: 'Pool Final',
    noUndian: idx + 1,
    status: 'Belum Menilai',
    scores: {},
    kebenaranScores: {},
    finalScore: undefined,
    ranking: undefined,
    rankingInPartai: undefined
  }));

  const finalPool: SeniPoolGroup = {
    poolName: 'Pool Final',
    partaiNumber,
    partaiLabel,
    kategori: first?.kategori || 'Tunggal',
    gender: first?.gender || 'Putra',
    usia: first?.usia || 'Dewasa',
    babak: 'Final',
    pesertaList: finalParticipants,
    isCompleted: false,
    isLive: false
  };

  return { finalPool, newParticipants: finalParticipants };
}

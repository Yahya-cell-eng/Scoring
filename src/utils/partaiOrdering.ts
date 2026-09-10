/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaganCategory, BaganMatch } from '../types';

export type ReorderStrategy = 'standar_ipsi_babak' | 'per_kategori' | 'per_nomor_saat_ini';

export interface FlattenedMatchInfo {
  catId: string;
  catName: string;
  shortKelas: string;
  gender: 'Putra' | 'Putri';
  match: BaganMatch;
  originalPartai: string;
  numericPartai: number;
  roundRank: number; // 1: 32-besar, 2: 16-besar, 3: perempat, 4: semi, 5: final
}

/**
 * Get numerical rank for round for IPSI tournament progression
 * Earlier rounds have lower rank so they are contested first
 */
export function getRoundProgressionRank(round: string): number {
  switch (round.toLowerCase()) {
    case 'sixtyfourth':
    case 'thirtysecond':
      return 1; // 64 Besar / 32 Besar
    case 'sixteenth':
    case 'eighth':
      return 2; // 16 Besar / 8 Besar
    case 'quarter':
      return 3; // Perempat Final
    case 'semi':
      return 4; // Semi Final
    case 'final':
      return 5; // Final
    default:
      return 3;
  }
}

/**
 * Extract numerical partai number from string (e.g. "Partai 05" -> 5)
 */
export function extractPartaiNumber(partaiStr: string): number {
  if (!partaiStr) return 9999;
  const num = parseInt(partaiStr.replace(/\D/g, ''), 10);
  return isNaN(num) ? 9999 : num;
}

/**
 * Format partai number into standard label (e.g. 5 -> "Partai 05", 12 -> "Partai 12")
 */
export function formatPartaiLabel(num: number, prefix: string = 'Partai '): string {
  const pad = num < 10 ? `0${num}` : String(num);
  return `${prefix}${pad}`;
}

/**
 * Flatten all matches from all categories with metadata
 */
export function flattenAllBaganMatches(categories: BaganCategory[]): FlattenedMatchInfo[] {
  const list: FlattenedMatchInfo[] = [];

  categories.forEach(cat => {
    cat.matches.forEach(m => {
      // Short class abbreviation
      const classMatch = cat.name.match(/Kelas\s+([A-Z0-9]+)/i);
      const letter = classMatch ? classMatch[1] : '';
      const genderTag = cat.gender === 'Putra' ? 'PA' : 'PI';
      const shortKelas = letter ? `${letter} ${genderTag}` : cat.name.substring(0, 10);

      list.push({
        catId: cat.id,
        catName: cat.name,
        shortKelas,
        gender: cat.gender || 'Putra',
        match: { ...m },
        originalPartai: m.partai,
        numericPartai: extractPartaiNumber(m.partai),
        roundRank: getRoundProgressionRank(m.round)
      });
    });
  });

  return list;
}

/**
 * Re-sequence and renumber all matches across all categories
 * @param categories Current categories list
 * @param strategy Ordering algorithm ('standar_ipsi_babak' | 'per_kategori' | 'per_nomor_saat_ini')
 * @param startNumber Starting partai number (default: 1)
 */
export function resequenceAndRenumberCategories(
  categories: BaganCategory[],
  strategy: ReorderStrategy = 'standar_ipsi_babak',
  startNumber: number = 1
): { updatedCategories: BaganCategory[]; orderedMatches: FlattenedMatchInfo[] } {
  if (!categories || categories.length === 0) {
    return { updatedCategories: [], orderedMatches: [] };
  }

  const flattened = flattenAllBaganMatches(categories);

  // Sort based on strategy
  if (strategy === 'standar_ipsi_babak') {
    // Standard IPSI: Preliminary rounds first across all classes -> Quarter Finals -> Semi Finals -> Finals
    flattened.sort((a, b) => {
      // 1. By round progression rank
      if (a.roundRank !== b.roundRank) {
        return a.roundRank - b.roundRank;
      }
      // 2. By category gender / name
      if (a.gender !== b.gender) {
        return a.gender === 'Putra' ? -1 : 1;
      }
      if (a.catName !== b.catName) {
        return a.catName.localeCompare(b.catName);
      }
      // 3. By match id in category
      return a.match.id - b.match.id;
    });
  } else if (strategy === 'per_kategori') {
    // Group by category, then sort by round in that category
    flattened.sort((a, b) => {
      if (a.catId !== b.catId) {
        const catIdxA = categories.findIndex(c => c.id === a.catId);
        const catIdxB = categories.findIndex(c => c.id === b.catId);
        return catIdxA - catIdxB;
      }
      return a.roundRank - b.roundRank || a.match.id - b.match.id;
    });
  } else if (strategy === 'per_nomor_saat_ini') {
    // Preserve current numeric order, just clean up gaps & duplicates
    flattened.sort((a, b) => {
      return a.numericPartai - b.numericPartai || a.roundRank - b.roundRank;
    });
  }

  // Create a map from (catId_matchId) to new assigned partai string
  const newPartaiMap = new Map<string, string>();
  let currentNum = startNumber;

  flattened.forEach(item => {
    const newPartaiStr = formatPartaiLabel(currentNum);
    item.match.partai = newPartaiStr;
    item.numericPartai = currentNum;
    newPartaiMap.set(`${item.catId}_${item.match.id}`, newPartaiStr);
    currentNum++;
  });

  // Apply new partai numbers to categories
  const updatedCategories: BaganCategory[] = categories.map(cat => {
    const updatedMatches = cat.matches.map(m => {
      const newPartai = newPartaiMap.get(`${cat.id}_${m.id}`);
      return {
        ...m,
        partai: newPartai || m.partai
      };
    });

    return {
      ...cat,
      matches: updatedMatches
    };
  });

  return {
    updatedCategories,
    orderedMatches: flattened
  };
}

/**
 * Move a specific match up or down in the schedule order and renumber
 */
export function reorderSingleMatch(
  categories: BaganCategory[],
  uniqueId: string, // "catId_matchId"
  direction: 'up' | 'down',
  currentOrderedList: FlattenedMatchInfo[]
): { updatedCategories: BaganCategory[]; orderedMatches: FlattenedMatchInfo[] } {
  const index = currentOrderedList.findIndex(
    item => `${item.catId}_${item.match.id}` === uniqueId
  );

  if (index === -1) {
    return { updatedCategories: categories, orderedMatches: currentOrderedList };
  }

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= currentOrderedList.length) {
    return { updatedCategories: categories, orderedMatches: currentOrderedList };
  }

  // Swap in ordered list
  const newList = [...currentOrderedList];
  const temp = newList[index];
  newList[index] = newList[targetIndex];
  newList[targetIndex] = temp;

  // Renumber sequentially
  const newPartaiMap = new Map<string, string>();
  newList.forEach((item, idx) => {
    const newNum = idx + 1;
    const newPartaiStr = formatPartaiLabel(newNum);
    item.match.partai = newPartaiStr;
    item.numericPartai = newNum;
    newPartaiMap.set(`${item.catId}_${item.match.id}`, newPartaiStr);
  });

  // Apply to categories
  const updatedCategories: BaganCategory[] = categories.map(cat => {
    const updatedMatches = cat.matches.map(m => {
      const newPartai = newPartaiMap.get(`${cat.id}_${m.id}`);
      return {
        ...m,
        partai: newPartai || m.partai
      };
    });

    return {
      ...cat,
      matches: updatedMatches
    };
  });

  return {
    updatedCategories,
    orderedMatches: newList
  };
}

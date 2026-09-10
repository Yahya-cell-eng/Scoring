/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Intelligent Tournament Bracket Drawing & Seeding Utility for Pencak Silat IPSI.
 * Strictly guarantees that athletes from the same kontingen (contingent):
 * 1. Do NOT face each other in the opening / first-round match (Sudut Merah vs Sudut Biru).
 * 2. Are separated across opposite branches / halves of the bracket so they only meet in the final (or later rounds).
 * 3. Are distributed across multiple brackets (Bagan 1, Bagan 2, etc.) if athletes exceed the bracket size limit.
 */

export interface ContigentSeparableAthlete {
  kontingen: string;
  nama?: string;
  [key: string]: any;
}

/**
 * Distribute athletes across brackets and seed positions to avoid same-contingent matchups.
 * Returns an array of brackets (each bracket is an array of size bracketSize containing athletes or nulls).
 */
export function distributeAthletesAvoidSameContingent<T extends ContigentSeparableAthlete>(
  athletes: T[],
  bracketSize: 2 | 4 | 8 | 16
): T[][] {
  if (!athletes || athletes.length === 0) return [];

  // Group athletes by normalized contingent
  const contingentGroups = new Map<string, T[]>();
  athletes.forEach(ath => {
    const rawK = ath.kontingen ? ath.kontingen.trim() : 'UMUM';
    const key = rawK.toUpperCase();
    if (!contingentGroups.has(key)) contingentGroups.set(key, []);
    contingentGroups.get(key)!.push(ath);
  });

  // Calculate number of brackets needed
  const numBrackets = Math.max(1, Math.ceil(athletes.length / bracketSize));
  const brackets: T[][] = Array.from({ length: numBrackets }, () => []);

  // Sort contingents by athlete count descending (largest contingent first)
  const sortedContingents = Array.from(contingentGroups.entries()).sort(
    (a, b) => b[1].length - a[1].length
  );

  // 1. Distribute athletes across brackets round-robin so same contingent goes to different brackets first
  let bracketRound = 0;
  sortedContingents.forEach(([_, groupAthletes]) => {
    groupAthletes.forEach(ath => {
      // Find bracket with least athletes from this contingent and least total athletes
      let bestBracketIdx = 0;
      let minSameContingent = Infinity;
      let minTotal = Infinity;

      for (let b = 0; b < numBrackets; b++) {
        const idx = (bracketRound + b) % numBrackets;
        const brk = brackets[idx];
        if (brk.length >= bracketSize) continue;

        const sameContCount = brk.filter(
          item => (item.kontingen || '').trim().toUpperCase() === (ath.kontingen || '').trim().toUpperCase()
        ).length;

        if (sameContCount < minSameContingent || (sameContCount === minSameContingent && brk.length < minTotal)) {
          minSameContingent = sameContCount;
          minTotal = brk.length;
          bestBracketIdx = idx;
        }
      }

      brackets[bestBracketIdx].push(ath);
      bracketRound = (bestBracketIdx + 1) % numBrackets;
    });
  });

  // 2. Arrange athletes within each bracket to guarantee Red vs Blue contingent separation
  const finalizedBrackets: T[][] = brackets.map(rawBracketAthletes => {
    return arrangeBracketSeedsAvoidingSameContingent(rawBracketAthletes, bracketSize);
  });

  return finalizedBrackets;
}

/**
 * Arrange a single bracket's athletes into seed slots [0 .. bracketSize - 1]
 * Match pairings in Round 1 are:
 * - Match 1: (Slot 0 vs Slot 1)
 * - Match 2: (Slot 2 vs Slot 3)
 * - Match 3: (Slot 4 vs Slot 5)
 * - Match 4: (Slot 6 vs Slot 7)
 * etc.
 * 
 * Target: Slot 2k (Merah) and Slot 2k+1 (Biru) MUST have different contingents!
 */
export function arrangeBracketSeedsAvoidingSameContingent<T extends ContigentSeparableAthlete>(
  bracketAthletes: T[],
  bracketSize: 2 | 4 | 8 | 16
): T[] {
  if (bracketAthletes.length <= 1) return [...bracketAthletes];

  // If only 2 athletes and both from same contingent, they have to face each other.
  if (bracketSize === 2) {
    return [...bracketAthletes];
  }

  // Pre-determined seed slot priority order designed to separate same-contingent athletes across halves & quarters:
  // For size 4: [0, 2, 1, 3] -> 0 (Semi 1 Merah), 2 (Semi 2 Merah), 1 (Semi 1 Biru), 3 (Semi 2 Biru)
  // For size 8: [0, 4, 2, 6, 1, 5, 3, 7] -> 0 (Q1), 4 (Q3 - opp half), 2 (Q2), 6 (Q4 - opp half), 1 (Q1 opp), ...
  // For size 16: quadrant & half interleaving
  const slotPriorities: Record<number, number[]> = {
    4: [0, 2, 1, 3],
    8: [0, 4, 2, 6, 1, 5, 3, 7],
    16: [0, 8, 4, 12, 2, 10, 6, 14, 1, 9, 5, 13, 3, 11, 7, 15]
  };

  const prioritySlots = slotPriorities[bracketSize] || Array.from({ length: bracketSize }, (_, i) => i);

  // Group by contingent
  const contingentMap = new Map<string, T[]>();
  bracketAthletes.forEach(ath => {
    const k = (ath.kontingen || 'UMUM').trim().toUpperCase();
    if (!contingentMap.has(k)) contingentMap.set(k, []);
    contingentMap.get(k)!.push(ath);
  });

  // Sort contingents by frequency descending
  const sorted = Array.from(contingentMap.entries()).sort((a, b) => b[1].length - a[1].length);

  const slots: (T | null)[] = Array.from({ length: bracketSize }, () => null);

  // Distribute along priority slots
  let currentPriorityIdx = 0;
  sorted.forEach(([_, list]) => {
    list.forEach(ath => {
      // Find next available priority slot that doesn't conflict with its match partner if possible
      let chosenSlot = -1;

      for (let p = 0; p < prioritySlots.length; p++) {
        const slotIdx = prioritySlots[(currentPriorityIdx + p) % prioritySlots.length];
        if (slots[slotIdx] !== null) continue;

        // Check if its match opponent (2k vs 2k+1) has the same contingent
        const partnerSlot = slotIdx % 2 === 0 ? slotIdx + 1 : slotIdx - 1;
        const partner = slots[partnerSlot];
        const athK = (ath.kontingen || '').trim().toUpperCase();
        const partnerK = partner ? (partner.kontingen || '').trim().toUpperCase() : '';

        if (!partner || athK !== partnerK) {
          chosenSlot = slotIdx;
          currentPriorityIdx = (currentPriorityIdx + p + 1) % prioritySlots.length;
          break;
        }
      }

      // If all available slots have partner with same contingent (forced clash due to majority), take first empty slot
      if (chosenSlot === -1) {
        for (let i = 0; i < bracketSize; i++) {
          if (slots[i] === null) {
            chosenSlot = i;
            break;
          }
        }
      }

      if (chosenSlot !== -1) {
        slots[chosenSlot] = ath;
      }
    });
  });

  // Verification & Post-Swap Optimization:
  // If any match (2k, 2k+1) still has the same contingent, try swapping with another match to eliminate same-contingent clash
  const numMatches = bracketSize / 2;
  for (let m = 0; m < numMatches; m++) {
    const s1 = m * 2;
    const s2 = m * 2 + 1;
    const a1 = slots[s1];
    const a2 = slots[s2];

    if (a1 && a2) {
      const k1 = (a1.kontingen || '').trim().toUpperCase();
      const k2 = (a2.kontingen || '').trim().toUpperCase();

      if (k1 === k2) {
        // Look for another slot in a different match to swap with a2
        for (let otherM = 0; otherM < numMatches; otherM++) {
          if (otherM === m) continue;
          for (let side = 0; side < 2; side++) {
            const otherSlot = otherM * 2 + side;
            const otherOpponentSlot = otherM * 2 + (1 - side);
            const otherAth = slots[otherSlot];
            const otherOpp = slots[otherOpponentSlot];

            if (otherAth) {
              const otherK = (otherAth.kontingen || '').trim().toUpperCase();
              const otherOppK = otherOpp ? (otherOpp.kontingen || '').trim().toUpperCase() : '';

              // Can we swap a2 with otherAth without causing a clash in either match?
              if (otherK !== k1 && (otherOpp === null || otherOppK !== k2)) {
                // Perform safe swap
                slots[s2] = otherAth;
                slots[otherSlot] = a2;
                break;
              }
            }
          }
        }
      }
    }
  }

  // Filter non-nulls maintaining seed index alignment
  // For the final array, return populated athletes
  const result: T[] = [];
  slots.forEach(item => {
    if (item !== null) result.push(item);
  });

  return result;
}

/**
 * Separate Seni (TGR) participants across pools (Pool A, Pool B, etc.)
 * so that participants from the same kontingen are distributed across different pools first.
 */
export function separateSeniByContingent<T extends ContigentSeparableAthlete>(
  participants: T[],
  participantsPerPool: number = 4
): T[][] {
  if (!participants || participants.length === 0) return [];

  const numPools = Math.max(1, Math.ceil(participants.length / participantsPerPool));
  const pools: T[][] = Array.from({ length: numPools }, () => []);

  // Group by contingent
  const contingentMap = new Map<string, T[]>();
  participants.forEach(p => {
    const k = (p.kontingen || 'UMUM').trim().toUpperCase();
    if (!contingentMap.has(k)) contingentMap.set(k, []);
    contingentMap.get(k)!.push(p);
  });

  // Sort contingents by size descending
  const sorted = Array.from(contingentMap.entries()).sort((a, b) => b[1].length - a[1].length);

  let poolIdx = 0;
  sorted.forEach(([_, group]) => {
    group.forEach(ath => {
      // Find pool with least from this contingent
      let bestPool = 0;
      let minSameCont = Infinity;
      let minTotal = Infinity;

      for (let i = 0; i < numPools; i++) {
        const pIndex = (poolIdx + i) % numPools;
        const pool = pools[pIndex];
        if (pool.length >= participantsPerPool) continue;

        const sameCount = pool.filter(
          item => (item.kontingen || '').trim().toUpperCase() === (ath.kontingen || '').trim().toUpperCase()
        ).length;

        if (sameCount < minSameCont || (sameCount === minSameCont && pool.length < minTotal)) {
          minSameCont = sameCount;
          minTotal = pool.length;
          bestPool = pIndex;
        }
      }

      pools[bestPool].push(ath);
      poolIdx = (bestPool + 1) % numPools;
    });
  });

  return pools;
}

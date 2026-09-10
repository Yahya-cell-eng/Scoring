/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaganCategory, BaganMatch, Athlete } from '../types';

export interface NextMatchTargetInfo {
  targetMatchId: number | null;
  targetPartaiLabel: string;
  targetPartaiNum: number | null;
  targetSide: 'Merah' | 'Biru' | null;
  targetRound: string;
  targetRoundLabel: string;
  isFinal: boolean;
  advancementText: string;
  winnerAdvancementBadge: string;
}

export interface SourceMatchInfo {
  sourceMatchId: number | null;
  sourcePartaiLabel: string;
  sourcePartaiNum: number | null;
  sourceRound: string;
  sourceRoundLabel: string;
  placeholderText: string;
}

/**
 * Get Indonesian round label
 */
export function getRoundLabelIndo(round: string): string {
  switch (round.toLowerCase()) {
    case 'sixtyfourth':
    case 'thirtysecond':
      return 'Babak 32 Besar';
    case 'sixteenth':
    case 'eighth':
      return 'Babak 16 Besar';
    case 'quarter':
      return 'Perempat Final (8 Besar)';
    case 'semi':
      return 'Semi Final';
    case 'final':
      return 'Final (Perebutan Juara 1)';
    default:
      return round;
  }
}

/**
 * Helper to check if a name represents a BYE
 */
export function isByeAthlete(nama?: string): boolean {
  if (!nama) return false;
  const n = nama.trim().toLowerCase();
  return n === 'bye' || n === 'automatic' || n === '—' || n === '-' || n === 'by';
}

/**
 * Get the target destination match and corner for the winner of a given match
 */
export function getNextMatchTarget(
  category: BaganCategory,
  currentMatchId: number
): NextMatchTargetInfo {
  const size = category.size || 4;
  let targetMatchId: number | null = null;
  let targetSide: 'Merah' | 'Biru' | null = null;
  let isFinal = false;

  if (size === 2) {
    isFinal = true;
  } else if (size === 4) {
    if (currentMatchId === 1) {
      targetMatchId = 3;
      targetSide = 'Merah';
    } else if (currentMatchId === 2) {
      targetMatchId = 3;
      targetSide = 'Biru';
    } else if (currentMatchId === 3) {
      isFinal = true;
    }
  } else if (size === 8) {
    if (currentMatchId === 1) {
      targetMatchId = 5;
      targetSide = 'Merah';
    } else if (currentMatchId === 2) {
      targetMatchId = 5;
      targetSide = 'Biru';
    } else if (currentMatchId === 3) {
      targetMatchId = 6;
      targetSide = 'Merah';
    } else if (currentMatchId === 4) {
      targetMatchId = 6;
      targetSide = 'Biru';
    } else if (currentMatchId === 5) {
      targetMatchId = 7;
      targetSide = 'Merah';
    } else if (currentMatchId === 6) {
      targetMatchId = 7;
      targetSide = 'Biru';
    } else if (currentMatchId === 7) {
      isFinal = true;
    }
  } else if (size === 16) {
    // 16-size bracket:
    // Matches 1-8 -> Matches 9-12 (Quarter)
    if (currentMatchId === 1) { targetMatchId = 9; targetSide = 'Merah'; }
    else if (currentMatchId === 2) { targetMatchId = 9; targetSide = 'Biru'; }
    else if (currentMatchId === 3) { targetMatchId = 10; targetSide = 'Merah'; }
    else if (currentMatchId === 4) { targetMatchId = 10; targetSide = 'Biru'; }
    else if (currentMatchId === 5) { targetMatchId = 11; targetSide = 'Merah'; }
    else if (currentMatchId === 6) { targetMatchId = 11; targetSide = 'Biru'; }
    else if (currentMatchId === 7) { targetMatchId = 12; targetSide = 'Merah'; }
    else if (currentMatchId === 8) { targetMatchId = 12; targetSide = 'Biru'; }
    // Matches 9-12 -> Matches 13-14 (Semi)
    else if (currentMatchId === 9) { targetMatchId = 13; targetSide = 'Merah'; }
    else if (currentMatchId === 10) { targetMatchId = 13; targetSide = 'Biru'; }
    else if (currentMatchId === 11) { targetMatchId = 14; targetSide = 'Merah'; }
    else if (currentMatchId === 12) { targetMatchId = 14; targetSide = 'Biru'; }
    // Matches 13-14 -> Match 15 (Final)
    else if (currentMatchId === 13) { targetMatchId = 15; targetSide = 'Merah'; }
    else if (currentMatchId === 14) { targetMatchId = 15; targetSide = 'Biru'; }
    else if (currentMatchId === 15) { isFinal = true; }
  }

  if (isFinal) {
    return {
      targetMatchId: null,
      targetPartaiLabel: 'Final',
      targetPartaiNum: null,
      targetSide: null,
      targetRound: 'final',
      targetRoundLabel: 'Babak Final',
      isFinal: true,
      advancementText: '🏆 Perebutan Juara 1 & 2',
      winnerAdvancementBadge: '🏆 JUARA 1'
    };
  }

  if (targetMatchId !== null) {
    const targetMatch = category.matches.find(m => m.id === targetMatchId);
    const targetPartaiLabel = targetMatch?.partai || `Partai TBD`;
    const num = parseInt(targetPartaiLabel.replace(/\D/g, ''), 10);
    const targetPartaiNum = isNaN(num) ? null : num;
    const targetRound = targetMatch?.round || 'semi';
    const targetRoundLabel = getRoundLabelIndo(targetRound);

    const sideText = targetSide === 'Merah' ? 'Sudut Merah' : 'Sudut Biru';
    const cleanLabel = targetPartaiNum ? `Partai ${targetPartaiNum}` : targetPartaiLabel;

    return {
      targetMatchId,
      targetPartaiLabel: cleanLabel,
      targetPartaiNum,
      targetSide,
      targetRound,
      targetRoundLabel,
      isFinal: targetRound === 'final',
      advancementText: `Pemenang maju ke ${cleanLabel} (${sideText})`,
      winnerAdvancementBadge: `Lolos ke ${cleanLabel} (${sideText})`
    };
  }

  return {
    targetMatchId: null,
    targetPartaiLabel: '',
    targetPartaiNum: null,
    targetSide: null,
    targetRound: '',
    targetRoundLabel: '',
    isFinal: false,
    advancementText: '',
    winnerAdvancementBadge: ''
  };
}

/**
 * Get the source matches providing participants to a target match
 */
export function getPreviousSourceMatches(
  category: BaganCategory,
  targetMatchId: number
): { merahSource: SourceMatchInfo | null; biruSource: SourceMatchInfo | null } {
  const size = category.size || 4;
  let merahSourceId: number | null = null;
  let biruSourceId: number | null = null;

  if (size === 4) {
    if (targetMatchId === 3) {
      merahSourceId = 1;
      biruSourceId = 2;
    }
  } else if (size === 8) {
    if (targetMatchId === 5) {
      merahSourceId = 1;
      biruSourceId = 2;
    } else if (targetMatchId === 6) {
      merahSourceId = 3;
      biruSourceId = 4;
    } else if (targetMatchId === 7) {
      merahSourceId = 5;
      biruSourceId = 6;
    }
  } else if (size === 16) {
    if (targetMatchId === 9) { merahSourceId = 1; biruSourceId = 2; }
    else if (targetMatchId === 10) { merahSourceId = 3; biruSourceId = 4; }
    else if (targetMatchId === 11) { merahSourceId = 5; biruSourceId = 6; }
    else if (targetMatchId === 12) { merahSourceId = 7; biruSourceId = 8; }
    else if (targetMatchId === 13) { merahSourceId = 9; biruSourceId = 10; }
    else if (targetMatchId === 14) { merahSourceId = 11; biruSourceId = 12; }
    else if (targetMatchId === 15) { merahSourceId = 13; biruSourceId = 14; }
  }

  const buildSourceInfo = (srcId: number | null): SourceMatchInfo | null => {
    if (!srcId) return null;
    const match = category.matches.find(m => m.id === srcId);
    if (!match) return null;

    const num = parseInt((match.partai || '').replace(/\D/g, ''), 10);
    const pLabel = !isNaN(num) ? `Partai ${num}` : match.partai || `Partai #${srcId}`;
    const rLabel = getRoundLabelIndo(match.round);

    return {
      sourceMatchId: srcId,
      sourcePartaiLabel: pLabel,
      sourcePartaiNum: isNaN(num) ? null : num,
      sourceRound: match.round,
      sourceRoundLabel: rLabel,
      placeholderText: `Pemenang ${pLabel} (${rLabel})`
    };
  };

  return {
    merahSource: buildSourceInfo(merahSourceId),
    biruSource: buildSourceInfo(biruSourceId)
  };
}

/**
 * Propagates match winners through the bracket automatically.
 * When match 1 is won by Red, Red's athlete immediately populates Match 3 (Sudut Merah) in a 4-bracket.
 */
export function propagateBracketWithAutoAdvance(
  initialMatches: BaganMatch[],
  size: number
): BaganMatch[] {
  const updated: BaganMatch[] = initialMatches.map(m => ({
    ...m,
    atletMerah: { ...m.atletMerah },
    atletBiru: { ...m.atletBiru },
    winner: m.winner
  }));

  const numInitialMatches = size / 2;

  // Clear all downstream matches (beyond round 1) first
  for (let i = numInitialMatches; i < updated.length; i++) {
    updated[i].atletMerah = { nama: '', kontingen: '' };
    updated[i].atletBiru = { nama: '', kontingen: '' };
    updated[i].winner = null;
  }

  // Iterate through matches in topological sequence
  for (let i = 0; i < updated.length; i++) {
    const match = updated[i];
    const matchId = match.id;

    const mNama = match.atletMerah.nama;
    const bNama = match.atletBiru.nama;

    // Automatic win if one side is BYE
    if (mNama && !isByeAthlete(mNama) && isByeAthlete(bNama)) {
      match.winner = 'merah';
    } else if (bNama && !isByeAthlete(bNama) && isByeAthlete(mNama)) {
      match.winner = 'biru';
    }

    const winner = match.winner;
    const advAthlete: Athlete = winner === 'merah'
      ? { ...match.atletMerah }
      : winner === 'biru'
      ? { ...match.atletBiru }
      : { nama: '', kontingen: '' };

    if (size === 4) {
      if (matchId === 1) updated[2].atletMerah = advAthlete;
      else if (matchId === 2) updated[2].atletBiru = advAthlete;
    } else if (size === 8) {
      if (matchId === 1) updated[4].atletMerah = advAthlete;
      else if (matchId === 2) updated[4].atletBiru = advAthlete;
      else if (matchId === 3) updated[5].atletMerah = advAthlete;
      else if (matchId === 4) updated[5].atletBiru = advAthlete;
      else if (matchId === 5) updated[6].atletMerah = advAthlete;
      else if (matchId === 6) updated[6].atletBiru = advAthlete;
    } else if (size === 16) {
      // Matches 1-8 -> 9-12 (indices 8-11)
      if (matchId === 1) updated[8].atletMerah = advAthlete;
      else if (matchId === 2) updated[8].atletBiru = advAthlete;
      else if (matchId === 3) updated[9].atletMerah = advAthlete;
      else if (matchId === 4) updated[9].atletBiru = advAthlete;
      else if (matchId === 5) updated[10].atletMerah = advAthlete;
      else if (matchId === 6) updated[10].atletBiru = advAthlete;
      else if (matchId === 7) updated[11].atletMerah = advAthlete;
      else if (matchId === 8) updated[11].atletBiru = advAthlete;
      // Matches 9-12 -> 13-14 (indices 12-13)
      else if (matchId === 9) updated[12].atletMerah = advAthlete;
      else if (matchId === 10) updated[12].atletBiru = advAthlete;
      else if (matchId === 11) updated[13].atletMerah = advAthlete;
      else if (matchId === 12) updated[13].atletBiru = advAthlete;
      // Matches 13-14 -> 15 (index 14)
      else if (matchId === 13) updated[14].atletMerah = advAthlete;
      else if (matchId === 14) updated[14].atletBiru = advAthlete;
    }
  }

  return updated;
}

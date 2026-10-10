/**
 * ROOMIE · Dimension Comparison Algorithms
 * Pure mathematical scoring functions for questionnaire dimensions.
 */
import {
  MAX_TIME_GAP_HOURS,
  Q14_NOISE_EMISSION_WEIGHTS,
  Q22_COST_SPLIT_MATRIX,
  DIRECTIONAL_WEAKEST_LINK_WEIGHT,
} from "./constants";

export interface DirectionalResult {
  score: number; // 0 to 100, unrounded
  sAB: number; // 0 to 100: how well B satisfies A
  sBA: number; // 0 to 100: how well A satisfies B
  shortfallAB: number; // max(0, demandA - toleranceB), 0 to 4
  shortfallBA: number; // max(0, demandB - toleranceA), 0 to 4
}

/**
 * I.1 Ordinal scale comparison (SYM):
 * similarity = 1 - |a - b| / 4
 * returns 0 to 100
 */
export function calcSymmetricOrdinal(valA: number, valB: number): number {
  const diff = Math.abs(valA - valB);
  const similarity = Math.max(0, 1 - diff / 4);
  return similarity * 100;
}

/**
 * I.2 Time-based comparison (TIME) for Q11 & Q12:
 * Maps option IDs to continuous clock hours and compares difference.
 * similarity = max(0, 1 - deltaHours / 4)
 * returns 0 to 100
 */
export function calcTimeScore(
  optA: number,
  optB: number,
  hoursMap: Record<number, number>,
  maxGapHours: number = MAX_TIME_GAP_HOURS
): number {
  const hourA = hoursMap[optA];
  const hourB = hoursMap[optB];
  if (hourA === undefined || hourB === undefined) {
    return 0;
  }
  const deltaHours = Math.abs(hourA - hourB);
  const similarity = Math.max(0, 1 - deltaHours / maxGapHours);
  return similarity * 100;
}

/**
 * Computes night-noise emission level from Q14 multi-select answers:
 * emission = 1 + 4 * max(w of selected options)
 * returns a level from 1.0 to 4.0 (or up to 5.0 scale)
 */
export function calcNightNoiseEmission(optValues: number[]): number {
  if (!optValues || optValues.length === 0) {
    return 1.0;
  }
  let maxW = 0.0;
  for (const opt of optValues) {
    const w = Q14_NOISE_EMISSION_WEIGHTS[opt] ?? 0.0;
    if (w > maxW) {
      maxW = w;
    }
  }
  return 1.0 + 4.0 * maxW;
}

/**
 * I.3 Jaccard similarity for multi-select (JAC) on Q14:
 * J = |A ∩ B| / |A ∪ B|
 * returns 0 to 100
 */
export function calcJaccardScore(setA: number[], setB: number[]): number {
  const sA = new Set(setA);
  const sB = new Set(setB);
  if (sA.size === 0 && sB.size === 0) {
    return 100;
  }
  let intersectionCount = 0;
  for (const item of sA) {
    if (sB.has(item)) {
      intersectionCount++;
    }
  }
  const unionSet = new Set([...sA, ...sB]);
  if (unionSet.size === 0) {
    return 100;
  }
  return (intersectionCount / unionSet.size) * 100;
}

/**
 * I.4 Categorical cost-split compatibility matrix (MATRIX) for Q22:
 * returns 0 to 100
 */
export function calcMatrixScore(optA: number, optB: number): number {
  const row = Q22_COST_SPLIT_MATRIX[optA];
  if (!row) {
    return 50; // fallback if option not mapped
  }
  const similarity = row[optB] ?? 0.5;
  return similarity * 100;
}

/**
 * Directional comparison (DIR):
 * Evaluates demand vs tolerance in both directions.
 * s_XY = 1 - max(0, demand_X - tolerance_Y) / 4 (surplus tolerance is never penalized)
 * dimension = (1 - w_min) * mean(s_AB, s_BA) + w_min * min(s_AB, s_BA)
 * returns score (0 to 100) and details
 */
export function calcDirectionalScore(
  demandA: number,
  toleranceB: number,
  demandB: number,
  toleranceA: number
): DirectionalResult {
  const shortfallAB = Math.max(0, demandA - toleranceB);
  const sAB = Math.max(0, (1 - shortfallAB / 4) * 100);

  const shortfallBA = Math.max(0, demandB - toleranceA);
  const sBA = Math.max(0, (1 - shortfallBA / 4) * 100);

  const mean = (sAB + sBA) / 2;
  const min = Math.min(sAB, sBA);

  // Weakest-link blend: 0.5 * mean + 0.5 * min
  const wMin = DIRECTIONAL_WEAKEST_LINK_WEIGHT;
  const score = (1 - wMin) * mean + wMin * min;

  return {
    score,
    sAB,
    sBA,
    shortfallAB,
    shortfallBA,
  };
}

/**
 * I.5 Joint-positive comparison (JOINT) for Q28 and Q30:
 * Both must score high; if both score low, similarity is low.
 * joint(a, b) = 0.5 * (min(a,b) - 1)/4 + 0.5 * (mean(a,b) - 1)/4
 * returns 0 to 100
 */
export function calcJointPositiveScore(valA: number, valB: number): number {
  const minVal = Math.min(valA, valB);
  const meanVal = (valA + valB) / 2;

  const minPart = Math.max(0, (minVal - 1) / 4);
  const meanPart = Math.max(0, (meanVal - 1) / 4);

  const joint = 0.5 * minPart + 0.5 * meanPart;
  return Math.min(100, Math.max(0, joint * 100));
}

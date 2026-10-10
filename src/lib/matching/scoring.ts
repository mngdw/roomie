/**
 * ROOMIE · Matching Engine Scoring
 * Evaluates individual dimensions, aggregates category scores, and computes final weighted compatibility.
 */
import {
  DIMENSIONS,
  CATEGORY_WEIGHTS,
  CATEGORY_META,
  Q11_BEDTIME_HOURS,
  Q12_WAKE_HOURS,
} from "./constants";
import type {
  CategoryKey,
  DimensionScoreResult,
  CategoryScoreResult,
  PairScoreResult,
} from "./types";
import {
  calcSymmetricOrdinal,
  calcTimeScore,
  calcNightNoiseEmission,
  calcJaccardScore,
  calcMatrixScore,
  calcDirectionalScore,
  calcJointPositiveScore,
} from "./dimensions";

export type AnswerMap =
  | Map<number, { optionValues: number[]; otherText?: string | null }>
  | Record<number, { optionValues: number[]; otherText?: string | null }>;

/**
 * Extracts a single numeric option for a question number.
 */
export function getSingleOption(answers: AnswerMap, qNum: number): number | undefined {
  if (answers instanceof Map) {
    const ans = answers.get(qNum);
    return ans?.optionValues?.[0];
  }
  const ans = answers[qNum];
  return ans?.optionValues?.[0];
}

/**
 * Extracts all option values for a question number.
 */
export function getOptionValues(answers: AnswerMap, qNum: number): number[] | undefined {
  if (answers instanceof Map) {
    const ans = answers.get(qNum);
    return ans?.optionValues;
  }
  const ans = answers[qNum];
  return ans?.optionValues;
}

/**
 * Counts the number of questions answered in an AnswerMap.
 */
export function countAnsweredQuestions(answers: AnswerMap): number {
  if (answers instanceof Map) {
    let count = 0;
    for (const [, val] of answers) {
      if (val?.optionValues && val.optionValues.length > 0) {
        count++;
      }
    }
    return count;
  }
  let count = 0;
  for (const key of Object.keys(answers)) {
    const val = answers[Number(key)];
    if (val?.optionValues && val.optionValues.length > 0) {
      count++;
    }
  }
  return count;
}

/**
 * Scores a single dimension given answers of user A and user B.
 */
export function scoreDimension(
  dimCode: string,
  answersA: AnswerMap,
  answersB: AnswerMap
): DimensionScoreResult {
  const config = DIMENSIONS[dimCode];
  if (!config) {
    throw new Error(`Unknown dimension code: ${dimCode}`);
  }

  const { category, rule } = config;

  switch (dimCode) {
    // --- Group 1: Lifestyle ---
    case "L1_cooking": {
      const q1A = getSingleOption(answersA, 1);
      const q1B = getSingleOption(answersB, 1);
      if (q1A === undefined || q1B === undefined) {
        return { code: dimCode, category, score: 0, rule, answered: false };
      }
      return {
        code: dimCode,
        category,
        score: calcSymmetricOrdinal(q1A, q1B),
        rule,
        answered: true,
        details: { q1A, q1B },
      };
    }

    case "L2_eating": {
      const q2A = getSingleOption(answersA, 2);
      const q2B = getSingleOption(answersB, 2);
      if (q2A === undefined || q2B === undefined) {
        return { code: dimCode, category, score: 0, rule, answered: false };
      }
      return {
        code: dimCode,
        category,
        score: calcSymmetricOrdinal(q2A, q2B),
        rule,
        answered: true,
        details: { q2A, q2B },
      };
    }

    case "L3_time_at_home": {
      const q3A = getSingleOption(answersA, 3);
      const q3B = getSingleOption(answersB, 3);
      if (q3A === undefined || q3B === undefined) {
        return { code: dimCode, category, score: 0, rule, answered: false };
      }
      return {
        code: dimCode,
        category,
        score: calcSymmetricOrdinal(q3A, q3B),
        rule,
        answered: true,
        details: { q3A, q3B },
      };
    }

    case "L4_routine_flexibility": {
      // A.Q4 (routine importance) -> B.Q5 (flexibility)
      // B.Q4 -> A.Q5
      const q4A = getSingleOption(answersA, 4);
      const q5A = getSingleOption(answersA, 5);
      const q4B = getSingleOption(answersB, 4);
      const q5B = getSingleOption(answersB, 5);
      if (q4A === undefined || q5A === undefined || q4B === undefined || q5B === undefined) {
        return { code: dimCode, category, score: 0, rule, answered: false };
      }
      const dirResult = calcDirectionalScore(q4A, q5B, q4B, q5A);
      return {
        code: dimCode,
        category,
        score: dirResult.score,
        rule,
        answered: true,
        details: { ...dirResult, q4A, q5A, q4B, q5B },
      };
    }

    // --- Group 2: Cleanliness ---
    case "C1_cleanliness_standard": {
      const q6A = getSingleOption(answersA, 6);
      const q6B = getSingleOption(answersB, 6);
      if (q6A === undefined || q6B === undefined) {
        return { code: dimCode, category, score: 0, rule, answered: false };
      }
      return {
        code: dimCode,
        category,
        score: calcSymmetricOrdinal(q6A, q6B),
        rule,
        answered: true,
        details: { q6A, q6B },
      };
    }

    case "C2_chore_pace": {
      // A.Q8 (pace expectation) -> B.Q7 (cleaning frequency supply)
      // B.Q8 -> A.Q7
      const q8A = getSingleOption(answersA, 8);
      const q7A = getSingleOption(answersA, 7);
      const q8B = getSingleOption(answersB, 8);
      const q7B = getSingleOption(answersB, 7);
      if (q8A === undefined || q7A === undefined || q8B === undefined || q7B === undefined) {
        return { code: dimCode, category, score: 0, rule, answered: false };
      }
      const dirResult = calcDirectionalScore(q8A, q7B, q8B, q7A);
      return {
        code: dimCode,
        category,
        score: dirResult.score,
        rule,
        answered: true,
        details: { ...dirResult, q8A, q7A, q8B, q7B },
      };
    }

    case "C3_mess_tolerance": {
      // Y's mess = 6 - Y.Q9; X's tolerance = 6 - X.Q10
      // demandA = 6 - A.Q9; toleranceB = 6 - B.Q10
      // demandB = 6 - B.Q9; toleranceA = 6 - A.Q10
      const q9A = getSingleOption(answersA, 9);
      const q10A = getSingleOption(answersA, 10);
      const q9B = getSingleOption(answersB, 9);
      const q10B = getSingleOption(answersB, 10);
      if (q9A === undefined || q10A === undefined || q9B === undefined || q10B === undefined) {
        return { code: dimCode, category, score: 0, rule, answered: false };
      }
      const messA = 6 - q9A;
      const tolA = 6 - q10A;
      const messB = 6 - q9B;
      const tolB = 6 - q10B;
      const dirResult = calcDirectionalScore(messA, tolB, messB, tolA);
      return {
        code: dimCode,
        category,
        score: dirResult.score,
        rule,
        answered: true,
        details: { ...dirResult, q9A, q10A, q9B, q10B, messA, tolA, messB, tolB },
      };
    }

    case "C4_tidiness": {
      const q9A = getSingleOption(answersA, 9);
      const q9B = getSingleOption(answersB, 9);
      if (q9A === undefined || q9B === undefined) {
        return { code: dimCode, category, score: 0, rule, answered: false };
      }
      return {
        code: dimCode,
        category,
        score: calcSymmetricOrdinal(q9A, q9B),
        rule,
        answered: true,
        details: { q9A, q9B },
      };
    }

    // --- Group 3: Schedule & Noise ---
    case "S1_bedtime": {
      const q11A = getSingleOption(answersA, 11);
      const q11B = getSingleOption(answersB, 11);
      if (q11A === undefined || q11B === undefined) {
        return { code: dimCode, category, score: 0, rule, answered: false };
      }
      return {
        code: dimCode,
        category,
        score: calcTimeScore(q11A, q11B, Q11_BEDTIME_HOURS),
        rule,
        answered: true,
        details: { q11A, q11B },
      };
    }

    case "S2_wake_time": {
      const q12A = getSingleOption(answersA, 12);
      const q12B = getSingleOption(answersB, 12);
      if (q12A === undefined || q12B === undefined) {
        return { code: dimCode, category, score: 0, rule, answered: false };
      }
      return {
        code: dimCode,
        category,
        score: calcTimeScore(q12A, q12B, Q12_WAKE_HOURS),
        rule,
        answered: true,
        details: { q12A, q12B },
      };
    }

    case "S3_night_noise": {
      // A.Q14 (emission) -> B.Q13 (tolerance)
      // B.Q14 (emission) -> A.Q13 (tolerance)
      const q14A = getOptionValues(answersA, 14);
      const q13A = getSingleOption(answersA, 13);
      const q14B = getOptionValues(answersB, 14);
      const q13B = getSingleOption(answersB, 13);
      if (!q14A || q13A === undefined || !q14B || q13B === undefined) {
        return { code: dimCode, category, score: 0, rule, answered: false };
      }
      const emissionA = calcNightNoiseEmission(q14A);
      const emissionB = calcNightNoiseEmission(q14B);
      const dirResult = calcDirectionalScore(emissionA, q13B, emissionB, q13A);
      return {
        code: dimCode,
        category,
        score: dirResult.score,
        rule,
        answered: true,
        details: { ...dirResult, emissionA, q13A, emissionB, q13B },
      };
    }

    case "S4_night_activities": {
      const q14A = getOptionValues(answersA, 14);
      const q14B = getOptionValues(answersB, 14);
      if (!q14A || !q14B) {
        return { code: dimCode, category, score: 0, rule, answered: false };
      }
      return {
        code: dimCode,
        category,
        score: calcJaccardScore(q14A, q14B),
        rule,
        answered: true,
        details: { q14A, q14B },
      };
    }

    case "S5_quiet_time": {
      const q15A = getSingleOption(answersA, 15);
      const q15B = getSingleOption(answersB, 15);
      if (q15A === undefined || q15B === undefined) {
        return { code: dimCode, category, score: 0, rule, answered: false };
      }
      return {
        code: dimCode,
        category,
        score: calcSymmetricOrdinal(q15A, q15B),
        rule,
        answered: true,
        details: { q15A, q15B },
      };
    }

    // --- Group 4: Social Life & Personal Space ---
    case "P1_guests": {
      // A.Q16 (guests demand) -> B.Q17 (comfort with guests)
      // B.Q16 -> A.Q17
      const q16A = getSingleOption(answersA, 16);
      const q17A = getSingleOption(answersA, 17);
      const q16B = getSingleOption(answersB, 16);
      const q17B = getSingleOption(answersB, 17);
      if (q16A === undefined || q17A === undefined || q16B === undefined || q17B === undefined) {
        return { code: dimCode, category, score: 0, rule, answered: false };
      }
      const dirResult = calcDirectionalScore(q16A, q17B, q16B, q17A);
      return {
        code: dimCode,
        category,
        score: dirResult.score,
        rule,
        answered: true,
        details: { ...dirResult, q16A, q17A, q16B, q17B },
      };
    }

    case "P2_interaction_vs_space": {
      // A.Q19 (interaction wanted) -> (6 - B.Q18) (tolerance for interaction)
      // B.Q19 -> (6 - A.Q18)
      const q19A = getSingleOption(answersA, 19);
      const q18A = getSingleOption(answersA, 18);
      const q19B = getSingleOption(answersB, 19);
      const q18B = getSingleOption(answersB, 18);
      if (q19A === undefined || q18A === undefined || q19B === undefined || q18B === undefined) {
        return { code: dimCode, category, score: 0, rule, answered: false };
      }
      const tolA = 6 - q18A;
      const tolB = 6 - q18B;
      const dirResult = calcDirectionalScore(q19A, tolB, q19B, tolA);
      return {
        code: dimCode,
        category,
        score: dirResult.score,
        rule,
        answered: true,
        details: { ...dirResult, q19A, q18A, q19B, q18B, tolA, tolB },
      };
    }

    case "P3_interaction_desire": {
      const q19A = getSingleOption(answersA, 19);
      const q19B = getSingleOption(answersB, 19);
      if (q19A === undefined || q19B === undefined) {
        return { code: dimCode, category, score: 0, rule, answered: false };
      }
      return {
        code: dimCode,
        category,
        score: calcSymmetricOrdinal(q19A, q19B),
        rule,
        answered: true,
        details: { q19A, q19B },
      };
    }

    case "P4_personal_space_need": {
      const q18A = getSingleOption(answersA, 18);
      const q18B = getSingleOption(answersB, 18);
      if (q18A === undefined || q18B === undefined) {
        return { code: dimCode, category, score: 0, rule, answered: false };
      }
      return {
        code: dimCode,
        category,
        score: calcSymmetricOrdinal(q18A, q18B),
        rule,
        answered: true,
        details: { q18A, q18B },
      };
    }

    case "P5_privacy_importance": {
      const q20A = getSingleOption(answersA, 20);
      const q20B = getSingleOption(answersB, 20);
      if (q20A === undefined || q20B === undefined) {
        return { code: dimCode, category, score: 0, rule, answered: false };
      }
      return {
        code: dimCode,
        category,
        score: calcSymmetricOrdinal(q20A, q20B),
        rule,
        answered: true,
        details: { q20A, q20B },
      };
    }

    // --- Group 5: Money & Responsibility ---
    case "F1_on_time_payment": {
      const q21A = getSingleOption(answersA, 21);
      const q21B = getSingleOption(answersB, 21);
      if (q21A === undefined || q21B === undefined) {
        return { code: dimCode, category, score: 0, rule, answered: false };
      }
      return {
        code: dimCode,
        category,
        score: calcSymmetricOrdinal(q21A, q21B),
        rule,
        answered: true,
        details: { q21A, q21B },
      };
    }

    case "F2_cost_split_method": {
      const q22A = getSingleOption(answersA, 22);
      const q22B = getSingleOption(answersB, 22);
      if (q22A === undefined || q22B === undefined) {
        return { code: dimCode, category, score: 0, rule, answered: false };
      }
      return {
        code: dimCode,
        category,
        score: calcMatrixScore(q22A, q22B),
        rule,
        answered: true,
        details: { q22A, q22B },
      };
    }

    case "F3_reminder_comfort": {
      const q23A = getSingleOption(answersA, 23);
      const q23B = getSingleOption(answersB, 23);
      if (q23A === undefined || q23B === undefined) {
        return { code: dimCode, category, score: 0, rule, answered: false };
      }
      return {
        code: dimCode,
        category,
        score: calcSymmetricOrdinal(q23A, q23B),
        rule,
        answered: true,
        details: { q23A, q23B },
      };
    }

    case "F4_cost_sharing": {
      const q24A = getSingleOption(answersA, 24);
      const q24B = getSingleOption(answersB, 24);
      if (q24A === undefined || q24B === undefined) {
        return { code: dimCode, category, score: 0, rule, answered: false };
      }
      return {
        code: dimCode,
        category,
        score: calcSymmetricOrdinal(q24A, q24B),
        rule,
        answered: true,
        details: { q24A, q24B },
      };
    }

    case "F5_expense_tracking": {
      const q25A = getSingleOption(answersA, 25);
      const q25B = getSingleOption(answersB, 25);
      if (q25A === undefined || q25B === undefined) {
        return { code: dimCode, category, score: 0, rule, answered: false };
      }
      return {
        code: dimCode,
        category,
        score: calcSymmetricOrdinal(q25A, q25B),
        rule,
        answered: true,
        details: { q25A, q25B },
      };
    }

    // --- Group 6: Personality & Communication ---
    case "M1_prefers_direct_talk": {
      const q26A = getSingleOption(answersA, 26);
      const q26B = getSingleOption(answersB, 26);
      if (q26A === undefined || q26B === undefined) {
        return { code: dimCode, category, score: 0, rule, answered: false };
      }
      return {
        code: dimCode,
        category,
        score: calcSymmetricOrdinal(q26A, q26B),
        rule,
        answered: true,
        details: { q26A, q26B },
      };
    }

    case "M2_voicing_vs_calm": {
      // A.Q27 (speaks up) -> B.Q29 (stays calm)
      // B.Q27 -> A.Q29
      const q27A = getSingleOption(answersA, 27);
      const q29A = getSingleOption(answersA, 29);
      const q27B = getSingleOption(answersB, 27);
      const q29B = getSingleOption(answersB, 29);
      if (q27A === undefined || q29A === undefined || q27B === undefined || q29B === undefined) {
        return { code: dimCode, category, score: 0, rule, answered: false };
      }
      const dirResult = calcDirectionalScore(q27A, q29B, q27B, q29A);
      return {
        code: dimCode,
        category,
        score: dirResult.score,
        rule,
        answered: true,
        details: { ...dirResult, q27A, q29A, q27B, q29B },
      };
    }

    case "M3_willing_to_compromise": {
      const q28A = getSingleOption(answersA, 28);
      const q28B = getSingleOption(answersB, 28);
      if (q28A === undefined || q28B === undefined) {
        return { code: dimCode, category, score: 0, rule, answered: false };
      }
      return {
        code: dimCode,
        category,
        score: calcJointPositiveScore(q28A, q28B),
        rule,
        answered: true,
        details: { q28A, q28B },
      };
    }

    case "M4_different_lifestyles": {
      const q30A = getSingleOption(answersA, 30);
      const q30B = getSingleOption(answersB, 30);
      if (q30A === undefined || q30B === undefined) {
        return { code: dimCode, category, score: 0, rule, answered: false };
      }
      return {
        code: dimCode,
        category,
        score: calcJointPositiveScore(q30A, q30B),
        rule,
        answered: true,
        details: { q30A, q30B },
      };
    }

    default:
      throw new Error(`Unhandled dimension: ${dimCode}`);
  }
}

/**
 * Calculates category scores and the final weighted compatibility score between two users.
 * Supports weight renormalization for missing answers.
 */
export function scorePair(answersA: AnswerMap, answersB: AnswerMap): PairScoreResult {
  const dimensionScores: Record<string, DimensionScoreResult> = {};

  // Group dimensions by category
  const categoryDimensions: Record<CategoryKey, DimensionScoreResult[]> = {
    lifestyle: [],
    cleanliness: [],
    schedule_noise: [],
    social_space: [],
    financial: [],
    communication: [],
  };

  let allDimensionsAnswered = true;

  for (const [dimCode] of Object.entries(DIMENSIONS)) {
    const dimResult = scoreDimension(dimCode, answersA, answersB);
    dimensionScores[dimCode] = dimResult;
    categoryDimensions[dimResult.category].push(dimResult);
    if (!dimResult.answered) {
      allDimensionsAnswered = false;
    }
  }

  // Compute category scores with renormalization if dimensions are missing
  const categoryScores: Record<CategoryKey, CategoryScoreResult> = {} as Record<
    CategoryKey,
    CategoryScoreResult
  >;

  let totalAnsweredCategoryWeight = 0;
  let weightedFinalScoreSum = 0;

  for (const [catKey, catWeight] of Object.entries(CATEGORY_WEIGHTS) as [CategoryKey, number][]) {
    const dims = categoryDimensions[catKey];
    let answeredWeightSum = 0;
    let weightedDimScoreSum = 0;
    let answeredCount = 0;

    for (const dimRes of dims) {
      const dimConfig = DIMENSIONS[dimRes.code];
      if (dimRes.answered) {
        answeredCount++;
        answeredWeightSum += dimConfig.weight;
        weightedDimScoreSum += dimConfig.weight * dimRes.score;
      }
    }

    let catScore = 0;
    if (answeredWeightSum > 0) {
      catScore = weightedDimScoreSum / answeredWeightSum;
      totalAnsweredCategoryWeight += catWeight;
      weightedFinalScoreSum += catWeight * catScore;
    }

    categoryScores[catKey] = {
      category: catKey,
      name_vi: CATEGORY_META[catKey].name_vi,
      score: catScore,
      weight: catWeight,
      answeredCount,
      totalDimensions: dims.length,
      isFullyAnswered: answeredCount === dims.length,
    };
  }

  // Renormalize final score across answered categories
  let finalScore = 0;
  if (totalAnsweredCategoryWeight > 0) {
    finalScore = weightedFinalScoreSum / totalAnsweredCategoryWeight;
  }

  const answeredQuestionCountA = countAnsweredQuestions(answersA);
  const answeredQuestionCountB = countAnsweredQuestions(answersB);

  return {
    finalScore,
    displayScore: Math.round(finalScore),
    categoryScores,
    dimensionScores,
    isFullyAnswered: allDimensionsAnswered,
    answeredQuestionCountA,
    answeredQuestionCountB,
  };
}

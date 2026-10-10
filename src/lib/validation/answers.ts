import { z } from "zod";
import {
  QUESTION_BY_ID,
  QUESTION_BY_NUMBER,
  QUESTIONNAIRE_QUESTIONS,
  type QuestionDefinition,
} from "../questionnaire/catalog.generated";

export const UserAnswerInputSchema = z.object({
  question_id: z.string().uuid("ID câu hỏi không hợp lệ"),
  option_values: z.array(z.number().int().positive()).min(1, "Vui lòng chọn ít nhất một đáp án"),
  other_text: z.string().trim().max(200, "Văn bản tùy chọn tối đa 200 ký tự").nullable().optional(),
});

export type UserAnswerInput = z.infer<typeof UserAnswerInputSchema>;

/**
 * Validate a single answer against the question definition in the catalog.
 * Returns null if valid, or an error message if invalid.
 */
export function validateAnswerAgainstDefinition(
  question: QuestionDefinition,
  optionValues: number[],
  otherText?: string | null,
): string | null {
  if (optionValues.length === 0) {
    return `Câu hỏi #${question.number} chưa có câu trả lời`;
  }

  // Non-multi-choice questions accept exactly one answer
  if (question.type !== "multi_choice" && optionValues.length !== 1) {
    return `Câu hỏi #${question.number} chỉ cho phép chọn 1 đáp án`;
  }

  // Check uniqueness of option values
  const uniqueValues = new Set(optionValues);
  if (uniqueValues.size !== optionValues.length) {
    return `Câu hỏi #${question.number} có đáp án trùng lặp`;
  }

  // Check valid option values
  const validOptionValues = new Set(question.options.map((o) => o.value));
  for (const v of optionValues) {
    if (!validOptionValues.has(v)) {
      return `Giá trị ${v} không hợp lệ cho câu hỏi #${question.number}`;
    }
  }

  // Check other_text permission
  const selectedAllowsOther = question.options.some(
    (o) => o.allows_other && optionValues.includes(o.value),
  );
  if (otherText && otherText.trim().length > 0 && !selectedAllowsOther) {
    return `Câu hỏi #${question.number} không cho phép nhập văn bản tùy chọn trừ khi chọn mục 'Khác'`;
  }

  return null;
}

/**
 * Validate a full questionnaire submission (e.g. 30 questions).
 */
export function validateQuestionnaireSubmission(
  answers: Array<{ question_id: string; option_values: number[]; other_text?: string | null }>,
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const answeredQuestionIds = new Set(answers.map((a) => a.question_id));

  // Check all required questions are present
  for (const q of QUESTIONNAIRE_QUESTIONS) {
    if (q.is_required && !answeredQuestionIds.has(q.id)) {
      errors.push(`Thiếu câu trả lời cho câu hỏi #${q.number}: ${q.code}`);
    }
  }

  // Check each provided answer
  for (const ans of answers) {
    const q = QUESTION_BY_ID.get(ans.question_id);
    if (!q) {
      errors.push(`Không tìm thấy câu hỏi với id: ${ans.question_id}`);
      continue;
    }
    const err = validateAnswerAgainstDefinition(q, ans.option_values, ans.other_text);
    if (err) {
      errors.push(err);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

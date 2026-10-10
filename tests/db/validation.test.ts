import { describe, it, expect } from "vitest";
import {
  ProfileFormSchema,
  RoommatePreferencesSchema,
  RoomFormSchema,
  validateAnswerAgainstDefinition,
  validateQuestionnaireSubmission,
} from "../../src/lib/validation";
import { QUESTIONNAIRE_QUESTIONS, QUESTION_BY_NUMBER } from "../../src/lib/questionnaire/catalog.generated";

describe("Validation Schemas & Questionnaire Rules", () => {
  it("rejects user profile if age is under 18", () => {
    const invalidProfile = {
      display_name: "Em Bé",
      full_name: "Nguyễn Văn Bé",
      date_of_birth: "2015-01-01", // under 18
      gender: "male" as const,
      city_code: "hn",
      district_code: "hn-thanh-xuan",
      housing_status: "looking_for_room" as const,
    };

    const res = ProfileFormSchema.safeParse(invalidProfile);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toContain("18 tuổi");
    }
  });

  it("validates correct profile successfully", () => {
    const validProfile = {
      display_name: "Ngọc",
      full_name: "Nguyễn Bảo Ngọc",
      date_of_birth: "2004-03-15",
      gender: "female" as const,
      city_code: "hn",
      district_code: "hn-thanh-xuan",
      housing_status: "looking_for_room" as const,
      mbti_type: "ISFJ",
      is_smoker: false,
    };

    const res = ProfileFormSchema.safeParse(validProfile);
    expect(res.success).toBe(true);
  });

  it("rejects roommate preferences when age_min > age_max", () => {
    const invalidPrefs = {
      accepted_genders: ["female" as const],
      age_min: 30,
      age_max: 20, // min > max
    };

    const res = RoommatePreferencesSchema.safeParse(invalidPrefs);
    expect(res.success).toBe(false);
  });

  it("rejects room when current occupants exceed capacity", () => {
    const invalidRoom = {
      city_code: "hn",
      district_code: "hn-thanh-xuan",
      monthly_rent: 4000000,
      room_type: "shared" as const,
      capacity_total: 2,
      current_occupants: 3, // 3 > 2!
      available_from: "2026-11-01",
    };

    const res = RoomFormSchema.safeParse(invalidRoom);
    expect(res.success).toBe(false);
  });

  it("validates 1-5 scale questions strictly", () => {
    const q1 = QUESTION_BY_NUMBER.get(1)!;

    // Valid answer
    expect(validateAnswerAgainstDefinition(q1, [3])).toBeNull();

    // Invalid: out of bounds
    expect(validateAnswerAgainstDefinition(q1, [6])).toBeTruthy();

    // Invalid: multiple answers for a scale question
    expect(validateAnswerAgainstDefinition(q1, [2, 3])).toBeTruthy();
  });

  it("validates multi-choice question Q14", () => {
    const q14 = QUESTION_BY_NUMBER.get(14)!;

    // Valid multiple choices
    expect(validateAnswerAgainstDefinition(q14, [1, 2, 3])).toBeNull();

    // Invalid: duplicates
    expect(validateAnswerAgainstDefinition(q14, [1, 1])).toBeTruthy();

    // other_text is rejected if option 7 ('Khác') is not selected
    expect(validateAnswerAgainstDefinition(q14, [1, 2], "Hát hò")).toBeTruthy();

    // other_text is accepted when option 7 ('Khác') is included
    expect(validateAnswerAgainstDefinition(q14, [1, 7], "Hát hò")).toBeNull();
  });

  it("validates full questionnaire submission", () => {
    // Missing required questions
    const incomplete = validateQuestionnaireSubmission([]);
    expect(incomplete.isValid).toBe(false);
    expect(incomplete.errors.length).toBe(30);

    // Complete 30 answers
    const completeAnswers = QUESTIONNAIRE_QUESTIONS.map((q) => ({
      question_id: q.id,
      option_values: q.type === "multi_choice" ? [1, 2] : [3],
    }));

    const complete = validateQuestionnaireSubmission(completeAnswers);
    expect(complete.isValid).toBe(true);
    expect(complete.errors.length).toBe(0);
  });
});

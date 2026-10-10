import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";
import type { UserAnswerInput } from "../validation/answers";

export type QuestionCategoryRow = Database["public"]["Tables"]["question_categories"]["Row"];
export type QuestionRow = Database["public"]["Tables"]["questions"]["Row"];
export type QuestionOptionRow = Database["public"]["Tables"]["question_options"]["Row"];
export type UserAnswerRow = Database["public"]["Tables"]["user_answers"]["Row"];
export type PublicLifestyleAnswerRow = Database["public"]["Views"]["public_lifestyle_answers"]["Row"];

export async function getQuestionCategories(
  client: SupabaseClient<Database>,
): Promise<QuestionCategoryRow[]> {
  const { data, error } = await client
    .from("question_categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getQuestionsWithOptions(
  client: SupabaseClient<Database>,
): Promise<Array<QuestionRow & { options: QuestionOptionRow[] }>> {
  const { data: questions, error: qError } = await client
    .from("questions")
    .select("*")
    .order("number", { ascending: true });

  if (qError) throw qError;

  const { data: options, error: optError } = await client
    .from("question_options")
    .select("*")
    .order("sort_order", { ascending: true });

  if (optError) throw optError;

  const optionsByQ = new Map<string, QuestionOptionRow[]>();
  for (const opt of options ?? []) {
    if (!optionsByQ.has(opt.question_id)) optionsByQ.set(opt.question_id, []);
    optionsByQ.get(opt.question_id)!.push(opt);
  }

  return (questions ?? []).map((q) => ({
    ...q,
    options: optionsByQ.get(q.id) ?? [],
  }));
}

export async function getMyAnswers(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<UserAnswerRow[]> {
  const { data, error } = await client
    .from("user_answers")
    .select("*")
    .eq("user_id", userId);

  if (error) throw error;
  return data ?? [];
}

export async function saveUserAnswers(
  client: SupabaseClient<Database>,
  userId: string,
  answers: UserAnswerInput[],
): Promise<UserAnswerRow[]> {
  const rows = answers.map((a) => ({
    user_id: userId,
    question_id: a.question_id,
    option_values: a.option_values,
    other_text: a.other_text ?? null,
  }));

  const { data, error } = await client
    .from("user_answers")
    .upsert(rows, { onConflict: "user_id,question_id" })
    .select();

  if (error) throw error;
  return data ?? [];
}

export async function getPublicLifestyleAnswers(
  client: SupabaseClient<Database>,
  targetUserId: string,
): Promise<PublicLifestyleAnswerRow[]> {
  const { data, error } = await client
    .from("public_lifestyle_answers")
    .select("*")
    .eq("user_id", targetUserId)
    .order("question_number", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

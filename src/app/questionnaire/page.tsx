import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/server/session";
import { withAdminDb } from "@/lib/server/db";
import { fetchCandidateUser } from "@/lib/matching/recommendations";
import { getFallbackCandidateUser } from "@/lib/data/fallback-candidates";
import { QuestionnaireClient } from "./QuestionnaireClient";

export default async function QuestionnairePage() {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    redirect("/login");
  }

  let user = null;
  try {
    user = await withAdminDb(async (client) => {
      return await fetchCandidateUser(client, currentUserId);
    });
  } catch (err) {
    console.warn("QuestionnairePage DB fallback active:", (err as Error).message);
    user = getFallbackCandidateUser(currentUserId);
  }

  if (!user) {
    user = getFallbackCandidateUser(currentUserId);
  }

  const answersMap: Record<number, number[]> = {};
  if (user) {
    for (const [qNum, ans] of user.answers.entries()) {
      answersMap[qNum] = ans.optionValues;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <QuestionnaireClient
        initialAnswers={answersMap}
        userId={currentUserId}
      />
    </div>
  );
}

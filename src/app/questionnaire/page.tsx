import { getCurrentUserId } from "@/lib/server/session";
import { withAdminDb } from "@/lib/server/db";
import { fetchCandidateUser } from "@/lib/matching/recommendations";
import { QuestionnaireClient } from "./QuestionnaireClient";

export default async function QuestionnairePage() {
  const currentUserId = await getCurrentUserId();

  const user = await withAdminDb(async (client) => {
    return await fetchCandidateUser(client, currentUserId);
  });

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

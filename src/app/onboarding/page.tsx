import { getCurrentUserId } from "@/lib/server/session";
import { withAdminDb } from "@/lib/server/db";
import { fetchCandidateUser } from "@/lib/matching/recommendations";
import { OnboardingWizard } from "./OnboardingWizard";

export default async function OnboardingPage() {
  const currentUserId = await getCurrentUserId();

  const user = await withAdminDb(async (client) => {
    return await fetchCandidateUser(client, currentUserId);
  });

  const existingAnswers = user
    ? Array.from(user.answers.entries()).map(([qNum, ans]) => ({
        questionNumber: qNum,
        optionValues: ans.optionValues,
        otherText: ans.otherText,
      }))
    : [];

  const initialData = user
    ? {
        displayName: user.displayName,
        gender: user.gender,
        districtCode: user.districtCode || undefined,
        occupation: user.occupation || undefined,
        schoolOrWorkplace: user.schoolOrWorkplace || undefined,
        bio: user.bio || undefined,
        isSmoker: user.isSmoker,
        housingStatus: user.housingStatus,
        acceptedGenders: user.roommatePreferences?.acceptedGenders,
        ageMin: user.roommatePreferences?.ageMin ?? undefined,
        ageMax: user.roommatePreferences?.ageMax ?? undefined,
        smokingPolicy: user.roommatePreferences?.smokingPolicy ?? undefined,
        requirementTags: user.roommatePreferences?.requirementTags,
        monthlyRent: user.room?.monthlyRent,
        roomType: user.room?.roomType,
        facilities: user.room?.facilities,
        budgetMax: user.roomPreferences?.budgetMax,
        existingAnswers,
      }
    : undefined;

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <OnboardingWizard initialData={initialData} />
    </div>
  );
}

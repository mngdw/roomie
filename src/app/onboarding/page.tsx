import { getCurrentUserId } from "@/lib/server/session";
import { withAdminDb } from "@/lib/server/db";
import { fetchCandidateUser } from "@/lib/matching/recommendations";
import { getFallbackCandidateUser } from "@/lib/data/fallback-candidates";
import { SessionRestoreGuard } from "@/components/SessionRestoreGuard";
import { OnboardingWizard } from "./OnboardingWizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    return <SessionRestoreGuard />;
  }

  let user = null;
  try {
    user = await withAdminDb(async (client) => {
      return await fetchCandidateUser(client, currentUserId);
    });
  } catch (err) {
    console.warn("OnboardingPage DB fallback active:", (err as Error).message);
    user = getFallbackCandidateUser(currentUserId);
  }

  if (!user) {
    user = getFallbackCandidateUser(currentUserId);
  }

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
        preferredDistrictCodes: user.roomPreferences?.preferredDistrictCodes,
        existingAnswers,
      }
    : undefined;

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <OnboardingWizard initialData={initialData} />
    </div>
  );
}

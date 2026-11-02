import { notFound, redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/server/session";
import { withAdminDb } from "@/lib/server/db";
import { fetchCandidateUser } from "@/lib/matching/recommendations";
import { getFallbackCandidateUser } from "@/lib/data/fallback-candidates";
import { EditProfileClient } from "./EditProfileClient";

export default async function EditProfilePage() {
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
    console.warn("EditProfilePage DB fallback active:", (err as Error).message);
    user = getFallbackCandidateUser(currentUserId);
  }

  if (!user) {
    user = getFallbackCandidateUser(currentUserId);
  }

  if (!user) {
    notFound();
  }

  const initialData = {
    displayName: user.displayName,
    fullName: user.displayName,
    occupation: user.occupation || undefined,
    schoolOrWorkplace: user.schoolOrWorkplace || undefined,
    districtCode: user.districtCode || undefined,
    bio: user.bio || undefined,
    isSmoker: user.isSmoker,
    phone: user.phone || undefined,
    zalo: user.zalo || undefined,
    acceptedGenders: user.roommatePreferences?.acceptedGenders,
    ageMin: user.roommatePreferences?.ageMin ?? undefined,
    ageMax: user.roommatePreferences?.ageMax ?? undefined,
    smokingPolicy: user.roommatePreferences?.smokingPolicy ?? undefined,
    requirementTags: user.roommatePreferences?.requirementTags,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <EditProfileClient initialData={initialData} />
    </div>
  );
}

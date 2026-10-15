import { notFound, redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/server/session";
import { withAdminDb } from "@/lib/server/db";
import { fetchCandidateUser } from "@/lib/matching/recommendations";
import { EditProfileClient } from "./EditProfileClient";

export default async function EditProfilePage() {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    redirect("/login");
  }

  const user = await withAdminDb(async (client) => {
    return await fetchCandidateUser(client, currentUserId);
  });

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

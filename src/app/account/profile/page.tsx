import { getCurrentUser } from "@/lib/auth/user";
import { ProfileForm } from "@/components/account/profile-form";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Profile &amp; settings</h1>
        <p className="mt-1 text-sm text-ink-soft">Update the details we use for your orders.</p>
      </div>
      <ProfileForm email={user.email} fullName={user.full_name} phone={user.phone} />
    </div>
  );
}

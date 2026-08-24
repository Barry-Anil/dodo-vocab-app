import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { getUserPreferences, getNotificationPreferences } from "@/lib/db/queries/preferences";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/settings/profile-form";
import { LearningPreferencesForm } from "@/components/settings/learning-preferences-form";
import { NotificationPreferencesForm } from "@/components/settings/notification-preferences-form";

export const metadata: Metadata = { title: "Settings – Vocabulary Builder" };

export default async function SettingsPage() {
  const user = await requireUser();
  const [preferences, notificationPreferences] = await Promise.all([
    getUserPreferences(user.id),
    getNotificationPreferences(user.id),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile, learning preferences, and notifications.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your name and account email.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm name={user.name ?? null} email={user.email ?? ""} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Learning preferences</CardTitle>
          <CardDescription>Your level, goals, and daily target.</CardDescription>
        </CardHeader>
        <CardContent>
          <LearningPreferencesForm
            cefrLevel={preferences?.cefrLevel ?? "B1"}
            learningGoals={preferences?.learningGoals ?? []}
            dailyWordTarget={preferences?.dailyWordTarget ?? 2}
            reminderTime={preferences?.reminderTime?.slice(0, 5) ?? "09:00"}
            timezone={preferences?.timezone ?? "UTC"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Choose what you want to be reminded about.</CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationPreferencesForm
            dailyReminderEnabled={notificationPreferences?.dailyReminderEnabled ?? true}
            reviewDueReminderEnabled={notificationPreferences?.reviewDueReminderEnabled ?? true}
            weeklyQuizReminderEnabled={notificationPreferences?.weeklyQuizReminderEnabled ?? true}
            weeklyReportEnabled={notificationPreferences?.weeklyReportEnabled ?? true}
            streakRiskReminderEnabled={notificationPreferences?.streakRiskReminderEnabled ?? true}
            secondReminderEnabled={notificationPreferences?.secondReminderEnabled ?? false}
            secondReminderTime={notificationPreferences?.secondReminderTime?.slice(0, 5) ?? "18:00"}
          />
        </CardContent>
      </Card>
    </div>
  );
}

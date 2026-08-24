import type { Metadata } from "next";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export const metadata: Metadata = { title: "Welcome – Vocabulary Builder" };

export default function OnboardingPage() {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-center text-xl font-semibold">Let&apos;s set up your learning plan</h1>
      <p className="mb-4 text-center text-sm text-muted-foreground">
        Takes about 30 seconds — you can change any of this later.
      </p>
      <OnboardingFlow />
    </div>
  );
}

'use client';

import { ProfileSection } from '@/components/settings/profile-section';
import { PreferencesSection } from '@/components/settings/preferences-section';

export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <ProfileSection />
        <PreferencesSection />
      </div>
    </div>
  );
}

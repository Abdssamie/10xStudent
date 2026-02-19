'use client';

import { BillingSection } from '@/components/settings/billing-section';

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
      <BillingSection />
    </div>
  );
}

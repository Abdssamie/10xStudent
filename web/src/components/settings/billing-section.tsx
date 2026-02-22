'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserSettings } from '@/hooks/use-user-settings';
import { Coins, Clock } from 'lucide-react';

export function BillingSection() {
  const { settings, isLoading: isLoadingSettings } = useUserSettings();

  if (isLoadingSettings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Current Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-muted rounded w-32"></div>
            <div className="h-4 bg-muted rounded w-24"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const credits = settings?.credits ?? 0;

  return (
    <div className="space-y-8">
      {/* Current Balance */}
      <Card>
        <CardHeader>
          <CardTitle>Current Balance</CardTitle>
          <CardDescription>Your available credits for research and generation.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Coins className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-3xl font-bold">{credits.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">credits remaining</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Free Credits Info */}
      <Card>
        <CardHeader>
          <CardTitle>Free Credits</CardTitle>
          <CardDescription>How to get more credits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted">
            <p className="font-medium">New users receive 10,000 free credits on sign-up.</p>
          </div>
        </CardContent>
      </Card>

      {/* Coming Soon */}
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
        <CardHeader className="flex flex-row items-center gap-3">
          <Clock className="h-5 w-5 text-amber-500" />
          <div>
            <CardTitle className="text-lg">Coming Soon</CardTitle>
            <CardDescription>Purchase more credits</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            We&apos;re working on adding the ability to purchase more credits. 
            For now, enjoy your free credits!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

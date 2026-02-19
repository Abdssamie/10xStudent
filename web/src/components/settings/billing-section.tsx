'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserSettings } from '@/hooks/use-user-settings';
import { Coins, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function BillingSection() {
  const { settings, isLoading } = useUserSettings();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Credits</CardTitle>
          <CardDescription>Manage your credits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 w-full bg-muted rounded" />
            <div className="h-10 w-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const credits = settings?.credits ?? 0;
  const usedThisMonth = settings?.credits ? 10000 - settings.credits : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Credits</CardTitle>
        <CardDescription>Manage your credits</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
          <div className="p-3 rounded-full bg-primary/10">
            <Coins className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{credits.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Credits remaining</p>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{usedThisMonth.toLocaleString()}</span> credits used this month
          </p>
        </div>

        <div className="pt-4 border-t space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Need more credits?</p>
              <p className="text-sm text-muted-foreground">Contact us for billing inquiries</p>
            </div>
            <Button variant="outline" asChild>
              <a href="mailto:support@10xstudent.com">
                <Mail className="mr-2 h-4 w-4" />
                Contact Us
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

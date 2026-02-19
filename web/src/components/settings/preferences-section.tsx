'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useUserSettings, useUpdatePreferences } from '@/hooks/use-user-settings';

type CitationFormat = 'APA' | 'MLA' | 'Chicago';

export function PreferencesSection() {
  const { settings, isLoading } = useUserSettings();
  const { updatePreferences, isUpdating } = useUpdatePreferences();
  const [citationFormat, setCitationFormat] = useState<CitationFormat>('APA');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings?.preferences?.defaultCitationFormat) {
      setCitationFormat(settings.preferences.defaultCitationFormat);
    }
  }, [settings]);

  useEffect(() => {
    const original = settings?.preferences?.defaultCitationFormat || 'APA';
    setHasChanges(citationFormat !== original);
  }, [citationFormat, settings]);

  const handleSave = async () => {
    const result = await updatePreferences({ defaultCitationFormat: citationFormat });
    if (result) {
      toast.success('Preferences saved');
      setHasChanges(false);
    } else {
      toast.error('Failed to save preferences');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-10 w-full bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="citation-format">Default Citation Format</Label>
          <Select
            value={citationFormat}
            onValueChange={(value: CitationFormat) => setCitationFormat(value)}
          >
            <SelectTrigger id="citation-format">
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="APA">APA</SelectItem>
              <SelectItem value="MLA">MLA</SelectItem>
              <SelectItem value="Chicago">Chicago</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            This format will be used by default for new documents.
          </p>
        </div>

        <div className="pt-4 border-t">
          <Button onClick={handleSave} disabled={!hasChanges || isUpdating}>
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

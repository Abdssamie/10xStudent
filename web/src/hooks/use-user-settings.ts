import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';

type CitationFormat = 'APA' | 'MLA' | 'Chicago';

type UserPreferences = {
  defaultCitationFormat: CitationFormat;
};

type UserSettings = {
  id: string;
  credits: number;
  preferences: UserPreferences | null;
  creditsResetAt: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useUserSettings() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!isLoaded) return;
    
    if (!isSignedIn) {
      setIsLoading(false);
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/v1/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user settings');
      }

      const data = await response.json();
      setSettings(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, isSignedIn, getToken]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    isLoading,
    error,
    refetch: fetchSettings,
  };
}

export function useUpdatePreferences() {
  const { getToken } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updatePreferences = useCallback(
    async (preferences: Partial<UserPreferences>): Promise<UserPreferences | null> => {
      setIsUpdating(true);
      setError(null);

      try {
        const token = await getToken();
        const response = await fetch(`${API_URL}/api/v1/user/preferences`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(preferences),
        });

        if (!response.ok) {
          throw new Error('Failed to update preferences');
        }

        const data = await response.json();
        return data;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        return null;
      } finally {
        setIsUpdating(false);
      }
    },
    [getToken],
  );

  return {
    updatePreferences,
    isUpdating,
    error,
  };
}

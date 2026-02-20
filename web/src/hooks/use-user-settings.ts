import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  type UserPreferences,
  type UserSettingsResponse,
  userSettingsResponseSchema,
  userPreferencesSchema,
} from '@shared/src';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useUserSettings() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [settings, setSettings] = useState<UserSettingsResponse | null>(null);
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
      const validated = userSettingsResponseSchema.parse(data);
      setSettings(validated);
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
        const validated = userPreferencesSchema.parse(data);
        return validated;
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

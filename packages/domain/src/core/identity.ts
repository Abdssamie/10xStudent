/**
 * @id: user-model
 * @priority: high
 * @progress: 0
 * @spec: Maps to Clerk user. Stores strict user preferences (theme, default export settings).
 * @skills: ["typescript", "zod"]
 */
export interface User {
    id: string;
    email: string;
    preferences: UserPreferences;
}

export interface UserPreferences {
    theme: 'light' | 'dark' | 'system';
    defaultExportFormat: 'pdf' | 'png';
}

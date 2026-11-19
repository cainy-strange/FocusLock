export type FocusMode = 'STRICT' | 'FLEXIBLE';

export type TabKey = 'FOCUS' | 'APPS' | 'SCHEDULE' | 'STATS';

/**
 * Port of Room entity `com.umer.focuslock.data.Session`.
 */
export interface Session {
  id: number;
  startedAt: number;
  endedAt: number;
  plannedMinutes: number;
  completed: boolean;
  mode: FocusMode;
}

/**
 * Port of `InstalledApp` from `MainActivity.kt`.
 */
export interface InstalledApp {
  label: string;
  packageName: string;
}

/**
 * Port of DataStore preferences from `com.umer.focuslock.data.Prefs`,
 * extended with web-runtime toggles for Android Accessibility and Usage Access.
 */
export interface FocusPrefs {
  blockedApps: string[];
  allowedApps: string[];
  sessionActive: boolean;
  sessionEnd: number;
  sessionStarted: number;
  sessionPlanned: number;
  sessionMode: FocusMode;
  scheduleEnabled: boolean;
  scheduleStart: number; // minute of day (0..1439), default 540 (09:00)
  scheduleDuration: number; // minutes (15..180), default 60
  lastScheduledTriggerDate: string | null;
  accessibilityEnabled: boolean;
  usageAccessEnabled: boolean;
}

export type AccessModalType = 'accessibility' | 'usage' | null;

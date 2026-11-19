import type { FocusPrefs, Session } from '../types/focus';

const PREFS_STORAGE_KEY = 'focuslock_settings';
const SESSIONS_STORAGE_KEY = 'focuslock_sessions';

export const DEFAULT_PREFS: FocusPrefs = {
  blockedApps: [],
  allowedApps: [],
  sessionActive: false,
  sessionEnd: 0,
  sessionStarted: 0,
  sessionPlanned: 0,
  sessionMode: 'STRICT',
  scheduleEnabled: false,
  scheduleStart: 9 * 60, // 09:00
  scheduleDuration: 60,
  lastScheduledTriggerDate: null,
  accessibilityEnabled: true,
  usageAccessEnabled: false,
};

let memoryPrefs: FocusPrefs = { ...DEFAULT_PREFS };
let memorySessions: Session[] = [];

function canUseLocalStorage(): boolean {
  try {
    const testKey = '__focuslock_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Port of `Prefs.kt` (Android DataStore) backed by localStorage.
 */
export function loadPrefs(): FocusPrefs {
  if (!canUseLocalStorage()) {
    return { ...memoryPrefs };
  }
  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<FocusPrefs>;
    return {
      ...DEFAULT_PREFS,
      ...parsed,
      blockedApps: Array.isArray(parsed.blockedApps) ? parsed.blockedApps : [],
      allowedApps: Array.isArray(parsed.allowedApps) ? parsed.allowedApps : [],
      sessionMode: parsed.sessionMode === 'FLEXIBLE' ? 'FLEXIBLE' : 'STRICT',
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(prefs: FocusPrefs): void {
  memoryPrefs = { ...prefs };
  if (!canUseLocalStorage()) return;
  try {
    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage quota errors in private contexts
  }
}

/**
 * Port of `FocusDatabase.kt` / `SessionDao` (Android Room) backed by localStorage.
 * Returns sessions ordered by `startedAt DESC` to match `SELECT * FROM sessions ORDER BY startedAt DESC`.
 */
export function loadSessions(): Session[] {
  if (!canUseLocalStorage()) {
    return [...memorySessions].sort((a, b) => b.startedAt - a.startedAt);
  }
  try {
    const raw = window.localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Session[];
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => b.startedAt - a.startedAt);
  } catch {
    return [];
  }
}

export function insertSession(
  existing: Session[],
  entry: Omit<Session, 'id'>
): Session[] {
  const nextId =
    existing.reduce((max, item) => (item.id > max ? item.id : max), 0) + 1;
  const created: Session = { id: nextId, ...entry };
  const updated = [created, ...existing].sort(
    (a, b) => b.startedAt - a.startedAt
  );
  memorySessions = updated;
  if (canUseLocalStorage()) {
    try {
      window.localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage quota errors
    }
  }
  return updated;
}

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Exact port of `calculateStreak` in `MainActivity.kt`.
 * Counts consecutive local calendar days ending today that have at least one completed session.
 */
export function calculateStreak(completedSessions: Session[]): number {
  const days = new Set(
    completedSessions.map((session) => toLocalDateKey(new Date(session.startedAt)))
  );
  let count = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  while (true) {
    const key = toLocalDateKey(cursor);
    if (!days.has(key)) break;
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export function formatTimeOfDay(minuteOfDay: number): string {
  const clamped = Math.max(0, Math.min(1439, Math.floor(minuteOfDay)));
  const hours = Math.floor(clamped / 60);
  const mins = clamped % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function formatCountdown(remainingSeconds: number): string {
  const safe = Math.max(0, Math.floor(remainingSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatFocusedDuration(totalMillis: number): string {
  const safe = Math.max(0, totalMillis);
  const hours = Math.floor(safe / 3_600_000);
  const minutes = Math.floor((safe / 60_000) % 60);
  return `${hours}h ${minutes}m`;
}

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Matches `SimpleDateFormat("dd MMM · HH:mm")` from `MainActivity.kt`.
 */
export function formatSessionDate(timestamp: number): string {
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const month = SHORT_MONTHS[date.getMonth()];
  const hours = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${month} · ${hours}:${mins}`;
}

/**
 * Port of next alarm calculation from `MainActivity.kt` (`scheduleDaily`) & `ScheduleReceiver.kt`.
 */
export function getNextScheduleDate(minuteOfDay: number, nowMs = Date.now()): Date {
  const next = new Date(nowMs);
  next.setHours(Math.floor(minuteOfDay / 60), minuteOfDay % 60, 0, 0);
  if (next.getTime() <= nowMs) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

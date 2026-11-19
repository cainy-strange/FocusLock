import type { FocusPrefs } from '../types/focus';
import { toLocalDateKey } from '../data/storage';

const SELF_PACKAGE = 'com.umer.focuslock';

export type AppLaunchOutcome =
  | { action: 'block'; packageName: string }
  | { action: 'session_expired' }
  | {
      action: 'allow';
      reason:
        | 'system_package'
        | 'accessibility_disabled'
        | 'no_active_session'
        | 'suitcase_allowed'
        | 'not_blocked';
    };

/**
 * Port of `FocusAccessibilityService.onAccessibilityEvent` blocking decision rules:
 * - System/self packages are never blocked
 * - Requires Accessibility Service enabled + active focus session
 * - If `now >= endAt`, session has expired and must be completed
 * - Suitcase allow-list precedence: `packageName in blocked && packageName !in allowed`
 */
export function evaluateAppLaunch(
  packageName: string,
  prefs: FocusPrefs,
  nowMs: number = Date.now()
): AppLaunchOutcome {
  if (
    packageName === SELF_PACKAGE ||
    packageName.startsWith('com.android.systemui') ||
    packageName.startsWith('com.android.launcher')
  ) {
    return { action: 'allow', reason: 'system_package' };
  }

  if (!prefs.accessibilityEnabled) {
    return { action: 'allow', reason: 'accessibility_disabled' };
  }

  if (!prefs.sessionActive) {
    return { action: 'allow', reason: 'no_active_session' };
  }

  if (nowMs >= prefs.sessionEnd) {
    return { action: 'session_expired' };
  }

  const isBlocked = prefs.blockedApps.includes(packageName);
  const isAllowed = prefs.allowedApps.includes(packageName);

  if (isBlocked && !isAllowed) {
    return { action: 'block', packageName };
  }

  if (isBlocked && isAllowed) {
    return { action: 'allow', reason: 'suitcase_allowed' };
  }

  return { action: 'allow', reason: 'not_blocked' };
}

/**
 * Port of `ScheduleReceiver.onReceive` daily trigger check.
 *
 * TODO: On Android, AlarmManager + BootReceiver trigger even when the app is closed.
 * On web, scheduled sessions fire automatically while FocusLock is open in the browser.
 */
export function shouldFireDailySchedule(
  prefs: FocusPrefs,
  now: Date = new Date()
): boolean {
  if (!prefs.scheduleEnabled || prefs.sessionActive) {
    return false;
  }

  const todayKey = toLocalDateKey(now);
  if (prefs.lastScheduledTriggerDate === todayKey) {
    return false;
  }

  const currentMinuteOfDay = now.getHours() * 60 + now.getMinutes();
  return currentMinuteOfDay === prefs.scheduleStart;
}

import { useCallback, useEffect, useState } from 'react';
import { BarChart3, Clock, LayoutGrid, Timer } from 'lucide-react';
import type {
  AccessModalType,
  FocusMode,
  FocusPrefs,
  InstalledApp,
  Session,
  TabKey,
} from './types/focus';
import { DEFAULT_INSTALLED_APPS } from './data/defaultApps';
import {
  formatCountdown,
  insertSession,
  loadPrefs,
  loadSessions,
  savePrefs,
  toLocalDateKey,
} from './data/storage';
import { evaluateAppLaunch, shouldFireDailySchedule } from './services/focusEngine';
import { FocusScreen } from './components/FocusScreen';
import { AppsScreen } from './components/AppsScreen';
import { ScheduleScreen } from './components/ScheduleScreen';
import { StatsScreen } from './components/StatsScreen';
import { BlockingScreen } from './components/BlockingScreen';
import { AccessModal } from './components/AccessModal';

const NAV_ITEMS: { key: TabKey; label: string; icon: typeof Timer }[] = [
  { key: 'FOCUS', label: 'FOCUS', icon: Timer },
  { key: 'APPS', label: 'APPS', icon: LayoutGrid },
  { key: 'SCHEDULE', label: 'SCHEDULE', icon: Clock },
  { key: 'STATS', label: 'STATS', icon: BarChart3 },
];

export default function App() {
  const [tab, setTab] = useState<TabKey>('FOCUS');
  const [prefs, setPrefs] = useState<FocusPrefs>(() => loadPrefs());
  const [sessions, setSessions] = useState<Session[]>(() => loadSessions());
  const [draftMinutes, setDraftMinutes] = useState<number>(45);
  const [draftMode, setDraftMode] = useState<FocusMode>(() => loadPrefs().sessionMode);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [blockedOverlayApp, setBlockedOverlayApp] = useState<InstalledApp | null>(null);
  const [accessModal, setAccessModal] = useState<AccessModalType>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const showFeedback = useCallback((message: string) => {
    setFeedback(message);
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const updatePrefs = useCallback((updater: (prev: FocusPrefs) => FocusPrefs) => {
    setPrefs((prev) => {
      const next = updater(prev);
      savePrefs(next);
      return next;
    });
  }, []);

  const completeActiveSession = useCallback(
    (snapshot: FocusPrefs, completedAtMs: number) => {
      if (snapshot.sessionStarted > 0 && snapshot.sessionPlanned > 0) {
        setSessions((prev) =>
          insertSession(prev, {
            startedAt: snapshot.sessionStarted,
            endedAt: completedAtMs,
            plannedMinutes: snapshot.sessionPlanned,
            completed: true,
            mode: snapshot.sessionMode,
          })
        );
      }
      updatePrefs((prev) => ({
        ...prev,
        sessionActive: false,
        sessionEnd: 0,
      }));
      setBlockedOverlayApp(null);
      showFeedback('Focus session completed and logged to history.');
    },
    [showFeedback, updatePrefs]
  );

  // Finalize an expired session immediately if the tab was reopened after completion
  useEffect(() => {
    const now = Date.now();
    if (prefs.sessionActive && now >= prefs.sessionEnd) {
      completeActiveSession(prefs, prefs.sessionEnd > 0 ? prefs.sessionEnd : now);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 1-second timer driving live countdown, session completion, and daily schedule triggers
  useEffect(() => {
    if (!prefs.sessionActive && !prefs.scheduleEnabled) return;

    const interval = window.setInterval(() => {
      const currentMs = Date.now();
      setNowMs(currentMs);

      if (prefs.sessionActive && currentMs >= prefs.sessionEnd) {
        completeActiveSession(prefs, currentMs);
        return;
      }

      if (shouldFireDailySchedule(prefs, new Date(currentMs))) {
        const duration = Math.max(1, prefs.scheduleDuration);
        const todayKey = toLocalDateKey(new Date(currentMs));
        updatePrefs((prev) => ({
          ...prev,
          sessionActive: true,
          sessionStarted: currentMs,
          sessionPlanned: duration,
          sessionEnd: currentMs + duration * 60_000,
          sessionMode: 'STRICT',
          lastScheduledTriggerDate: todayKey,
        }));
        showFeedback(`Scheduled STRICT session started (${duration} min).`);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [completeActiveSession, prefs, showFeedback, updatePrefs]);

  const remainingSeconds = prefs.sessionActive
    ? Math.max(0, Math.ceil((prefs.sessionEnd - nowMs) / 1000))
    : 0;

  function handleStartSession() {
    const startedAt = Date.now();
    setNowMs(startedAt);
    updatePrefs((prev) => ({
      ...prev,
      sessionActive: true,
      sessionStarted: startedAt,
      sessionPlanned: draftMinutes,
      sessionEnd: startedAt + draftMinutes * 60_000,
      sessionMode: draftMode,
    }));
  }

  function handleStopSession() {
    const endedAt = Date.now();
    if (prefs.sessionStarted > 0 && prefs.sessionPlanned > 0) {
      setSessions((prev) =>
        insertSession(prev, {
          startedAt: prefs.sessionStarted,
          endedAt,
          plannedMinutes: prefs.sessionPlanned,
          completed: false,
          mode: prefs.sessionMode,
        })
      );
    }
    updatePrefs((prev) => ({
      ...prev,
      sessionActive: false,
      sessionEnd: 0,
    }));
    setBlockedOverlayApp(null);
  }

  function handleToggleBlocked(packageName: string, checked: boolean) {
    updatePrefs((prev) => {
      const next = new Set(prev.blockedApps);
      if (checked) next.add(packageName);
      else next.delete(packageName);
      return { ...prev, blockedApps: Array.from(next) };
    });
  }

  function handleToggleAllowed(packageName: string, checked: boolean) {
    updatePrefs((prev) => {
      const next = new Set(prev.allowedApps);
      if (checked) next.add(packageName);
      else next.delete(packageName);
      return { ...prev, allowedApps: Array.from(next) };
    });
  }

  function handleTestOpenApp(app: InstalledApp) {
    const currentMs = Date.now();
    setNowMs(currentMs);
    const outcome = evaluateAppLaunch(app.packageName, prefs, currentMs);

    if (outcome.action === 'session_expired') {
      completeActiveSession(prefs, currentMs);
      return;
    }

    if (outcome.action === 'block') {
      setBlockedOverlayApp(app);
      return;
    }

    if (outcome.reason === 'suitcase_allowed') {
      showFeedback(`${app.label} is accessible via Suitcase allow-list.`);
    } else if (outcome.reason === 'accessibility_disabled') {
      showFeedback(
        `${app.label} opened · Accessibility detection is currently disabled.`
      );
    } else if (outcome.reason === 'no_active_session') {
      showFeedback(`${app.label} opened · No active focus session.`);
    } else {
      showFeedback(`${app.label} opened · Not selected for blocking.`);
    }
  }

  function handleSaveSchedule(
    enabled: boolean,
    minuteOfDay: number,
    duration: number
  ) {
    updatePrefs((prev) => ({
      ...prev,
      scheduleEnabled: enabled,
      scheduleStart: minuteOfDay,
      scheduleDuration: duration,
      // Allow re-triggering today if the user picks a new upcoming time
      lastScheduledTriggerDate:
        prev.scheduleStart !== minuteOfDay ? null : prev.lastScheduledTriggerDate,
    }));
  }

  function handlePreviewBlocker() {
    const firstBlocked =
      DEFAULT_INSTALLED_APPS.find(
        (app) =>
          prefs.blockedApps.includes(app.packageName) &&
          !prefs.allowedApps.includes(app.packageName)
      ) ?? DEFAULT_INSTALLED_APPS[4]; // Instagram fallback for preview
    setBlockedOverlayApp(firstBlocked);
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col">
      {/* Desktop Top Navigation Bar (3-zone contract) */}
      <header className="hidden lg:block sticky top-0 z-30 bg-[#080808]/95 backdrop-blur-sm border-b border-[#292929]">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => setTab('FOCUS')}
            className="text-lg font-extrabold tracking-[0.22em] text-white whitespace-nowrap shrink-0 flex items-center gap-2.5 cursor-pointer"
          >
            <span>FOCUSLOCK</span>
            <span className="text-[#FF5A36] text-xl leading-none" aria-hidden="true">
              ▦
            </span>
          </button>

          {/* Zone 2: Primary Navigation Links */}
          <nav className="flex items-center gap-7" aria-label="Primary navigation">
            {NAV_ITEMS.map(({ key, label }) => {
              const selected = tab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`min-h-[40px] px-1 text-xs font-semibold tracking-[0.14em] transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                    selected
                      ? 'text-[#FF5A36] border-[#FF5A36]'
                      : 'text-[#9A9A9A] border-transparent hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="shrink-0">
            {prefs.sessionActive ? (
              <button
                type="button"
                onClick={() => setTab('FOCUS')}
                className="min-h-[40px] px-4 py-2 rounded-lg bg-[#30201B] text-[#FF5A36] font-mono text-xs font-bold tracking-[0.1em] tabular-nums whitespace-nowrap shrink-0 cursor-pointer hover:bg-[#3d2822] transition-colors"
              >
                {formatCountdown(remainingSeconds)}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (tab === 'FOCUS') {
                    handleStartSession();
                  } else {
                    setTab('FOCUS');
                  }
                }}
                className="min-h-[40px] px-4 py-2 rounded-lg bg-[#FF5A36] text-black text-xs font-extrabold tracking-[0.12em] hover:bg-[#ff6d4d] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                START FOCUS
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-5 sm:px-6 pt-5 pb-24 lg:pt-10 lg:pb-14">
        {/* Mobile Brand Header matching MainActivity.kt */}
        <div className="lg:hidden flex items-center justify-between pt-1 pb-6">
          <div>
            <p className="text-[22px] font-extrabold tracking-[0.18em] text-white leading-tight">
              FOCUSLOCK
            </p>
            <p className="text-[10px] font-medium tracking-[0.2em] text-[#9A9A9A] mt-0.5">
              DISCIPLINE BY DESIGN
            </p>
          </div>
          <span
            className="text-[#FF5A36] text-3xl font-bold leading-none select-none"
            aria-hidden="true"
          >
            ▦
          </span>
        </div>

        {/* Non-intrusive inline feedback banner */}
        {feedback && (
          <div
            role="status"
            aria-live="polite"
            className="mb-6 bg-[#171717] border border-[#292929] rounded-xl px-4 py-3 flex items-center justify-between gap-4"
          >
            <p className="text-xs text-white">{feedback}</p>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-[11px] font-semibold tracking-[0.12em] text-[#9A9A9A] hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              DISMISS
            </button>
          </div>
        )}

        {tab === 'FOCUS' && (
          <FocusScreen
            active={prefs.sessionActive}
            remainingSeconds={remainingSeconds}
            mode={prefs.sessionActive ? prefs.sessionMode : draftMode}
            minutes={draftMinutes}
            blockedCount={prefs.blockedApps.length}
            accessibilityEnabled={prefs.accessibilityEnabled}
            usageAccessEnabled={prefs.usageAccessEnabled}
            onMinutesChange={setDraftMinutes}
            onModeChange={setDraftMode}
            onStart={handleStartSession}
            onStop={handleStopSession}
            onOpenAccessibility={() => setAccessModal('accessibility')}
            onOpenUsage={() => setAccessModal('usage')}
          />
        )}

        {tab === 'APPS' && (
          <AppsScreen
            apps={DEFAULT_INSTALLED_APPS}
            blockedApps={prefs.blockedApps}
            allowedApps={prefs.allowedApps}
            sessionActive={prefs.sessionActive}
            onToggleBlocked={handleToggleBlocked}
            onToggleAllowed={handleToggleAllowed}
            onTestOpenApp={handleTestOpenApp}
          />
        )}

        {tab === 'SCHEDULE' && (
          <ScheduleScreen
            enabled={prefs.scheduleEnabled}
            minuteOfDay={prefs.scheduleStart}
            duration={prefs.scheduleDuration}
            onSave={handleSaveSchedule}
          />
        )}

        {tab === 'STATS' && <StatsScreen sessions={sessions} />}
      </main>

      {/* Mobile Bottom Navigation Bar matching Compose NavigationBar */}
      <nav
        aria-label="Bottom navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#171717] border-t border-[#292929]"
      >
        <div className="grid grid-cols-4 h-16">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
            const selected = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className="flex flex-col items-center justify-center gap-1 min-h-[44px] cursor-pointer"
              >
                <span
                  className={`px-3.5 py-1 rounded-full transition-colors ${
                    selected
                      ? 'bg-[#30201B] text-[#FF5A36]'
                      : 'text-[#9A9A9A]'
                  }`}
                >
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </span>
                <span
                  className={`text-[9px] font-semibold tracking-[0.12em] whitespace-nowrap ${
                    selected ? 'text-[#FF5A36]' : 'text-[#9A9A9A]'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Full-Screen Blocking Overlay (BlockingActivity.kt port) */}
      {blockedOverlayApp && prefs.sessionActive && (
        <BlockingScreen
          blockedApp={blockedOverlayApp}
          remainingSeconds={remainingSeconds}
          mode={prefs.sessionMode}
          onEndSession={handleStopSession}
          onReturnToFocusLock={() => setBlockedOverlayApp(null)}
        />
      )}

      {/* Required Access Configuration Modal */}
      <AccessModal
        modalType={accessModal}
        accessibilityEnabled={prefs.accessibilityEnabled}
        usageAccessEnabled={prefs.usageAccessEnabled}
        sessionActive={prefs.sessionActive}
        onToggleAccessibility={(enabled) =>
          updatePrefs((prev) => ({ ...prev, accessibilityEnabled: enabled }))
        }
        onToggleUsageAccess={(enabled) =>
          updatePrefs((prev) => ({ ...prev, usageAccessEnabled: enabled }))
        }
        onPreviewBlocker={handlePreviewBlocker}
        onClose={() => setAccessModal(null)}
      />
    </div>
  );
}

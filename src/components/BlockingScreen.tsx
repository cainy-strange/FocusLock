import type { FocusMode, InstalledApp } from '../types/focus';
import { formatCountdown } from '../data/storage';

interface BlockingScreenProps {
  blockedApp: InstalledApp;
  remainingSeconds: number;
  mode: FocusMode;
  onEndSession: () => void;
  onReturnToFocusLock: () => void;
}

/**
 * Full-screen port of `BlockingActivity.kt`.
 */
export function BlockingScreen({
  blockedApp,
  remainingSeconds,
  mode,
  onEndSession,
  onReturnToFocusLock,
}: BlockingScreenProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="blocking-screen-heading"
      className="fixed inset-0 z-50 bg-[#080808] flex flex-col items-center justify-center p-7 text-center"
    >
      <div className="w-full max-w-md flex flex-col items-center">
        <p className="text-sm font-semibold tracking-[0.35em] text-white">
          FOCUSLOCK
        </p>

        <h1
          id="blocking-screen-heading"
          className="mt-12 text-4xl sm:text-5xl leading-[1.1] font-extrabold tracking-tight text-white"
        >
          STAY
          <br />
          FOCUSED.
        </h1>

        <div
          className="mt-7 font-mono text-5xl sm:text-6xl font-bold text-[#FF5A36] tabular-nums"
          aria-live="polite"
        >
          {formatCountdown(remainingSeconds)}
        </div>

        <p className="mt-3 text-sm text-[#CCCCCC]">
          This app is blocked during your focus session.
        </p>

        <p className="mt-1.5 font-mono text-xs text-[#9A9A9A]">
          {blockedApp.label} · {blockedApp.packageName}
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 w-full">
          {mode === 'FLEXIBLE' ? (
            <>
              <button
                type="button"
                onClick={onEndSession}
                className="min-h-[48px] px-8 rounded-xl border border-[#444444] text-white text-xs font-semibold tracking-[0.14em] hover:border-white hover:bg-white/5 transition-colors whitespace-nowrap cursor-pointer"
              >
                END SESSION
              </button>
              <button
                type="button"
                onClick={onReturnToFocusLock}
                className="min-h-[44px] px-4 text-xs text-[#9A9A9A] hover:text-white transition-colors whitespace-nowrap cursor-pointer"
              >
                RETURN TO FOCUSLOCK
              </button>
            </>
          ) : (
            <>
              <p className="text-[11px] font-medium tracking-[0.16em] text-[#9A9A9A]">
                STRICT SESSION · RETURN WHEN THE TIMER ENDS
              </p>
              <button
                type="button"
                onClick={onReturnToFocusLock}
                className="mt-3 min-h-[44px] px-6 rounded-xl border border-[#292929] text-white text-xs font-semibold tracking-[0.12em] hover:border-white/40 hover:bg-white/5 transition-colors whitespace-nowrap cursor-pointer"
              >
                RETURN TO FOCUSLOCK
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

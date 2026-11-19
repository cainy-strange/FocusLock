import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { AccessModalType } from '../types/focus';

interface AccessModalProps {
  modalType: AccessModalType;
  accessibilityEnabled: boolean;
  usageAccessEnabled: boolean;
  sessionActive: boolean;
  onToggleAccessibility: (enabled: boolean) => void;
  onToggleUsageAccess: (enabled: boolean) => void;
  onPreviewBlocker: () => void;
  onClose: () => void;
}

/**
 * Web replacement for Android `Settings.ACTION_ACCESSIBILITY_SETTINGS` and
 * `Settings.ACTION_USAGE_ACCESS_SETTINGS` intents from `MainActivity.kt`.
 *
 * TODO: Replace with native OS permission links if packaged as a mobile wrapper
 * or browser extension with tab-blocking permissions.
 */
export function AccessModal({
  modalType,
  accessibilityEnabled,
  usageAccessEnabled,
  sessionActive,
  onToggleAccessibility,
  onToggleUsageAccess,
  onPreviewBlocker,
  onClose,
}: AccessModalProps) {
  useEffect(() => {
    if (!modalType) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalType, onClose]);

  if (!modalType) return null;

  const isAccessibility = modalType === 'accessibility';
  const enabled = isAccessibility ? accessibilityEnabled : usageAccessEnabled;

  return (
    <div
      className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-5"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="access-modal-title"
    >
      <div
        className="w-full max-w-md bg-[#171717] border border-[#292929] rounded-[22px] p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium tracking-[0.2em] text-[#FF5A36]">
              REQUIRED ACCESS
            </p>
            <h2
              id="access-modal-title"
              className="mt-1 text-xl font-bold text-white"
            >
              {isAccessibility ? 'Accessibility service' : 'Usage access'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close access dialog"
            className="min-h-[44px] min-w-[44px] -mr-2 -mt-2 flex items-center justify-center rounded-lg text-[#9A9A9A] hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm leading-relaxed text-[#9A9A9A]">
          {isAccessibility
            ? 'FocusLock uses window-change detection to display the blocking screen when a selected app is opened. It only checks package identifiers and does not read screen content. In this web build, OS-level interception is simulated when testing apps in APPS.'
            : 'Usage access is reserved for future per-app screen time insights. Statistics currently report FocusLock session history stored locally in your browser.'}
        </p>

        <div className="flex items-center justify-between py-3 border-y border-[#292929]">
          <span className="text-sm font-medium text-white">
            {isAccessibility ? 'Enable app blocking detection' : 'Enable usage access flag'}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() =>
              isAccessibility
                ? onToggleAccessibility(!accessibilityEnabled)
                : onToggleUsageAccess(!usageAccessEnabled)
            }
            className="min-h-[44px] flex items-center cursor-pointer"
          >
            <span
              className={`w-12 h-7 rounded-full p-1 transition-colors flex items-center ${
                enabled ? 'bg-[#FF5A36]' : 'bg-[#292929]'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </span>
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {isAccessibility && sessionActive && accessibilityEnabled && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onPreviewBlocker();
              }}
              className="w-full min-h-[44px] px-4 rounded-xl border border-[#3A3A3A] text-white text-xs font-semibold tracking-[0.12em] hover:border-white/50 hover:bg-white/5 transition-colors cursor-pointer"
            >
              PREVIEW BLOCKING SCREEN
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[46px] px-4 rounded-xl bg-[#FF5A36] text-black text-xs font-extrabold tracking-[0.14em] hover:bg-[#ff6d4d] transition-colors cursor-pointer"
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
}

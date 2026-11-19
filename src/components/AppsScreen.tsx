import { Check } from 'lucide-react';
import type { InstalledApp } from '../types/focus';

interface AppsScreenProps {
  apps: InstalledApp[];
  blockedApps: string[];
  allowedApps: string[];
  sessionActive: boolean;
  onToggleBlocked: (packageName: string, checked: boolean) => void;
  onToggleAllowed: (packageName: string, checked: boolean) => void;
  onTestOpenApp: (app: InstalledApp) => void;
}

export function AppsScreen({
  apps,
  blockedApps,
  allowedApps,
  sessionActive,
  onToggleBlocked,
  onToggleAllowed,
  onTestOpenApp,
}: AppsScreenProps) {
  const blockedSet = new Set(blockedApps);
  const allowedSet = new Set(allowedApps);

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-6">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-white">
            APP CONTROL
          </h1>
          <p className="text-sm text-[#9A9A9A] mt-1">
            Choose what FocusLock should block and what remains available.
          </p>
        </div>

        <p className="text-xs text-[#9A9A9A] tabular-nums whitespace-nowrap">
          {blockedApps.length} blocked · {allowedApps.length} Suitcase allowed
        </p>
      </div>

      <p className="text-xs text-[#9A9A9A] mb-4">
        Suitcase allow-list takes precedence: allowed apps stay accessible even if also marked blocked.
        {sessionActive
          ? ' Use OPEN to test blocking behavior during your active session.'
          : ''}
      </p>

      <div className="bg-[#171717] rounded-[22px] px-5 sm:px-6 divide-y divide-[#292929]">
        {apps.map((app) => {
          const isBlocked = blockedSet.has(app.packageName);
          const isAllowed = allowedSet.has(app.packageName);

          return (
            <div
              key={app.packageName}
              className="py-3.5 flex items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium text-white truncate">
                  {app.label}
                </p>
                <p className="font-mono text-[11px] text-[#9A9A9A] truncate mt-0.5">
                  {app.packageName}
                </p>
              </div>

              <div className="flex items-center gap-3 sm:gap-5 shrink-0">
                <button
                  type="button"
                  onClick={() => onTestOpenApp(app)}
                  className={`min-h-[44px] px-2.5 rounded-lg text-[11px] font-semibold tracking-[0.12em] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    sessionActive
                      ? 'text-[#FF5A36] hover:bg-[#30201B]/70'
                      : 'text-[#9A9A9A] hover:text-white hover:bg-white/5'
                  }`}
                >
                  OPEN
                </button>

                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-5">
                  <CheckboxControl
                    label="BLOCK"
                    checked={isBlocked}
                    onChange={(next) => onToggleBlocked(app.packageName, next)}
                  />
                  <CheckboxControl
                    label="ALLOW"
                    checked={isAllowed}
                    onChange={(next) => onToggleAllowed(app.packageName, next)}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

interface CheckboxControlProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function CheckboxControl({ label, checked, onChange }: CheckboxControlProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="min-h-[40px] sm:min-h-[44px] flex items-center justify-end gap-2.5 px-1 cursor-pointer group"
    >
      <span className="text-[10px] font-medium tracking-[0.14em] text-[#9A9A9A] group-hover:text-white transition-colors whitespace-nowrap">
        {label}
      </span>
      <span
        className={`w-5 h-5 rounded-[5px] flex items-center justify-center border transition-colors ${
          checked
            ? 'bg-[#FF5A36] border-[#FF5A36] text-black'
            : 'bg-transparent border-[#555555] group-hover:border-white/70'
        }`}
      >
        {checked && <Check className="w-3.5 h-3.5 stroke-[3]" aria-hidden="true" />}
      </span>
    </button>
  );
}

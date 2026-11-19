import type { FocusMode } from '../types/focus';
import { formatCountdown } from '../data/storage';

interface FocusScreenProps {
  active: boolean;
  remainingSeconds: number;
  mode: FocusMode;
  minutes: number;
  blockedCount: number;
  accessibilityEnabled: boolean;
  usageAccessEnabled: boolean;
  onMinutesChange: (minutes: number) => void;
  onModeChange: (mode: FocusMode) => void;
  onStart: () => void;
  onStop: () => void;
  onOpenAccessibility: () => void;
  onOpenUsage: () => void;
}

export function FocusScreen({
  active,
  remainingSeconds,
  mode,
  minutes,
  blockedCount,
  accessibilityEnabled,
  usageAccessEnabled,
  onMinutesChange,
  onModeChange,
  onStart,
  onStop,
  onOpenAccessibility,
  onOpenUsage,
}: FocusScreenProps) {
  const sliderPercent = ((minutes - 5) / (180 - 5)) * 100;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
      {/* Primary Session Panel */}
      <section className="lg:col-span-7">
        <p className="text-[11px] font-medium tracking-[0.2em] text-[#9A9A9A] mb-3">
          YOUR NEXT SESSION
        </p>

        <div className="bg-[#171717] rounded-[22px] p-6 sm:p-8">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-[#FF5A36]">
            {active ? 'SESSION ACTIVE' : 'READY WHEN YOU ARE'}
          </p>

          <div className="mt-5">
            {active ? (
              <div
                className="font-mono text-5xl sm:text-6xl font-bold tracking-tight text-white tabular-nums"
                aria-live="polite"
              >
                {formatCountdown(remainingSeconds)}
              </div>
            ) : (
              <h1 className="text-4xl sm:text-[42px] leading-[1.12] font-extrabold tracking-tight text-white">
                FOCUS
                <br />
                WITHOUT
                <br />
                DISTRACTION
              </h1>
            )}
          </div>

          <p className="mt-4 text-[11px] tracking-[0.14em] text-[#9A9A9A] tabular-nums">
            {blockedCount} {blockedCount === 1 ? 'APP' : 'APPS'} SELECTED FOR BLOCKING
          </p>

          {!active ? (
            <div className="mt-7 space-y-5">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label
                    htmlFor="focus-duration-slider"
                    className="text-xs font-medium tracking-[0.08em] text-white tabular-nums"
                  >
                    DURATION · {minutes} MIN
                  </label>
                  <span className="text-[11px] text-[#9A9A9A] tabular-nums">
                    5–180 MIN
                  </span>
                </div>
                <input
                  id="focus-duration-slider"
                  type="range"
                  min={5}
                  max={180}
                  step={5}
                  value={minutes}
                  onChange={(e) => onMinutesChange(Number(e.target.value))}
                  className="focus-slider"
                  style={{
                    background: `linear-gradient(to right, #FF5A36 ${sliderPercent}%, #292929 ${sliderPercent}%)`,
                  }}
                />
              </div>

              <div
                className="flex items-center gap-2.5"
                role="radiogroup"
                aria-label="Focus session mode"
              >
                {(['STRICT', 'FLEXIBLE'] as const).map((option) => {
                  const selected = mode === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => onModeChange(option)}
                      className={`min-h-[42px] px-4 py-2 rounded-lg text-xs font-semibold tracking-[0.12em] transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                        selected
                          ? 'bg-[#30201B] text-[#FF5A36] border-[#FF5A36]/60'
                          : 'bg-transparent text-[#9A9A9A] border-[#292929] hover:text-white hover:border-[#444444]'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={onStart}
                className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-[#FF5A36] text-black text-xs font-extrabold tracking-[0.14em] hover:bg-[#ff6d4d] active:scale-[0.99] transition-all whitespace-nowrap cursor-pointer"
              >
                START FOCUS SESSION
              </button>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              <p className="text-sm text-[#9A9A9A] tracking-[0.06em]">
                MODE: <span className="text-white font-semibold">{mode}</span>
              </p>

              <button
                type="button"
                onClick={onStop}
                className="w-full min-h-[48px] px-6 py-3 rounded-xl border border-[#3A3A3A] text-white text-xs font-semibold tracking-[0.14em] hover:border-white/50 hover:bg-white/5 transition-colors whitespace-nowrap cursor-pointer"
              >
                END SESSION
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Required Access Column */}
      <section className="lg:col-span-5">
        <p className="text-[11px] font-medium tracking-[0.2em] text-[#9A9A9A] mb-3">
          REQUIRED ACCESS
        </p>

        <div className="bg-[#171717] rounded-[22px] px-5 py-2 divide-y divide-[#292929]">
          <AccessRow
            title="Accessibility service"
            subtitle="Detect blocked apps"
            status={accessibilityEnabled ? 'Active' : 'Disabled'}
            onOpen={onOpenAccessibility}
          />
          <AccessRow
            title="Usage access"
            subtitle="Enable app usage insights"
            status={usageAccessEnabled ? 'Active' : 'Not set'}
            onOpen={onOpenUsage}
          />
        </div>
      </section>
    </div>
  );
}

interface AccessRowProps {
  title: string;
  subtitle: string;
  status: string;
  onOpen: () => void;
}

function AccessRow({ title, subtitle, status, onOpen }: AccessRowProps) {
  return (
    <div className="py-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-white truncate">{title}</p>
        <p className="text-xs text-[#9A9A9A] mt-0.5">
          {subtitle} · {status}
        </p>
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="min-h-[44px] min-w-[44px] px-3 rounded-lg text-xs font-semibold tracking-[0.14em] text-[#FF5A36] hover:bg-[#30201B]/70 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        OPEN
      </button>
    </div>
  );
}

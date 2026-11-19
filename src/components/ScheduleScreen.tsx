import { useEffect, useState } from 'react';
import {
  formatSessionDate,
  formatTimeOfDay,
  getNextScheduleDate,
} from '../data/storage';

interface ScheduleScreenProps {
  enabled: boolean;
  minuteOfDay: number;
  duration: number;
  onSave: (enabled: boolean, minuteOfDay: number, duration: number) => void;
}

export function ScheduleScreen({
  enabled,
  minuteOfDay,
  duration,
  onSave,
}: ScheduleScreenProps) {
  const [toggle, setToggle] = useState(enabled);
  const [draftMinute, setDraftMinute] = useState(minuteOfDay);
  const [draftDuration, setDraftDuration] = useState(duration);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setToggle(enabled);
    setDraftMinute(minuteOfDay);
    setDraftDuration(duration);
  }, [enabled, minuteOfDay, duration]);

  const timeString = formatTimeOfDay(draftMinute);
  const sliderPercent = ((draftDuration - 15) / (180 - 15)) * 100;

  function handleTimeChange(value: string) {
    const parts = value.split(':');
    if (parts.length !== 2) return;
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    if (Number.isNaN(h) || Number.isNaN(m)) return;
    setDraftMinute(h * 60 + m);
    setSavedNotice(false);
  }

  function handleSave() {
    onSave(toggle, draftMinute, draftDuration);
    setSavedNotice(true);
  }

  const nextTrigger = enabled
    ? formatSessionDate(getNextScheduleDate(minuteOfDay).getTime())
    : null;

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-white">
          AUTOMATION
        </h1>
        <p className="text-sm text-[#9A9A9A] mt-1">
          Set a daily focus session. Browser schedules trigger automatically while FocusLock is open.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        <div className="lg:col-span-7 bg-[#171717] rounded-[18px] p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium tracking-[0.08em] text-white">
              DAILY SESSION
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={toggle}
              aria-label="Toggle daily focus session"
              onClick={() => {
                setToggle((prev) => !prev);
                setSavedNotice(false);
              }}
              className="min-h-[44px] flex items-center cursor-pointer"
            >
              <span
                className={`w-12 h-7 rounded-full p-1 transition-colors flex items-center ${
                  toggle ? 'bg-[#FF5A36]' : 'bg-[#292929]'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    toggle ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </span>
            </button>
          </div>

          <div>
            <label
              htmlFor="schedule-start-time"
              className="block text-[11px] font-medium tracking-[0.2em] text-[#9A9A9A] mb-2"
            >
              START TIME
            </label>
            <input
              id="schedule-start-time"
              type="time"
              value={timeString}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="focus-time-input font-mono text-4xl font-bold text-white bg-[#080808] border border-[#292929] hover:border-[#444444] focus:border-[#FF5A36] rounded-xl px-4 py-2.5 tabular-nums cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label
                htmlFor="schedule-duration-slider"
                className="text-sm font-medium text-white tabular-nums"
              >
                DURATION · {draftDuration} MIN
              </label>
              <span className="text-[11px] text-[#9A9A9A] tabular-nums">
                15–180 MIN
              </span>
            </div>
            <input
              id="schedule-duration-slider"
              type="range"
              min={15}
              max={180}
              step={5}
              value={draftDuration}
              onChange={(e) => {
                setDraftDuration(Math.floor(Number(e.target.value) / 5) * 5);
                setSavedNotice(false);
              }}
              className="focus-slider"
              style={{
                background: `linear-gradient(to right, #FF5A36 ${sliderPercent}%, #292929 ${sliderPercent}%)`,
              }}
            />
          </div>

          <div className="space-y-3 pt-1">
            <button
              type="button"
              onClick={handleSave}
              className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-[#FF5A36] text-black text-xs font-extrabold tracking-[0.14em] hover:bg-[#ff6d4d] active:scale-[0.99] transition-all whitespace-nowrap cursor-pointer"
            >
              SAVE SCHEDULE
            </button>
            {savedNotice && (
              <p className="text-xs text-[#FF5A36]" role="status">
                Schedule saved · {toggle ? `Daily STRICT session at ${timeString} for ${draftDuration} min` : 'Daily schedule paused'}
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#171717] rounded-[18px] p-6 space-y-3">
            <p className="text-[11px] font-medium tracking-[0.2em] text-[#9A9A9A]">
              SCHEDULE BEHAVIOR
            </p>
            <p className="text-xs leading-relaxed text-[#9A9A9A]">
              Scheduled sessions start in STRICT mode. Enable Accessibility access and keep FocusLock open in your browser for automatic daily execution.
            </p>
            {nextTrigger && (
              <p className="pt-2 border-t border-[#292929] text-xs text-white tabular-nums">
                Next trigger · {nextTrigger} · {duration} min STRICT
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

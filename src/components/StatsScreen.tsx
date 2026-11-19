import type { Session } from '../types/focus';
import {
  calculateStreak,
  formatFocusedDuration,
  formatSessionDate,
} from '../data/storage';

interface StatsScreenProps {
  sessions: Session[];
}

export function StatsScreen({ sessions }: StatsScreenProps) {
  const completed = sessions.filter((s) => s.completed);
  const totalMillis = completed.reduce(
    (sum, s) => sum + Math.max(0, s.endedAt - s.startedAt),
    0
  );
  const streak = calculateStreak(completed);

  return (
    <section>
      <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-white mb-5">
        YOUR PROGRESS
      </h1>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard label="FOCUSED" value={formatFocusedDuration(totalMillis)} />
        <StatCard
          label="STREAK"
          value={`${streak} ${streak === 1 ? 'day' : 'days'}`}
        />
        <StatCard label="SESSIONS" value={`${completed.length}`} />
      </div>

      <div className="mt-8">
        <p className="text-[11px] font-medium tracking-[0.2em] text-[#9A9A9A] mb-3">
          SESSION HISTORY
        </p>

        {sessions.length === 0 ? (
          <div className="bg-[#171717] rounded-[18px] p-6 sm:p-8">
            <p className="text-sm text-[#9A9A9A]">
              No focus sessions recorded yet. Start a session in FOCUS to build your history and daily streak.
            </p>
          </div>
        ) : (
          <div className="bg-[#171717] rounded-[18px] px-5 sm:px-6 divide-y divide-[#292929]">
            {sessions.map((session) => (
              <div key={session.id} className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-white tabular-nums">
                    {formatSessionDate(session.startedAt)}
                  </span>
                  <span
                    className={`text-[11px] font-semibold tracking-[0.14em] whitespace-nowrap ${
                      session.completed ? 'text-[#FF5A36]' : 'text-[#9A9A9A]'
                    }`}
                  >
                    {session.completed ? 'COMPLETED' : 'ENDED EARLY'}
                  </span>
                </div>
                <p className="text-xs text-[#9A9A9A] mt-1 tabular-nums">
                  {session.plannedMinutes} min planned · {session.mode}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

interface StatCardProps {
  label: string;
  value: string;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="bg-[#171717] rounded-[14px] p-4 sm:p-5">
      <p className="text-[10px] font-medium tracking-[0.16em] text-[#9A9A9A]">
        {label}
      </p>
      <p className="mt-2 font-mono text-lg sm:text-2xl font-bold text-white tabular-nums">
        {value}
      </p>
    </div>
  );
}

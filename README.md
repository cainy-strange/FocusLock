# FocusLock — React Web App

FocusLock is a React + TypeScript + Tailwind CSS rewrite of the original Kotlin/Jetpack Compose Android focus blocker (`cainy-strange/FocusLock`), preserving its Nothing-inspired monochrome interface (`#080808` / `#171717` / `#FF5A36`) and core business logic.

## Features

- **Timed Focus Sessions (`FOCUS`)**: Start `STRICT` or `FLEXIBLE` sessions from 5 to 180 minutes (5-minute increments) with a live countdown timer and automatic session completion logging.
- **App Control & Suitcase Allow-List (`APPS`)**: Mark apps as `BLOCK` or `ALLOW` (Suitcase allow-list takes precedence so allowed apps remain accessible even if also marked blocked). Use `OPEN` on any row to test the blocking decision engine during an active session.
- **Blocking Overlay (`BlockingScreen`)**: Full-screen focus screen ported from `BlockingActivity.kt`. Displays live remaining time, allows ending early in `FLEXIBLE` mode, and enforces strict messaging in `STRICT` mode.
- **Daily Automation (`SCHEDULE`)**: Configure a daily `STRICT` focus session with start time and duration (15–180 minutes). Automatically triggers when the scheduled minute arrives while FocusLock is open.
- **Session Statistics & Streak (`STATS`)**: Tracks total focused time, consecutive daily streak, completed session count, and full session history (`COMPLETED` vs `ENDED EARLY`), persisted in `localStorage`.

## Running Locally

```bash
npm install
npm run dev
```

The dev server listens on `http://0.0.0.0:3000`.

### Build & Type-Check

```bash
npm run lint
npm run build
```

## Web Limitations vs. Native Android

- **Installed App Discovery**: Browsers cannot access Android's `PackageManager` (`QUERY_ALL_PACKAGES`), so `APPS` uses a curated catalog of common launcher apps (`src/data/defaultApps.ts`).
- **System-Level App Blocking**: Browsers cannot run an Android `AccessibilityService` to intercept other OS apps. Blocking logic (`src/services/focusEngine.ts`) is enforced via the in-app `OPEN` test launcher and `PREVIEW BLOCKING SCREEN` control.
- **Background Alarms**: Android `AlarmManager` and `BOOT_COMPLETED` receivers are unavailable in a web app. Scheduled daily `STRICT` sessions run automatically while FocusLock is open in the browser.
- **Usage Access Analytics**: Matches the original MVP — Usage Access settings are represented in the UI, while `STATS` reports FocusLock session history rather than OS-wide screen time.

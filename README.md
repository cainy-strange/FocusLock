# FocusLock — Android MVP source

FocusLock is a native Kotlin + Jetpack Compose Android focus blocker with a Nothing-inspired monochrome interface.

## Included in this MVP

- Strict and flexible timed focus sessions
- Select installed launcher apps to block
- Suitcase allow-list (allowed apps are not blocked even if also selected)
- Daily scheduled strict sessions
- Local Room session history, focus totals and a basic streak counter
- DataStore-backed settings; no account, analytics SDK, ads or network permission

## Open in Android Studio

1. Install a current Android Studio release and Android SDK Platform 36.
2. Make sure Android Studio uses JDK 17 (Settings → Build Tools → Gradle → Gradle JDK).
3. Extract this ZIP and open the `focuslock` folder (the folder containing `settings.gradle.kts`).
4. Allow Gradle sync. If Android Studio asks to create/update Gradle wrapper files, accept its recommended compatible Gradle 8.13+ distribution.
5. Connect an Android phone with USB debugging enabled, or create an emulator, then press Run.

The project uses AGP 8.13.2, Kotlin 2.2.21, Compose BOM 2026.09.00, Room 2.8.4 and compileSdk 36. If your installed Android Studio is older, update it rather than downgrading random dependencies.

## First-run setup on your phone

1. Open FocusLock → FOCUS → `OPEN` beside Accessibility service.
2. Find FocusLock in Installed apps/services and enable it. Android displays a sensitive-permission warning because Accessibility can observe app-window changes. This build only uses the event package name to decide whether to show the blocker; it does not read screen text or transmit data.
3. Return to FocusLock. Select apps in APPS. Add essential apps to ALLOW (Suitcase).
4. Start a short 2-minute FLEXIBLE test session first. Verify that a selected app shows the blocking screen and an allowed app remains accessible.
5. Test STRICT only after flexible mode works.
6. For schedules, save a daily start time. Exact alarms are used only when Android allows them; otherwise Android may deliver the session later. Battery restrictions and OEM background limits can affect reliability.

## Important limitations — read before relying on it

- This is an MVP, not a tamper-proof parental-control/device-owner product. A normal app cannot prevent uninstall, force-stop, disabling Accessibility, safe mode, or all system-level escape paths.
- The blocker launches a dedicated Activity from the Accessibility Service. Android background-activity-launch rules and OEM customisations vary. If a device blocks that launch, a production version should use a carefully implemented `TYPE_ACCESSIBILITY_OVERLAY` window and test it on each target Android/OEM version.
- Scheduled start is daily. Android may delay inexact alarms; users may need to grant Alarms & reminders special access. Reboot rescheduling is included.
- App discovery uses `QUERY_ALL_PACKAGES`. Google Play restricts broad package visibility; Play distribution requires a valid policy justification and review. For a personal sideload build this is easier to test.
- Usage access settings are linked, but per-app usage analytics are not yet implemented. Statistics currently report FocusLock session history, not total phone screen time.
- A session that ends while no blocked app is opened may not be written to history in this first MVP. The next hardening pass should move session completion into a durable timer/worker and test process death.
- Strict mode means no in-app early-stop control. It cannot stop the user from revoking permissions or uninstalling the app.

## Package structure

- `MainActivity.kt` — Compose screens and navigation
- `BlockingActivity.kt` — countdown blocker screen
- `service/FocusAccessibilityService.kt` — foreground app event handling
- `service/ScheduleReceiver.kt` — daily alarm and reboot rescheduling
- `data/Prefs.kt` — DataStore settings and session state
- `data/FocusDatabase.kt`, `data/Session.kt` — Room session history

## Privacy

The app declares no INTERNET permission and has no remote backend. App package names and focus history remain on-device in DataStore/Room. Accessibility and Usage Access are powerful permissions; only enable them if you understand and accept their scope.

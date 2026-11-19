import type { InstalledApp } from '../types/focus';

/**
 * Curated list of common launcher apps for web environments.
 *
 * TODO: Browsers cannot invoke Android's PackageManager.queryIntentActivities
 * (QUERY_ALL_PACKAGES). Replace with a native bridge or browser extension API
 * if targeting desktop/mobile system-level app discovery.
 */
export const DEFAULT_INSTALLED_APPS: InstalledApp[] = [
  { label: 'Calendar', packageName: 'com.google.android.calendar' },
  { label: 'Chrome', packageName: 'com.android.chrome' },
  { label: 'Discord', packageName: 'com.discord' },
  { label: 'Gmail', packageName: 'com.google.android.gm' },
  { label: 'Instagram', packageName: 'com.instagram.android' },
  { label: 'Maps', packageName: 'com.google.android.apps.maps' },
  { label: 'Messages', packageName: 'com.google.android.apps.messaging' },
  { label: 'Notes', packageName: 'com.google.android.keep' },
  { label: 'Phone', packageName: 'com.google.android.dialer' },
  { label: 'Reddit', packageName: 'com.reddit.frontpage' },
  { label: 'Slack', packageName: 'com.Slack' },
  { label: 'Snapchat', packageName: 'com.snapchat.android' },
  { label: 'Spotify', packageName: 'com.spotify.music' },
  { label: 'Telegram', packageName: 'org.telegram.messenger' },
  { label: 'TikTok', packageName: 'com.zhiliaoapp.musically' },
  { label: 'WhatsApp', packageName: 'com.whatsapp' },
  { label: 'X', packageName: 'com.twitter.android' },
  { label: 'YouTube', packageName: 'com.google.android.youtube' },
].sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()));

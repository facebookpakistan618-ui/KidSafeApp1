/**
 * permissions.ts
 * Centralises all Android permission requests.
 * Uses react-native-permissions for the runtime grant flow.
 */

import { NativeModules, Platform } from 'react-native';
import {
  PERMISSIONS,
  RESULTS,
  check,
  request,
  openSettings,
} from 'react-native-permissions';

const { NotificationModule } = NativeModules as {
  NotificationModule: {
    isNotificationAccessEnabled: () => Promise<boolean>;
    openNotificationSettings: () => void;
    storePairingInfo: (pairId: string, deviceId: string) => Promise<boolean>;
  };
};

// ── SMS ──────────────────────────────────────────────────────────────────────

export type PermissionStatus = 'granted' | 'denied' | 'blocked' | 'unavailable';

export async function checkSMSPermission(): Promise<PermissionStatus> {
  if (Platform.OS !== 'android') return 'unavailable';
  const result = await check(PERMISSIONS.ANDROID.READ_SMS);
  return mapResult(result);
}

export async function requestSMSPermission(): Promise<PermissionStatus> {
  if (Platform.OS !== 'android') return 'unavailable';
  const result = await request(PERMISSIONS.ANDROID.READ_SMS);
  return mapResult(result);
}

// ── Notification listener ────────────────────────────────────────────────────

/**
 * Returns true if the user has granted this app notification listener access.
 * This cannot be granted programmatically — the user must toggle it in Settings.
 */
export async function checkNotificationListenerAccess(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  return NotificationModule.isNotificationAccessEnabled();
}

/**
 * Opens Android Settings > Special app access > Notification access.
 * The user manually enables the toggle for KidSafe Monitor.
 */
export function openNotificationListenerSettings(): void {
  NotificationModule.openNotificationSettings();
}

// ── Pairing info ─────────────────────────────────────────────────────────────

/**
 * Stores pairId + deviceId in SharedPreferences so the native
 * NotificationListenerService can read them (services run outside RN context).
 */
export async function storePairingInfoNative(
  pairId: string,
  deviceId: string
): Promise<void> {
  await NotificationModule.storePairingInfo(pairId, deviceId);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function mapResult(result: string): PermissionStatus {
  switch (result) {
    case RESULTS.GRANTED:   return 'granted';
    case RESULTS.DENIED:    return 'denied';
    case RESULTS.BLOCKED:   return 'blocked';
    default:                return 'unavailable';
  }
}

export { openSettings };

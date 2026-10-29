package com.kidsafemonitor

import android.content.Intent
import android.content.SharedPreferences
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * NotificationModule
 *
 * Exposed to React Native as NativeModules.NotificationModule
 * Allows JS to:
 *  - Check whether notification access is granted (user-visible in Android Settings)
 *  - Open the Android notification access settings screen
 *  - Store pairId / deviceId to SharedPreferences (read by the native service)
 */
class NotificationModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "NotificationModule"

    /**
     * Returns true if the user has granted notification listener access to this app.
     * This is always visible to the user in Android Settings — cannot be granted silently.
     */
    @ReactMethod
    fun isNotificationAccessEnabled(promise: Promise) {
        try {
            val enabledListeners = Settings.Secure.getString(
                reactContext.contentResolver,
                "enabled_notification_listeners"
            ) ?: ""
            val componentName = "${reactContext.packageName}/${KidSafeNotificationService::class.java.name}"
            promise.resolve(enabledListeners.contains(componentName))
        } catch (e: Exception) {
            promise.reject("CHECK_ERROR", e.message)
        }
    }

    /**
     * Opens the system Notification Access settings screen.
     * The user must manually toggle KidSafe Monitor on — this cannot be done from code.
     */
    @ReactMethod
    fun openNotificationSettings() {
        val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactContext.startActivity(intent)
    }

    /**
     * Stores pairing info in SharedPreferences so the native NotificationListenerService
     * can read it (services don't have direct access to RN state).
     */
    @ReactMethod
    fun storePairingInfo(pairId: String, deviceId: String, promise: Promise) {
        try {
            val prefs: SharedPreferences = reactContext.getSharedPreferences(
                KidSafeNotificationService.PREFS_NAME,
                android.content.Context.MODE_PRIVATE
            )
            prefs.edit()
                .putString(KidSafeNotificationService.PREF_PAIR_ID, pairId)
                .putString(KidSafeNotificationService.PREF_DEVICE_ID, deviceId)
                .apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STORE_ERROR", e.message)
        }
    }
}

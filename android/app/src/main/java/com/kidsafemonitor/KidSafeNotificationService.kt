package com.kidsafemonitor

import android.app.Notification
import android.content.SharedPreferences
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore

/**
 * KidSafeNotificationService
 *
 * Captures incoming WhatsApp notifications (message previews) from the notification bar
 * and forwards them to the parent's Firebase-backed dashboard.
 *
 * TRANSPARENCY:
 * - This service only activates after the child explicitly enables it in:
 *   Settings > Apps > Special app access > Notification access > KidSafe Monitor
 * - A persistent foreground notification on the child's device always shows
 *   "KidSafe monitoring active" so the child cannot forget it's running.
 * - Only the notification PREVIEW is captured (same text the child sees
 *   in their notification shade). Full chat history is not accessible this way.
 */
class KidSafeNotificationService : NotificationListenerService() {

    private val TAG = "KidSafeNotifService"
    private val db: FirebaseFirestore by lazy { FirebaseFirestore.getInstance() }

    private val MONITORED_PACKAGES = setOf(
        "com.whatsapp",
        "com.whatsapp.w4b"  // WhatsApp Business
    )

    // Group notifications are meta-notifications (e.g. "3 messages from 2 chats")
    // and don't contain useful individual message content — skip them.
    private val SKIP_NOTIFICATION_FLAGS = setOf(
        Notification.GROUP_ALERT_SUMMARY
    )

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val pkg = sbn.packageName

        if (pkg !in MONITORED_PACKAGES) return
        if (sbn.notification.flags and Notification.FLAG_GROUP_SUMMARY != 0) return

        val prefs: SharedPreferences = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
        val pairId = prefs.getString(PREF_PAIR_ID, null) ?: run {
            Log.w(TAG, "No pairId stored — notification not forwarded")
            return
        }
        val childDeviceId = prefs.getString(PREF_DEVICE_ID, null) ?: return

        val extras = sbn.notification.extras
        val sender  = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()  ?: "Unknown"
        // Prefer EXTRA_BIG_TEXT (expanded notification) for more context
        val preview = (extras.getCharSequence(Notification.EXTRA_BIG_TEXT)
            ?: extras.getCharSequence(Notification.EXTRA_TEXT))?.toString() ?: ""

        if (preview.isBlank()) return

        val appLabel = when (pkg) {
            "com.whatsapp"     -> "whatsapp"
            "com.whatsapp.w4b" -> "whatsapp_business"
            else               -> pkg
        }

        val message = hashMapOf(
            "app"          to appLabel,
            "sender"       to sender,
            "preview"      to preview,
            "timestamp"    to FieldValue.serverTimestamp(),
            "read"         to false,
            "childId"      to childDeviceId
        )

        db.collection("messages")
            .document(pairId)
            .collection("items")
            .add(message)
            .addOnSuccessListener { Log.d(TAG, "Message forwarded: $sender → $pairId") }
            .addOnFailureListener { e -> Log.e(TAG, "Failed to forward message", e) }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        // No action needed — we already stored it
    }

    companion object {
        const val PREFS_NAME  = "KidSafePrefs"
        const val PREF_PAIR_ID    = "pairId"
        const val PREF_DEVICE_ID  = "deviceId"
    }
}

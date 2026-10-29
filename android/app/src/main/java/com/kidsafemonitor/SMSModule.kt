package com.kidsafemonitor

import android.Manifest
import android.content.ContentResolver
import android.content.pm.PackageManager
import android.database.ContentObserver
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import android.content.SharedPreferences

/**
 * SMSModule
 *
 * Exposed to React Native as NativeModules.SMSModule
 *
 * Provides:
 *  - getRecentSMS(limit)   → Promise<Array>  — fetch SMS inbox snapshot
 *  - startSMSObserver()    → void            — watch for new incoming SMS in real-time
 *  - stopSMSObserver()     → void
 *
 * Requires runtime permission: android.permission.READ_SMS
 * (requested via react-native-permissions in PermissionsSetupScreen)
 */
class SMSModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    private val TAG = "SMSModule"
    private val db: FirebaseFirestore by lazy { FirebaseFirestore.getInstance() }
    private var smsObserver: ContentObserver? = null

    override fun getName(): String = "SMSModule"

    private fun hasSmsPermission(): Boolean =
        ContextCompat.checkSelfPermission(reactContext, Manifest.permission.READ_SMS) ==
                PackageManager.PERMISSION_GRANTED

    /**
     * Fetches the most recent [limit] SMS messages from the inbox.
     * Returns an array of maps: { id, address, body, date, read }
     */
    @ReactMethod
    fun getRecentSMS(limit: Int, promise: Promise) {
        if (!hasSmsPermission()) {
            promise.reject("PERMISSION_DENIED", "READ_SMS permission not granted")
            return
        }

        try {
            val results = Arguments.createArray()
            val cursor = reactContext.contentResolver.query(
                Uri.parse("content://sms/inbox"),
                arrayOf("_id", "address", "body", "date", "read"),
                null,
                null,
                "date DESC LIMIT $limit"
            )

            cursor?.use { c ->
                while (c.moveToNext()) {
                    val msg = Arguments.createMap().apply {
                        putString("id",      c.getString(0))
                        putString("address", c.getString(1))
                        putString("body",    c.getString(2))
                        putDouble("date",    c.getLong(3).toDouble())
                        putBoolean("read",   c.getInt(4) == 1)
                    }
                    results.pushMap(msg)
                }
            }

            promise.resolve(results)
        } catch (e: Exception) {
            promise.reject("SMS_READ_ERROR", e.message)
        }
    }

    /**
     * Registers a ContentObserver on content://sms/inbox.
     * When a new SMS arrives it is:
     *  1. Emitted as a "NewSMS" event to React Native
     *  2. Pushed to Firestore for the parent to see
     */
    @ReactMethod
    fun startSMSObserver() {
        if (!hasSmsPermission()) {
            Log.w(TAG, "Cannot start observer — READ_SMS not granted")
            return
        }

        val prefs: SharedPreferences = reactContext.getSharedPreferences(
            KidSafeNotificationService.PREFS_NAME,
            android.content.Context.MODE_PRIVATE
        )
        val pairId       = prefs.getString(KidSafeNotificationService.PREF_PAIR_ID, null)   ?: return
        val childDeviceId = prefs.getString(KidSafeNotificationService.PREF_DEVICE_ID, null) ?: return

        smsObserver = object : ContentObserver(Handler(Looper.getMainLooper())) {
            override fun onChange(selfChange: Boolean) {
                super.onChange(selfChange)
                readLatestAndForward(pairId, childDeviceId)
            }
        }

        reactContext.contentResolver.registerContentObserver(
            Uri.parse("content://sms/inbox"),
            true,
            smsObserver!!
        )

        Log.d(TAG, "SMS observer started for pair $pairId")
    }

    @ReactMethod
    fun stopSMSObserver() {
        smsObserver?.let {
            reactContext.contentResolver.unregisterContentObserver(it)
            smsObserver = null
            Log.d(TAG, "SMS observer stopped")
        }
    }

    private fun readLatestAndForward(pairId: String, childDeviceId: String) {
        if (!hasSmsPermission()) return

        try {
            val cursor = reactContext.contentResolver.query(
                Uri.parse("content://sms/inbox"),
                arrayOf("_id", "address", "body", "date"),
                null,
                null,
                "date DESC LIMIT 1"
            )

            cursor?.use { c ->
                if (c.moveToFirst()) {
                    val address = c.getString(1)
                    val body    = c.getString(2)
                    val date    = c.getLong(3)

                    // Emit to React Native for local UI update
                    reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit("NewSMS", Arguments.createMap().apply {
                            putString("address", address)
                            putString("body",    body)
                            putDouble("date",    date.toDouble())
                        })

                    // Push to Firestore
                    db.collection("messages")
                        .document(pairId)
                        .collection("items")
                        .add(hashMapOf(
                            "app"       to "sms",
                            "sender"    to address,
                            "preview"   to body,
                            "timestamp" to FieldValue.serverTimestamp(),
                            "read"      to false,
                            "childId"   to childDeviceId
                        ))
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error reading new SMS", e)
        }
    }

    override fun invalidate() {
        stopSMSObserver()
        super.invalidate()
    }
}

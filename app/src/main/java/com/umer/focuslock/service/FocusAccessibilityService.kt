package com.umer.focuslock.service

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.accessibility.AccessibilityEvent
import com.umer.focuslock.BlockingActivity
import com.umer.focuslock.data.Prefs
import com.umer.focuslock.data.FocusDatabase
import com.umer.focuslock.data.Session
import kotlinx.coroutines.*

class FocusAccessibilityService : AccessibilityService() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private lateinit var prefs: Prefs
    private var lastBlocked = ""

    override fun onServiceConnected() { super.onServiceConnected(); prefs = Prefs(this) }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        val packageName = event?.packageName?.toString() ?: return
        if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED && event.eventType != AccessibilityEvent.TYPE_WINDOWS_CHANGED) return
        if (packageName == packageNameSelf() || packageName.startsWith("com.android.systemui") || packageName.startsWith("com.android.launcher")) return
        scope.launch {
            if (!prefs.isActive()) return@launch
            if (System.currentTimeMillis() >= prefs.endAt()) {
                val start = prefs.startedAt(); val planned = prefs.plannedMinutes(); val sessionMode = prefs.mode()
                if (start > 0L && planned > 0) FocusDatabase.get(this@FocusAccessibilityService).sessionDao().insert(Session(startedAt = start, endedAt = System.currentTimeMillis(), plannedMinutes = planned, completed = true, mode = sessionMode))
                prefs.stopSession(); return@launch
            }
            val blocked = prefs.blockedApps()
            val allowed = prefs.allowedApps()
            if (packageName in blocked && packageName !in allowed && packageName != lastBlocked) {
                lastBlocked = packageName
                startActivity(Intent(this@FocusAccessibilityService, BlockingActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                    putExtra("blocked_package", packageName)
                })
            } else if (packageName !in blocked) lastBlocked = ""
        }
    }

    private fun packageNameSelf() = applicationContext.packageName
    override fun onInterrupt() = Unit
    override fun onDestroy() { scope.cancel(); super.onDestroy() }
}

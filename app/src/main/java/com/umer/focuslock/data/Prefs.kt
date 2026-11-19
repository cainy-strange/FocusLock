package com.umer.focuslock.data

import android.content.Context
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first

private val Context.dataStore by preferencesDataStore("focuslock_settings")

class Prefs(private val context: Context) {
    private val blocked = stringSetPreferencesKey("blocked_apps")
    private val allowed = stringSetPreferencesKey("allowed_apps")
    private val active = booleanPreferencesKey("session_active")
    private val endAt = longPreferencesKey("session_end")
    private val startedAt = longPreferencesKey("session_started")
    private val planned = intPreferencesKey("session_planned")
    private val mode = stringPreferencesKey("session_mode")
    private val scheduleEnabled = booleanPreferencesKey("schedule_enabled")
    private val scheduleStart = intPreferencesKey("schedule_start")
    private val scheduleDuration = intPreferencesKey("schedule_duration")

    suspend fun blockedApps() = context.dataStore.data.first()[blocked] ?: emptySet()
    suspend fun allowedApps() = context.dataStore.data.first()[allowed] ?: emptySet()
    suspend fun setBlocked(value: Set<String>) { context.dataStore.edit { it[blocked] = value } }
    suspend fun setAllowed(value: Set<String>) { context.dataStore.edit { it[allowed] = value } }
    suspend fun isActive() = context.dataStore.data.first()[active] ?: false
    suspend fun endAt() = context.dataStore.data.first()[endAt] ?: 0L
    suspend fun startedAt() = context.dataStore.data.first()[startedAt] ?: 0L
    suspend fun plannedMinutes() = context.dataStore.data.first()[planned] ?: 0
    suspend fun mode() = context.dataStore.data.first()[mode] ?: "STRICT"
    suspend fun startSession(minutes: Int, sessionMode: String) { context.dataStore.edit { it[active] = true; it[startedAt] = System.currentTimeMillis(); it[planned] = minutes; it[endAt] = System.currentTimeMillis() + minutes * 60_000L; it[mode] = sessionMode } }
    suspend fun stopSession() { context.dataStore.edit { it[active] = false; it[endAt] = 0L } }
    suspend fun saveSchedule(enabled: Boolean, startMinute: Int, duration: Int) { context.dataStore.edit { it[scheduleEnabled] = enabled; it[scheduleStart] = startMinute; it[scheduleDuration] = duration } }
    suspend fun schedule() = Triple(context.dataStore.data.first()[scheduleEnabled] ?: false, context.dataStore.data.first()[scheduleStart] ?: 540, context.dataStore.data.first()[scheduleDuration] ?: 60)
}

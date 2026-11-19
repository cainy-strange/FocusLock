package com.umer.focuslock

import android.app.AlarmManager
import android.app.TimePickerDialog
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.*
import androidx.lifecycle.lifecycleScope
import com.umer.focuslock.data.*
import com.umer.focuslock.service.ScheduleReceiver
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

private val Ink = Color(0xFF080808)
private val Panel = Color(0xFF171717)
private val Orange = Color(0xFFFF5A36)
private val Muted = Color(0xFF9A9A9A)

data class InstalledApp(val label: String, val packageName: String)

class MainActivity : ComponentActivity() {
    private lateinit var prefs: Prefs
    private lateinit var dao: SessionDao
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = Prefs(this)
        dao = FocusDatabase.get(this).sessionDao()
        setContent {
            MaterialTheme(colorScheme = darkColorScheme(primary = Orange, background = Ink, surface = Panel, onBackground = Color.White, onSurface = Color.White)) {
                FocusLockApp(prefs, dao)
            }
        }
    }
}

@Composable
private fun FocusLockApp(prefs: Prefs, dao: SessionDao) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var tab by remember { mutableStateOf(0) }
    var blocked by remember { mutableStateOf(setOf<String>()) }
    var allowed by remember { mutableStateOf(setOf<String>()) }
    var active by remember { mutableStateOf(false) }
    var endAt by remember { mutableLongStateOf(0L) }
    var mode by remember { mutableStateOf("STRICT") }
    var minutes by remember { mutableFloatStateOf(45f) }
    var apps by remember { mutableStateOf(emptyList<InstalledApp>()) }
    var scheduleEnabled by remember { mutableStateOf(false) }
    var scheduleMinute by remember { mutableIntStateOf(9 * 60) }
    var scheduleDuration by remember { mutableIntStateOf(60) }
    var scheduleLabel by remember { mutableStateOf("09:00") }
    val sessions by dao.observeAll().collectAsState(initial = emptyList())

    fun refresh() {
        scope.launch {
            blocked = prefs.blockedApps(); allowed = prefs.allowedApps(); active = prefs.isActive(); endAt = prefs.endAt(); mode = prefs.mode()
            val sched = prefs.schedule(); scheduleEnabled = sched.first; scheduleMinute = sched.second; scheduleDuration = sched.third
            scheduleLabel = String.format(Locale.getDefault(), "%02d:%02d", scheduleMinute / 60, scheduleMinute % 60)
        }
    }
    LaunchedEffect(Unit) {
        refresh()
        apps = loadLaunchableApps(context)
    }

    Scaffold(containerColor = Ink, bottomBar = {
        NavigationBar(containerColor = Panel, contentColor = Color.White) {
            listOf("FOCUS", "APPS", "SCHEDULE", "STATS").forEachIndexed { i, name ->
                NavigationBarItem(selected = tab == i, onClick = { tab = i; refresh() }, icon = { Icon(listOf(Icons.Default.Timer, Icons.Default.Apps, Icons.Default.Schedule, Icons.Default.BarChart)[i], null) }, label = { Text(name, fontSize = 9.sp, letterSpacing = 1.sp) }, colors = NavigationBarItemDefaults.colors(selectedIconColor = Orange, selectedTextColor = Orange, indicatorColor = Color(0xFF30201B), unselectedIconColor = Muted, unselectedTextColor = Muted))
            }
        }
    }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).padding(horizontal = 20.dp)) {
            Row(Modifier.fillMaxWidth().padding(top = 22.dp, bottom = 24.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                Column {
                    Text("FOCUSLOCK", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Black, letterSpacing = 3.sp)
                    Text("DISCIPLINE BY DESIGN", color = Muted, fontSize = 9.sp, letterSpacing = 2.sp)
                }
                Text("▦", color = Orange, fontSize = 30.sp, fontWeight = FontWeight.Bold)
            }
            when (tab) {
                0 -> FocusScreen(active, endAt, mode, minutes, { minutes = it }, { mode = it }, blocked.size, context, onStart = {
                    scope.launch { prefs.startSession(minutes.toInt(), mode); active = true; endAt = prefs.endAt(); refresh() }
                }, onStop = {
                    scope.launch {
                        val end = System.currentTimeMillis(); val start = prefs.startedAt(); val planned = prefs.plannedMinutes(); val savedMode = prefs.mode()
                        prefs.stopSession(); dao.insert(Session(startedAt = start, endedAt = end, plannedMinutes = planned, completed = false, mode = savedMode)); active = false; refresh()
                    }
                }, onAccessibility = { context.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)) }, onUsage = { context.startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)) })
                1 -> AppsScreen(apps, blocked, allowed, onBlocked = { app, value -> scope.launch { blocked = if (value) blocked + app else blocked - app; prefs.setBlocked(blocked) } }, onAllowed = { app, value -> scope.launch { allowed = if (value) allowed + app else allowed - app; prefs.setAllowed(allowed) } })
                2 -> ScheduleScreen(scheduleEnabled, scheduleLabel, scheduleDuration, onTime = {
                    TimePickerDialog(context, { _, h, m -> scheduleMinute = h * 60 + m; scheduleLabel = String.format(Locale.getDefault(), "%02d:%02d", h, m) }, scheduleMinute / 60, scheduleMinute % 60, true).show()
                }, onDuration = { scheduleDuration = it }, onSave = { enabled ->
                    scope.launch { prefs.saveSchedule(enabled, scheduleMinute, scheduleDuration); scheduleEnabled = enabled; if (enabled) scheduleDaily(context, scheduleMinute) else cancelSchedule(context) }
                })
                3 -> StatsScreen(sessions)
            }
        }
    }
}

@Composable
private fun FocusScreen(active: Boolean, endAt: Long, mode: String, minutes: Float, onMinutes: (Float) -> Unit, onMode: (String) -> Unit, blockedCount: Int, context: Context, onStart: () -> Unit, onStop: () -> Unit, onAccessibility: () -> Unit, onUsage: () -> Unit) {
    val remaining = ((endAt - System.currentTimeMillis()).coerceAtLeast(0L) / 1000L)
    Text("YOUR NEXT SESSION", color = Muted, fontSize = 10.sp, letterSpacing = 2.sp)
    Spacer(Modifier.height(12.dp))
    Surface(color = Panel, shape = RoundedCornerShape(22.dp), modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(22.dp)) {
            Text(if (active) "SESSION ACTIVE" else "READY WHEN YOU ARE", color = Orange, fontSize = 11.sp, letterSpacing = 2.sp)
            Spacer(Modifier.height(18.dp))
            Text(if (active) String.format("%02d:%02d", remaining / 60, remaining % 60) else "FOCUS\nWITHOUT\nDISTRACTION", color = Color.White, fontSize = if (active) 48.sp else 34.sp, lineHeight = 39.sp, fontWeight = FontWeight.Black)
            Spacer(Modifier.height(14.dp))
            Text("$blockedCount APPS SELECTED FOR BLOCKING", color = Muted, fontSize = 10.sp, letterSpacing = 1.sp)
            if (!active) {
                Spacer(Modifier.height(24.dp)); Text("DURATION · ${minutes.toInt()} MIN", color = Color.White, fontSize = 12.sp)
                Slider(value = minutes, onValueChange = onMinutes, valueRange = 5f..180f, steps = 34, colors = SliderDefaults.colors(thumbColor = Orange, activeTrackColor = Orange))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(selected = mode == "STRICT", onClick = { onMode("STRICT") }, label = { Text("STRICT") })
                    FilterChip(selected = mode == "FLEXIBLE", onClick = { onMode("FLEXIBLE") }, label = { Text("FLEXIBLE") })
                }
                Spacer(Modifier.height(16.dp))
                Button(onClick = onStart, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = Orange), shape = RoundedCornerShape(12.dp)) { Text("START FOCUS SESSION", color = Color.Black, fontWeight = FontWeight.Bold) }
            } else {
                Spacer(Modifier.height(18.dp)); Text("MODE: $mode", color = Muted)
                Spacer(Modifier.height(16.dp)); OutlinedButton(onClick = onStop, modifier = Modifier.fillMaxWidth()) { Text("END SESSION", color = Color.White) }
            }
        }
    }
    Spacer(Modifier.height(20.dp))
    Text("REQUIRED ACCESS", color = Muted, fontSize = 10.sp, letterSpacing = 2.sp)
    Spacer(Modifier.height(8.dp))
    AccessRow("Accessibility service", "Detect blocked apps", onAccessibility)
    AccessRow("Usage access", "Enable app usage insights", onUsage)
}

@Composable
private fun AccessRow(title: String, subtitle: String, action: () -> Unit) {
    Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
        Column(Modifier.weight(1f)) { Text(title, color = Color.White); Text(subtitle, color = Muted, fontSize = 11.sp) }
        TextButton(onClick = action) { Text("OPEN", color = Orange) }
    }
}

@Composable
private fun AppsScreen(apps: List<InstalledApp>, blocked: Set<String>, allowed: Set<String>, onBlocked: (String, Boolean) -> Unit, onAllowed: (String, Boolean) -> Unit) {
    Text("APP CONTROL", color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Bold)
    Text("Choose what FocusLock should block and what remains available.", color = Muted, fontSize = 12.sp)
    Spacer(Modifier.height(12.dp))
    LazyColumn {
        items(apps, key = { it.packageName }) { app ->
            Row(Modifier.fillMaxWidth().padding(vertical = 7.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) { Text(app.label, color = Color.White); Text(app.packageName, color = Muted, fontSize = 9.sp) }
                Column(horizontalAlignment = Alignment.End) {
                    Row(verticalAlignment = Alignment.CenterVertically) { Text("BLOCK", color = Muted, fontSize = 9.sp); Checkbox(checked = app.packageName in blocked, onCheckedChange = { onBlocked(app.packageName, it) }) }
                    Row(verticalAlignment = Alignment.CenterVertically) { Text("ALLOW", color = Muted, fontSize = 9.sp); Checkbox(checked = app.packageName in allowed, onCheckedChange = { onAllowed(app.packageName, it) }) }
                }
            }
            HorizontalDivider(color = Color(0xFF292929))
        }
    }
}

@Composable
private fun ScheduleScreen(enabled: Boolean, time: String, duration: Int, onTime: () -> Unit, onDuration: (Int) -> Unit, onSave: (Boolean) -> Unit) {
    var toggle by remember(enabled) { mutableStateOf(enabled) }
    Text("AUTOMATION", color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Bold)
    Text("Set a daily focus session. Android may delay alarms in battery-saving modes.", color = Muted, fontSize = 12.sp)
    Spacer(Modifier.height(24.dp))
    Surface(color = Panel, shape = RoundedCornerShape(18.dp), modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) { Text("DAILY SESSION", color = Color.White); Switch(checked = toggle, onCheckedChange = { toggle = it }) }
            Spacer(Modifier.height(18.dp))
            Text("START TIME", color = Muted, fontSize = 10.sp, letterSpacing = 2.sp)
            TextButton(onClick = onTime) { Text(time, color = Color.White, fontSize = 34.sp, fontWeight = FontWeight.Bold) }
            Spacer(Modifier.height(12.dp))
            Text("DURATION · $duration MIN", color = Color.White)
            Slider(value = duration.toFloat(), onValueChange = { onDuration((it / 5).toInt() * 5) }, valueRange = 15f..180f, colors = SliderDefaults.colors(thumbColor = Orange, activeTrackColor = Orange))
            Button(onClick = { onSave(toggle) }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = Orange)) { Text("SAVE SCHEDULE", color = Color.Black) }
        }
    }
    Spacer(Modifier.height(16.dp))
    Text("Scheduled sessions start in STRICT mode. Enable Accessibility access and keep FocusLock unrestricted from battery optimisation for best reliability.", color = Muted, fontSize = 11.sp)
}

@Composable
private fun StatsScreen(sessions: List<Session>) {
    val completed = sessions.filter { it.completed }
    val totalMillis = completed.sumOf { (it.endedAt - it.startedAt).coerceAtLeast(0L) }
    val streak = calculateStreak(completed)
    Text("YOUR PROGRESS", color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Bold)
    Spacer(Modifier.height(16.dp))
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        StatCard("FOCUSED", "${totalMillis / 3_600_000}h ${(totalMillis / 60_000) % 60}m", Modifier.weight(1f))
        StatCard("STREAK", "$streak days", Modifier.weight(1f))
        StatCard("SESSIONS", "${completed.size}", Modifier.weight(1f))
    }
    Spacer(Modifier.height(24.dp))
    Text("SESSION HISTORY", color = Muted, fontSize = 10.sp, letterSpacing = 2.sp)
    Spacer(Modifier.height(8.dp))
    LazyColumn {
        items(sessions, key = { it.id }) { s ->
            Column(Modifier.fillMaxWidth().padding(vertical = 10.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Text(SimpleDateFormat("dd MMM · HH:mm", Locale.getDefault()).format(Date(s.startedAt)), color = Color.White); Text(if (s.completed) "COMPLETED" else "ENDED EARLY", color = if (s.completed) Orange else Muted, fontSize = 9.sp) }
                Text("${s.plannedMinutes} min planned · ${s.mode}", color = Muted, fontSize = 11.sp)
            }
            HorizontalDivider(color = Color(0xFF292929))
        }
    }
}

@Composable
private fun StatCard(label: String, value: String, modifier: Modifier = Modifier) {
    Surface(color = Panel, shape = RoundedCornerShape(14.dp), modifier = modifier) { Column(Modifier.padding(12.dp)) { Text(label, color = Muted, fontSize = 9.sp); Spacer(Modifier.height(8.dp)); Text(value, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp) } }
}

private fun calculateStreak(sessions: List<Session>): Int {
    val days = sessions.map { Calendar.getInstance().apply { timeInMillis = it.startedAt }.let { c -> "%04d-%03d".format(c.get(Calendar.YEAR), c.get(Calendar.DAY_OF_YEAR)) } }.toSet()
    var count = 0
    val c = Calendar.getInstance()
    while (true) {
        val key = "%04d-%03d".format(c.get(Calendar.YEAR), c.get(Calendar.DAY_OF_YEAR))
        if (key !in days) break
        count++; c.add(Calendar.DAY_OF_YEAR, -1)
    }
    return count
}

private fun loadLaunchableApps(context: Context): List<InstalledApp> {
    val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
    return context.packageManager.queryIntentActivities(intent, 0).mapNotNull {
        val pkg = it.activityInfo?.packageName ?: return@mapNotNull null
        if (pkg == context.packageName) null else InstalledApp(it.loadLabel(context.packageManager).toString(), pkg)
    }.distinctBy { it.packageName }.sortedBy { it.label.lowercase(Locale.getDefault()) }
}

private fun scheduleDaily(context: Context, minuteOfDay: Int) {
    val alarm = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val intent = Intent(context, ScheduleReceiver::class.java)
    val pi = android.app.PendingIntent.getBroadcast(context, 41, intent, android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE)
    val now = Calendar.getInstance(); val next = Calendar.getInstance().apply { set(Calendar.HOUR_OF_DAY, minuteOfDay / 60); set(Calendar.MINUTE, minuteOfDay % 60); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0); if (timeInMillis <= now.timeInMillis) add(Calendar.DAY_OF_YEAR, 1) }
    if (android.os.Build.VERSION.SDK_INT < 31 || alarm.canScheduleExactAlarms()) alarm.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next.timeInMillis, pi) else alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next.timeInMillis, pi)
}

private fun cancelSchedule(context: Context) {
    val intent = Intent(context, ScheduleReceiver::class.java)
    val pi = android.app.PendingIntent.getBroadcast(context, 41, intent, android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE)
    (context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(pi)
}

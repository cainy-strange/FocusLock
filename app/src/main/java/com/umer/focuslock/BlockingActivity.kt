package com.umer.focuslock

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.umer.focuslock.data.Prefs
import com.umer.focuslock.data.FocusDatabase
import com.umer.focuslock.data.Session
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class BlockingActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val prefs = Prefs(this)
        setContent {
            var remaining by remember { mutableLongStateOf(0L) }
            var mode by remember { mutableStateOf("STRICT") }
            val scope = rememberCoroutineScope()
            LaunchedEffect(Unit) {
                mode = prefs.mode()
                while (true) {
                    remaining = ((prefs.endAt() - System.currentTimeMillis()).coerceAtLeast(0L) / 1000L)
                    if (remaining <= 0L) {
                        val start = prefs.startedAt(); val planned = prefs.plannedMinutes(); val sessionMode = prefs.mode()
                        if (start > 0L && planned > 0) FocusDatabase.get(this@BlockingActivity).sessionDao().insert(Session(startedAt = start, endedAt = System.currentTimeMillis(), plannedMinutes = planned, completed = true, mode = sessionMode))
                        prefs.stopSession(); finish(); break
                    }
                    delay(1000)
                }
            }
            MaterialTheme(colorScheme = darkColorScheme(background = Color(0xFF080808), surface = Color(0xFF151515), primary = Color(0xFFFF5A36))) {
                Column(Modifier.fillMaxSize().background(Color(0xFF080808)).padding(28.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                    Text("FOCUSLOCK", color = Color.White, fontSize = 14.sp, letterSpacing = 5.sp)
                    Spacer(Modifier.height(48.dp))
                    Text("STAY\nFOCUSED.", color = Color.White, fontSize = 38.sp, lineHeight = 42.sp, fontWeight = FontWeight.Black)
                    Spacer(Modifier.height(28.dp))
                    Text("${remaining / 60}:${(remaining % 60).toString().padStart(2, '0')}", color = Color(0xFFFF5A36), fontSize = 52.sp, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(12.dp))
                    Text("This app is blocked during your focus session.", color = Color.LightGray)
                    Spacer(Modifier.height(40.dp))
                    if (mode == "FLEXIBLE") {
                        OutlinedButton(onClick = { scope.launch { prefs.stopSession(); finish() } }) { Text("END SESSION", color = Color.White) }
                    } else {
                        Text("STRICT SESSION · RETURN WHEN THE TIMER ENDS", color = Color.Gray, fontSize = 10.sp)
                    }
                }
            }
        }
    }
}

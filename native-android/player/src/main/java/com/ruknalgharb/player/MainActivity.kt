package com.ruknalgharb.player

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.util.UUID

private val Navy = Color(0xFF0B1E3A)
private val Blue = Color(0xFF1677D2)
private val Gold = Color(0xFFFFC83D)
private val Green = Color(0xFF168A53)
private val Red = Color(0xFFCB4148)
private val Ink = Color(0xFF172B45)
private val Muted = Color(0xFF718096)

private data class PlayerGame(val id: String, val title: String, val subtitle: String, val icon: String)
private val playerGames = listOf(
    PlayerGame("rocket", "الطيارة", "تابع المضاعف واسحب قبل الانفجار", "✈️"),
    PlayerGame("apple", "التفاح", "اختار التفاحة الآمنة في كل صف", "🍎"),
    PlayerGame("wheel", "العجلة", "لف العجلة وشاهد النتيجة", "🎡"),
    PlayerGame("plinko", "بلينكو", "أسقط الكرة في خانة المضاعف", "🎯"),
    PlayerGame("dice", "النرد", "اختار مجموع الرمية قبل اللعب", "🎲"),
    PlayerGame("cards", "الأوراق", "اختار الأحمر أو الأسود", "🂡")
)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val api = NativeApi(applicationContext)
        setContent {
            MaterialTheme(colorScheme = lightColorScheme(primary = Blue, secondary = Gold, background = Color(0xFFF3F6FA))) {
                CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                    PlayerApp(api)
                }
            }
        }
    }
}

@Composable
private fun PlayerApp(api: NativeApi) {
    var signedIn by remember { mutableStateOf(false) }
    var user by remember { mutableStateOf(JSONObject()) }
    var wallet by remember { mutableStateOf(JSONObject()) }
    var history by remember { mutableStateOf<org.json.JSONArray?>(null) }
    var active by remember { mutableStateOf<JSONObject?>(null) }
    var selectedGame by remember { mutableStateOf<PlayerGame?>(null) }
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var registerMode by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var notice by remember { mutableStateOf("") }
    var stake by remember { mutableStateOf("100") }
    var pick by remember { mutableStateOf("low") }
    var multiplier by remember { mutableStateOf(1.0) }
    var result by remember { mutableStateOf<JSONObject?>(null) }
    val scope = rememberCoroutineScope()

    suspend fun refreshAccount() {
        val me = api.app("me", JSONObject(), false)
        user = me.optJSONObject("user") ?: JSONObject()
        wallet = me.optJSONObject("wallet") ?: JSONObject()
        history = me.optJSONArray("history")
        active = me.optJSONObject("active")
        signedIn = true
        if (active != null && selectedGame == null) {
            selectedGame = playerGames.firstOrNull { it.id == active?.optString("gameId") }
        }
    }

    LaunchedEffect(Unit) {
        try { refreshAccount() } catch (_: Exception) { signedIn = false }
    }

    LaunchedEffect(active?.optString("id"), selectedGame?.id) {
        val current = active
        if (signedIn && current != null && selectedGame?.id == "rocket") {
            while (true) {
                try {
                    val tick = api.app("crash_tick", JSONObject().put("roundId", current.optString("id")), false)
                    if (tick.has("crashed")) {
                        active = null
                        result = JSONObject()
                            .put("stake", tick.optDouble("stake", current.optDouble("stake")))
                            .put("payout", tick.optDouble("payout", 0.0))
                            .put("balance", tick.optDouble("balance", 0.0))
                            .put("multiplier", tick.optDouble("multiplier", 0.0))
                            .put("crashed", tick.optBoolean("crashed"))
                        notice = if (tick.optBoolean("crashed")) "انتهت الجولة قبل السحب." else "تم إنهاء الجولة."
                        refreshAccount()
                        break
                    }
                    multiplier = tick.optDouble("multiplier", multiplier)
                } catch (e: Exception) {
                    error = e.message ?: "تعذر تحديث الجولة"
                    break
                }
                delay(650)
            }
        }
    }

    fun launchTask(block: suspend () -> Unit) {
        scope.launch {
            busy = true
            error = ""
            try { block() } catch (e: Exception) { error = e.message ?: "حدث خطأ غير متوقع" }
            finally { busy = false }
        }
    }

    fun openGame(game: PlayerGame) {
        selectedGame = game
        result = null
        notice = ""
        error = ""
        stake = "100"
        pick = if (game.id == "cards") "red" else "low"
        multiplier = 1.0
    }

    fun playSelected() {
        val game = selectedGame ?: return
        val amount = stake.toDoubleOrNull()
        if (amount == null || amount <= 0) { error = "اكتب قيمة مشاركة صحيحة"; return }
        if (game.id == "rocket" || game.id == "apple") {
            launchTask {
                val data = api.app("active_start", JSONObject()
                    .put("gameId", game.id)
                    .put("stake", amount)
                    .put("idempotencyKey", UUID.randomUUID().toString()), true)
                active = data.optJSONObject("active")
                result = null
                multiplier = 1.0
                notice = "بدأت الجولة. الرصيد المستخدم افتراضي فقط."
                refreshAccount()
            }
        } else {
            launchTask {
                val body = JSONObject()
                    .put("gameId", game.id)
                    .put("stake", amount)
                    .put("idempotencyKey", UUID.randomUUID().toString())
                if (game.id == "dice" || game.id == "cards") body.put("choice", pick)
                val data = api.app("play", body, true)
                result = data
                notice = if (data.optDouble("payout", 0.0) >= amount) "نتيجة الجولة جاهزة." else "انتهت الجولة."
                refreshAccount()
            }
        }
    }

    fun applePick(cell: Int) {
        val round = active ?: return
        launchTask {
            val data = api.app("apple_pick", JSONObject()
                .put("roundId", round.optString("id"))
                .put("cell", cell), true)
            val next = data.optJSONObject("active")
            if (next != null) {
                active = next
                notice = "اختيار آمن. تقدر تكمل أو تسحب."
            } else {
                active = null
                result = JSONObject()
                    .put("stake", data.optDouble("stake", round.optDouble("stake")))
                    .put("payout", data.optDouble("payout", 0.0))
                    .put("balance", data.optDouble("balance", 0.0))
                    .put("multiplier", data.optDouble("multiplier", 0.0))
                    .put("won", data.optBoolean("won"))
                notice = if (data.optBoolean("won")) "أكملت الصفوف بنجاح." else "ظهرت التفاحة الفاسدة وانتهت الجولة."
            }
            refreshAccount()
        }
    }

    fun cashOut() {
        val round = active ?: return
        val game = selectedGame ?: return
        val action = if (game.id == "apple") "apple_cash" else "crash_cash"
        launchTask {
            val data = api.app(action, JSONObject().put("roundId", round.optString("id")), true)
            active = null
            result = JSONObject()
                .put("stake", data.optDouble("stake", round.optDouble("stake")))
                .put("payout", data.optDouble("payout", 0.0))
                .put("balance", data.optDouble("balance", 0.0))
                .put("multiplier", data.optDouble("multiplier", multiplier))
                .put("won", true)
            notice = "تم تثبيت نتيجة الجولة."
            refreshAccount()
        }
    }

    Surface(Modifier.fillMaxSize(), color = Color(0xFFF3F6FA)) {
        if (!signedIn) {
            Column(
                Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),
                verticalArrangement = Arrangement.Center
            ) {
                HeaderCard("ركن الغرب", "تطبيق اللاعبين الأصلي", "🎮")
                Spacer(Modifier.height(18.dp))
                Text(if (registerMode) "إنشاء حساب" else "تسجيل الدخول", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = Navy)
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(username, { username = it }, Modifier.fillMaxWidth(), label = { Text("اسم المستخدم") }, singleLine = true)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(password, { password = it }, Modifier.fillMaxWidth(), label = { Text("كلمة المرور") }, singleLine = true, visualTransformation = PasswordVisualTransformation())
                Spacer(Modifier.height(12.dp))
                Button(
                    onClick = {
                        if (username.isBlank() || password.isBlank()) { error = "اكتب اسم المستخدم وكلمة المرور"; return@Button }
                        launchTask {
                            val action = if (registerMode) "register" else "login"
                            api.auth(action, JSONObject().put("username", username.trim()).put("password", password), false)
                            password = ""
                            refreshAccount()
                        }
                    },
                    enabled = !busy,
                    modifier = Modifier.fillMaxWidth()
                ) { Text(if (busy) "جارٍ الاتصال..." else if (registerMode) "إنشاء الحساب" else "دخول") }
                TextButton(onClick = { registerMode = !registerMode; error = "" }, modifier = Modifier.align(Alignment.CenterHorizontally)) {
                    Text(if (registerMode) "عندي حساب بالفعل" else "إنشاء حساب جديد")
                }
                if (error.isNotBlank()) Text(error, color = Red, modifier = Modifier.padding(top = 8.dp))
                Text("الرصيد داخل التطبيق افتراضي. لا توجد مدفوعات أو تحويلات مالية حقيقية.", color = Muted, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 18.dp))
            }
        } else if (selectedGame == null) {
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(14.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column {
                        Text("ركن الغرب", style = MaterialTheme.typography.headlineSmall, color = Navy, fontWeight = FontWeight.Bold)
                        Text("أهلًا ${user.optString("displayName", user.optString("username", "لاعب"))}", color = Muted)
                    }
                    TextButton(onClick = { launchTask { api.auth("logout", JSONObject(), true); signedIn = false; api.clearSession() } }) { Text("خروج") }
                }
                Spacer(Modifier.height(10.dp))
                Card(colors = CardDefaults.cardColors(containerColor = Navy), modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(18.dp)) {
                        Text("رصيدك الافتراضي", color = Color.White)
                        Text(formatNumber(wallet.optDouble("balance", 0.0)), style = MaterialTheme.typography.headlineLarge, color = Gold, fontWeight = FontWeight.Bold)
                        Text("الجولات ${wallet.optInt("rounds")}  •  كسب ${wallet.optInt("wins")}  •  خسارة ${wallet.optInt("losses")}", color = Color.White)
                    }
                }
                Spacer(Modifier.height(18.dp))
                Text("الألعاب الست", style = MaterialTheme.typography.titleLarge, color = Navy, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(8.dp))
                playerGames.forEach { game ->
                    Card(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 5.dp).clickable { openGame(game) },
                        colors = CardDefaults.cardColors(containerColor = Color.White)
                    ) {
                        Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text(game.icon, style = MaterialTheme.typography.headlineMedium)
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(game.title, color = Navy, fontWeight = FontWeight.Bold)
                                Text(game.subtitle, color = Muted, style = MaterialTheme.typography.bodySmall)
                            }
                            Text("العب ←", color = Blue, fontWeight = FontWeight.Bold)
                        }
                    }
                }
                Spacer(Modifier.height(16.dp))
                Text("آخر الجولات", style = MaterialTheme.typography.titleLarge, color = Navy, fontWeight = FontWeight.Bold)
                history?.let { h ->
                    if (h.length() == 0) Text("لا توجد جولات مسجلة حتى الآن.", color = Muted)
                    else (0 until minOf(h.length(), 8)).forEach { i ->
                        val row = h.optJSONObject(i) ?: JSONObject()
                        val net = row.optDouble("win") - row.optDouble("bet")
                        Row(Modifier.fillMaxWidth().padding(vertical = 7.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(row.optString("g"), color = Ink)
                            Text(if (net >= 0) "+${formatNumber(net)}" else formatNumber(net), color = if (net >= 0) Green else Red, fontWeight = FontWeight.Bold)
                        }
                        HorizontalDivider(color = Color(0xFFE1E8F0))
                    }
                }
                if (error.isNotBlank()) Text(error, color = Red, modifier = Modifier.padding(top = 8.dp))
            }
        } else {
            val game = selectedGame!!
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(14.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    TextButton(onClick = { if (active == null) selectedGame = null else notice = "أنهِ الجولة الحالية قبل الخروج." }) { Text("رجوع") }
                    Spacer(Modifier.weight(1f))
                    Text(formatNumber(wallet.optDouble("balance", 0.0)), color = Navy, fontWeight = FontWeight.Bold)
                }
                Card(colors = CardDefaults.cardColors(containerColor = Navy), modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.fillMaxWidth().padding(18.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(game.icon, style = MaterialTheme.typography.displaySmall)
                        Text(game.title, style = MaterialTheme.typography.headlineSmall, color = Color.White, fontWeight = FontWeight.Bold)
                        Text(game.subtitle, color = Color(0xFFD7E5F5))
                        if (game.id == "rocket" && active != null) {
                            Spacer(Modifier.height(12.dp))
                            Text("×${"%.2f".format(multiplier)}", style = MaterialTheme.typography.displayMedium, color = Gold, fontWeight = FontWeight.Bold)
                        }
                    }
                }
                Spacer(Modifier.height(12.dp))
                if (active == null) {
                    OutlinedTextField(stake, { stake = it }, Modifier.fillMaxWidth(), label = { Text("قيمة المشاركة الافتراضية") }, singleLine = true)
                    if (game.id == "dice") {
                        Spacer(Modifier.height(8.dp)); Text("اختار النتيجة", color = Navy, fontWeight = FontWeight.Bold)
                        ChoiceRow(listOf("low" to "أقل من 7", "seven" to "7 بالضبط", "high" to "أكبر من 7"), pick) { pick = it }
                    }
                    if (game.id == "cards") {
                        Spacer(Modifier.height(8.dp)); Text("اختار لون الورقة", color = Navy, fontWeight = FontWeight.Bold)
                        ChoiceRow(listOf("red" to "أحمر ♥", "black" to "أسود ♠"), pick) { pick = it }
                    }
                    Spacer(Modifier.height(10.dp))
                    Button(onClick = { playSelected() }, enabled = !busy, modifier = Modifier.fillMaxWidth()) {
                        Text(if (busy) "جارٍ التنفيذ..." else "ابدأ الجولة")
                    }
                } else if (game.id == "apple") {
                    Text("الصف ${active!!.optInt("level") + 1} من 5 — اختار تفاحة واحدة", color = Navy, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(8.dp))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        repeat(5) { cell ->
                            OutlinedButton(onClick = { applePick(cell) }, enabled = !busy, modifier = Modifier.weight(1f)) { Text("🍎") }
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                    Button(onClick = { cashOut() }, enabled = !busy && active!!.optInt("level") > 0, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = Green)) { Text("اسحب العائد الآن") }
                } else if (game.id == "rocket") {
                    Text("الجولة شغالة. اضغط اسحب لتثبيت العائد قبل الانفجار.", color = Navy)
                    Button(onClick = { cashOut() }, enabled = !busy, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = Green)) { Text("اسحب الآن") }
                }

                result?.let { r ->
                    val bet = r.optDouble("stake")
                    val payout = r.optDouble("payout")
                    val net = payout - bet
                    Spacer(Modifier.height(14.dp))
                    Card(colors = CardDefaults.cardColors(containerColor = if (net >= 0) Color(0xFFE7F6EC) else Color(0xFFFDEBEC)), modifier = Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(16.dp)) {
                            Text("نتيجة الجولة", fontWeight = FontWeight.Bold, color = Navy)
                            Text("المشاركة: ${formatNumber(bet)}")
                            Text("العائد: ${formatNumber(payout)}")
                            Text("صافي النتيجة: ${if (net >= 0) "+" else ""}${formatNumber(net)}", fontWeight = FontWeight.Bold, color = if (net >= 0) Green else Red)
                            Text("الرصيد بعد الجولة: ${formatNumber(r.optDouble("balance", wallet.optDouble("balance")))}")
                        }
                    }
                    Button(onClick = { selectedGame = null; result = null; notice = "" }, modifier = Modifier.fillMaxWidth()) { Text("العودة للألعاب") }
                }
                if (notice.isNotBlank()) Text(notice, color = Muted, modifier = Modifier.padding(top = 10.dp))
                if (error.isNotBlank()) Text(error, color = Red, modifier = Modifier.padding(top = 10.dp))
                Text("الرصيد افتراضي فقط • يتم اعتماد نتيجة الجولة من الخادم.", color = Muted, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 18.dp))
            }
        }
    }
}

@Composable
private fun HeaderCard(title: String, subtitle: String, icon: String) {
    Card(colors = CardDefaults.cardColors(containerColor = Navy), modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.fillMaxWidth().padding(22.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(icon, style = MaterialTheme.typography.displayMedium)
            Text(title, color = Gold, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text(subtitle, color = Color.White)
        }
    }
}

@Composable
private fun ChoiceRow(items: List<Pair<String, String>>, selected: String, onSelect: (String) -> Unit) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        items.forEach { (value, label) ->
            OutlinedButton(onClick = { onSelect(value) }, modifier = Modifier.weight(1f), colors = ButtonDefaults.outlinedButtonColors(containerColor = if (selected == value) Color(0xFFDCEBFA) else Color.White)) {
                Text(label, color = Navy)
            }
        }
    }
}

private fun formatNumber(value: Double): String = String.format(java.util.Locale.US, "%,.2f", value)

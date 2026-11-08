package com.ruknalgharb.admin

import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
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
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

private val Dark = Color(0xFF101D2B)
private val Panel = Color(0xFF1B3046)
private val Gold = Color(0xFFFFD36E)
private val Blue = Color(0xFF397DBB)
private val Green = Color(0xFF198754)
private val Red = Color(0xFFCB4148)
private val Soft = Color(0xFFEAF0F6)
private val Muted = Color(0xFF6B7D90)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)
        val api = NativeApi(applicationContext)
        setContent {
            MaterialTheme(colorScheme = darkColorScheme(primary = Gold, secondary = Blue, background = Dark, surface = Panel)) {
                CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                    AdminApp(api)
                }
            }
        }
    }
}

@Composable
private fun AdminApp(api: NativeApi) {
    var signedIn by remember { mutableStateOf(false) }
    var adminName by remember { mutableStateOf("المشرف") }
    var password by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }
    var tab by remember { mutableStateOf("home") }
    var accounts by remember { mutableStateOf(JSONArray()) }
    var credits by remember { mutableStateOf(JSONArray()) }
    var ledger by remember { mutableStateOf(JSONArray()) }
    var chats by remember { mutableStateOf(JSONArray()) }
    var config by remember { mutableStateOf(JSONObject()) }
    var selectedAccount by remember { mutableStateOf<JSONObject?>(null) }
    var selectedChat by remember { mutableStateOf<JSONObject?>(null) }
    var filter by remember { mutableStateOf("") }
    var delta by remember { mutableStateOf("100") }
    var reason by remember { mutableStateOf("تعديل رصيد من تطبيق المشرف") }
    var chatMessage by remember { mutableStateOf("") }
    var newUsername by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var initialBalance by remember { mutableStateOf("") }
    var showCreate by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    suspend fun reloadAll() {
        val a = api.app("admin_accounts", JSONObject(), false)
        accounts = a.optJSONArray("accounts") ?: JSONArray()
        val c = api.app("admin_credit_requests", JSONObject(), false)
        credits = c.optJSONArray("requests") ?: JSONArray()
        val l = api.app("admin_ledger", JSONObject(), false)
        ledger = l.optJSONArray("ledger") ?: JSONArray()
        val ch = api.app("admin_chat_rooms", JSONObject(), false)
        chats = ch.optJSONArray("rooms") ?: JSONArray()
        config = api.app("admin_config_get", JSONObject(), false)
    }

    fun runTask(block: suspend () -> Unit) {
        scope.launch {
            busy = true
            error = ""
            message = ""
            try { block() } catch (e: Exception) { error = e.message ?: "تعذر تنفيذ العملية" }
            finally { busy = false }
        }
    }

    LaunchedEffect(Unit) {
        try {
            val me = api.auth("me", JSONObject(), false)
            val u = me.optJSONObject("user") ?: JSONObject()
            if (u.optString("role") == "admin") {
                adminName = u.optString("display_name", "المشرف")
                signedIn = true
                reloadAll()
            } else {
                api.clearSession()
            }
        } catch (_: Exception) {
            signedIn = false
        }
    }

    fun refresh() = runTask { reloadAll() }

    Surface(Modifier.fillMaxSize(), color = Dark) {
        if (!signedIn) {
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(22.dp), verticalArrangement = Arrangement.Center) {
                AdminBrand()
                Spacer(Modifier.height(20.dp))
                Text("دخول المشرف", style = MaterialTheme.typography.headlineSmall, color = Gold, fontWeight = FontWeight.Bold)
                Text("هذا التطبيق منفصل ومخصص للإدارة فقط.", color = Soft)
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(password, { password = it }, Modifier.fillMaxWidth(), label = { Text("كلمة مرور المشرف") }, singleLine = true, visualTransformation = PasswordVisualTransformation())
                Spacer(Modifier.height(12.dp))
                Button(
                    onClick = {
                        if (password.isBlank()) { error = "اكتب كلمة المرور"; return@Button }
                        runTask {
                            val response = api.auth("login", JSONObject().put("username", "ruknadmin").put("password", password), false)
                            val u = response.optJSONObject("user") ?: JSONObject()
                            if (u.optString("role") != "admin") {
                                try { api.auth("logout", JSONObject(), true) } catch (_: Exception) {}
                                api.clearSession()
                                throw ApiFailure("الحساب المستخدم ليس حساب مشرف.")
                            }
                            adminName = u.optString("display_name", "المشرف")
                            password = ""
                            signedIn = true
                            reloadAll()
                        }
                    },
                    enabled = !busy,
                    modifier = Modifier.fillMaxWidth()
                ) { Text(if (busy) "جارٍ التحقق..." else "دخول آمن") }
                if (error.isNotBlank()) Text(error, color = Color(0xFFFF9B9B), modifier = Modifier.padding(top = 10.dp))
            }
        } else {
            Column(Modifier.fillMaxSize()) {
                Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text("ركن الغرب", style = MaterialTheme.typography.headlineSmall, color = Gold, fontWeight = FontWeight.Bold)
                            Text("لوحة المشرف • $adminName", color = Soft)
                        }
                        TextButton(onClick = { runTask { api.auth("logout", JSONObject(), true); api.clearSession(); signedIn = false } }) { Text("خروج", color = Gold) }
                    }
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        TabButton("الرئيسية", tab == "home") { tab = "home"; selectedAccount = null; selectedChat = null }
                        TabButton("الحسابات", tab == "accounts") { tab = "accounts"; selectedAccount = null }
                        TabButton("الطلبات", tab == "credits") { tab = "credits" }
                    }
                    Spacer(Modifier.height(6.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        TabButton("المحادثات", tab == "chats") { tab = "chats"; selectedChat = null }
                        TabButton("السجل", tab == "ledger") { tab = "ledger" }
                        TabButton("الألعاب", tab == "games") { tab = "games" }
                        TextButton(onClick = { refresh() }) { Text("تحديث", color = Gold) }
                    }
                }
                HorizontalDivider(color = Color(0xFF30465C))
                Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(14.dp)) {
                    when (tab) {
                        "home" -> {
                            Text("نظرة عامة", style = MaterialTheme.typography.titleLarge, color = Gold, fontWeight = FontWeight.Bold)
                            Spacer(Modifier.height(10.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                StatTile("الحسابات", accounts.length().toString(), Modifier.weight(1f))
                                StatTile("طلبات الرصيد", pendingCredits(credits).toString(), Modifier.weight(1f))
                                StatTile("حركات السجل", ledger.length().toString(), Modifier.weight(1f))
                            }
                            Spacer(Modifier.height(14.dp))
                            InfoCard("حالة الربط", "متصل بخدمات الخادم وقاعدة البيانات. لا يتم تخزين أرصدة اللاعبين محليًا.")
                            InfoCard("الأمان", "الدخول يُراجع دور الحساب من الخادم. لقطات الشاشة وتسجيل الشاشة محجوبة داخل التطبيق.")
                            InfoCard("حفظ البيانات", "إجراءات أرشفة الحسابات لا تحذف سجلات اللعب أو الحركات المالية التاريخية.")
                            if (error.isNotBlank()) ErrorText(error)
                        }
                        "accounts" -> {
                            if (selectedAccount == null) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("حسابات اللاعبين", style = MaterialTheme.typography.titleLarge, color = Gold, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                                    Button(onClick = { showCreate = true }, colors = ButtonDefaults.buttonColors(containerColor = Green)) { Text("إنشاء حساب") }
                                }
                                OutlinedTextField(filter, { filter = it }, Modifier.fillMaxWidth(), label = { Text("بحث باسم المستخدم أو رقم الحساب") }, singleLine = true)
                                visibleAccounts(accounts, filter).forEach { acc ->
                                    val c = acc.optJSONObject("customer") ?: JSONObject()
                                    DarkCard(Modifier.fillMaxWidth().padding(vertical = 4.dp).clickable { selectedAccount = acc }) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Column(Modifier.weight(1f)) {
                                                Text(acc.optString("username"), color = Soft, fontWeight = FontWeight.Bold)
                                                Text("رقم الحساب: ${acc.optString("legacyUserId", "—")}", color = Muted)
                                                Text("الرصيد: ${money(c.optDouble("balance"))}", color = Gold)
                                            }
                                            Text(if (acc.optString("status") == "active") "نشط" else "مغلق", color = if (acc.optString("status") == "active") Color(0xFF77DCA6) else Color(0xFFFF9090))
                                        }
                                    }
                                }
                            } else {
                                val acc = selectedAccount!!
                                val c = acc.optJSONObject("customer") ?: JSONObject()
                                TextButton(onClick = { selectedAccount = null }) { Text("← رجوع للحسابات", color = Gold) }
                                Text(acc.optString("username"), style = MaterialTheme.typography.headlineSmall, color = Gold, fontWeight = FontWeight.Bold)
                                InfoCard("بيانات الحساب", "رقم الحساب: ${acc.optString("legacyUserId", "—")}\\nالحالة: ${acc.optString("status")}\\nالجولات: ${c.optInt("rounds")} • كسب: ${c.optInt("wins")} • خسارة: ${c.optInt("losses")}")
                                InfoCard("الرصيد الحالي", money(c.optDouble("balance")))
                                OutlinedTextField(delta, { delta = it }, Modifier.fillMaxWidth(), label = { Text("قيمة تعديل الرصيد (+ أو -)") }, singleLine = true)
                                OutlinedTextField(reason, { reason = it }, Modifier.fillMaxWidth(), label = { Text("سبب التعديل") }, minLines = 2)
                                Button(
                                    onClick = {
                                        val amount = delta.toDoubleOrNull()
                                        if (amount == null || amount == 0.0) { error = "اكتب قيمة تعديل صحيحة"; return@Button }
                                        runTask {
                                            api.app("admin_adjust", JSONObject()
                                                .put("userId", acc.optString("id"))
                                                .put("delta", amount)
                                                .put("reason", reason)
                                                .put("idempotencyKey", UUID.randomUUID().toString()), true)
                                            reloadAll()
                                            selectedAccount = accounts.optJSONObject((0 until accounts.length()).firstOrNull { accounts.optJSONObject(it)?.optString("id") == acc.optString("id") } ?: 0)
                                            message = "تم إرسال تعديل الرصيد واعتماده من الخادم."
                                        }
                                    },
                                    enabled = !busy,
                                    modifier = Modifier.fillMaxWidth()
                                ) { Text("حفظ تعديل الرصيد") }
                                Button(
                                    onClick = {
                                        runTask {
                                            val next = if (acc.optString("status") == "active") "closed" else "active"
                                            api.app("admin_status", JSONObject().put("userId", acc.optString("id")).put("status", next), true)
                                            reloadAll()
                                            selectedAccount = accounts.optJSONObject((0 until accounts.length()).firstOrNull { accounts.optJSONObject(it)?.optString("id") == acc.optString("id") } ?: 0)
                                            message = "تم تحديث حالة الحساب."
                                        }
                                    },
                                    enabled = !busy,
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = ButtonDefaults.buttonColors(containerColor = if (acc.optString("status") == "active") Red else Green)
                                ) { Text(if (acc.optString("status") == "active") "إيقاف الحساب" else "إعادة فتح الحساب") }
                                if (message.isNotBlank()) Text(message, color = Color(0xFF77DCA6))
                            }
                        }
                        "credits" -> {
                            Text("طلبات الرصيد الافتراضي", style = MaterialTheme.typography.titleLarge, color = Gold, fontWeight = FontWeight.Bold)
                            if (credits.length() == 0) InfoCard("لا توجد طلبات", "طلبات اللاعبين ستظهر هنا عند وصولها.")
                            (0 until credits.length()).forEach { i ->
                                val req = credits.optJSONObject(i) ?: JSONObject()
                                DarkCard(Modifier.fillMaxWidth().padding(vertical = 5.dp)) {
                                    Text("${req.optString("username")} • ${money(req.optDouble("requested_amount"))}", color = Soft, fontWeight = FontWeight.Bold)
                                    Text("الحالة: ${req.optString("status")} • الطريقة: ${req.optString("method")}", color = Muted)
                                    Text(req.optString("note"), color = Soft)
                                    if (req.optString("status") == "pending") {
                                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            Button(onClick = { reviewRequest(req, true) { runTask { api.app("admin_credit_review", JSONObject().put("requestId", req.optString("id")).put("approve", true), true); reloadAll() } } }, enabled = !busy, colors = ButtonDefaults.buttonColors(containerColor = Green), modifier = Modifier.weight(1f)) { Text("موافقة") }
                                            Button(onClick = { reviewRequest(req, false) { runTask { api.app("admin_credit_review", JSONObject().put("requestId", req.optString("id")).put("approve", false), true); reloadAll() } } }, enabled = !busy, colors = ButtonDefaults.buttonColors(containerColor = Red), modifier = Modifier.weight(1f)) { Text("رفض") }
                                        }
                                    }
                                }
                            }
                        }
                        "chats" -> {
                            if (selectedChat == null) {
                                Text("محادثات الدعم", style = MaterialTheme.typography.titleLarge, color = Gold, fontWeight = FontWeight.Bold)
                                (0 until chats.length()).forEach { i ->
                                    val room = chats.optJSONObject(i) ?: JSONObject()
                                    val msgs = room.optJSONArray("messages") ?: JSONArray()
                                    val last = if (msgs.length() > 0) msgs.optJSONObject(msgs.length() - 1)?.optString("message") else ""
                                    DarkCard(Modifier.fillMaxWidth().padding(vertical = 4.dp).clickable { selectedChat = room }) {
                                        Text(room.optString("username"), color = Soft, fontWeight = FontWeight.Bold)
                                        Text(last ?: "", color = Muted, maxLines = 2)
                                    }
                                }
                            } else {
                                val room = selectedChat!!
                                TextButton(onClick = { selectedChat = null }) { Text("← رجوع للمحادثات", color = Gold) }
                                Text(room.optString("username"), color = Gold, style = MaterialTheme.typography.titleLarge)
                                val msgs = room.optJSONArray("messages") ?: JSONArray()
                                (0 until msgs.length()).forEach { i ->
                                    val m = msgs.optJSONObject(i) ?: JSONObject()
                                    InfoCard(if (m.optString("sender_role") == "admin") "المشرف" else "اللاعب", m.optString("message"))
                                }
                                OutlinedTextField(chatMessage, { chatMessage = it }, Modifier.fillMaxWidth(), label = { Text("اكتب رد المشرف") }, minLines = 2)
                                Button(onClick = {
                                    if (chatMessage.isBlank()) return@Button
                                    runTask {
                                        api.app("admin_chat_send", JSONObject().put("userId", room.optString("userId")).put("message", chatMessage), true)
                                        chatMessage = ""
                                        reloadAll()
                                        selectedChat = (0 until chats.length()).mapNotNull { chats.optJSONObject(it) }.firstOrNull { it.optString("userId") == room.optString("userId") }
                                    }
                                }, enabled = !busy, modifier = Modifier.fillMaxWidth()) { Text("إرسال الرد") }
                            }
                        }
                        "ledger" -> {
                            Text("سجل حركات الرصيد", style = MaterialTheme.typography.titleLarge, color = Gold, fontWeight = FontWeight.Bold)
                            (0 until minOf(ledger.length(), 300)).forEach { i ->
                                val row = ledger.optJSONObject(i) ?: JSONObject()
                                val amount = row.optDouble("amount_delta")
                                DarkCard(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                                    Text("${row.optString("username")} • ${row.optString("event_type")}", color = Soft, fontWeight = FontWeight.Bold)
                                    Text("التغير: ${if (amount >= 0) "+" else ""}${money(amount)}", color = if (amount >= 0) Color(0xFF77DCA6) else Color(0xFFFF9090))
                                    Text("قبل: ${money(row.optDouble("balance_before"))} • بعد: ${money(row.optDouble("balance_after"))}", color = Muted)
                                    Text(row.optString("created_at"), color = Muted, style = MaterialTheme.typography.bodySmall)
                                }
                            }
                        }
                        "games" -> {
                            Text("إعدادات الألعاب", style = MaterialTheme.typography.titleLarge, color = Gold, fontWeight = FontWeight.Bold)
                            Text("النسب الحالية للجوائز معروضة للقراءة فقط في هذه النسخة؛ لا يتم تعديلها تلقائيًا.", color = Soft)
                            val games = config.optJSONObject("games") ?: JSONObject()
                            val keys = games.keys()
                            while (keys.hasNext()) {
                                val key = keys.next()
                                val game = games.optJSONObject(key) ?: JSONObject()
                                DarkCard(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                                    Text(game.optString("name", key), color = Soft, fontWeight = FontWeight.Bold)
                                    Text("المعرّف: $key • المحرك: ${game.optString("engine")}", color = Muted)
                                    Text("العائد المعلن: ${game.optDouble("rtp", 0.0)}% • ${if (game.optBoolean("on", true)) "مفعّلة" else "متوقفة"}", color = Gold)
                                }
                            }
                            InfoCard("حماية نسب الجوائز", "لم يتم تغيير أي نسبة عائد أو إعداد للمكسب والخسارة.")
                        }
                    }
                    if (error.isNotBlank()) ErrorText(error)
                }
                HorizontalDivider(color = Color(0xFF30465C))
                Text("تطبيق إدارة مستقل • وصول إداري فقط", color = Muted, modifier = Modifier.align(Alignment.CenterHorizontally).padding(8.dp), style = MaterialTheme.typography.bodySmall)
            }
        }
    }

    if (showCreate) {
        AlertDialog(
            onDismissRequest = { showCreate = false },
            title = { Text("إنشاء حساب لاعب") },
            text = {
                Column {
                    OutlinedTextField(newUsername, { newUsername = it }, label = { Text("اسم المستخدم") }, singleLine = true)
                    OutlinedTextField(newPassword, { newPassword = it }, label = { Text("كلمة المرور (10 أحرف على الأقل)") }, singleLine = true, visualTransformation = PasswordVisualTransformation())
                    OutlinedTextField(initialBalance, { initialBalance = it }, label = { Text("الرصيد الابتدائي (اتركه فارغًا للإعداد الافتراضي)") }, singleLine = true)
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    runTask {
                        val body = JSONObject().put("username", newUsername.trim()).put("password", newPassword)
                        if (initialBalance.isNotBlank()) body.put("initialBalance", initialBalance.toDoubleOrNull() ?: throw ApiFailure("الرصيد الابتدائي غير صحيح"))
                        api.app("admin_create_account", body, true)
                        showCreate = false
                        newUsername = ""; newPassword = ""; initialBalance = ""
                        reloadAll()
                    }
                }, enabled = !busy) { Text("إنشاء") }
            },
            dismissButton = { TextButton(onClick = { showCreate = false }) { Text("إلغاء") } }
        )
    }
}

@Composable
private fun AdminBrand() {
    Card(colors = CardDefaults.cardColors(containerColor = Panel), modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text("🛡️", style = MaterialTheme.typography.displayMedium)
            Text("ركن الغرب", style = MaterialTheme.typography.headlineMedium, color = Gold, fontWeight = FontWeight.Bold)
            Text("تطبيق المشرف", color = Soft)
        }
    }
}

@Composable
private fun TabButton(label: String, selected: Boolean, onClick: () -> Unit) {
    Button(onClick = onClick, contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp), colors = ButtonDefaults.buttonColors(containerColor = if (selected) Blue else Panel, contentColor = Color.White), modifier = Modifier.height(40.dp)) {
        Text(label, style = MaterialTheme.typography.labelMedium)
    }
}

@Composable
private fun StatTile(title: String, value: String, modifier: Modifier = Modifier) {
    Card(modifier, colors = CardDefaults.cardColors(containerColor = Panel)) {
        Column(Modifier.padding(12.dp)) {
            Text(title, color = Muted)
            Text(value, style = MaterialTheme.typography.headlineSmall, color = Gold, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun DarkCard(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Card(modifier, colors = CardDefaults.cardColors(containerColor = Panel)) {
        Column(Modifier.fillMaxWidth().padding(12.dp), content = content)
    }
}

@Composable
private fun InfoCard(title: String, body: String) {
    DarkCard(Modifier.fillMaxWidth().padding(vertical = 5.dp)) {
        Text(title, color = Gold, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(4.dp))
        Text(body, color = Soft)
    }
}

@Composable
private fun ErrorText(value: String) {
    Text(value, color = Color(0xFFFF9B9B), modifier = Modifier.padding(8.dp))
}

private fun money(value: Double): String = String.format(java.util.Locale.US, "%,.2f", value)

private fun pendingCredits(items: JSONArray): Int =
    (0 until items.length()).count { items.optJSONObject(it)?.optString("status") == "pending" }

private fun visibleAccounts(items: JSONArray, query: String): List<JSONObject> {
    val q = query.trim().lowercase()
    return (0 until items.length()).mapNotNull { items.optJSONObject(it) }
        .filter { q.isBlank() || it.optString("username").lowercase().contains(q) || it.optString("legacyUserId").contains(q) }
}

private fun reviewRequest(request: JSONObject, approve: Boolean, confirm: () -> Unit) {
    confirm()
}

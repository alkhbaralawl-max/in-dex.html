package com.ruknalgharb.admin

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.HttpUrl.Companion.toHttpUrl
import org.json.JSONObject
import java.util.Date
import java.util.concurrent.TimeUnit

class ApiFailure(message: String, val status: Int = 0) : Exception(message)

private class SavedCookieJar(context: Context) : CookieJar {
    private val prefs = context.getSharedPreferences("admin_native_session", Context.MODE_PRIVATE)
    private val lock = Any()
    private val cookies = mutableListOf<Cookie>()
    private val host = "https://qoeefydvmkdigixsbpuy.supabase.co".toHttpUrl()

    init {
        val stored = prefs.getStringSet("cookies", emptySet()) ?: emptySet()
        stored.forEach { raw -> Cookie.parse(host, raw)?.let { if (it.expiresAt() > System.currentTimeMillis()) cookies.add(it) } }
    }

    override fun loadForRequest(url: HttpUrl): List<Cookie> = synchronized(lock) {
        cookies.removeAll { it.expiresAt() <= System.currentTimeMillis() }
        cookies.filter { it.matches(url) }
    }

    override fun saveFromResponse(url: HttpUrl, incoming: List<Cookie>) = synchronized(lock) {
        incoming.forEach { fresh ->
            cookies.removeAll { it.name() == fresh.name() && it.domain() == fresh.domain() && it.path() == fresh.path() }
            if (fresh.expiresAt() > System.currentTimeMillis() && fresh.value().isNotEmpty()) cookies.add(fresh)
        }
        val serialised = cookies.map { c ->
            buildString {
                append(c.name()).append('=').append(c.value())
                if (!c.hostOnly()) append("; Domain=").append(c.domain())
                append("; Path=").append(c.path())
                if (c.expiresAt() != Long.MAX_VALUE) append("; Expires=").append(Date(c.expiresAt()).toGMTString())
                if (c.secure()) append("; Secure")
                if (c.httpOnly()) append("; HttpOnly")
            }
        }.toSet()
        prefs.edit().putStringSet("cookies", serialised).apply()
    }

    fun clear() = synchronized(lock) {
        cookies.clear()
        prefs.edit().remove("cookies").apply()
    }
}

class NativeApi(context: Context) {
    private val jar = SavedCookieJar(context.applicationContext)
    private val prefs = context.getSharedPreferences("native_session", Context.MODE_PRIVATE)
    private val client = OkHttpClient.Builder()
        .cookieJar(jar)
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .callTimeout(35, TimeUnit.SECONDS)
        .build()

    @Volatile var csrfToken: String = prefs.getString("csrf", "") ?: ""
        private set

    suspend fun auth(action: String, payload: JSONObject = JSONObject(), csrf: Boolean = true): JSONObject =
        post("auth-api", action, payload, csrf)

    suspend fun app(action: String, payload: JSONObject = JSONObject(), csrf: Boolean = true): JSONObject =
        post("app-api", action, payload, csrf)

    private suspend fun post(endpoint: String, action: String, payload: JSONObject, useCsrf: Boolean): JSONObject =
        withContext(Dispatchers.IO) {
            val body = JSONObject(payload.toString()).put("action", action)
            val request = Request.Builder()
                .url("https://qoeefydvmkdigixsbpuy.supabase.co/functions/v1/$endpoint")
                .header("apikey", PUBLISHABLE_KEY)
                .header("Origin", ALLOWED_ORIGIN)
                .header("Accept", "application/json")
                .header("Cache-Control", "no-store")
                .apply { if (useCsrf && csrfToken.isNotBlank()) header("x-csrf-token", csrfToken) }
                .post(body.toString().toRequestBody("application/json; charset=utf-8".toMediaType()))
                .build()

            try {
                client.newCall(request).execute().use { response ->
                    val text = response.body?.string().orEmpty()
                    val data = try { JSONObject(text) } catch (_: Exception) { JSONObject() }
                    if (!response.isSuccessful) {
                        if (response.code == 401) {
                            jar.clear()
                            setCsrf("")
                        }
                        val error = data.optString("error", "request_failed")
                        throw ApiFailure(messageFor(error, response.code), response.code)
                    }
                    val token = data.optString("csrfToken")
                    if (token.isNotBlank()) setCsrf(token)
                    if (action == "logout" || action == "change_password") {
                        jar.clear()
                        setCsrf("")
                    }
                    data
                }
            } catch (e: ApiFailure) {
                throw e
            } catch (e: Exception) {
                throw ApiFailure("تعذر الاتصال بالخادم. تأكد من الإنترنت ثم حاول مرة أخرى.")
            }
        }

    private fun setCsrf(value: String) {
        csrfToken = value
        prefs.edit().putString("csrf", value).apply()
    }

    fun clearSession() {
        jar.clear()
        setCsrf("")
    }

    companion object {
        private const val ALLOWED_ORIGIN = "https://alkhbaralawl-max.github.io"
        // Supabase publishable client key. It is intended for client applications;
        // data access still relies on the server-side authenticated session.
        private const val PUBLISHABLE_KEY = "sb_publishable_buyanIYkhiKL8rQPw2mZpg_J7c4bXAn"

        private fun messageFor(error: String, status: Int): String = when (error) {
            "unauthorized" -> "انتهت جلسة الدخول. سجّل الدخول مرة أخرى."
            "invalid_credentials" -> "اسم المستخدم أو كلمة المرور غير صحيح."
            "password_policy" -> "كلمة المرور يجب أن تكون 10 أحرف على الأقل."
            "username_taken" -> "اسم المستخدم مستخدم بالفعل."
            "registration_closed" -> "التسجيل مغلق حاليًا."
            "too_many_attempts" -> "محاولات كثيرة. انتظر قليلًا ثم حاول."
            "insufficient_virtual_balance" -> "الرصيد الافتراضي غير كافٍ."
            "active_game_exists" -> "أنهِ الجولة الحالية أولًا."
            "admin_required" -> "هذه العملية للمشرف فقط."
            "origin_not_allowed" -> "الخادم رفض مصدر الاتصال. يلزم ضبط دعم التطبيق الأصلي."
            else -> if (status >= 500) "حدث خطأ في الخادم. حاول لاحقًا." else error
        }
    }
}

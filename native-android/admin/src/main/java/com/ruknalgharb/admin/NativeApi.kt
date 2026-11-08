package com.ruknalgharb.admin

class ApiFailure(message: String, val status: Int = 0) : Exception(message)

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.MediaType.Companion.toMediaType
import org.json.JSONArray
import org.json.JSONObject
import java.nio.charset.StandardCharsets
import java.util.Date
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import java.util.concurrent.TimeUnit

private class SecureSessionStore(context: Context) {
    private val prefs = context.getSharedPreferences("admin_secure", Context.MODE_PRIVATE)
    private val alias = "admin_session_key"

    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore")
        store.load(null)
        (store.getKey(alias, null) as? SecretKey)?.let { return it }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        generator.init(
            KeyGenParameterSpec.Builder(
                alias,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build()
        )
        return generator.generateKey()
    }

    fun put(name: String, value: String) {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key())
        val encrypted = cipher.doFinal(value.toByteArray(StandardCharsets.UTF_8))
        val packed = cipher.iv + encrypted
        prefs.edit().putString(name, Base64.encodeToString(packed, Base64.NO_WRAP)).apply()
    }

    fun get(name: String): String? {
        val raw = prefs.getString(name, null) ?: return null
        return try {
            val packed = Base64.decode(raw, Base64.NO_WRAP)
            if (packed.size <= 12) return null
            val iv = packed.copyOfRange(0, 12)
            val encrypted = packed.copyOfRange(12, packed.size)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, iv))
            String(cipher.doFinal(encrypted), StandardCharsets.UTF_8)
        } catch (_: Exception) {
            prefs.edit().remove(name).apply()
            null
        }
    }

    fun remove(name: String) { prefs.edit().remove(name).apply() }
}

private class SavedCookieJar(context: Context) : CookieJar {
    private val store = SecureSessionStore(context.applicationContext)
    private val lock = Any()
    private val cookies = mutableListOf<Cookie>()
    private val host = "https://qoeefydvmkdigixsbpuy.supabase.co".toHttpUrl()

    init {
        val stored = try { JSONArray(store.get("cookies") ?: "[]") } catch (_: Exception) { JSONArray() }
        for (i in 0 until stored.length()) {
            Cookie.parse(host, stored.optString(i))?.let { if (it.expiresAt() > System.currentTimeMillis()) cookies.add(it) }
        }
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
        val serialised = JSONArray()
        cookies.forEach { c ->
            val header = buildString {
                append(c.name()).append('=').append(c.value())
                if (!c.hostOnly()) append("; Domain=").append(c.domain())
                append("; Path=").append(c.path())
                if (c.expiresAt() != Long.MAX_VALUE) append("; Expires=").append(Date(c.expiresAt()).toGMTString())
                if (c.secure()) append("; Secure")
                if (c.httpOnly()) append("; HttpOnly")
            }
            serialised.put(header)
        }
        store.put("cookies", serialised.toString())
    }

    fun clear() = synchronized(lock) {
        cookies.clear()
        store.remove("cookies")
    }
}

class NativeApi(context: Context) {
    private val jar = SavedCookieJar(context.applicationContext)
    private val secureStore = SecureSessionStore(context.applicationContext)
    private val client = OkHttpClient.Builder()
        .cookieJar(jar)
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .callTimeout(35, TimeUnit.SECONDS)
        .build()

    @Volatile var csrfToken: String = secureStore.get("csrf") ?: ""
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
            } catch (_: Exception) {
                throw ApiFailure("تعذر الاتصال بالخادم. تأكد من الإنترنت ثم حاول مرة أخرى.")
            }
        }

    private fun setCsrf(value: String) {
        csrfToken = value
        if (value.isBlank()) secureStore.remove("csrf") else secureStore.put("csrf", value)
    }

    fun clearSession() {
        jar.clear()
        setCsrf("")
    }

    companion object {
        private const val ALLOWED_ORIGIN = "https://alkhbaralawl-max.github.io"
        // A publishable client key only; authorization is enforced by server-side sessions and role checks.
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
            "unknown_game" -> "اللعبة غير مفعّلة على الخادم الحالي."
            else -> if (status >= 500) "حدث خطأ في الخادم. حاول لاحقًا." else error
        }
    }
}

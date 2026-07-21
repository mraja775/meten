package ai.prodloop.meten.consumer.data

import android.content.ContentResolver
import ai.prodloop.meten.consumer.BuildConfig
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class ConsumerApi(
    private val resolver: ContentResolver,
    private val tokenProvider: () -> String?,
    baseUrl: String = BuildConfig.API_BASE_URL
) {
    private val root = baseUrl.trimEnd('/')
    private val jsonType = "application/json; charset=utf-8".toMediaType()
    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(120, TimeUnit.SECONDS)
        .callTimeout(150, TimeUnit.SECONDS)
        .build()

    fun requestOtp(email: String, academySlug: String = "") {
        val payload = JSONObject().put("email", email)
        if (academySlug.isNotBlank()) payload.put("academySlug", academySlug)
        execute("/api/consumer/auth/request-otp", "POST", payload).close()
    }

    fun verifyOtp(email: String, otp: String): AuthSession {
        val root = bodyJson(execute("/api/consumer/auth/verify-otp", "POST", JSONObject().put("email", email).put("code", otp)))
        val data = root.optJSONObject("data") ?: root
        val profile = data.optJSONObject("student") ?: data.optJSONObject("profile") ?: JSONObject()
        return AuthSession(
            token = data.optString("token").ifBlank { data.optString("accessToken") },
            profile = ConsumerProfile(
                id = profile.optString("id"),
                name = profile.optString("fullName", "Student"),
                email = profile.optString("email", email),
                academyName = profile.optString("academyName")
            )
        ).also { require(it.token.isNotBlank()) { "The server did not return a session token." } }
    }

    fun profile(): ConsumerProfile {
        val data = dataObject(bodyJson(execute("/api/consumer/auth/me"))).optJSONObject("student") ?: JSONObject()
        return ConsumerProfile(data.optString("id"), data.optString("fullName", "Student"), data.optString("email"), data.optString("academyName"))
    }

    fun sessions(): List<TrainingSession> {
        val root = bodyJson(execute("/api/consumer/training-sessions?pageSize=50"))
        val array = root.optJSONArray("data") ?: JSONArray()
        return (0 until array.length()).map { parseSession(array.getJSONObject(it)) }
    }

    fun session(id: String): TrainingSession = parseSession(dataObject(bodyJson(execute("/api/consumer/training-sessions/$id"))))

    fun correctSession(id: String, shotScores: List<Double>, seriesTotals: List<Double>, groupSizeMm: Double?): TrainingSession {
        val payload = JSONObject().put("shotScores", JSONArray(shotScores))
        if (seriesTotals.isNotEmpty()) payload.put("seriesTotals", JSONArray(seriesTotals))
        groupSizeMm?.let { payload.put("groupSizeMm", it) }
        val response = executeRequest(Request.Builder().url("$root/api/consumer/training-sessions/$id/corrections").patch(payload.toString().toRequestBody(jsonType)))
        return parseSession(dataObject(bodyJson(response)))
    }

    fun upload(request: TrainingSessionRequest): TrainingSession {
        require(request.images.isNotEmpty()) { "Add at least one score-sheet photo." }
        val body = MultipartBody.Builder().setType(MultipartBody.FORM)
            .addFormDataPart("sessionDate", request.sessionDate.toString())
            .addFormDataPart("sessionTime", request.sessionTime.toString())
            .addFormDataPart("notes", request.notes)
            .addFormDataPart("reflectionText", request.reflectionText)
            .addFormDataPart("reflectionInputMode", request.reflectionInputMode.wireValue)
        request.images.forEach { image ->
            val bytes = resolver.openInputStream(image.uri)?.use { it.readBytes() }
                ?: error("Could not read ${image.fileName}.")
            body.addFormDataPart("images", image.fileName, bytes.toRequestBody(image.mimeType.toMediaType()))
        }
        val root = bodyJson(executeRequest(Request.Builder().url("$root/api/consumer/training-sessions").post(body.build())))
        return parseSession(dataObject(root))
    }

    fun logout() {
        runCatching { execute("/api/consumer/auth/logout", "POST", JSONObject()).close() }
    }

    private fun execute(path: String, method: String = "GET", json: JSONObject? = null) = executeRequest(
        Request.Builder().url(root + path).apply {
            if (method == "POST") post((json ?: JSONObject()).toString().toRequestBody(jsonType))
        }
    )

    private fun executeRequest(builder: Request.Builder): okhttp3.Response {
        tokenProvider()?.takeIf { it.isNotBlank() }?.let { builder.header("Authorization", "Bearer $it") }
        val response = try { client.newCall(builder.header("Accept", "application/json").build()).execute() }
        catch (_: java.net.SocketTimeoutException) { throw ApiException(0, "TIMEOUT", "The request timed out. Check your connection and try again.") }
        catch (_: java.io.IOException) { throw ApiException(0, "NETWORK_ERROR", "Unable to reach Meten. Check your internet connection.") }
        if (!response.isSuccessful) {
            val raw = response.body?.string().orEmpty()
            val error = runCatching { JSONObject(raw).optJSONObject("error") }.getOrNull()
            val message = error?.optString("message")?.takeIf { it.isNotBlank() }
                ?: when (response.code) { 401 -> "Your session has expired. Please sign in again."; 429 -> "Too many attempts. Please wait and try again."; else -> "Something went wrong. Please try again." }
            response.close()
            throw ApiException(response.code, error?.optString("code").orEmpty(), message)
        }
        return response
    }

    private fun bodyJson(response: okhttp3.Response): JSONObject = response.use {
        val type = it.header("Content-Type").orEmpty()
        if (!type.contains("json", ignoreCase = true)) throw ApiException(it.code, "INVALID_RESPONSE", "The server returned an unexpected response.")
        JSONObject(it.body?.string().orEmpty())
    }

    private fun dataObject(root: JSONObject) = root.optJSONObject("data") ?: root

    private fun parseSession(item: JSONObject): TrainingSession {
        val parsed = item.optJSONObject("verifiedScores")
            ?: item.optJSONObject("parsedScores")
            ?: JSONObject()
        return TrainingSession(
            id = item.optString("id"), sessionDate = item.optString("sessionDate"), sessionTime = item.optString("sessionTime"),
            notes = item.optString("notes"), reflectionText = item.optString("reflectionText"),
            imageUrls = ((item.optJSONArray("images")?.let(::strings) ?: emptyList()) + listOfNotNull(item.optString("imageUrl").takeIf(String::isNotBlank))).distinct().map { absoluteUrl(it) },
            totalScore = number(parsed, "totalScore") ?: number(item, "totalScore"), averageScore = number(parsed, "averageShotScore"),
            shotCount = parsed.optInt("shotCount").takeIf { parsed.has("shotCount") }, groupSize = number(parsed, "groupSizeMm"),
            shotScores = numbers(parsed.optJSONArray("shotScores")), seriesTotals = numbers(parsed.optJSONArray("seriesTotals")),
            ocrStatus = item.optString("ocrStatus", parsed.optString("status", "PROCESSING")),
            suggestions = strings(parsed.optJSONArray("actionSuggestions"))
        )
    }

    private fun number(json: JSONObject, key: String) = json.optDouble(key, Double.NaN).takeUnless { it.isNaN() }
    private fun numbers(array: JSONArray?): List<Double> = if (array == null) emptyList() else (0 until array.length()).mapNotNull { array.optDouble(it, Double.NaN).takeUnless { value -> value.isNaN() } }
    private fun strings(array: JSONArray?): List<String> = if (array == null) emptyList() else (0 until array.length()).map { index ->
        val value = array.opt(index); if (value is JSONObject) value.optString("imageUrl", value.optString("url")) else value.toString()
    }
    private fun absoluteUrl(value: String) = if (value.startsWith("http://") || value.startsWith("https://")) value else root + "/" + value.trimStart('/')
}

package ai.prodloop.meten.consumer.data

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class SessionStore(context: Context) {
    private val preferences = EncryptedSharedPreferences.create(
        context,
        "consumer_session",
        MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    val token: String? get() = preferences.getString("token", null)

    fun save(session: AuthSession) {
        preferences.edit()
            .putString("token", session.token)
            .putString("id", session.profile.id)
            .putString("name", session.profile.name)
            .putString("email", session.profile.email)
            .putString("academy", session.profile.academyName)
            .apply()
    }

    fun profile(): ConsumerProfile? {
        if (token.isNullOrBlank()) return null
        return ConsumerProfile(
            id = preferences.getString("id", "").orEmpty(),
            name = preferences.getString("name", "Student").orEmpty(),
            email = preferences.getString("email", "").orEmpty(),
            academyName = preferences.getString("academy", "").orEmpty()
        )
    }

    fun clear() = preferences.edit().clear().apply()
}

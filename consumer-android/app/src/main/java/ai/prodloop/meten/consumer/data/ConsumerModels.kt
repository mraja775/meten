package ai.prodloop.meten.consumer.data

data class ConsumerProfile(
    val id: String,
    val name: String,
    val email: String,
    val academyName: String = ""
)

data class AuthSession(val token: String, val profile: ConsumerProfile)

data class TrainingSession(
    val id: String,
    val sessionDate: String,
    val sessionTime: String,
    val notes: String,
    val reflectionText: String,
    val imageUrls: List<String>,
    val totalScore: Double?,
    val averageScore: Double?,
    val shotCount: Int?,
    val groupSize: Double?,
    val shotScores: List<Double>,
    val seriesTotals: List<Double>,
    val ocrStatus: String,
    val suggestions: List<String>
)

class ApiException(val status: Int, val code: String, message: String) : Exception(message)

sealed interface LoadState<out T> {
    data object Loading : LoadState<Nothing>
    data class Ready<T>(val value: T) : LoadState<T>
    data class Failed(val message: String) : LoadState<Nothing>
}

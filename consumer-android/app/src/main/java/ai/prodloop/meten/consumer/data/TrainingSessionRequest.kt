package ai.prodloop.meten.consumer.data

import android.net.Uri
import java.time.LocalDate
import java.time.LocalTime

enum class ReflectionInputMode(val wireValue: String) {
    Typed("typed"),
    Speech("speech")
}

data class ApiSettings(
    val baseUrl: String,
    val sessionCookie: String
)

data class ScoreImage(
    val uri: Uri,
    val fileName: String,
    val mimeType: String
)

data class TrainingSessionRequest(
    val studentId: String,
    val sessionDate: LocalDate,
    val sessionTime: LocalTime,
    val notes: String,
    val reflectionText: String,
    val reflectionInputMode: ReflectionInputMode,
    val images: List<ScoreImage>
)

sealed interface UploadState {
    data object Idle : UploadState
    data object Uploading : UploadState
    data class Saved(val message: String) : UploadState
    data class Failed(val message: String) : UploadState
}

package ai.prodloop.meten.consumer.data

import android.content.ContentResolver
import java.io.ByteArrayOutputStream
import java.io.DataOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

class ConsumerTrainingApi(
    private val contentResolver: ContentResolver
) {
    fun upload(settings: ApiSettings, request: TrainingSessionRequest): Result<String> {
        return runCatching {
            require(request.images.isNotEmpty()) { "Add at least one score image." }

            val boundary = "Meten-${UUID.randomUUID()}"
            val endpoint = settings.baseUrl.trimEnd('/') + "/api/training-sessions"
            val connection = (URL(endpoint).openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                doOutput = true
                connectTimeout = 15_000
                readTimeout = 120_000
                setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")
                if (settings.sessionCookie.isNotBlank()) {
                    setRequestProperty("Cookie", settings.sessionCookie)
                }
            }

            connection.outputStream.use { output ->
                DataOutputStream(output).use { multipart ->
                    writeTextPart(multipart, boundary, "studentId", request.studentId)
                    writeTextPart(multipart, boundary, "sessionDate", request.sessionDate.toString())
                    writeTextPart(multipart, boundary, "sessionTime", request.sessionTime.toString())
                    writeTextPart(multipart, boundary, "notes", request.notes)
                    writeTextPart(multipart, boundary, "reflectionText", request.reflectionText)
                    writeTextPart(multipart, boundary, "reflectionInputMode", request.reflectionInputMode.wireValue)

                    request.images.forEach { image ->
                        contentResolver.openInputStream(image.uri).use { input ->
                            requireNotNull(input) { "Could not read ${image.fileName}." }
                            writeFilePart(
                                multipart = multipart,
                                boundary = boundary,
                                name = "images",
                                fileName = image.fileName,
                                mimeType = image.mimeType,
                                bytes = input.readBytes()
                            )
                        }
                    }

                    multipart.writeBytes("--$boundary--\r\n")
                }
            }

            val body = if (connection.responseCode in 200..299) {
                connection.inputStream.bufferedReader().use { it.readText() }
            } else {
                connection.errorStream?.bufferedReader()?.use { it.readText() }.orEmpty()
            }

            if (connection.responseCode !in 200..299) {
                error(body.ifBlank { "Upload failed with HTTP ${connection.responseCode}." })
            }

            body
        }
    }
}

fun buildMultipartBody(
    boundary: String,
    fields: Map<String, String>,
    files: List<MultipartFile>
): ByteArray {
    val output = ByteArrayOutputStream()
    DataOutputStream(output).use { multipart ->
        fields.forEach { (name, value) ->
            writeTextPart(multipart, boundary, name, value)
        }
        files.forEach { file ->
            writeFilePart(multipart, boundary, "images", file.fileName, file.mimeType, file.bytes)
        }
        multipart.writeBytes("--$boundary--\r\n")
    }
    return output.toByteArray()
}

data class MultipartFile(
    val fileName: String,
    val mimeType: String,
    val bytes: ByteArray
)

private fun writeTextPart(
    multipart: DataOutputStream,
    boundary: String,
    name: String,
    value: String
) {
    multipart.writeBytes("--$boundary\r\n")
    multipart.writeBytes("Content-Disposition: form-data; name=\"$name\"\r\n\r\n")
    multipart.writeBytes(value)
    multipart.writeBytes("\r\n")
}

private fun writeFilePart(
    multipart: DataOutputStream,
    boundary: String,
    name: String,
    fileName: String,
    mimeType: String,
    bytes: ByteArray
) {
    multipart.writeBytes("--$boundary\r\n")
    multipart.writeBytes(
        "Content-Disposition: form-data; name=\"$name\"; filename=\"$fileName\"\r\n"
    )
    multipart.writeBytes("Content-Type: $mimeType\r\n\r\n")
    multipart.write(bytes)
    multipart.writeBytes("\r\n")
}

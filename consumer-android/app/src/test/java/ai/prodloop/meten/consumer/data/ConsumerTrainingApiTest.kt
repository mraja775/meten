package ai.prodloop.meten.consumer.data

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ConsumerTrainingApiTest {
    @Test
    fun buildsMultipartBodyWithRepeatedImagesAndReflectionFields() {
        val body = buildMultipartBody(
            boundary = "Boundary",
            fields = mapOf(
                "studentId" to "student-1",
                "sessionDate" to "2026-07-06",
                "sessionTime" to "08:30",
                "reflectionText" to "Trigger felt rushed in string two.",
                "reflectionInputMode" to "speech"
            ),
            files = listOf(
                MultipartFile("score-1.jpg", "image/jpeg", byteArrayOf(1, 2, 3)),
                MultipartFile("score-2.jpg", "image/jpeg", byteArrayOf(4, 5, 6))
            )
        ).decodeToString()

        assertTrue(body.contains("name=\"reflectionText\""))
        assertTrue(body.contains("Trigger felt rushed in string two."))
        assertTrue(body.contains("name=\"reflectionInputMode\""))
        assertTrue(body.contains("speech"))
        assertTrue(body.contains("name=\"images\"; filename=\"score-1.jpg\""))
        assertTrue(body.contains("name=\"images\"; filename=\"score-2.jpg\""))
    }

    @Test
    fun multipartBodyUsesValidCrlfFramingAndClosingBoundary() {
        val body = buildMultipartBody(
            boundary = "MetenBoundary",
            fields = linkedMapOf("notes" to "Steady hold"),
            files = emptyList()
        ).decodeToString()

        assertEquals(
            "--MetenBoundary\r\n" +
                "Content-Disposition: form-data; name=\"notes\"\r\n\r\n" +
                "Steady hold\r\n" +
                "--MetenBoundary--\r\n",
            body
        )
        assertFalse(body.replace("\r\n", "").contains('\n'))
    }

    @Test
    fun multipartBodyPreservesArbitraryImageBytes() {
        val imageBytes = byteArrayOf(0, 1, 13, 10, 127, -1, -128)
        val body = buildMultipartBody(
            boundary = "BinaryBoundary",
            fields = emptyMap(),
            files = listOf(MultipartFile("score.png", "image/png", imageBytes))
        )

        val header = (
            "--BinaryBoundary\r\n" +
                "Content-Disposition: form-data; name=\"images\"; filename=\"score.png\"\r\n" +
                "Content-Type: image/png\r\n\r\n"
            ).encodeToByteArray()
        val trailer = "\r\n--BinaryBoundary--\r\n".encodeToByteArray()
        val expected = header + imageBytes + trailer

        assertArrayEquals(expected, body)
    }

    @Test
    fun multipartBodyKeepsFieldInsertionOrder() {
        val body = buildMultipartBody(
            boundary = "OrderBoundary",
            fields = linkedMapOf(
                "studentId" to "student-1",
                "sessionDate" to "2026-07-20",
                "sessionTime" to "08:30"
            ),
            files = emptyList()
        ).decodeToString()

        val student = body.indexOf("name=\"studentId\"")
        val date = body.indexOf("name=\"sessionDate\"")
        val time = body.indexOf("name=\"sessionTime\"")
        assertTrue(student in 0 until date)
        assertTrue(date in 0 until time)
    }
}

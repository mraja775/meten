package ai.prodloop.meten.consumer.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertSame
import org.junit.Test

class TrainingSessionRequestTest {
    @Test
    fun reflectionInputModesMatchBackendContract() {
        assertEquals("typed", ReflectionInputMode.Typed.wireValue)
        assertEquals("speech", ReflectionInputMode.Speech.wireValue)
    }

    @Test
    fun apiSettingsHaveValueSemantics() {
        val first = ApiSettings("https://api.example.test", "session=secret")
        val same = ApiSettings("https://api.example.test", "session=secret")
        val changed = first.copy(baseUrl = "https://other.example.test")

        assertEquals(first, same)
        assertEquals(first.hashCode(), same.hashCode())
        assertNotEquals(first, changed)
    }

    @Test
    fun uploadStatesExposeStablePayloads() {
        assertSame(UploadState.Idle, UploadState.Idle)
        assertSame(UploadState.Uploading, UploadState.Uploading)
        assertEquals("Saved", UploadState.Saved("Saved").message)
        assertEquals("Network unavailable", UploadState.Failed("Network unavailable").message)
    }
}

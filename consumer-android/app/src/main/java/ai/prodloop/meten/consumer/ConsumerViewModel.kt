package ai.prodloop.meten.consumer

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import ai.prodloop.meten.consumer.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class AuthUiState(
    val restoring: Boolean = true,
    val profile: ConsumerProfile? = null,
    val email: String = "",
    val academySlug: String = "",
    val otpRequested: Boolean = false,
    val busy: Boolean = false,
    val message: String? = null
)

class ConsumerViewModel(application: Application) : AndroidViewModel(application) {
    private val store = SessionStore(application)
    private val api = ConsumerApi(
        resolver = application.contentResolver,
        tokenProvider = { store.token }
    )
    private val _auth = MutableStateFlow(AuthUiState())
    val auth = _auth.asStateFlow()
    private val _sessions = MutableStateFlow<LoadState<List<TrainingSession>>>(LoadState.Loading)
    val sessions = _sessions.asStateFlow()
    private val _detail = MutableStateFlow<LoadState<TrainingSession>>(LoadState.Loading)
    val detail = _detail.asStateFlow()

    init {
        val saved = store.profile()
        if (saved == null) _auth.value = AuthUiState(restoring = false)
        else viewModelScope.launch {
            runCatching { io { api.profile() } }
                .onSuccess { _auth.value = AuthUiState(restoring = false, profile = it); loadSessions() }
                .onFailure { store.clear(); _auth.value = AuthUiState(restoring = false, message = "Please sign in again.") }
        }
    }

    fun requestOtp(email: String, academySlug: String) {
        val normalized = email.trim().lowercase()
        val normalizedAcademy = academySlug.trim().lowercase()
        if (!android.util.Patterns.EMAIL_ADDRESS.matcher(normalized).matches()) {
            _auth.value = _auth.value.copy(message = "Enter a valid email address."); return
        }
        _auth.value = _auth.value.copy(busy = true, message = null, email = normalized, academySlug = normalizedAcademy)
        viewModelScope.launch { runCatching { io { api.requestOtp(normalized, normalizedAcademy) } }
            .onSuccess { _auth.value = _auth.value.copy(busy = false, otpRequested = true, message = "Enter the code sent to your email.") }
            .onFailure { _auth.value = _auth.value.copy(busy = false, message = friendly(it)) } }
    }

    fun verifyOtp(code: String) {
        if (!code.matches(Regex("\\d{6}"))) { _auth.value = _auth.value.copy(message = "Enter the 6-digit code."); return }
        _auth.value = _auth.value.copy(busy = true, message = null)
        viewModelScope.launch { runCatching { io { api.verifyOtp(_auth.value.email, code) } }
            .onSuccess { session -> store.save(session); _auth.value = AuthUiState(restoring = false, profile = session.profile); loadSessions() }
            .onFailure { _auth.value = _auth.value.copy(busy = false, message = friendly(it)) } }
    }

    fun backToEmail() { _auth.value = _auth.value.copy(otpRequested = false, message = null) }
    fun logout() { viewModelScope.launch { io { api.logout() }; store.clear(); _auth.value = AuthUiState(restoring = false); _sessions.value = LoadState.Loading } }

    fun loadSessions() {
        _sessions.value = LoadState.Loading
        viewModelScope.launch { runCatching { io { api.sessions() } }
            .onSuccess { _sessions.value = LoadState.Ready(it) }
            .onFailure { handleFailure(it) { _sessions.value = LoadState.Failed(friendly(it)) } } }
    }

    fun loadDetail(id: String) {
        _detail.value = LoadState.Loading
        viewModelScope.launch { runCatching { io { api.session(id) } }
            .onSuccess { _detail.value = LoadState.Ready(it) }
            .onFailure { handleFailure(it) { _detail.value = LoadState.Failed(friendly(it)) } } }
    }

    suspend fun upload(request: TrainingSessionRequest): Result<TrainingSession> = runCatching { io { api.upload(request) } }
        .onSuccess { loadSessions() }
        .onFailure { if (it is ApiException && it.status == 401) expireSession() }

    suspend fun correct(id: String, shots: List<Double>, totals: List<Double>, group: Double?): Result<TrainingSession> =
        runCatching { io { api.correctSession(id, shots, totals, group) } }.onSuccess { _detail.value = LoadState.Ready(it); loadSessions() }

    fun friendly(error: Throwable) = error.message?.takeIf { it.isNotBlank() } ?: "Something went wrong. Please try again."
    private fun handleFailure(error: Throwable, block: () -> Unit) { if (error is ApiException && error.status == 401) expireSession() else block() }
    private fun expireSession() { store.clear(); _auth.value = AuthUiState(restoring = false, message = "Your session expired. Please sign in again.") }
    private suspend fun <T> io(block: () -> T): T = withContext(Dispatchers.IO) { block() }
}

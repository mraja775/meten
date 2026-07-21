package ai.prodloop.meten.consumer

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.speech.RecognizerIntent
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import ai.prodloop.meten.consumer.data.*
import ai.prodloop.meten.consumer.ui.theme.MetenTheme
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import java.io.File
import java.time.LocalDate
import java.time.LocalTime
import java.util.Locale

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) { super.onCreate(savedInstanceState); setContent { MetenTheme { ConsumerApp() } } }
}

private enum class Tab { Home, Capture, Profile }

@Composable
fun ConsumerApp(vm: ConsumerViewModel = viewModel()) {
    val auth by vm.auth.collectAsState()
    when {
        auth.restoring -> CenteredProgress("Restoring your session…")
        auth.profile == null -> LoginScreen(auth, vm::requestOtp, vm::verifyOtp, vm::backToEmail)
        else -> SignedInApp(auth.profile!!, vm)
    }
}

@Composable
private fun LoginScreen(state: AuthUiState, request: (String, String) -> Unit, verify: (String) -> Unit, back: () -> Unit) {
    var email by remember(state.email) { mutableStateOf(state.email) }; var academySlug by remember(state.academySlug) { mutableStateOf(state.academySlug) }; var code by remember { mutableStateOf("") }
    Surface(Modifier.fillMaxSize()) { Column(Modifier.fillMaxSize().padding(28.dp), verticalArrangement = Arrangement.Center) {
        Text("Meten", style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp)); Text(if (state.otpRequested) "Check your email" else "Your training, in focus", style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(24.dp))
        if (!state.otpRequested) {
            OutlinedTextField(email, { email = it }, Modifier.fillMaxWidth(), label = { Text("Email address") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email), enabled = !state.busy)
            Spacer(Modifier.height(12.dp)); OutlinedTextField(academySlug, { academySlug = it }, Modifier.fillMaxWidth(), label = { Text("Academy code (if provided)") }, singleLine = true, enabled = !state.busy)
            Spacer(Modifier.height(12.dp)); Button({ request(email, academySlug) }, Modifier.fillMaxWidth(), enabled = !state.busy) { Text(if (state.busy) "Sending…" else "Send sign-in code") }
        } else {
            Text("We sent a 6-digit code to ${state.email}.")
            Spacer(Modifier.height(12.dp)); OutlinedTextField(code, { if (it.length <= 6) code = it.filter(Char::isDigit) }, Modifier.fillMaxWidth(), label = { Text("6-digit code") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword), enabled = !state.busy)
            Spacer(Modifier.height(12.dp)); Button({ verify(code) }, Modifier.fillMaxWidth(), enabled = !state.busy) { Text(if (state.busy) "Signing in…" else "Sign in") }
            TextButton(back, enabled = !state.busy) { Text("Use a different email") }
        }
        state.message?.let { Spacer(Modifier.height(12.dp)); Text(it, color = if (state.otpRequested) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error) }
    } }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SignedInApp(profile: ConsumerProfile, vm: ConsumerViewModel) {
    var tab by rememberSaveable { mutableStateOf(Tab.Home) }; var detailId by rememberSaveable { mutableStateOf<String?>(null) }
    Scaffold(topBar = { TopAppBar(title = { Text(if (detailId != null) "Session details" else when(tab) { Tab.Home -> "Training"; Tab.Capture -> "New session"; Tab.Profile -> "Profile" }) }, navigationIcon = { if (detailId != null) TextButton({ detailId = null }) { Text("Back") } }) },
        bottomBar = { if (detailId == null) NavigationBar { listOf(Tab.Home to "History", Tab.Capture to "Capture", Tab.Profile to "Profile").forEach { (item,label) -> NavigationBarItem(selected = tab == item, onClick = { tab = item }, icon = {}, label = { Text(label) }) } } }
    ) { padding -> Box(Modifier.padding(padding).fillMaxSize()) {
        if (detailId != null) DetailScreen(detailId!!, vm) else when(tab) {
            Tab.Home -> HistoryScreen(vm, onNew = { tab = Tab.Capture }, onOpen = { detailId = it })
            Tab.Capture -> CaptureScreen(vm) { tab = Tab.Home }
            Tab.Profile -> ProfileScreen(profile, vm::logout)
        }
    } }
}

@Composable
private fun HistoryScreen(vm: ConsumerViewModel, onNew: () -> Unit, onOpen: (String) -> Unit) {
    val state by vm.sessions.collectAsState()
    when (val value = state) {
        LoadState.Loading -> CenteredProgress("Loading sessions…")
        is LoadState.Failed -> ErrorState(value.message, vm::loadSessions)
        is LoadState.Ready -> if (value.value.isEmpty()) EmptyState(onNew) else LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) { Text("Recent sessions", style = MaterialTheme.typography.titleLarge); Button(onNew) { Text("Add") } } }
            item { ProgressSummary(value.value) }
            items(value.value, key = { it.id }) { session -> SessionCard(session) { onOpen(session.id) } }
        }
    }
}

@Composable private fun ProgressSummary(sessions: List<TrainingSession>) {
    val scored = sessions.mapNotNull { it.averageScore }
    val recent = scored.take(5)
    val previous = scored.drop(5).take(5)
    val recentAverage = recent.takeIf { it.isNotEmpty() }?.average()
    val delta = if (recent.isNotEmpty() && previous.isNotEmpty()) recent.average() - previous.average() else null
    Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp)) {
        Text("Progress", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(6.dp))
        Text(recentAverage?.let { "Recent average ${format(it)}" } ?: "Scores are still processing")
        delta?.let { Text("${if (it >= 0) "+" else ""}${format(it)} versus your previous five sessions", color = if (it >= 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant) }
        scored.maxOrNull()?.let { Text("Best average ${format(it)}", style = MaterialTheme.typography.bodySmall) }
    } }
}

@Composable private fun SessionCard(session: TrainingSession, onClick: () -> Unit) { Card(onClick = onClick, modifier = Modifier.fillMaxWidth()) { Row(Modifier.padding(14.dp), horizontalArrangement = Arrangement.spacedBy(14.dp)) {
    AsyncImage(session.imageUrls.firstOrNull(), "Score sheet", Modifier.size(76.dp).clip(RoundedCornerShape(8.dp)), contentScale = ContentScale.Crop)
    Column(Modifier.weight(1f)) { Text(session.sessionDate, fontWeight = FontWeight.SemiBold); Text(session.totalScore?.let { "Score ${format(it)}" } ?: "OCR ${session.ocrStatus.lowercase()}"); session.averageScore?.let { Text("Average ${format(it)} · ${session.shotCount ?: 0} shots", style = MaterialTheme.typography.bodySmall) }; if (session.notes.isNotBlank()) Text(session.notes, maxLines = 2) }
} } }

@Composable private fun DetailScreen(id: String, vm: ConsumerViewModel) { LaunchedEffect(id) { vm.loadDetail(id) }; val state by vm.detail.collectAsState(); when(val value = state) {
    LoadState.Loading -> CenteredProgress("Loading session…"); is LoadState.Failed -> ErrorState(value.message) { vm.loadDetail(id) }; is LoadState.Ready -> LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        val s = value.value; item { AsyncImage(s.imageUrls.firstOrNull(), "Uploaded score sheet", Modifier.fillMaxWidth().height(240.dp).clip(RoundedCornerShape(12.dp)), contentScale = ContentScale.Crop) }
        item { MetricCard(s) }; item { CorrectionPanel(s, vm) }; if (s.notes.isNotBlank()) item { TextSection("Notes", s.notes) }; if (s.reflectionText.isNotBlank()) item { TextSection("Reflection", s.reflectionText) }; if (s.suggestions.isNotEmpty()) item { TextSection("Suggested focus", s.suggestions.joinToString("\n• ", prefix = "• ")) }
    }
} }

@Composable private fun CorrectionPanel(session: TrainingSession, vm: ConsumerViewModel) {
    var editing by remember { mutableStateOf(false) }; var shots by remember(session.id) { mutableStateOf(session.shotScores.joinToString(", ", transform = ::format)) }; var totals by remember(session.id) { mutableStateOf(session.seriesTotals.joinToString(", ", transform = ::format)) }; var group by remember(session.id) { mutableStateOf(session.groupSize?.let(::format).orEmpty()) }; var message by remember { mutableStateOf<String?>(null) }; var saving by remember { mutableStateOf(false) }; val scope=rememberCoroutineScope()
    if (!editing) OutlinedButton({editing=true}) { Text("Correct extracted scores") } else Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(14.dp),verticalArrangement=Arrangement.spacedBy(8.dp)) {
        Text("Verify OCR results",fontWeight=FontWeight.SemiBold); Text("Separate values with commas.",style=MaterialTheme.typography.bodySmall)
        OutlinedTextField(shots,{shots=it},Modifier.fillMaxWidth(),label={Text("Shot scores")}); OutlinedTextField(totals,{totals=it},Modifier.fillMaxWidth(),label={Text("Series totals (optional)")}); OutlinedTextField(group,{group=it},Modifier.fillMaxWidth(),label={Text("Group size mm (optional)")},keyboardOptions=KeyboardOptions(keyboardType=KeyboardType.Decimal))
        message?.let { Text(it,color=MaterialTheme.colorScheme.error) }
        Row(horizontalArrangement=Arrangement.spacedBy(8.dp)) { Button({ val parsedShots=parseNumbers(shots); val parsedTotals=parseNumbers(totals); val parsedGroup=group.trim().takeIf(String::isNotEmpty)?.toDoubleOrNull(); if(parsedShots.isEmpty()) message="Enter at least one valid shot score." else { saving=true; scope.launch { vm.correct(session.id,parsedShots,parsedTotals,parsedGroup).onSuccess { editing=false }.onFailure { message=vm.friendly(it) }; saving=false } } },enabled=!saving){Text(if(saving)"Saving…" else "Save corrections")}; TextButton({editing=false},enabled=!saving){Text("Cancel")} }
    } }
}

@Composable private fun MetricCard(s: TrainingSession) { Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) { Text("${s.sessionDate} ${s.sessionTime}", style = MaterialTheme.typography.titleMedium); Text(s.totalScore?.let { "Total ${format(it)}" } ?: "Results processing", style = MaterialTheme.typography.headlineSmall); Text("Average ${s.averageScore?.let(::format) ?: "—"}  ·  Shots ${s.shotCount ?: "—"}  ·  Group ${s.groupSize?.let(::format) ?: "—"}") } } }
@Composable private fun TextSection(title: String, text: String) { Column { Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold); Spacer(Modifier.height(4.dp)); Text(text) } }

@Composable
private fun CaptureScreen(vm: ConsumerViewModel, saved: () -> Unit) {
    val context = LocalContext.current; val scope = rememberCoroutineScope(); val images = remember { mutableStateListOf<ScoreImage>() }
    var pending by remember { mutableStateOf<Pair<Uri,String>?>(null) }; var selectedDate by rememberSaveable { mutableStateOf(LocalDate.now()) }; var notes by rememberSaveable { mutableStateOf("") }; var reflection by rememberSaveable { mutableStateOf("") }; var mode by remember { mutableStateOf(ReflectionInputMode.Typed) }; var status by remember { mutableStateOf<String?>(null) }; var uploading by remember { mutableStateOf(false) }
    val take = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { if (it) pending?.let { p -> images += ScoreImage(p.first,p.second,"image/jpeg") } }
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { if (it) { pending = captureUri(context); take.launch(pending!!.first) } else status = "Camera permission was denied. You can select photos instead." }
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetMultipleContents()) { uris -> uris.take(6-images.size).forEachIndexed { i, uri -> images += ScoreImage(uri,"score-${System.currentTimeMillis()}-$i.jpg",context.contentResolver.getType(uri) ?: "image/jpeg") } }
    val speech = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { result -> result.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()?.let { reflection = listOf(reflection,it).filter(String::isNotBlank).joinToString("\n"); mode = ReflectionInputMode.Speech } }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text("Upload clear, well-lit photos. You can add up to six sheets.")
        Text("Training day", style=MaterialTheme.typography.titleMedium)
        (0L..6L).map { LocalDate.now().minusDays(it) }.chunked(4).forEach { days -> Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(6.dp)) { days.forEach { day -> FilterChip(selectedDate==day,{selectedDate=day},{Text(if(day==LocalDate.now())"Today" else "${day.dayOfMonth}/${day.monthValue}")}) } } }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { Button({ permission.launch(Manifest.permission.CAMERA) }, enabled = images.size < 6) { Text("Take photo") }; OutlinedButton({ picker.launch("image/*") }, enabled = images.size < 6) { Text("Choose photos") } }
        if (images.isNotEmpty()) { images.forEach { image -> Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) { AsyncImage(image.uri,"Selected score sheet",Modifier.size(80.dp).clip(RoundedCornerShape(8.dp)), contentScale=ContentScale.Crop); Text(image.fileName,Modifier.padding(12.dp).weight(1f),maxLines=1); TextButton({images.remove(image)}) { Text("Remove") } } } }
        OutlinedTextField(notes,{notes=it},Modifier.fillMaxWidth(),label={Text("Session notes")},minLines=2)
        OutlinedTextField(reflection,{reflection=it;mode=ReflectionInputMode.Typed},Modifier.fillMaxWidth(),label={Text("How did training feel?")},minLines=3)
        OutlinedButton({ runCatching { speech.launch(Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,RecognizerIntent.LANGUAGE_MODEL_FREE_FORM).putExtra(RecognizerIntent.EXTRA_LANGUAGE,Locale.getDefault())) }.onFailure { status="Speech recognition is not available on this device." } }) { Text("Speak reflection") }
        status?.let { Text(it, color = if (uploading) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error) }
        Button({ uploading=true; status="Uploading securely…"; scope.launch { vm.upload(TrainingSessionRequest("",selectedDate,LocalTime.now().withSecond(0).withNano(0),notes,reflection,mode,images.toList())).onSuccess { saved() }.onFailure { status=vm.friendly(it); uploading=false } } },Modifier.fillMaxWidth(),enabled=!uploading && images.isNotEmpty()) { Text(if(uploading) "Uploading…" else "Save session") }
    }
}

@Composable private fun ProfileScreen(profile: ConsumerProfile, logout: () -> Unit) { Column(Modifier.padding(20.dp).fillMaxSize(), verticalArrangement = Arrangement.spacedBy(8.dp)) { Text(profile.name, style=MaterialTheme.typography.headlineSmall); Text(profile.email); if(profile.academyName.isNotBlank()) Text(profile.academyName); Spacer(Modifier.height(16.dp)); OutlinedButton(logout) { Text("Sign out") }; Spacer(Modifier.weight(1f)); Text("Meten ${BuildConfig.VERSION_NAME}",style=MaterialTheme.typography.bodySmall) } }
@Composable private fun EmptyState(new:()->Unit) { Column(Modifier.fillMaxSize().padding(32.dp),horizontalAlignment=Alignment.CenterHorizontally,verticalArrangement=Arrangement.Center) { Text("No sessions yet",style=MaterialTheme.typography.headlineSmall); Text("Capture your first score sheet to start tracking progress."); Spacer(Modifier.height(16.dp)); Button(new){Text("Capture a session")} } }
@Composable private fun ErrorState(message:String,retry:()->Unit) { Column(Modifier.fillMaxSize().padding(32.dp),horizontalAlignment=Alignment.CenterHorizontally,verticalArrangement=Arrangement.Center) { Text(message); Spacer(Modifier.height(12.dp)); Button(retry){Text("Try again")} } }
@Composable private fun CenteredProgress(label:String) { Box(Modifier.fillMaxSize(),contentAlignment=Alignment.Center) { Column(horizontalAlignment=Alignment.CenterHorizontally) { CircularProgressIndicator(); Spacer(Modifier.height(12.dp)); Text(label) } } }
private fun captureUri(context: Context): Pair<Uri,String> { val name="score-${System.currentTimeMillis()}.jpg"; val file=File(context.cacheDir,"score-captures/$name").apply { parentFile?.mkdirs(); createNewFile() }; return FileProvider.getUriForFile(context,"${context.packageName}.fileprovider",file) to name }
private fun format(value:Double)=if(value%1.0==0.0)value.toInt().toString() else "%.1f".format(value)
private fun parseNumbers(value:String)=value.split(',','\n',' ').mapNotNull { it.trim().takeIf(String::isNotEmpty)?.toDoubleOrNull() }

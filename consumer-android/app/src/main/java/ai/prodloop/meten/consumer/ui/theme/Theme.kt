package ai.prodloop.meten.consumer.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    primary = Color(0xFF1F6F5B),
    onPrimary = Color.White,
    secondary = Color(0xFF52635D),
    secondaryContainer = Color(0xFFD5E7DF),
    surfaceVariant = Color(0xFFE2E8E4),
    background = Color(0xFFF8FAF8),
    errorContainer = Color(0xFFFFDAD4)
)

@Composable
fun MetenTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColors,
        content = content
    )
}

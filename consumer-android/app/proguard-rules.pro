# Keep source names in crash reports without retaining implementation details.
-renamesourcefileattribute SourceFile
-keepattributes SourceFile,LineNumberTable

# Tink references these compile-time-only annotations from encrypted preferences.
-dontwarn com.google.errorprone.annotations.CanIgnoreReturnValue
-dontwarn com.google.errorprone.annotations.CheckReturnValue
-dontwarn com.google.errorprone.annotations.Immutable
-dontwarn com.google.errorprone.annotations.RestrictedApi

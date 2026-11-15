# Android Guide — Naytra

This guide documents the native Android build, configuration, Firebase credentials, and developer workflow for Naytra using Capacitor.

---

## 1. Project Specifications

| Attribute | Value |
| :--- | :--- |
| **Framework** | Capacitor 8 wrapping React 19 SPA |
| **Package ID / App ID** | `com.rgc.naytra` (immutable) |
| **App Name** | Naytra |
| **Android Project Root** | `android/` |
| **Web Build Directory** | `web/dist/` |
| **Firebase Project** | `naytra-53238` |
| **Target SDK** | Android 34 / 35 (Compile SDK 34+) |
| **Min SDK** | Android 22 (Android 5.1 Lollipop) |

---

## 2. Environment Setup

### 2.1 Java Runtime (JDK)
Gradle 8.14.3 requires JDK 17 or JDK 21 (LTS). Note that Android Studio Ladybug/Otter bundles JDK 25, which produces class file version 69 that Gradle's Groovy parser does not support.

Use the workspace JDK 21 located at `.jdk21/Contents/Home`:
```bash
export JAVA_HOME="/Users/yogambar/Downloads/Naytra/.jdk21/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"
```
Or if installed via Homebrew (`brew install openjdk@21`):
```bash
export JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
```

### 2.2 Android SDK
The Android SDK is located at:
```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
```

---

## 3. Developer Workflow

### 3.1 Synchronize Web Build to Native Android
Whenever web UI or assets change:
```bash
cd web
npm run build
npx cap sync android
```
This builds the production Vite bundles into `web/dist/` and copies them into `android/app/src/main/assets/public/`.

### 3.2 Build Debug APK with Gradle
```bash
cd android
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew assembleDebug
```
The output APK is generated at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### 3.3 Open in Android Studio
To view, debug, or deploy directly to an emulator or physical device using Android Studio:
```bash
cd web
npx cap open android
```

---

## 4. Google Services & Firebase Setup

### 4.1 Placing `google-services.json`
1. Download `google-services.json` from the Firebase Console (`naytra-53238`).
2. Place it at:
   ```
   android/app/google-services.json
   ```
3. **Security:** `google-services.json` is strictly git-ignored. Never commit it to git or paste its raw tokens into chat.

### 4.2 Extracted Debug SHA-1 and SHA-256 Fingerprints
Generated from `./gradlew signingReport` with the local debug keystore:
- **Variant:** `debug`
- **Keystore:** `~/.android/debug.keystore` (Alias: `AndroidDebugKey`)
- **SHA-1:** `35:7D:DD:C0:D8:00:F3:BA:D1:9E:80:CF:FB:70:F5:B9:4F:AF:D2:E1`
- **SHA-256:** `AF:29:29:55:60:7D:D1:40:94:98:02:28:0E:A7:67:10:EE:D1:37:6B:31:AA:15:9B:02:B9:EE:13:BF:52:B6:79`

Command to re-run:
```bash
cd android
JAVA_HOME="/Users/yogambar/Downloads/Naytra/.jdk21/Contents/Home" ./gradlew signingReport --no-daemon
```

### 4.3 Adding SHA-1 in Firebase Console
1. Open [Firebase Console](https://console.firebase.google.com/) -> Select project `naytra-53238`.
2. Navigate to **Project Settings** (gear icon) -> **General** tab.
3. Scroll down to **Your apps** -> Select the Android app (`com.rgc.naytra`).
4. Click **Add fingerprint** and paste the SHA-1 extracted above.
5. Download a fresh `google-services.json` and replace `android/app/google-services.json`.

### 4.4 Restricting the API Key in Google Cloud Console
1. Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Click on the API Key associated with the Android client.
3. Under **Application restrictions**, select **Android apps**.
4. Add an item:
   - Package name: `com.rgc.naytra`
   - SHA-1 fingerprint: (Your SHA-1 from signingReport)
5. Under **API restrictions**, restrict to required APIs (Identity Toolkit / Firebase Authentication, etc.).
6. Save changes.

---

## 5. Network Security Architecture

### 5.1 Debug vs. Release Security
Naytra enforces strict transport security on Android:
- **Debug Builds (`android/app/src/debug/res/xml/network_security_config.xml`)**:
  - Cleartext HTTP is permitted ONLY for local host development and emulator networking:
    - `10.0.2.2` (Android emulator alias for host `127.0.0.1`)
    - `127.0.0.1`
    - `localhost`
- **Release Builds (`android/app/src/main/res/xml/network_security_config.xml`)**:
  - `cleartextTrafficPermitted="false"` across all domains. Only valid TLS/HTTPS traffic is allowed.

---

## 6. Native Features & Depth System

- **Status Bar:** Styled dynamically via `@capacitor/status-bar` to follow the active depth theme (Dark `#0F1318` vs Light `#FFFFFF`).
- **Splash Screen:** Auto-hides on web readiness with `#172033` brand ink background.
- **Haptics:** `@capacitor/haptics` triggers light tactile ticks on mobile tab changes, order execution, and error states.
- **Android Back Button:** `@capacitor/app` intercepts physical/gesture back button presses: navigates up browser history or minimizes the app at the top-level dashboard.

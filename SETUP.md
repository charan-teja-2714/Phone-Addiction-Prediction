# Setup Guide — Digital Wellbeing App

Complete instructions to set up this project on a new system.

---

adb install -r "I:/Final Year Projects/PhoneAddictionApp/MobileApp/android/app/build/outputs/apk/release/app-release.apk"


## Prerequisites

### Required Software
- **Node.js** (v18 or higher) — [Download](https://nodejs.org/)
- **Python** (3.9 or higher) — [Download](https://www.python.org/)
- **Android Studio** — [Download](https://developer.android.com/studio)
- **Git** — [Download](https://git-scm.com/)
- **JDK 17** — Included with Android Studio or [Download](https://adoptium.net/)

### Android Studio Setup
1. Install Android Studio
2. Open SDK Manager (Tools → SDK Manager)
3. Install:
   - Android SDK Platform 33 (or higher)
   - Android SDK Build-Tools
   - Android Emulator (optional, for testing)
4. Set environment variables:
   ```bash
   # Windows (add to System Environment Variables)
   ANDROID_HOME=C:\Users\YourName\AppData\Local\Android\Sdk
   
   # Add to PATH:
   %ANDROID_HOME%\platform-tools
   %ANDROID_HOME%\tools
   ```

---

## Step 1: Clone the Repository

```bash
git clone <your-repo-url>
cd PhoneAddictionApp
```

---

## Step 2: Backend Setup (FastAPI Server)

### 2.1 Navigate to ML Directory
```bash
cd ml
```

### 2.2 Create Python Virtual Environment
```bash
# Windows
python -m venv env
env\Scripts\activate

# Linux/Mac
python3 -m venv env
source env/bin/activate
```

### 2.3 Install Dependencies
```bash
pip install -r requirements.txt
```

### 2.4 Verify Model Files Exist
Ensure these files are present:
```
ml/models/catboost/model.cbm
ml/models/feature_schema.json
ml/models/label_mapping.json
ml/artifacts/preprocessing_metadata.json
```

### 2.5 Start the Backend Server
```bash
# From ml/ directory
uvicorn api.main:app --host 0.0.0.0 --port 8000
```

Server should start at `http://localhost:8000`

Test it:
```bash
curl http://localhost:8000/health
# Should return: {"status":"ok"}
```

---

## Step 3: Mobile App Setup (React Native)

### 3.1 Navigate to MobileApp Directory
```bash
cd ../MobileApp
```

### 3.2 Install Node Dependencies
```bash
npm install
# or
yarn install
```

### 3.3 Configure API URL

Edit `src/config.js`:
```javascript
// For development with USB device
export const API_BASE_URL = 'http://localhost:8000';

// For production/APK
// export const API_BASE_URL = 'https://your-deployed-server.com';
```

---

## Step 4: Connect Android Device

### Option A: Physical Device (Recommended)

1. **Enable Developer Options** on your Android phone:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
   - Go back to Settings → Developer Options

2. **Enable USB Debugging**:
   - In Developer Options, enable "USB Debugging"

3. **Connect via USB** and verify:
   ```bash
   adb devices
   # Should show your device ID
   ```

4. **Set up port forwarding** (run this every time you reconnect):
   ```bash
   adb reverse tcp:8000 tcp:8000
   ```

### Option B: Android Emulator

1. Open Android Studio → Device Manager
2. Create a new Virtual Device (Pixel 5, API 33+)
3. Start the emulator
4. Verify connection:
   ```bash
   adb devices
   ```

---

## Step 5: Run the App

### 5.1 Start Metro Bundler
```bash
# In MobileApp/ directory
npm start
```

### 5.2 Build and Install App (New Terminal)
```bash
# In MobileApp/ directory
npm run android
# or
npx react-native run-android
```

The app should install and launch on your device/emulator.

---

## Step 6: Grant Permissions

When the app launches for the first time:

1. **Usage Access Permission**:
   - Tap "Grant Permission"
   - Find "MobileApp" in the list
   - Toggle "Permit usage access" ON
   - Go back to the app

2. **Notification Permission** (Android 13+):
   - Allow when prompted

---

## Troubleshooting

### Backend Issues

**Port 8000 already in use:**
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8000 | xargs kill -9
```

**Module not found errors:**
```bash
pip install --upgrade -r requirements.txt
```

### Mobile App Issues

**Metro bundler cache issues:**
```bash
npm start -- --reset-cache
```

**Build errors:**
```bash
cd android
./gradlew clean
cd ..
npm run android
```

**ADB not recognized:**
- Add Android SDK platform-tools to PATH
- Restart terminal

**App crashes on launch:**
```bash
# View logs
adb logcat | grep ReactNative
```

**Network error in app:**
1. Ensure backend is running (`http://localhost:8000/health`)
2. Run `adb reverse tcp:8000 tcp:8000`
3. Check `src/config.js` has correct URL
4. Reload app (press R twice in app)

---

## Development Workflow

### Daily Development

1. **Start Backend** (Terminal 1):
   ```bash
   cd ml
   env\Scripts\activate  # Windows
   uvicorn api.main:app --host 0.0.0.0 --port 8000
   ```

2. **Start Metro** (Terminal 2):
   ```bash
   cd MobileApp
   npm start
   ```

3. **Connect Device & Forward Port** (Terminal 3):
   ```bash
   adb devices
   adb reverse tcp:8000 tcp:8000
   ```

4. **Run App** (if not already installed):
   ```bash
   npm run android
   ```

### Making Changes

**Backend changes:**
- Server auto-reloads with `--reload` flag
- Or restart manually: `Ctrl+C` then re-run uvicorn

**Frontend changes:**
- Metro auto-reloads on save
- Force reload: Press R twice in app
- Dev menu: Shake device or `Ctrl+M` (Windows) / `Cmd+M` (Mac)

---

## Building APK for Distribution

### Debug APK (for testing)
```bash
cd MobileApp/android
./gradlew assembleDebug
# APK location: android/app/build/outputs/apk/debug/app-debug.apk
```

### Release APK (for production)

1. **Generate signing key:**
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Configure gradle:**
   Edit `android/app/build.gradle`:
   ```gradle
   android {
       signingConfigs {
           release {
               storeFile file('my-release-key.keystore')
               storePassword 'your-password'
               keyAlias 'my-key-alias'
               keyPassword 'your-password'
           }
       }
       buildTypes {
           release {
               signingConfig signingConfigs.release
           }
       }
   }
   ```

3. **Build release APK:**
   ```bash
   cd android
   ./gradlew assembleRelease
   # APK location: android/app/build/outputs/apk/release/app-release.apk
   ```

4. **Update API URL** in `src/config.js` to production server before building.

---

## Deploying Backend to Cloud

### Option 1: Render.com (Recommended)

1. Push code to GitHub
2. Go to [render.com](https://render.com)
3. Create new Web Service
4. Connect GitHub repo
5. Configure:
   - **Root Directory:** `ml`
   - **Build Command:** `pip install -r requirements_api.txt`
   - **Start Command:** `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
6. Deploy
7. Copy the deployed URL (e.g., `https://your-app.onrender.com`)
8. Update `MobileApp/src/config.js` with this URL

### Option 2: Docker

```bash
cd ml
docker build -t phone-addiction-api .
docker run -p 8000:8000 phone-addiction-api
```

---

## Project Structure Quick Reference

```
PhoneAddictionApp/
├── ml/                          # Backend + ML
│   ├── api/                     # FastAPI server
│   ├── src/                     # Training scripts
│   ├── models/                  # Trained models
│   └── requirements.txt         # Python dependencies
│
└── MobileApp/                   # React Native app
    ├── android/                 # Android native code
    ├── src/                     # React Native code
    ├── package.json             # Node dependencies
    └── src/config.js            # API configuration
```

---

## Support

For issues:
1. Check logs: `adb logcat` (mobile) or terminal output (backend)
2. Verify all prerequisites are installed
3. Ensure ports 8000 and 8081 are not blocked
4. Check firewall settings

---

## Next Steps

After setup:
1. Complete the questionnaire in the app
2. Grant usage access permission
3. Use your phone normally for a day
4. Return to the app and pull down to refresh
5. Tap "Get Risk Prediction" to see your addiction risk level

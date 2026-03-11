# Digital Wellbeing — Smartphone Addiction Prediction App
### Final Year Project Documentation

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Project Structure](#3-project-structure)
4. [Machine Learning Pipeline](#4-machine-learning-pipeline)
5. [Backend API](#5-backend-api)
6. [Mobile Application](#6-mobile-application)
7. [Android Native Module](#7-android-native-module)
8. [Tech Stack](#8-tech-stack)
9. [Model Performance](#9-model-performance)
10. [Features & Input Schema](#10-features--input-schema)
11. [API Reference](#11-api-reference)
12. [Deployment](#12-deployment)
13. [How to Run Locally](#13-how-to-run-locally)
14. [Privacy & Ethics](#14-privacy--ethics)

---

## 1. Project Overview

**Digital Wellbeing** is an Android application that predicts a user's smartphone addiction risk level using a machine learning model trained on behavioral and psychological data. The app collects real usage statistics directly from the Android OS, combines them with optional self-reported wellbeing data, and sends the features to a cloud-hosted FastAPI backend that returns a prediction.

### Goals
- Detect smartphone addiction risk (Low / Moderate / High) using real device usage data
- Provide personalized, context-aware recommendations based on the prediction
- Track usage trends over time with weekly history charts
- Educate users about digital wellbeing through daily insights

### Problem Statement
Excessive smartphone use is linked to anxiety, depression, reduced academic performance, and disrupted sleep. Most existing apps only track screen time passively without providing any risk assessment or actionable intervention. This project bridges that gap using ML-driven prediction.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Android Phone                         │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              React Native App                    │   │
│  │                                                  │   │
│  │  ┌──────────────┐    ┌────────────────────────┐ │   │
│  │  │ UsageStats   │    │   Zustand Store        │ │   │
│  │  │ Module (Java)│───▶│  (usage, prediction,   │ │   │
│  │  │              │    │   questionnaire)        │ │   │
│  │  └──────────────┘    └───────────┬────────────┘ │   │
│  │         ▲                        │               │   │
│  │  Android UsageStatsManager       │               │   │
│  │                                  ▼               │   │
│  │                        ┌─────────────────┐       │   │
│  │                        │  Prediction     │       │   │
│  │                        │  Service (HTTP) │       │   │
│  │                        └────────┬────────┘       │   │
│  └─────────────────────────────────┼────────────────┘   │
└────────────────────────────────────┼────────────────────┘
                                     │ HTTPS POST /predict
                                     ▼
┌─────────────────────────────────────────────────────────┐
│              Render.com Cloud Server                    │
│                                                         │
│  FastAPI + Uvicorn                                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │  /predict → encode → derive features → CatBoost │   │
│  │                                                  │   │
│  │  CatBoost Model (model.cbm)                      │   │
│  │  → Low Addiction / Moderate Addiction / High     │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Project Structure

```
PhoneAddictionApp/
│
├── ml/                             # Machine Learning + Backend
│   ├── api/                        # FastAPI server
│   │   ├── main.py                 # App entry point, routes
│   │   ├── inference.py            # Encode → derive → predict pipeline
│   │   ├── model_loader.py         # Load artifacts at startup
│   │   ├── schemas.py              # Pydantic request/response models
│   │   └── config.py               # Artifact file paths
│   │
│   ├── src/                        # Training pipeline
│   │   ├── config.py               # Hyperparameters, paths, thresholds
│   │   ├── data_loader.py          # CSV loading and validation
│   │   ├── preprocessing.py        # Cleaning, encoding, scaling
│   │   ├── feature_engineering.py  # Derived features + SMOTE
│   │   ├── train_catboost.py       # CatBoost training
│   │   ├── train_lightgbm.py       # LightGBM training
│   │   ├── train_random_forest.py  # Random Forest training
│   │   ├── train_xgboost.py        # XGBoost training
│   │   ├── evaluate.py             # Metrics, CV, confusion matrix
│   │   └── utils.py                # Logger, helpers
│   │
│   ├── models/
│   │   ├── catboost/model.cbm      # Frozen CatBoost model (used by API)
│   │   ├── feature_schema.json     # Feature names + categorical mappings
│   │   └── label_mapping.json      # {0: Low, 1: Moderate, 2: High}
│   │
│   ├── artifacts/
│   │   ├── encoders.pkl            # Fitted label encoders
│   │   └── preprocessing_metadata.json  # Categorical encodings for inference
│   │
│   ├── metrics/                    # JSON metrics for all 4 models
│   ├── Dockerfile                  # Docker config for Render deployment
│   ├── requirements_api.txt        # Minimal API dependencies
│   └── requirements.txt            # Full training dependencies
│
└── MobileApp/                      # React Native Android App
    ├── android/app/src/main/java/com/mobileapp/
    │   ├── UsageStatsModule.java   # Native module — reads Android usage data
    │   ├── UsageStatsPackage.java  # Registers the native module
    │   ├── MainApplication.kt      # Registers UsageStatsPackage
    │   └── MainActivity.kt         # App entry point
    │
    └── src/
        ├── screens/
        │   ├── HomeScreen.jsx          # Dashboard — stats, risk card, insights
        │   ├── InsightsScreen.jsx      # Weekly trends, category breakdown
        │   ├── QuestionnaireScreen.jsx # Wellbeing self-assessment
        │   ├── ProfileScreen.jsx       # Settings, goals, permissions
        │   └── PermissionScreen.jsx    # First-time permission request
        │
        ├── components/
        │   ├── RiskCard.jsx            # Donut chart with risk score
        │   ├── RiskAlertCard.jsx       # Contextual tips for High/Moderate risk
        │   ├── CompletenessCard.jsx    # Data quality indicator
        │   ├── StatCard.jsx            # Individual stat tile
        │   ├── InsightCard.jsx         # Daily tip cards
        │   └── SectionHeader.jsx       # Reusable section title
        │
        ├── services/
        │   ├── usageCollector.js       # JS bridge to UsageStatsModule
        │   ├── predictionService.js    # Axios call to FastAPI /predict
        │   ├── featureBuilder.js       # Maps app state → API request body
        │   └── notificationService.js  # Local push notifications (notifee)
        │
        ├── hooks/
        │   ├── useAppLifecycle.js      # Foreground/background refresh + notifications
        │   └── usePrediction.js        # Prediction state management
        │
        ├── store/
        │   └── useAppStore.js          # Zustand global state
        │
        ├── utils/
        │   └── formatTime.js           # ms → "1h 23m" helpers
        │
        ├── theme/
        │   └── index.js                # Colors, spacing, radius tokens
        │
        └── config.js                   # API base URL + timeout
```

---

## 4. Machine Learning Pipeline

### Dataset
- **Source:** Primary dataset collected for smartphone addiction prediction
- **Total samples:** ~3,000 records
- **Target variable:** `Addiction_Level` (continuous score 0–10, binned into 3 classes)
- **Binning thresholds:**
  - Low Addiction: score < 7.0
  - Moderate Addiction: 7.0 ≤ score < 9.0
  - High Addiction: score ≥ 9.0

### Class Distribution (after binning)
| Class | Approx. Count | % |
|---|---|---|
| Low Addiction | ~419 | 14% |
| Moderate Addiction | ~655 | 22% |
| High Addiction | ~1,926 | 64% |

### Preprocessing Steps
1. **Drop irrelevant columns** — ID, Name, Location, School_Grade
2. **Label encoding** — Gender (Female=0, Male=1, Other=2), Phone_Usage_Purpose (Browsing=0, Education=1, Gaming=2, Other=3, Social Media=4)
3. **Missing value handling** — median imputation for numerical, mode for categorical
4. **Train/test split** — 80/20 stratified split (random_state=42)
5. **SMOTE oversampling** — applied to training set only to balance minority classes

### Feature Engineering (4 derived features added)
| Feature | Formula | Purpose |
|---|---|---|
| `Total_Content_Hours` | Social + Gaming + Education hours | Total active content consumption |
| `Usage_Sleep_Ratio` | Daily usage / (Sleep hours + ε) | Usage-to-rest balance indicator |
| `Mental_Health_Score` | Anxiety + Depression − Self_Esteem | Composite mental wellbeing metric |
| `Weekend_Weekday_Ratio` | Weekend hours / (Daily hours + ε) | Weekend-vs-weekday usage pattern |

### Models Trained
Four gradient-boosted and ensemble models were trained and evaluated:

| Model | Accuracy | F1 Macro | CV F1 Mean |
|---|---|---|---|
| **CatBoost** ✅ (selected) | **90.83%** | **87.62%** | **97.20%** |
| XGBoost | 89.50% | 85.54% | 96.98% |
| LightGBM | 89.50% | 85.27% | 96.97% |
| Random Forest | 84.33% | 79.64% | 94.37% |

**CatBoost was selected** as the production model for its highest accuracy, best macro F1, and lowest variance across 5-fold cross-validation (std = 0.0037).

### Hyperparameters (CatBoost)
```python
{
    "iterations": 300,
    "depth": 8,
    "learning_rate": 0.1,
    "random_seed": 42,
    "auto_class_weights": "Balanced"
}
```

### Cross-Validation (5-Fold — CatBoost)
| Fold | F1 Score |
|---|---|
| 1 | 0.9730 |
| 2 | 0.9752 |
| 3 | 0.9667 |
| 4 | 0.9762 |
| 5 | 0.9687 |
| **Mean** | **0.9720 ± 0.0037** |

---

## 5. Backend API

### Technology
- **Framework:** FastAPI (Python 3.11)
- **Server:** Uvicorn
- **Model:** CatBoost (loaded at startup, served in-memory)
- **Hosting:** Render.com (Docker-based free tier)
- **Live URL:** `https://phone-addiction-prediction.onrender.com`

### Inference Pipeline
```
POST /predict (raw JSON)
        │
        ▼
1. Validate request via Pydantic schema
        │
        ▼
2. Encode categoricals (Gender, Phone_Usage_Purpose)
        │
        ▼
3. Arrange 20 raw features in schema order
        │
        ▼
4. Compute 4 derived features
   (Total_Content_Hours, Usage_Sleep_Ratio,
    Mental_Health_Score, Weekend_Weekday_Ratio)
        │
        ▼
5. Build 24-feature numpy array
        │
        ▼
6. CatBoost.predict() + predict_proba()
        │
        ▼
7. Return { predicted_class, label, confidence }
```

### Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check — returns `{"status": "ok"}` |
| `GET` | `/model-info` | Model name, feature count, class labels |
| `POST` | `/predict` | Run addiction prediction |

---

## 6. Mobile Application

### Screens

#### Home Screen
- **Header** — "Digital Wellbeing" branding with shield icon
- **RiskCard** — Donut chart showing risk level with confidence percentage
- **RiskAlertCard** — Contextual alert shown for High/Moderate risk with expandable personalized tips
- **CompletenessCard** — Shows data quality score (how many features are filled)
- **Quick Stats grid** — Screen time, phone checks, night usage, apps used
- **Daily Insights** — 3 static educational tip cards
- **Screen Time Modal** — Full breakdown of every app used today, sorted by usage, grouped by category (tap Screen Time card to open)
- **Pull-to-refresh** — Refreshes all data from native module + runs a new prediction

#### Insights Screen
- Weekly history bar chart (7 days)
- Category breakdown (Social Media, Gaming, Education, etc.)
- Comparison with previous day

#### Questionnaire Screen (Check-in)
- 10-question self-assessment covering:
  - Anxiety level (0–10)
  - Depression level (0–10)
  - Self-esteem (0–10)
  - Social interactions
  - Academic performance
  - Family communication
  - Parental control
  - Phone usage purpose
- Answers are stored in Zustand and sent with every prediction request to improve accuracy

#### Profile Screen
- **Your Profile** — Age, sleep hours, exercise hours (editable), gender selector
- **Permissions & Data** — Usage Access permission status, notification toggle
- **Goals** — Daily screen time goal (editable, shown as badge)
- **Actions** — Reset questionnaire, Export data (share as JSON)
- **Privacy Policy** and **Terms of Service** (in-app dialogs)
- **Disclaimer** — Not a medical diagnostic tool

#### Permission Screen
- First-launch screen explaining why Usage Access is needed
- Button to open Android system settings for permission grant

### State Management (Zustand)
| Store Slice | Contents |
|---|---|
| `usageStats` | dailyUsageHours, phoneChecks, screenTimeBeforeBed, socialMediaHours, gamingHours, educationHours, appsUsed, weekendUsage |
| `perAppUsage` | Array of {packageName, appName, usageMs, category} |
| `prediction` | {label, confidence, predictedClass, timestamp} |
| `questionnaire` | All 10 check-in answers |
| `userProfile` | age, gender, sleepHours, exerciseHours |
| `dataCompleteness` | 0.0–1.0 completeness ratio |
| `weeklyHistory` | Array of last 7 days usage |
| `dailyGoalHours` | User-set daily screen time goal |
| `customCategories` | User-overridden app categories |
| `milestonesHit` | {3: bool, 5: bool, 7: bool} for milestone notifications |

### Notifications (notifee)
Three types of local push notifications:

| Notification | Trigger | Channel |
|---|---|---|
| Risk Prediction Result | After every prediction | High importance (risk alert) / Default (low risk) |
| Daily Summary | Scheduled at 9 PM every day | Default importance |
| Screen Time Milestone | When usage crosses 3h, 5h, 7h | High importance |

---

## 7. Android Native Module

**File:** `UsageStatsModule.java`

The `UsageStatsModule` bridges React Native to the Android `UsageStatsManager` API (Android API 21+). It reads real foreground usage data from the OS.

### Why UsageStatsManager?
- Official Android API — no reflection hacks or Accessibility Service abuse
- Precise ACTIVITY_RESUMED / ACTIVITY_PAUSED event timestamps
- Required special permission: `PACKAGE_USAGE_STATS` (user grants manually in system settings)

### Exposed Methods

| Method | Returns | Description |
|---|---|---|
| `hasPermission()` | `boolean` | Check if Usage Access is granted |
| `openUsageAccessSettings()` | `boolean` | Open system settings for permission grant |
| `collectUsageStats()` | `WritableMap` | All 8 aggregate usage metrics |
| `getPerAppUsage()` | `WritableArray` | Per-app usage with category labels |

### App Categories Tracked
| Category | Detection Method | Example Apps |
|---|---|---|
| Social Media | Exact package match (20 apps) | WhatsApp, Instagram, TikTok, Twitter |
| Gaming | Prefix match (20 publisher prefixes) | Supercell, King, EA, Roblox |
| Education | Exact package match (16 apps) | Duolingo, Khan Academy, Coursera |
| Entertainment | Exact package match (21 apps) | YouTube, Netflix, Spotify |
| Communication | Exact package match (13 apps) | Gmail, Zoom, Google Meet |
| Browser | Exact package match (10 apps) | Chrome, Firefox, Brave |
| Shopping | Exact package match (8 apps) | Amazon, Flipkart, Myntra |
| Finance | Exact package match (20 apps) | Paytm, PhonePe, HDFC, Zerodha |
| Productivity | Exact package match (17 apps) | MS Office, Google Docs, GitHub |
| Other | Default fallback | All other apps |

### Metrics Computed (single-pass event processing)
| Metric | Method |
|---|---|
| `dailyUsageHours` | Sum of all ACTIVITY_RESUMED→PAUSED durations (since midnight) |
| `phoneChecksPerDay` | Count of new sessions (gap > 60s between last pause and next resume) |
| `appsUsedDaily` | Count of distinct packages in foreground |
| `timeOnSocialMedia` | Sum of foreground time for social media packages |
| `timeOnGaming` | Sum of foreground time for gaming packages |
| `timeOnEducation` | Sum of foreground time for education packages |
| `screenTimeBeforeBed` | Foreground time overlapping 22:00–06:00 window |
| `weekendUsageHours` | Foreground time on Saturday/Sunday using hour-level flag array |

### Permissions Required (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.PACKAGE_USAGE_STATS" />
<uses-permission android:name="android.permission.QUERY_ALL_PACKAGES" />
<uses-permission android:name="android.permission.INTERNET" />
```
`QUERY_ALL_PACKAGES` is required on Android 11+ to resolve app names from package names via `PackageManager.getApplicationLabel()`.

---

## 8. Tech Stack

### Mobile App
| Technology | Version | Purpose |
|---|---|---|
| React Native | 0.83.1 | Cross-platform mobile framework |
| React | 19.2.0 | UI rendering |
| React Native Paper | 5.x | Material Design UI components |
| React Navigation | 7.x | Tab and stack navigation |
| Zustand | 5.x | Global state management |
| react-native-vector-icons | 10.x | MaterialCommunityIcons |
| @notifee/react-native | 9.x | Local push notifications |
| victory-native | 41.x | Charts (weekly history) |
| axios | 1.x | HTTP client for API calls |
| @react-native-async-storage | 2.x | Persistent local storage |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Python | 3.11 | Runtime |
| FastAPI | 0.100+ | REST API framework |
| Uvicorn | 0.23+ | ASGI server |
| CatBoost | 1.2+ | ML model (prediction) |
| scikit-learn | 1.3+ | Preprocessing utilities |
| pandas | 2.0+ | Data manipulation |
| numpy | 1.24+ | Numerical computing |
| Pydantic | 2.x | Request/response validation |

### Training (additional)
| Technology | Purpose |
|---|---|
| XGBoost | Compared against CatBoost |
| LightGBM | Compared against CatBoost |
| imbalanced-learn | SMOTE oversampling |
| matplotlib / seaborn | Training plots and confusion matrices |
| joblib | Model serialization |

### Infrastructure
| Service | Purpose |
|---|---|
| Render.com | Cloud hosting for FastAPI backend (free tier, Docker) |
| GitHub | Source control |

---

## 9. Model Performance

### CatBoost (Selected Model — Test Set, n=600)

| Class | Precision | Recall | F1 | Support |
|---|---|---|---|---|
| Low Addiction | 93.06% | 79.76% | 85.90% | 84 |
| Moderate Addiction | 73.17% | 91.60% | 81.36% | 131 |
| High Addiction | 98.35% | 92.99% | 95.59% | 385 |
| **Weighted Avg** | **92.11%** | **90.83%** | **91.13%** | **600** |
| **Macro Avg** | **88.19%** | **88.12%** | **87.62%** | **600** |

**Overall Accuracy: 90.83%**
**5-Fold CV F1: 97.20% ± 0.37%**

### Model Comparison (Test Set)

| Model | Accuracy | F1 Macro | Selected |
|---|---|---|---|
| CatBoost | 90.83% | 87.62% | ✅ Yes |
| XGBoost | 89.50% | 85.54% | No |
| LightGBM | 89.50% | 85.27% | No |
| Random Forest | 84.33% | 79.64% | No |

---

## 10. Features & Input Schema

The prediction API accepts 20 raw features. 4 derived features are computed internally.

### Raw Features (20)

| Feature | Type | Range | Source |
|---|---|---|---|
| `Age` | int | 5–100 | User profile |
| `Gender` | string | Male/Female/Other | User profile |
| `Daily_Usage_Hours` | float | 0–24 | Android UsageStats (auto) |
| `Sleep_Hours` | float | 0–24 | Questionnaire |
| `Academic_Performance` | float | 0–100 | Questionnaire |
| `Social_Interactions` | int | 0+ | Questionnaire |
| `Exercise_Hours` | float | 0–24 | User profile |
| `Anxiety_Level` | int | 0–10 | Questionnaire |
| `Depression_Level` | int | 0–10 | Questionnaire |
| `Self_Esteem` | int | 0–10 | Questionnaire |
| `Parental_Control` | int | 0–10 | Questionnaire |
| `Screen_Time_Before_Bed` | float | 0–24 | Android UsageStats (auto) |
| `Phone_Checks_Per_Day` | int | 0+ | Android UsageStats (auto) |
| `Apps_Used_Daily` | int | 0+ | Android UsageStats (auto) |
| `Time_on_Social_Media` | float | 0–24 | Android UsageStats (auto) |
| `Time_on_Gaming` | float | 0–24 | Android UsageStats (auto) |
| `Time_on_Education` | float | 0–24 | Android UsageStats (auto) |
| `Phone_Usage_Purpose` | string | Browsing/Education/Gaming/Other/Social Media | Questionnaire |
| `Family_Communication` | int | 0–10 | Questionnaire |
| `Weekend_Usage_Hours` | float | 0–24 | Android UsageStats (auto) |

### Derived Features (4, computed by API)

| Feature | Formula |
|---|---|
| `Total_Content_Hours` | Social + Gaming + Education |
| `Usage_Sleep_Ratio` | Daily_Usage / (Sleep + ε) |
| `Mental_Health_Score` | Anxiety + Depression − Self_Esteem |
| `Weekend_Weekday_Ratio` | Weekend_Usage / (Daily_Usage + ε) |

---

## 11. API Reference

### POST `/predict`

**Request Body:**
```json
{
  "Age": 20,
  "Gender": "Male",
  "Daily_Usage_Hours": 6.5,
  "Sleep_Hours": 6.0,
  "Academic_Performance": 65,
  "Social_Interactions": 3,
  "Exercise_Hours": 0.5,
  "Anxiety_Level": 7,
  "Depression_Level": 6,
  "Self_Esteem": 4,
  "Parental_Control": 2,
  "Screen_Time_Before_Bed": 2.0,
  "Phone_Checks_Per_Day": 85,
  "Apps_Used_Daily": 12,
  "Time_on_Social_Media": 3.0,
  "Time_on_Gaming": 1.5,
  "Time_on_Education": 0.5,
  "Phone_Usage_Purpose": "Social Media",
  "Family_Communication": 3,
  "Weekend_Usage_Hours": 8.0
}
```

**Response:**
```json
{
  "predicted_class": 2,
  "label": "High Addiction",
  "confidence": 0.9342
}
```

**Classes:**
| predicted_class | label |
|---|---|
| 0 | Low Addiction |
| 1 | Moderate Addiction |
| 2 | High Addiction |

### GET `/health`
```json
{ "status": "ok" }
```

### GET `/model-info`
```json
{
  "model": "CatBoostClassifier",
  "num_features": 24,
  "classes": { "0": "Low Addiction", "1": "Moderate Addiction", "2": "High Addiction" }
}
```

---

## 12. Deployment

### Backend — Render.com
- **URL:** `https://phone-addiction-prediction.onrender.com`
- **Runtime:** Docker (Python 3.11-slim)
- **Start command:** `uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}`
- **Note:** Free tier sleeps after 15 minutes of inactivity. First request after idle takes ~30 seconds to wake up.

### Mobile App — Release APK
- Signed with debug keystore (suitable for university demo)
- `API_BASE_URL` points to the Render deployment
- `android:usesCleartextTraffic="true"` allows HTTP fallback for local testing

---

## 13. How to Run Locally

### Backend
```bash
cd ml
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements_api.txt
uvicorn api.main:app --host 0.0.0.0 --port 8000
```
Server runs at `http://localhost:8000`

### Mobile App (Development)
```bash
# Update src/config.js to use localhost URL for local testing:
# export const API_BASE_URL = 'http://localhost:8000';

# Forward port via USB (phone connected):
adb reverse tcp:8000 tcp:8000

# Start Metro bundler:
cd MobileApp
npm install
npx react-native start

# In another terminal, run on connected device:
npx react-native run-android
```

### Build Release APK
```bash
cd MobileApp/android
gradlew.bat assembleRelease
# Output: app/build/outputs/apk/release/app-release.apk

# Install on device:
adb install app/build/outputs/apk/release/app-release.apk
```

---

## 14. Privacy & Ethics

### Data Collection
- **What is collected:** Aggregate foreground usage time per app category (not individual app content)
- **What is NOT collected:** Messages, browsing history, keystrokes, notifications, location, contacts
- **Storage:** All data stored locally on the device using AsyncStorage
- **Transmission:** Only aggregate numerical statistics are sent to the prediction API — no app names, personal identifiers, or message content

### Permissions
| Permission | Why needed |
|---|---|
| `PACKAGE_USAGE_STATS` | Read app foreground times via Android UsageStatsManager |
| `QUERY_ALL_PACKAGES` | Resolve app names from package IDs on Android 11+ |
| `INTERNET` | Send prediction request to FastAPI backend |
| `POST_NOTIFICATIONS` | Show risk alert and daily summary notifications |

### Disclaimer
This application is a university final-year project for educational and research purposes. The ML model provides risk level predictions based on behavioral patterns — it is **not a medical diagnostic tool**. Users experiencing mental health concerns should consult a qualified healthcare professional.

### Ethical Considerations
- No data is ever transmitted to third parties
- Uninstalling the app permanently removes all locally stored data
- Usage Access permission can be revoked at any time from Android system settings
- The app does not track content, only time durations by category

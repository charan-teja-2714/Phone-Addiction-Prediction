# Smartphone Addiction Prediction — ML Pipeline

Multiclass classification system that predicts smartphone addiction levels
(**Low**, **Moderate**, **High**) from behavioural and psychological features
using a CatBoost classifier.

## Problem Definition

Smartphone addiction is a growing concern among students. This pipeline takes
~3000 survey records containing usage patterns, mental health indicators, and
demographic features, then classifies each respondent into one of three
addiction levels. The final model powers a mobile application that provides
real-time predictions.

## Quick Start

```bash
# 1. Install dependencies (inside your venv)
pip install -r requirements.txt

# 2. Place your dataset at  ml/data/raw/primary_dataset.csv

# 3. Train all 4 models and generate comparison plots
python run_pipeline.py

# 4. Freeze the best model (CatBoost) for deployment
python freeze_model.py
```

## Project Structure

```
ml/
├── data/
│   ├── raw/primary_dataset.csv           ← source dataset
│   └── processed/
│       ├── cleaned_data.csv              ← after imputation (pre-encoding)
│       ├── train_ready_data.csv          ← after encoding + binning
│       └── preprocessing_artifacts.pkl   ← full training artifacts
│
├── src/
│   ├── config.py                         ← paths, hyperparameters, constants
│   ├── data_loader.py                    ← load & validate raw CSV
│   ├── preprocessing.py                  ← imputation, encoding, target binning
│   ├── feature_engineering.py            ← derived features, SMOTE, splits
│   ├── train_random_forest.py
│   ├── train_xgboost.py
│   ├── train_lightgbm.py
│   ├── train_catboost.py
│   ├── evaluate.py                       ← metrics, plots, model comparison
│   └── utils.py                          ← logging, I/O helpers
│
├── models/
│   ├── random_forest/model.pkl
│   ├── xgboost/model.pkl
│   ├── lightgbm/model.pkl
│   ├── catboost/model.cbm                ← FINAL DEPLOYMENT MODEL
│   ├── feature_schema.json               ← frozen input feature order
│   └── label_mapping.json                ← class index → label
│
├── artifacts/
│   ├── encoders.pkl                      ← LabelEncoders for categorical features
│   └── preprocessing_metadata.json       ← thresholds, mappings, feature info
│
├── validation/
│   ├── sample_input.json                 ← real sample for sanity check
│   └── sanity_check_output.json          ← prediction output verification
│
├── metrics/                              ← per-model JSON evaluation reports
├── plots/                                ← confusion matrices, feature importance
├── logs/
│   ├── training.log                      ← training pipeline log
│   └── model_freeze.log                  ← freeze/packaging log
│
├── run_pipeline.py                       ← train all models
├── freeze_model.py                       ← freeze best model for deployment
├── requirements.txt
└── README.md
```

## Final Model: CatBoost

**Why CatBoost was selected:**

| Model         | Accuracy | F1 (macro) | CV F1 Mean | CV Std |
|---------------|----------|------------|------------|--------|
| Random Forest | 0.843    | 0.796      | 0.944      | 0.007  |
| XGBoost       | 0.895    | 0.855      | 0.970      | 0.006  |
| LightGBM      | 0.895    | 0.853      | 0.970      | 0.005  |
| **CatBoost**  | **0.908**| **0.876**  | **0.972**  | **0.004** |

CatBoost wins on every metric — highest test F1, highest CV F1, and lowest
variance (most stable across folds). Its built-in `auto_class_weights=Balanced`
complements the SMOTE oversampling applied during training.

## Target Binning

The raw `Addiction_Level` (continuous 1–10) is binned into three classes:

| Score Range | Class              | Label |
|-------------|--------------------|-------|
| < 7.0       | Low Addiction      | 0     |
| 7.0 – 9.0   | Moderate Addiction | 1     |
| >= 9.0      | High Addiction     | 2     |

Dataset distribution after binning: Low 14% / Moderate 22% / High 64%.
SMOTE balances the training set to equal class sizes.

## Input Feature Schema

All inference requests **must** provide these 20 features in this exact order:

```json
[
  "Age", "Gender", "Daily_Usage_Hours", "Sleep_Hours",
  "Academic_Performance", "Social_Interactions", "Exercise_Hours",
  "Anxiety_Level", "Depression_Level", "Self_Esteem",
  "Parental_Control", "Screen_Time_Before_Bed", "Phone_Checks_Per_Day",
  "Apps_Used_Daily", "Time_on_Social_Media", "Time_on_Gaming",
  "Time_on_Education", "Phone_Usage_Purpose", "Family_Communication",
  "Weekend_Usage_Hours"
]
```

**Categorical encoding (must be applied before inference):**

| Feature              | Mapping                                                     |
|----------------------|-------------------------------------------------------------|
| Gender               | Female → 0, Male → 1, Other → 2                            |
| Phone_Usage_Purpose  | Browsing → 0, Education → 1, Gaming → 2, Other → 3, Social Media → 4 |

**4 derived features are computed automatically at inference time:**
- `Total_Content_Hours` = Social Media + Gaming + Education hours
- `Usage_Sleep_Ratio` = Daily Usage / Sleep Hours
- `Mental_Health_Score` = Anxiety + Depression - Self Esteem
- `Weekend_Weekday_Ratio` = Weekend Usage / Daily Usage

## Label Mapping

```json
{
  "0": "Low Addiction",
  "1": "Moderate Addiction",
  "2": "High Addiction"
}
```

## Loading the Model for Inference

```python
import json
import joblib
import pandas as pd
from catboost import CatBoostClassifier

# 1. Load model
model = CatBoostClassifier()
model.load_model("ml/models/catboost/model.cbm")

# 2. Load schema and label mapping
with open("ml/models/feature_schema.json") as f:
    schema = json.load(f)
with open("ml/models/label_mapping.json") as f:
    labels = json.load(f)

# 3. Load encoders
encoders = joblib.load("ml/artifacts/encoders.pkl")

# 4. Prepare input (encode categoricals, add derived features, predict)
```

## Deployment Readiness

### FastAPI
The frozen model, schema, encoders, and label mapping provide everything
needed for a `/predict` endpoint. Load them once at startup and apply the
same preprocessing (encode categoricals → add derived features → predict).

### Hugging Face Hub
Upload these files to a Hugging Face model repository:
- `models/catboost/model.cbm`
- `models/feature_schema.json`
- `models/label_mapping.json`
- `artifacts/encoders.pkl`
- `artifacts/preprocessing_metadata.json`

The `preprocessing_metadata.json` contains all information needed to
reconstruct the inference pipeline without access to the source code.

## Graceful Degradation (Optional Feature Defaults)

In real-world mobile usage, users may skip questionnaire fields. To handle
this, `preprocessing_metadata.json` contains **Age + Gender stratified median
defaults** for the 7 optional features.

### Architecture

```
Mobile App                          Backend API
──────────                          ───────────
User fills some fields              Receives all 20 features (strict)
  ↓                                   ↓
App checks which optional           Encodes, derives, predicts
fields are missing                    ↓
  ↓                                 Returns prediction
Looks up defaults from
preprocessing_metadata.json
(by age group + gender)
  ↓
Fills missing fields
  ↓
Sends complete 20-feature request
```

**The backend always requires all 20 features.** The default-filling logic
lives entirely in the mobile app layer.

### Feature Classification

| Type | Features | Source |
|------|----------|--------|
| **Auto-collected** (10) | Daily_Usage_Hours, Phone_Checks_Per_Day, Screen_Time_Before_Bed, Weekend_Usage_Hours, Time_on_Social_Media, Time_on_Gaming, Time_on_Education, Apps_Used_Daily, Sleep_Hours, Exercise_Hours | Device sensors / tracking |
| **Optional** (7) | Anxiety_Level, Depression_Level, Self_Esteem, Academic_Performance, Family_Communication, Social_Interactions, Parental_Control | User questionnaire |

### Fallback Chain

1. **Age-group + Gender median** (if that stratum has >= 5 samples)
2. **Gender-only median** (if age+gender stratum is too small)
3. **Global median** (ultimate fallback)

### Age Groups

`<18` | `18-22` | `23-30` | `>30`

### Data Completeness Score

```
completeness = (number of user-provided optional features) / 7
```

- `1.0` = user filled all 7 optional fields (best prediction quality)
- `0.0` = all 7 used defaults (still produces a valid prediction)
- This score is informational only — it does NOT affect model confidence

### Recomputing Defaults

If the dataset changes, re-run:

```bash
python compute_defaults.py
```

This updates `preprocessing_metadata.json` without touching any other artifact.


uvicorn api.main:app --host 0.0.0.0 --port 8000   
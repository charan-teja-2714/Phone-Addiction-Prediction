# Smartphone Addiction Prediction — FastAPI Service

Production-ready inference API serving a frozen CatBoost model that classifies
smartphone addiction into **Low**, **Moderate**, or **High**.

## Quick Start

```bash
# From the ml/ directory
cd ml

# Install dependencies (inside your venv)
pip install -r api/requirements.txt

# Start the server
uvicorn api.main:app --host 0.0.0.0 --port 8000
```

The server loads all artifacts at startup. Swagger docs are available at
`http://localhost:8000/docs`.

## Endpoints

### `GET /health`
```json
{ "status": "ok" }
```

### `GET /model-info`
```json
{
  "model": "CatBoostClassifier",
  "num_features": 20,
  "classes": {
    "0": "Low Addiction",
    "1": "Moderate Addiction",
    "2": "High Addiction"
  }
}
```

### `POST /predict`

**Request body** — all 20 features required:

```json
{
  "Age": 17,
  "Gender": "Male",
  "Daily_Usage_Hours": 6.5,
  "Sleep_Hours": 5.0,
  "Academic_Performance": 65,
  "Social_Interactions": 3,
  "Exercise_Hours": 0.5,
  "Anxiety_Level": 8,
  "Depression_Level": 7,
  "Self_Esteem": 3,
  "Parental_Control": 1,
  "Screen_Time_Before_Bed": 2.5,
  "Phone_Checks_Per_Day": 120,
  "Apps_Used_Daily": 15,
  "Time_on_Social_Media": 3.0,
  "Time_on_Gaming": 2.0,
  "Time_on_Education": 0.5,
  "Phone_Usage_Purpose": "Social Media",
  "Family_Communication": 2,
  "Weekend_Usage_Hours": 9.0
}
```

**Response:**

```json
{
  "predicted_class": 2,
  "label": "High Addiction",
  "confidence": 0.9991
}
```

### Categorical Fields

These fields accept **either** human-readable strings or pre-encoded integers:

| Field | String values | Encoded values |
|---|---|---|
| Gender | Female, Male, Other | 0, 1, 2 |
| Phone_Usage_Purpose | Browsing, Education, Gaming, Other, Social Media | 0, 1, 2, 3, 4 |

## React Native Integration

```javascript
const response = await fetch("http://<server-ip>:8000/predict", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    Age: 17,
    Gender: "Male",
    Daily_Usage_Hours: 6.5,
    Sleep_Hours: 5.0,
    Academic_Performance: 65,
    Social_Interactions: 3,
    Exercise_Hours: 0.5,
    Anxiety_Level: 8,
    Depression_Level: 7,
    Self_Esteem: 3,
    Parental_Control: 1,
    Screen_Time_Before_Bed: 2.5,
    Phone_Checks_Per_Day: 120,
    Apps_Used_Daily: 15,
    Time_on_Social_Media: 3.0,
    Time_on_Gaming: 2.0,
    Time_on_Education: 0.5,
    Phone_Usage_Purpose: "Social Media",
    Family_Communication: 2,
    Weekend_Usage_Hours: 9.0,
  }),
});

const result = await response.json();
// result = { predicted_class: 2, label: "High Addiction", confidence: 0.9991 }
```

**Notes for mobile:**
- CORS is enabled for all origins
- Use the device's local network IP (not `localhost`) when testing on a physical device
- The API accepts both string labels and numeric codes for categorical fields

## Hugging Face Compatibility

To upload this model to Hugging Face Hub, push these files to a model repository:

```
models/catboost/model.cbm
models/feature_schema.json
models/label_mapping.json
artifacts/encoders.pkl
artifacts/preprocessing_metadata.json
```

The `preprocessing_metadata.json` is self-contained — it includes all
categorical mappings, thresholds, and feature ordering needed to reconstruct
inference without access to the training code.

## Error Handling

| Code | Meaning |
|------|---------|
| 200  | Successful prediction |
| 422  | Invalid input (missing field, wrong type, unknown category) |
| 500  | Internal server error (never exposes stack traces) |

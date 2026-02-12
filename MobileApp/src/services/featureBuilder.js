/**
 * featureBuilder.js — Builds the 20-field prediction request from store data.
 *
 * Applies the 3-tier graceful degradation strategy from preprocessing_metadata.json:
 *   1. Age-group + Gender stratified median (if stratum available)
 *   2. Gender-only median
 *   3. Global median (ultimate fallback)
 *
 * The 7 optional questionnaire features use degradation when unanswered (null).
 * The 10 auto features come from the Android native module.
 * Age, Gender, Sleep_Hours, Exercise_Hours come from user profile settings.
 */

// ── Stratified defaults (from preprocessing_metadata.json) ──

const GLOBAL_MEDIANS = {
  Anxiety_Level: 6.0,
  Depression_Level: 5.0,
  Self_Esteem: 6.0,
  Academic_Performance: 75.0,
  Family_Communication: 5.0,
  Social_Interactions: 5.0,
  Parental_Control: 1.0,
};

const GENDER_MEDIANS = {
  Male: {
    Anxiety_Level: 6.0,
    Depression_Level: 5.0,
    Self_Esteem: 6.0,
    Academic_Performance: 75.0,
    Family_Communication: 5.0,
    Social_Interactions: 5.0,
    Parental_Control: 1.0,
  },
  Female: {
    Anxiety_Level: 6.0,
    Depression_Level: 6.0,
    Self_Esteem: 6.0,
    Academic_Performance: 75.0,
    Family_Communication: 6.0,
    Social_Interactions: 5.0,
    Parental_Control: 1.0,
  },
  Other: {
    Anxiety_Level: 6.0,
    Depression_Level: 5.0,
    Self_Esteem: 6.0,
    Academic_Performance: 76.0,
    Family_Communication: 5.0,
    Social_Interactions: 5.0,
    Parental_Control: 0.0,
  },
};

const STRATIFIED_DEFAULTS = {
  '<18': {
    Male: { Anxiety_Level: 6.0, Depression_Level: 5.0, Self_Esteem: 6.0, Academic_Performance: 75.0, Family_Communication: 5.0, Social_Interactions: 5.0, Parental_Control: 1.0 },
    Female: { Anxiety_Level: 5.0, Depression_Level: 6.0, Self_Esteem: 6.0, Academic_Performance: 74.0, Family_Communication: 6.0, Social_Interactions: 5.0, Parental_Control: 0.0 },
    Other: { Anxiety_Level: 6.0, Depression_Level: 5.0, Self_Esteem: 6.0, Academic_Performance: 76.0, Family_Communication: 6.0, Social_Interactions: 5.0, Parental_Control: 1.0 },
  },
  '18-22': {
    Male: { Anxiety_Level: 5.0, Depression_Level: 6.0, Self_Esteem: 6.0, Academic_Performance: 76.0, Family_Communication: 5.0, Social_Interactions: 5.0, Parental_Control: 1.0 },
    Female: { Anxiety_Level: 6.0, Depression_Level: 6.0, Self_Esteem: 5.0, Academic_Performance: 77.0, Family_Communication: 5.0, Social_Interactions: 5.0, Parental_Control: 1.0 },
    Other: { Anxiety_Level: 6.0, Depression_Level: 6.0, Self_Esteem: 5.0, Academic_Performance: 76.0, Family_Communication: 5.0, Social_Interactions: 5.0, Parental_Control: 0.0 },
  },
  '23-30': {
    Male: { Anxiety_Level: 6.0, Depression_Level: 5.0, Self_Esteem: 6.0, Academic_Performance: 75.0, Family_Communication: 5.0, Social_Interactions: 5.0, Parental_Control: 1.0 },
    Female: { Anxiety_Level: 6.0, Depression_Level: 6.0, Self_Esteem: 6.0, Academic_Performance: 75.0, Family_Communication: 6.0, Social_Interactions: 5.0, Parental_Control: 1.0 },
    Other: { Anxiety_Level: 6.0, Depression_Level: 5.0, Self_Esteem: 6.0, Academic_Performance: 76.0, Family_Communication: 5.0, Social_Interactions: 5.0, Parental_Control: 0.0 },
  },
  '>30': {
    Male: { Anxiety_Level: 6.0, Depression_Level: 5.0, Self_Esteem: 6.0, Academic_Performance: 75.0, Family_Communication: 5.0, Social_Interactions: 5.0, Parental_Control: 1.0 },
    Female: { Anxiety_Level: 6.0, Depression_Level: 6.0, Self_Esteem: 6.0, Academic_Performance: 75.0, Family_Communication: 6.0, Social_Interactions: 5.0, Parental_Control: 1.0 },
    Other: { Anxiety_Level: 6.0, Depression_Level: 5.0, Self_Esteem: 6.0, Academic_Performance: 76.0, Family_Communication: 5.0, Social_Interactions: 5.0, Parental_Control: 0.0 },
  },
};

/**
 * Returns the age-group key for the stratified defaults.
 * @param {number} age
 * @returns {string} e.g. "<18", "18-22", "23-30", ">30"
 */
function getAgeGroup(age) {
  if (age < 18) return '<18';
  if (age <= 22) return '18-22';
  if (age <= 30) return '23-30';
  return '>30';
}

/**
 * 3-tier fallback to get a default value for an optional feature.
 * @param {string} feature — API feature name
 * @param {number} age
 * @param {string} gender — "Male" | "Female" | "Other"
 * @returns {number}
 */
function getDefault(feature, age, gender) {
  // Tier 1: Age-group + Gender stratified
  const ageGroup = getAgeGroup(age);
  const stratum = STRATIFIED_DEFAULTS[ageGroup]?.[gender];
  if (stratum && stratum[feature] !== undefined) return stratum[feature];

  // Tier 2: Gender-only median
  const genderMedian = GENDER_MEDIANS[gender];
  if (genderMedian && genderMedian[feature] !== undefined) return genderMedian[feature];

  // Tier 3: Global median
  return GLOBAL_MEDIANS[feature] ?? 5.0;
}

/**
 * Derives Phone_Usage_Purpose from the dominant app category.
 * @param {object} usage — Store usageStats
 * @returns {string} "Social Media" | "Gaming" | "Education" | "Browsing" | "Other"
 */
function derivePhoneUsagePurpose(usage) {
  const categories = [
    { name: 'Social Media', hours: usage.socialMediaHours ?? 0 },
    { name: 'Gaming', hours: usage.gamingHours ?? 0 },
    { name: 'Education', hours: usage.educationHours ?? 0 },
  ];

  const sorted = categories.sort((a, b) => b.hours - a.hours);
  const top = sorted[0];

  // If the top category has meaningful usage, return it
  if (top.hours > 0.1) return top.name;

  // If total usage is very low, classify as "Other"
  const totalUsage = usage.dailyUsageHours ?? 0;
  if (totalUsage < 0.5) return 'Other';

  // Default to "Browsing" if usage exists but no dominant category
  return 'Browsing';
}

/**
 * Builds the 20-field prediction request body.
 *
 * @param {object} params
 * @param {object} params.usageStats — From store (auto-collected from device)
 * @param {object} params.questionnaire — From store (user-filled, nullable fields)
 * @param {object} params.userProfile — { age: number, gender: string, sleepHours: number, exerciseHours: number }
 * @returns {object} — 20-field request body matching PredictionRequest schema
 */
export function buildPredictionRequest({ usageStats, questionnaire, userProfile }) {
  const age = userProfile.age ?? 20;
  const gender = userProfile.gender ?? 'Other';

  // ── Auto-collected features (from Android native module) ──
  const autoFeatures = {
    Daily_Usage_Hours: usageStats.dailyUsageHours ?? 0,
    Phone_Checks_Per_Day: usageStats.phoneChecks ?? 0,
    Screen_Time_Before_Bed: usageStats.screenTimeBeforeBed ?? 0,
    Weekend_Usage_Hours: usageStats.weekendUsage ?? 0,
    Time_on_Social_Media: usageStats.socialMediaHours ?? 0,
    Time_on_Gaming: usageStats.gamingHours ?? 0,
    Time_on_Education: usageStats.educationHours ?? 0,
    Apps_Used_Daily: usageStats.appsUsed ?? 0,
  };

  // ── User-provided lifestyle features ──
  const lifestyleFeatures = {
    Sleep_Hours: userProfile.sleepHours ?? 7,
    Exercise_Hours: userProfile.exerciseHours ?? 1,
  };

  // ── Optional questionnaire features (with graceful degradation) ──
  const optionalMapping = {
    Anxiety_Level: questionnaire.anxietyLevel,
    Depression_Level: questionnaire.depressionLevel,
    Self_Esteem: questionnaire.selfEsteem,
    Academic_Performance: questionnaire.academicPerformance,
    Family_Communication: questionnaire.familyCommunication,
    Social_Interactions: questionnaire.socialInteractions,
    Parental_Control: questionnaire.parentalControl,
  };

  const optionalFeatures = {};
  for (const [apiKey, storeValue] of Object.entries(optionalMapping)) {
    optionalFeatures[apiKey] =
      storeValue !== null && storeValue !== undefined
        ? storeValue
        : getDefault(apiKey, age, gender);
  }

  // ── Derived ──
  const phonePurpose = derivePhoneUsagePurpose(usageStats);

  return {
    Age: age,
    Gender: gender,
    ...autoFeatures,
    ...lifestyleFeatures,
    ...optionalFeatures,
    Phone_Usage_Purpose: phonePurpose,
  };
}

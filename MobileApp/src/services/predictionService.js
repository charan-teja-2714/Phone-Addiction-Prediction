/**
 * predictionService.js — Calls the FastAPI /predict endpoint.
 *
 * Returns a normalized prediction result or null on failure.
 * Never throws — all errors are caught and logged.
 */

import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT_MS } from '../config';
import { buildPredictionRequest } from './featureBuilder';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Checks if the prediction API server is reachable.
 * @returns {Promise<boolean>}
 */
export async function isApiReachable() {
  try {
    const res = await api.get('/health', { timeout: 5000 });
    return res.data?.status === 'healthy';
  } catch {
    return false;
  }
}

/**
 * Runs a prediction against the FastAPI backend.
 *
 * @param {object} params
 * @param {object} params.usageStats — From Zustand store
 * @param {object} params.questionnaire — From Zustand store
 * @param {object} params.userProfile — { age, gender, sleepHours, exerciseHours }
 * @returns {Promise<{ label: string, confidence: number, predictedClass: number, timestamp: string } | null>}
 */
export async function runPrediction({ usageStats, questionnaire, userProfile }) {
  try {
    const requestBody = buildPredictionRequest({
      usageStats,
      questionnaire,
      userProfile,
    });

    const response = await api.post('/predict', requestBody);
    const data = response.data;

    return {
      predictedClass: data.predicted_class,
      label: data.label,
      confidence: data.confidence,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  } catch (error) {
    if (__DEV__) {
      console.warn(
        '[predictionService] Prediction failed:',
        error.response?.data || error.message,
      );
    }
    return null;
  }
}

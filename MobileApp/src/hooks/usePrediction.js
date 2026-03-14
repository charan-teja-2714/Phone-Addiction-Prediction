/**
 * usePrediction — Hook that runs the ML prediction via the FastAPI backend.
 *
 * Reads usage stats, questionnaire, and user profile from the Zustand store,
 * sends them to the API, and stores the result back in the store.
 *
 * Usage:
 *   const { predict, loading, error } = usePrediction();
 *   await predict(); // triggers prediction
 */

import { useCallback, useRef, useState } from 'react';
import { runPrediction } from '../services/predictionService';
import { useAppStore } from '../store/useAppStore';

export const usePrediction = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const runningRef = useRef(false);

  const predict = useCallback(async () => {
    // Prevent concurrent predictions
    if (runningRef.current) return;
    runningRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const state = useAppStore.getState();
      const result = await runPrediction({
        usageStats: state.usageStats,
        questionnaire: state.questionnaire,
        userProfile: state.userProfile,
      });

      if (result) {
        useAppStore.getState().setPrediction(result);
        useAppStore.getState().refreshWeeklyHistory?.();
      } else {
        setError('Could not reach the prediction server.');
      }
    } catch (e) {
      setError(e.message || 'Prediction failed');
    } finally {
      setLoading(false);
      runningRef.current = false;
    }
  }, []);

  return { predict, loading, error };
};

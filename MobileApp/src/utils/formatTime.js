/**
 * Formats a duration in milliseconds into a human-readable string.
 *
 *   < 60 seconds  → "45s"
 *   < 60 minutes  → "12m"
 *   >= 60 minutes  → "2h 15m"
 *
 * @param {number} ms — Duration in milliseconds
 * @returns {string}
 */
export function formatDuration(ms) {
  if (!ms || ms < 0) return '0s';

  const totalSeconds = Math.floor(ms / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const remainingMinutes = totalMinutes % 60;
  if (remainingMinutes === 0) {
    return `${totalHours}h`;
  }
  return `${totalHours}h ${remainingMinutes}m`;
}

/**
 * Formats hours (decimal) into a human-readable string.
 *
 *   < 1/60 hour (< 1 min)  → seconds
 *   < 1 hour               → minutes
 *   >= 1 hour              → hours and minutes
 *
 * @param {number} hours — Duration in decimal hours (e.g. 1.5)
 * @returns {string}
 */
export function formatHours(hours) {
  if (!hours || hours <= 0) return '0s';
  return formatDuration(hours * 3600000);
}

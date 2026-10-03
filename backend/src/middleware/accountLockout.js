/**
 * Account Lockout middleware (S-10)
 * Tracks failed login attempts per email and locks accounts after threshold.
 * In-memory store (resets on server restart). For production, use Redis.
 */

const LOCKOUT_THRESHOLD = 5;         // Max failed attempts
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // Cleanup every 10 minutes

// In-memory store: { email: { attempts: number, lockedUntil: Date|null } }
const failedAttempts = new Map();

// Periodic cleanup of expired entries
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of failedAttempts.entries()) {
    if (data.lockedUntil && data.lockedUntil < now) {
      failedAttempts.delete(email);
    }
  }
}, CLEANUP_INTERVAL_MS);

/**
 * Check if an account is locked
 * @param {string} email
 * @returns {{ locked: boolean, remainingMs: number }}
 */
function isAccountLocked(email) {
  const key = String(email).toLowerCase();
  const data = failedAttempts.get(key);
  if (!data || !data.lockedUntil) return { locked: false, remainingMs: 0 };

  const now = Date.now();
  if (data.lockedUntil > now) {
    return { locked: true, remainingMs: data.lockedUntil - now };
  }

  // Lockout expired, clear it
  failedAttempts.delete(key);
  return { locked: false, remainingMs: 0 };
}

/**
 * Record a failed login attempt
 * @param {string} email
 * @returns {{ locked: boolean, attempts: number, remainingMs: number }}
 */
function recordFailedAttempt(email) {
  const key = String(email).toLowerCase();
  const data = failedAttempts.get(key) || { attempts: 0, lockedUntil: null };

  data.attempts += 1;

  if (data.attempts >= LOCKOUT_THRESHOLD) {
    data.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    failedAttempts.set(key, data);
    return { locked: true, attempts: data.attempts, remainingMs: LOCKOUT_DURATION_MS };
  }

  failedAttempts.set(key, data);
  return { locked: false, attempts: data.attempts, remainingMs: 0 };
}

/**
 * Clear failed attempts on successful login
 * @param {string} email
 */
function clearFailedAttempts(email) {
  failedAttempts.delete(String(email).toLowerCase());
}

/**
 * Get remaining attempts before lockout
 * @param {string} email
 * @returns {number}
 */
function getRemainingAttempts(email) {
  const key = String(email).toLowerCase();
  const data = failedAttempts.get(key);
  if (!data) return LOCKOUT_THRESHOLD;
  return Math.max(0, LOCKOUT_THRESHOLD - data.attempts);
}

module.exports = {
  isAccountLocked,
  recordFailedAttempt,
  clearFailedAttempts,
  getRemainingAttempts,
  LOCKOUT_THRESHOLD,
  LOCKOUT_DURATION_MS,
};

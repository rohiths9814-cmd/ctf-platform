/**
 * Simple in-memory response cache.
 * Dramatically reduces DB queries for hot endpoints like leaderboard.
 * 
 * Usage:
 *   import { cached, invalidate } from '../utils/cache.js';
 *   const data = cached('leaderboard', 5000, () => db.prepare(...).all());
 *   invalidate('leaderboard'); // bust on new solve
 */

const cache = new Map();

/**
 * Return cached data if fresh, otherwise execute fetchFn and cache result.
 * @param {string} key   - Unique cache key
 * @param {number} ttlMs - Time-to-live in milliseconds
 * @param {Function} fetchFn - Synchronous function that returns fresh data
 */
export function cached(key, ttlMs, fetchFn) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.time < ttlMs) {
    return entry.data;
  }
  const data = fetchFn();
  cache.set(key, { data, time: Date.now() });
  return data;
}

/** Remove a specific cache entry (call after writes that affect it). */
export function invalidate(key) {
  cache.delete(key);
}

/** Remove all cache entries matching a prefix. */
export function invalidatePrefix(prefix) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

/** Clear entire cache. */
export function invalidateAll() {
  cache.clear();
}

/** Get cache stats for monitoring. */
export function getCacheStats() {
  return {
    entries: cache.size,
    keys: [...cache.keys()],
  };
}

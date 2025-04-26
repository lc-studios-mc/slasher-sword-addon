/**
 * Clamps a number within a given range.
 * @param {number} value - The number to clamp.
 * @param {number} min - The lower bound.
 * @param {number} max - The upper bound.
 * @returns {number} The clamped value.
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Returns a random integer in a range (inclusive).
 * @param {number} min - The minimum value.
 * @param {number} max - The maximum value.
 * @returns {number} A random integer.
 */
export function randi(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Returns a random floating-point number in a range.
 * @param {number} min - The minimum value.
 * @param {number} max - The maximum value.
 * @returns {number} A random float.
 */
export function randf(min, max) {
  return Math.random() * (max - min) + min;
}

import { Direction } from "@minecraft/server";

/**
 * @typedef {import("@minecraft/server").Vector3} Vector3
 */

export const ONE = Object.freeze({
  x: 1,
  y: 1,
  z: 1,
});

export const HALF = Object.freeze({
  x: 0.5,
  y: 0.5,
  z: 0.5,
});

export const ZERO = Object.freeze({
  x: 0,
  y: 0,
  z: 0,
});

export const UP = Object.freeze({
  x: 0,
  y: 1,
  z: 0,
});

export const DOWN = Object.freeze({
  x: 0,
  y: -1,
  z: 0,
});

export const LEFT = Object.freeze({
  x: -1,
  y: 0,
  z: 0,
});

export const RIGHT = Object.freeze({
  x: 1,
  y: 0,
  z: 0,
});

export const FORWARD = Object.freeze({
  x: 0,
  y: 0,
  z: 1,
});

export const BACKWARD = Object.freeze({
  x: 0,
  y: 0,
  z: -1,
});

/**
 * Checks if an object is a valid Vector3.
 * @param {unknown} arg Value to check
 * @returns {boolean}
 */
export function isVector3(arg) {
  if (arg == null) return false;
  if (typeof arg !== "object") return false;
  if (Array.isArray(arg)) return false;

  const isVector3 =
    "x" in arg &&
    typeof arg.x === "number" &&
    "y" in arg &&
    typeof arg.y === "number" &&
    "z" in arg &&
    typeof arg.z === "number";

  return isVector3;
}

/**
 * Adds two vectors together.
 * @param {Vector3} vecA First vector
 * @param {Vector3} vecB Second vector
 * @returns {Vector3}
 */
export function add(vecA, vecB) {
  return {
    x: vecA.x + vecB.x,
    y: vecA.y + vecB.y,
    z: vecA.z + vecB.z,
  };
}

/**
 * Subtracts second vector from first.
 * @param {Vector3} vecA First vector
 * @param {Vector3} vecB Vector to subtract
 * @returns {Vector3}
 */
export function subtract(vecA, vecB) {
  return {
    x: vecA.x - vecB.x,
    y: vecA.y - vecB.y,
    z: vecA.z - vecB.z,
  };
}

/**
 * Scales a vector by a number or another vector.
 * @param {Vector3} vec Vector to scale
 * @param {Vector3 | number} scalar Scale factor
 * @returns {Vector3}
 */
export function scale(vec, scalar) {
  if (typeof scalar === "number") {
    return {
      x: vec.x * scalar,
      y: vec.y * scalar,
      z: vec.z * scalar,
    };
  } else if (isVector3(scalar)) {
    return {
      x: vec.x * scalar.x,
      y: vec.y * scalar.y,
      z: vec.z * scalar.z,
    };
  }
  return vec;
}

/**
 * Divides vector by a number or another vector.
 * @param {Vector3} vec Vector to divide
 * @param {Vector3 | number} divisor Divisor value
 * @returns {Vector3}
 */
export function divide(vec, divisor) {
  if (typeof divisor === "number") {
    return {
      x: vec.x / divisor,
      y: vec.y / divisor,
      z: vec.z / divisor,
    };
  } else if (isVector3(divisor)) {
    return {
      x: vec.x / divisor.x,
      y: vec.y / divisor.y,
      z: vec.z / divisor.z,
    };
  }
  return vec;
}

/**
 * Calculates distance between two points.
 * @param {Vector3} vecA First point
 * @param {Vector3} vecB Second point
 * @returns {number}
 */
export function distance(vecA, vecB) {
  return Math.sqrt(
    (vecA.x - vecB.x) ** 2 + (vecA.y - vecB.y) ** 2 + (vecA.z - vecB.z) ** 2,
  );
}

/**
 * Calculates squared distance between two points.
 * @param {Vector3} vecA First point
 * @param {Vector3} vecB Second point
 * @returns {number}
 */
export function sqrDistance(vecA, vecB) {
  return (
    (vecA.x - vecB.x) ** 2 + (vecA.y - vecB.y) ** 2 + (vecA.z - vecB.z) ** 2
  );
}

/**
 * Normalizes a vector to unit length.
 * @param {Vector3} vec Input vector
 * @returns {Vector3}
 */
export function normalize(vec) {
  const length = Math.sqrt(vec.x ** 2 + vec.y ** 2 + vec.z ** 2);
  if (length === 0) return { x: 0, y: 0, z: 0 };
  return {
    x: vec.x / length,
    y: vec.y / length,
    z: vec.z / length,
  };
}

/**
 * Linearly interpolates between two vectors.
 * @param {Vector3} vec1 Start vector
 * @param {Vector3} vec2 End vector
 * @param {number} t Interpolation factor (0-1)
 * @returns {Vector3}
 */
export function lerp(vec1, vec2, t) {
  return {
    x: vec1.x + (vec2.x - vec1.x) * t,
    y: vec1.y + (vec2.y - vec1.y) * t,
    z: vec1.z + (vec2.z - vec1.z) * t,
  };
}

/**
 * Reflects a vector off a surface with given normal.
 * @param {Vector3} vec Input vector
 * @param {Vector3} normal Surface normal
 * @returns {Vector3}
 */
export function reflect(vec, normal) {
  return subtract(vec, scale(scale(normal, 2), dot(vec, normal)));
}

/**
 * Computes the cross product of two vectors.
 * @param {Vector3} vec1 First vector
 * @param {Vector3} vec2 Second vector
 * @returns {Vector3}
 */
export function cross(vec1, vec2) {
  return {
    x: vec1.y * vec2.z - vec1.z * vec2.y,
    y: vec1.z * vec2.x - vec1.x * vec2.z,
    z: vec1.x * vec2.y - vec1.y * vec2.x,
  };
}

/**
 * Computes the dot product of two vectors.
 * @param {Vector3} vec1 First vector
 * @param {Vector3} vec2 Second vector
 * @returns {number}
 */
export function dot(vec1, vec2) {
  return vec1.x * vec2.x + vec1.y * vec2.y + vec1.z * vec2.z;
}

/**
 * Calculates the magnitude of a vector.
 * @param {Vector3} vec The vector
 * @returns {number}
 */
export function length(vec) {
  return Math.sqrt(vec.x ** 2 + vec.y ** 2 + vec.z ** 2);
}

/**
 * Calculates the squared magnitude of a vector.
 * @param {Vector3} vec The vector
 * @returns {number}
 */
export function sqrLength(vec) {
  return vec.x ** 2 + vec.y ** 2 + vec.z ** 2;
}

/**
 * Calculates the angle between two vectors in radians.
 * @param {Vector3} vec1 First vector
 * @param {Vector3} vec2 Second vector
 * @returns {number}
 */
export function angle(vec1, vec2) {
  return Math.acos(dot(normalize(vec1), normalize(vec2)));
}

/**
 * Calculates midpoint between two vectors.
 * @param {Vector3} vec1 First vector
 * @param {Vector3} vec2 Second vector
 * @returns {Vector3}
 */
export function midpoint(vec1, vec2) {
  return {
    x: (vec1.x + vec2.x) / 2,
    y: (vec1.y + vec2.y) / 2,
    z: (vec1.z + vec2.z) / 2,
  };
}

/**
 * Clamps vector components between min and max values.
 * @param {Vector3} vec Vector to clamp
 * @param {Vector3} min Minimum values
 * @param {Vector3} max Maximum values
 * @returns {Vector3}
 */
export function clamp(vec, min, max) {
  return {
    x: Math.max(min.x, Math.min(max.x, vec.x)),
    y: Math.max(min.y, Math.min(max.y, vec.y)),
    z: Math.max(min.z, Math.min(max.z, vec.z)),
  };
}

/**
 * Floors each component of a vector.
 * @param {Vector3} vec Input vector
 * @returns {Vector3}
 */
export function floor(vec) {
  return { x: Math.floor(vec.x), y: Math.floor(vec.y), z: Math.floor(vec.z) };
}

/**
 * Ceils each component of a vector.
 * @param {Vector3} vec Input vector
 * @returns {Vector3}
 */
export function ceil(vec) {
  return { x: Math.ceil(vec.x), y: Math.ceil(vec.y), z: Math.ceil(vec.z) };
}

/**
 * Rounds each component of a vector.
 * @param {Vector3} vec Input vector
 * @returns {Vector3}
 */
export function round(vec) {
  return { x: Math.round(vec.x), y: Math.round(vec.y), z: Math.round(vec.z) };
}

/**
 * Generates vectors in a circle on XY plane.
 * @param {number} radius Circle radius
 * @param {number} density Point density factor
 * @returns {Vector3[]}
 */
export function generateVectorsOnCircle(radius, density) {
  const vectors = new Array(Math.ceil(Math.sqrt(2 * Math.PI * radius)));

  for (let i = 0, len = vectors.length; i < len; i++) {
    const angle = (i / len) * 2 * Math.PI;
    const x = radius * Math.cos(angle) * Math.sqrt(density);
    const y = radius * Math.sin(angle) * Math.sqrt(density);
    vectors[i] = { x, y, z: 0 };
  }

  return vectors;
}

/**
 * Returns a random vector with components in [0,1].
 * @returns {Vector3}
 */
export function random() {
  return { x: Math.random(), y: Math.random(), z: Math.random() };
}

/**
 * Returns a random direction.
 * @returns {Vector3}
 */
export function randomDirection() {
  const theta = Math.random() * 2 * Math.PI;
  const phi = Math.acos(2 * Math.random() - 1);
  return {
    x: Math.sin(phi) * Math.cos(theta),
    y: Math.sin(phi) * Math.sin(theta),
    z: Math.cos(phi),
  };
}

/**
 * Returns a random point within a sphere.
 * @param {number} sphereRadius Radius of the sphere
 * @returns {Vector3}
 */
export function randomLocationInSphere(sphereRadius) {
  const direction = randomDirection();
  const randomRadius = Math.cbrt(Math.random()) * sphereRadius;
  return scale(direction, randomRadius);
}

/**
 * Rotates vector by degrees around axis.
 * @param {Vector3} vec Vector to rotate
 * @param {Vector3} axis Rotation axis
 * @param {number} degrees Angle in degrees
 * @returns {Vector3}
 */
export function rotateDeg(vec, axis, degrees) {
  return rotateRad(vec, axis, (Math.PI / 180) * degrees);
}

/**
 * Rotates a vector around an axis by radians.
 * @param {Vector3} vec Vector to rotate
 * @param {Vector3} axis Rotation axis
 * @param {number} radians Angle in radians
 * @returns {Vector3}
 */
export function rotateRad(vec, axis, radians) {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dot = axis.x * vec.x + axis.y * vec.y + axis.z * vec.z;
  const crossX = axis.y * vec.z - axis.z * vec.y;
  const crossY = axis.z * vec.x - axis.x * vec.z;
  const crossZ = axis.x * vec.y - axis.y * vec.x;

  const x = vec.x * cos + crossX * sin + axis.x * dot * (1 - cos);
  const y = vec.y * cos + crossY * sin + axis.y * dot * (1 - cos);
  const z = vec.z * cos + crossZ * sin + axis.z * dot * (1 - cos);

  return { x, y, z };
}

/**
 * Changes vector direction while preserving magnitude.
 * @param {Vector3} vec Vector to change
 * @param {Vector3} dir New direction
 * @returns {Vector3}
 */
export function changeDir(vec, dir) {
  const magnitude = Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);

  if (magnitude === 0) {
    return { x: 0, y: 0, z: 0 };
  }

  const dirMagnitude = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);

  if (dirMagnitude === 0) {
    return { x: vec.x, y: vec.y, z: vec.z };
  }

  return {
    x: (dir.x / dirMagnitude) * magnitude,
    y: (dir.y / dirMagnitude) * magnitude,
    z: (dir.z / dirMagnitude) * magnitude,
  };
}

/**
 * Gets location relative to origin based on cardinal direction.
 * @param {Vector3} origin Origin point
 * @param {Vector3} relative Relative offset
 * @param {Direction} cardinalDirection Cardinal direction
 * @returns {Vector3}
 */
export function getRelativeLocation(
  origin,
  relative,
  cardinalDirection = Direction.North,
) {
  switch (cardinalDirection) {
    default:
    case Direction.North:
      return add(origin, relative);
    case Direction.South:
      return add(origin, rotateDeg(relative, UP, 180));
    case Direction.West:
      return add(origin, rotateDeg(relative, UP, 90));
    case Direction.East:
      return add(origin, rotateDeg(relative, UP, -90));
  }
}

/**
 * Gets position relative to head location and view direction.
 * @param {Vector3} headLocation Head position
 * @param {Vector3} viewDirection View direction vector
 * @param {Partial<Vector3>} [move] Movement offset
 * @returns {Vector3}
 */
export function getRelativeToHead(headLocation, viewDirection, move) {
  const forward = viewDirection;
  const up = { x: 0, y: 1, z: 0 };
  const right = normalize(cross(forward, up));

  // Set the amount of movement in each direction
  const rightMove = move?.x ?? 0;
  const upMove = move?.y ?? 0;
  const forwardMove = move?.z ?? 0;

  // Calculate the scaled vectors
  const rightVec = scale(right, rightMove);
  const upVec = scale(up, upMove);
  const forwardVec = scale(forward, forwardMove);

  // Combine all the vectors
  const moveVec = add(add(rightVec, upVec), forwardVec);

  // Add the movement vector to the player's position
  const newPosition = add(headLocation, moveVec);

  return newPosition;
}

import type { Vector2, Vector3 } from "@minecraft/server";
import { vec2, vec3 } from "gl-matrix";

export class GlVector2 implements Vector2 {
	readonly v: vec2;

	static fromObject(obj?: Partial<Vector2>): GlVector2 {
		const instance = new GlVector2();

		if (obj?.x !== undefined) instance.v[0] = obj.x;
		if (obj?.y !== undefined) instance.v[1] = obj.y;

		return instance;
	}

	constructor(v = vec2.create()) {
		this.v = v;
	}

	get x(): number {
		return this.v[0];
	}
	set x(value: number) {
		this.v[0] = value;
	}

	get y(): number {
		return this.v[1];
	}
	set y(value: number) {
		this.v[1] = value;
	}
}

export class GlVector3 implements Vector3 {
	readonly v: vec3;

	static fromObject(obj?: Partial<Vector3>): GlVector3 {
		const instance = new GlVector3();

		if (obj?.x !== undefined) instance.v[0] = obj.x;
		if (obj?.y !== undefined) instance.v[1] = obj.y;
		if (obj?.z !== undefined) instance.v[2] = obj.z;

		return instance;
	}

	constructor(vec = vec3.create()) {
		this.v = vec;
	}

	get x(): number {
		return this.v[0];
	}
	set x(value: number) {
		this.v[0] = value;
	}

	get y(): number {
		return this.v[1];
	}
	set y(value: number) {
		this.v[1] = value;
	}

	get z(): number {
		return this.v[2];
	}
	set z(value: number) {
		this.v[2] = value;
	}
}

/**
 * Calculates a new location relative to a starting point and its view direction.
 *
 * @param out The receiving vector.
 * @param originLocation The starting location vector.
 * @param forward The normalized forward-facing vector.
 * @param move Movement along the right (x), up (y), and forward (z) axes.
 * @returns `out`
 */
export const calculateRelativeLocation = (
	out: vec3,
	originLocation: vec3,
	forward: vec3,
	move: Partial<Vector3>,
): vec3 => {
	const worldUp = vec3.fromValues(0, 1, 0);

	// Calculate the right vector (cross product of forward and worldUp)
	const right = vec3.create();
	vec3.cross(right, forward, worldUp);

	// Handle case where forward is parallel to worldUp (cross product is zero)
	if (vec3.squaredLength(right) < 0.0001) {
		vec3.copy(right, vec3.fromValues(1, 0, 0)); // Use default world right
	} else {
		vec3.normalize(right, right);
	}

	const rightMove = move?.x ?? 0;
	const upMove = move?.y ?? 0;
	const forwardMove = move?.z ?? 0;

	// Calculate total movement vector: (right * x) + (worldUp * y) + (forward * z)
	const moveVec = vec3.create();
	vec3.scaleAndAdd(moveVec, moveVec, right, rightMove);
	vec3.scaleAndAdd(moveVec, moveVec, worldUp, upMove);
	vec3.scaleAndAdd(moveVec, moveVec, forward, forwardMove);

	// Final location: origin + movement
	vec3.add(out, originLocation, moveVec);

	return out;
};

/**
 * Changes the direction of a vector to match another, preserving the original magnitude.
 *
 * @param out The receiving vector.
 * @param vec The original vector to get the magnitude from.
 * @param dir The vector to get the direction from.
 * @returns The `out` vector with the new direction and original magnitude.
 */
export const changeDir = (out: vec3, vec: vec3, dir: vec3): vec3 => {
	const magnitude = vec3.length(vec);

	// Preserve the original vector if the direction vector is a zero vector.
	if (vec3.length(dir) === 0) {
		return vec3.copy(out, vec);
	}

	// 1. Normalize the direction vector into 'out'.
	vec3.normalize(out, dir);

	// 2. Scale the normalized vector by the original magnitude.
	vec3.scale(out, out, magnitude);

	return out;
};

/**
 * Generates an array of vec3 points that lie on a straight line segment
 * between two endpoints, inclusive.
 *
 * @param start The starting vec3.
 * @param end The ending vec3.
 * @param count The total number of points to generate (must be >= 2).
 * @returns An array of vec3 points forming the path.
 */
export const generateLinePoints = (start: vec3, end: vec3, count: number): vec3[] => {
	if (count < 2) {
		// Count must be at least 2. Defaulting to 2 points (start and end).
		return [vec3.clone(start), vec3.clone(end)];
	}

	const points: vec3[] = [];
	// Calculate segment count.
	const segmentCount = count - 1;

	for (let i = 0; i < count; i++) {
		const t = i / segmentCount;

		// Use a new vector for each point.
		const currentPoint = vec3.create();

		// Interpolate using gl-matrix vec3.lerp.
		vec3.lerp(currentPoint, start, end, t);

		points.push(currentPoint);
	}

	return points;
};

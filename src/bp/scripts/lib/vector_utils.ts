import { vec3 } from "gl-matrix";

export const calculateRelativeLocation = (
	out: vec3,
	originLocation: vec3,
	forward: vec3,
	move: vec3,
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

	const rightMove = move[0];
	const upMove = move[1];
	const forwardMove = move[2];

	// Calculate total movement vector: (right * x) + (worldUp * y) + (forward * z)
	const moveVec = vec3.create();
	vec3.scaleAndAdd(moveVec, moveVec, right, rightMove);
	vec3.scaleAndAdd(moveVec, moveVec, worldUp, upMove);
	vec3.scaleAndAdd(moveVec, moveVec, forward, forwardMove);

	// Final location: origin + movement
	vec3.add(out, originLocation, moveVec);

	return out;
};

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

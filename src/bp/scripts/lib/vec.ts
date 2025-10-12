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

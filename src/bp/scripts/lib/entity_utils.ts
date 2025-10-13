import * as mc from "@minecraft/server";
import { GlVector3 } from "@/lib/vec";
import { vec3 } from "gl-matrix";

export const isEntityAlive = (entity: mc.Entity): boolean => {
	try {
		const health = entity.getComponent("health")!;
		return health.currentValue > 0;
	} catch {
		return false;
	}
};

export const isVisibleTo = (viewer: mc.Entity, target: mc.Entity): boolean => {
	const dim = viewer.dimension;
	if (dim.id !== target.dimension.id) return false;

	const raycastConfigs: { dir: GlVector3; origin: GlVector3 }[] = [];

	const viewerHeadLoc = GlVector3.fromObject(viewer.getHeadLocation());

	{
		const targetHeadLoc = GlVector3.fromObject(target.getHeadLocation());
		const dir = vec3.create();
		vec3.sub(dir, targetHeadLoc.v, viewerHeadLoc.v);

		raycastConfigs.push({
			dir: new GlVector3(dir),
			origin: viewerHeadLoc,
		});
	}

	{
		const targetFootLoc = GlVector3.fromObject(target.getHeadLocation());
		vec3.add(targetFootLoc.v, targetFootLoc.v, vec3.fromValues(0, 0.3, 0));
		const dir = vec3.create();
		vec3.sub(dir, targetFootLoc.v, viewerHeadLoc.v);

		raycastConfigs.push({
			dir: new GlVector3(dir),
			origin: viewerHeadLoc,
		});
	}

	for (const raycastConfig of raycastConfigs) {
		const { dir, origin } = raycastConfig;

		const raycastHits = dim.getEntitiesFromRay(origin, dir, {
			includeLiquidBlocks: false,
			includePassableBlocks: false,
		});

		const isTargetHit = raycastHits.some((hit) => hit.entity === target);

		if (isTargetHit) return true;
	}

	return false;
};

import * as v from "@mcbe-toolbox-lc/vecarr";
import * as mc from "@minecraft/server";
import { vec3 } from "gl-matrix";

export const isVisibleTo = (viewer: mc.Entity, target: mc.Entity): boolean => {
	const dim = viewer.dimension;
	if (dim.id !== target.dimension.id) return false;

	const raycastConfigs: { dir: v.HybridVec3; origin: v.HybridVec3 }[] = [];

	const viewerHeadLoc = new v.HybridVec3(viewer.getHeadLocation());

	{
		const targetHeadLoc = new v.HybridVec3(target.getHeadLocation());
		const dir = vec3.create();
		vec3.sub(dir, targetHeadLoc, viewerHeadLoc);

		raycastConfigs.push({
			dir: new v.HybridVec3(dir),
			origin: viewerHeadLoc,
		});
	}

	{
		const targetFootLoc = new v.HybridVec3(target.getHeadLocation());
		vec3.add(targetFootLoc, targetFootLoc, vec3.fromValues(0, 0.3, 0));
		const dir = vec3.create();
		vec3.sub(dir, targetFootLoc, viewerHeadLoc);

		raycastConfigs.push({
			dir: new v.HybridVec3(dir),
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

export const getEntityBodyLocation = (entity: mc.Entity): v.HybridVec3 => {
	const location = new v.HybridVec3();

	vec3.add(location, new v.HybridVec3(entity.getHeadLocation()), new v.HybridVec3(entity.location));
	vec3.scale(location, location, 0.5);
	vec3.add(location, location, vec3.fromValues(0, 0.29, 0));

	return location;
};

export const canHurtEntity = (attacker: mc.Player, target: mc.Entity): boolean => {
	if (attacker === target) return false;

	if (target instanceof mc.Player) {
		// Players should not take damage when PvP is disabled
		if (!mc.world.gameRules.pvp) return false;

		// Creative or Spectator players should not take damage
		const targetGameMode = target.getGameMode();
		if (targetGameMode === mc.GameMode.Creative) return false;
		if (targetGameMode === mc.GameMode.Spectator) return false;
	}

	// Projectiles should not take damage
	if (target.hasComponent("projectile")) return false;

	return target.matches({
		excludeTypes: ["minecraft:xp_orb", "minecraft:item"],
	});
};

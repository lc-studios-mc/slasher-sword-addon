import * as mc from "@minecraft/server";

export const isEntityAlive = (entity: mc.Entity): boolean => {
	try {
		const health = entity.getComponent("health")!;
		return health.currentValue > 0;
	} catch {
		return false;
	}
};

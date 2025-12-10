import { damageCalculator } from "@/lib/damage";
import { canHurtEntity } from "@/lib/entity_utils";
import { calculateRelativeLocation, changeDir } from "@/lib/vector_utils";
import * as v from "@mcbe-toolbox-lc/vecarr";
import * as mc from "@minecraft/server";
import { vec3 } from "gl-matrix";

type SlasherBeamInfo = {
	settings: (typeof BEAM_SETTINGS)[keyof typeof BEAM_SETTINGS];
	source: mc.Player;
	alreadyHitEntityIds: string[];
};

const BEAM_SETTINGS = {
	powerSlashBeam: {
		entityType: "slasher:power_slash_beam",
		shootForce: 2.8,
		damage: 10,
	},
} as const;

const BEAM_ENTITY_TYPES = Object.values(BEAM_SETTINGS).map((obj) => obj.entityType);
const BEAM_BURST_PARTICLE_ID = "slasher:beam_burst_emitter";
const BEAM_VANISH_PARTICLE_ID = "slasher:beam_vanish_emitter";
const BEAM_INFO_BY_ENTITY = new Map<mc.Entity, SlasherBeamInfo>();

const vanishBeamEntity = (entity: mc.Entity) => {
	try {
		entity.dimension.spawnParticle(BEAM_VANISH_PARTICLE_ID, entity.location);
		entity.remove();
	} catch {}
};

export const shootPowerSlashBeam = (source: mc.Player): void => {
	const rot = source.getRotation();
	const dir = new v.HybridVec3(source.getViewDirection());

	const origin = vec3.create();
	calculateRelativeLocation(
		origin,
		new v.HybridVec3(source.getHeadLocation()),
		dir,
		[0, 0.04, 0.6],
	);
	vec3.add(origin, origin, new v.HybridVec3(source.getVelocity()));

	const force = changeDir(
		vec3.create(),
		vec3.scale(vec3.create(), vec3.fromValues(0, 0, 1), BEAM_SETTINGS.powerSlashBeam.shootForce),
		dir,
	);

	const beamEntity = source.dimension.spawnEntity(
		BEAM_SETTINGS.powerSlashBeam.entityType,
		new v.HybridVec3(origin),
	);

	const info: SlasherBeamInfo = {
		settings: BEAM_SETTINGS.powerSlashBeam,
		source,
		alreadyHitEntityIds: [],
	};

	BEAM_INFO_BY_ENTITY.set(beamEntity, info);

	beamEntity.setProperty("slasher:rotation_x", rot.x);
	beamEntity.setProperty("slasher:rotation_y", rot.y);
	beamEntity.setProperty("slasher:rotation_z", -50);

	const projectileComponent = beamEntity.getComponent("projectile")!;

	projectileComponent.shoot(new v.HybridVec3(force));

	mc.system.runTimeout(() => {
		if (!beamEntity.isValid) return;

		if (vec3.length(new v.HybridVec3(beamEntity.getVelocity())) <= 0.1) {
			vanishBeamEntity(beamEntity);
			return;
		}

		beamEntity.setProperty("slasher:is_visible", true);
	}, 2);
};

mc.world.beforeEvents.entityRemove.subscribe((e) => {
	BEAM_INFO_BY_ENTITY.delete(e.removedEntity);
});

mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(
	(e) => {
		vanishBeamEntity(e.entity);
	},
	{
		entityTypes: BEAM_ENTITY_TYPES,
		eventTypes: ["timeout"],
	},
);

const onPowerSlashBeamHitBlock = (e: mc.ProjectileHitBlockAfterEvent): void => {
	try {
		if (!e.getBlockHit().block.isValid) return;
	} catch {
		return;
	}

	const info = BEAM_INFO_BY_ENTITY.get(e.projectile);
	if (!info) return;

	e.dimension.spawnParticle(BEAM_BURST_PARTICLE_ID, e.location);
	e.projectile.remove();
};

const onPowerSlashBeamHitEntity = (e: mc.ProjectileHitEntityAfterEvent): void => {
	const info = BEAM_INFO_BY_ENTITY.get(e.projectile);
	if (!info) return;

	const hitEntity = e.getEntityHit().entity;
	if (!hitEntity) return;
	if (info.alreadyHitEntityIds.includes(hitEntity.id)) return;
	if (!canHurtEntity(info.source, hitEntity)) return;

	let damaged = false;
	try {
		const damage: number = damageCalculator.calculate(
			info.settings.damage,
			hitEntity,
			mc.EntityDamageCause.entityAttack,
		);

		damaged = hitEntity.applyDamage(damage, {
			cause: mc.EntityDamageCause.override,
			damagingEntity: info.source,
		});
	} catch {}

	if (!damaged) return;

	info.alreadyHitEntityIds.push(hitEntity.id);
	info.source.playSound("slasher.hitmarker");
	e.dimension.spawnParticle(BEAM_BURST_PARTICLE_ID, e.location);
};

mc.world.afterEvents.projectileHitBlock.subscribe((e) => {
	switch (e.projectile.typeId) {
		case BEAM_SETTINGS.powerSlashBeam.entityType:
			onPowerSlashBeamHitBlock(e);
			break;
	}
});

mc.world.afterEvents.projectileHitEntity.subscribe((e) => {
	switch (e.projectile.typeId) {
		case BEAM_SETTINGS.powerSlashBeam.entityType:
			onPowerSlashBeamHitEntity(e);
			break;
	}
});

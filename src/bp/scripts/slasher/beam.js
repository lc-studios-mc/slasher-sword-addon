import * as mc from "@minecraft/server";
import * as vec3 from "../utils/vec3.js";
import { calculateFinalDamage } from "../utils/entity.js";
import { randf } from "../utils/math.js";
import { isPlayerCreativeOrSpectator } from "../utils/player.js";

const BEAM_INFO = {
  fastAtk: {
    entityTypeId: "lc:slasher_beam_fast_atk",
    shootForceMultiplier: 4.62,
    directHitDamage: 1,
  },
  chargedAtk: {
    entityTypeId: "lc:slasher_beam_charged_atk",
    shootForceMultiplier: 2.23,
    directHitDamage: 8,
  },
};

/**
 * @param {mc.Player} source
 * @returns {void}
 */
export function shootFastAtkBeam(source) {
  const rot = source.getRotation();
  const dir = source.getViewDirection();

  for (let i = 0; i < 3; i++) {
    const origin = vec3.add(
      vec3.getRelativeToHead(source.getHeadLocation(), dir, {
        x: (i - 1) / 1.6,
        y: -0.3,
        z: 0.9,
      }),
      source.getVelocity(),
    );

    const force = vec3.changeDir(
      vec3.scale(vec3.FORWARD, BEAM_INFO.fastAtk.shootForceMultiplier),
      dir,
    );

    const beamEntity = source.dimension.spawnEntity(
      BEAM_INFO.fastAtk.entityTypeId,
      origin,
    );

    setSourceId(beamEntity, source.id);

    setRotation(beamEntity, {
      x: rot.x,
      y: rot.y,
      z: 0,
    });

    beamEntity.setProperty("lc:bit", i);

    beamEntity.applyImpulse(force);

    mc.system.runTimeout(() => {
      if (!beamEntity.isValid()) return;

      if (vec3.length(beamEntity.getVelocity()) <= 0.1) {
        vanish(beamEntity);
        return;
      }

      makeVisible(beamEntity);
    }, 2);
  }
}

/**
 * @param {mc.Player} source
 * @returns {void}
 */
export function shootChargedAtkBeam(source) {
  const rot = source.getRotation();
  const dir = source.getViewDirection();
  const origin = vec3.add(
    vec3.getRelativeToHead(source.getHeadLocation(), dir, {
      x: -0.11,
      y: 0.03,
      z: 0.9,
    }),
    source.getVelocity(),
  );

  const force = vec3.changeDir(
    vec3.scale(vec3.FORWARD, BEAM_INFO.chargedAtk.shootForceMultiplier),
    dir,
  );

  const beamEntity = source.dimension.spawnEntity(
    BEAM_INFO.chargedAtk.entityTypeId,
    origin,
  );

  setSourceId(beamEntity, source.id);

  setRotation(beamEntity, {
    x: rot.x,
    y: rot.y,
    z: -85,
  });

  beamEntity.applyImpulse(force);

  mc.system.runTimeout(() => {
    if (!beamEntity.isValid()) return;

    if (vec3.length(beamEntity.getVelocity()) <= 0.1) {
      vanish(beamEntity);
      return;
    }

    makeVisible(beamEntity);
  }, 2);
}

mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(
  ({ entity: beamEntity }) => {
    vanish(beamEntity, true);
  },
  {
    entityTypes: [
      BEAM_INFO.fastAtk.entityTypeId,
      BEAM_INFO.chargedAtk.entityTypeId,
    ],
    eventTypes: ["timeout"],
  },
);

mc.world.afterEvents.projectileHitEntity.subscribe((event) => {
  if (event.projectile.typeId === BEAM_INFO.fastAtk.entityTypeId) {
    onFastAtkBeamHitEntity(event);
  } else if (event.projectile.typeId === BEAM_INFO.chargedAtk.entityTypeId) {
    onChargedAtkBeamHitEntity(event);
  }
});

mc.world.afterEvents.projectileHitBlock.subscribe((event) => {
  if (event.projectile.typeId === BEAM_INFO.fastAtk.entityTypeId) {
    onFastAtkBeamHitBlock(event);
  } else if (event.projectile.typeId === BEAM_INFO.chargedAtk.entityTypeId) {
    onChargedAtkBeamHitBlock(event);
  }
});

/** @param {mc.ProjectileHitEntityAfterEvent} event */
function onFastAtkBeamHitEntity(event) {
  if (!event.projectile.isValid()) return;

  const hitEntity = event.getEntityHit().entity;
  if (!hitEntity) return;

  const source = mc.world.getEntity(getSourceId(event.projectile) ?? "");
  if (source === hitEntity) return;
  if (hitEntity instanceof mc.Player) {
    if (!mc.world.gameRules.pvp) return;
    if (isPlayerCreativeOrSpectator(hitEntity)) return;
  }

  let damaged = false;
  try {
    damaged = hitEntity.applyDamage(BEAM_INFO.fastAtk.directHitDamage, {
      cause: mc.EntityDamageCause.override,
      damagingEntity: source,
    });
  } catch {}

  if (!damaged) return;

  hitEntity.clearVelocity();

  if (source instanceof mc.Player) {
    const soundLoc = vec3.add(
      vec3.normalize(
        vec3.subtract(
          vec3.add(hitEntity.location, vec3.UP),
          source.getHeadLocation(),
        ),
      ),
      source.getHeadLocation(),
    );

    source.playSound("slasher.beam.hitmarker", {
      location: soundLoc,
      volume: 0.4,
      pitch: randf(0.95, 1.05),
    });
  }

  vanish(event.projectile);
}

/** @param {mc.ProjectileHitBlockAfterEvent} event */
function onFastAtkBeamHitBlock(event) {
  if (!event.projectile.isValid()) return;

  vanish(event.projectile);
}

/** @param {mc.ProjectileHitEntityAfterEvent} event */
function onChargedAtkBeamHitEntity(event) {
  if (!event.projectile.isValid()) return;

  const hitEntity = event.getEntityHit().entity;
  if (!hitEntity) return;

  const source = mc.world.getEntity(getSourceId(event.projectile) ?? "");
  if (source === hitEntity) return;
  if (hitEntity instanceof mc.Player) {
    if (!mc.world.gameRules.pvp) return;
    if (isPlayerCreativeOrSpectator(hitEntity)) return;
  }

  const damage = calculateFinalDamage(
    BEAM_INFO.chargedAtk.directHitDamage,
    hitEntity,
  );

  let damaged = false;
  try {
    hitEntity.addEffect("slowness", 50, { amplifier: 0 });
    damaged = hitEntity.applyDamage(damage, {
      cause: mc.EntityDamageCause.override,
      damagingEntity: source,
    });
  } catch {}

  if (damaged && source instanceof mc.Player) {
    const soundLoc = vec3.add(
      vec3.normalize(
        vec3.subtract(
          vec3.add(hitEntity.location, vec3.UP),
          source.getHeadLocation(),
        ),
      ),
      source.getHeadLocation(),
    );

    source.playSound("slasher.beam.hitmarker", {
      location: soundLoc,
      pitch: randf(0.95, 1.05),
    });
  }

  vanish(event.projectile);
}

/** @param {mc.ProjectileHitBlockAfterEvent} event */
function onChargedAtkBeamHitBlock(event) {
  if (!event.projectile.isValid()) return;

  vanish(event.projectile);
}

/**
 * @param {mc.Entity} beamEntity
 * @param {boolean=} timeout
 **/
function vanish(beamEntity, timeout = false) {
  try {
    spawnVanishParticle(beamEntity, timeout);
    beamEntity.remove();
  } catch {}
}

/**
 * @param {mc.Entity} beamEntity
 * @param {boolean=} timeout
 **/
function spawnVanishParticle(beamEntity, timeout = false) {
  if (timeout) {
    if (
      beamEntity.typeId === BEAM_INFO.fastAtk.entityTypeId &&
      Number(beamEntity.getProperty("lc:bit")) !== 1
    )
      return;

    beamEntity.dimension.spawnParticle(
      "lc:slasher_beam_timeout_emitter",
      beamEntity.location,
    );

    return;
  }

  if (beamEntity.typeId === BEAM_INFO.fastAtk.entityTypeId) {
    beamEntity.dimension.spawnParticle(
      "lc:slasher_beam_hit_weak_emitter",
      beamEntity.location,
    );
    return;
  }

  if (beamEntity.typeId === BEAM_INFO.chargedAtk.entityTypeId) {
    beamEntity.dimension.spawnParticle(
      "lc:slasher_beam_hit_strong_emitter",
      beamEntity.location,
    );
  }
}

/**
 * @param {mc.Entity} beamEntity
 * @returns {string | undefined}
 */
function getSourceId(beamEntity) {
  const value = beamEntity.getDynamicProperty("sourceId");
  if (typeof value !== "string") return undefined;
  return value;
}

/**
 * @param {mc.Entity} beamEntity
 * @param {string=} value
 */
function setSourceId(beamEntity, value) {
  beamEntity.setDynamicProperty("sourceId", value);
}

/**
 * @param {mc.Entity} beamEntity
 * @param {mc.Vector3} value
 */
function setRotation(beamEntity, value) {
  beamEntity.setProperty("lc:rotation_x", value.x);
  beamEntity.setProperty("lc:rotation_y", value.y);
  beamEntity.setProperty("lc:rotation_z", value.z);
}

/**
 * @param {mc.Entity} beamEntity
 */
function makeVisible(beamEntity) {
  beamEntity.setProperty("lc:is_visible", true);
}

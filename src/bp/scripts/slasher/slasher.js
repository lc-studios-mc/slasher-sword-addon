/**
 * This is the main script where the core behavior of the Slasher is written.
 */

import * as mc from "@minecraft/server";
import * as vec3 from "../utils/vec3.js";
import { ItemExtender } from "../item_extender/item_extender.js";
import { registerItemExtender } from "../item_extender/profile_registry.js";
import { isPlayerCreativeOrSpectator } from "../utils/player.js";
import { calculateFinalDamage, getEntityName } from "../utils/entity.js";
import { clamp, randf, randi } from "../utils/math.js";
import { shootChargedAtkBeam, shootFastAtkBeam } from "./beam.js";

// Extend "lc:slasher" item with scripting
registerItemExtender("lc:slasher", (args) => new Slasher(args));

class Slasher extends ItemExtender {
  constructor(args) {
    super(args);

    /** @private @type {SlasherState} */
    this.currentState = new IdleState(this);
    this.currentState.onEnter();
  }

  onCreate() {
    this.user.startItemCooldown("slasher_pick", 2);
  }

  onTick(itemStack) {
    this.currentState.tick(itemStack);
  }

  /**
   * @param {mc.ItemStartUseAfterEvent} event
   * @returns {boolean}
   */
  isUsable(event) {
    if (this.isNeedingRepair(this.getDurabilityComp(event.itemStack)))
      return false;
    return this.currentState.isUsable(event);
  }

  onStartUsing(event) {
    this.currentState.onStartUsing(event);
  }

  onStopUsing(event) {
    this.currentState.onStopUsing(event);
  }

  onHitEntity(event) {
    this.currentState.onHitEntity(event);
  }

  onHitBlock(event) {
    this.currentState.onHitBlock(event);
  }

  /**
   * @param {SlasherState} newState
   */
  changeState(newState) {
    this.currentState.onExit();
    this.currentState = newState;
    this.currentState.onEnter();
  }

  /** @returns {mc.Vector3} */
  getHeadFrontLocation() {
    return vec3.add(this.user.getHeadLocation(), this.user.getViewDirection());
  }

  /**
   * @param {number} intensity
   * @param {number} seconds
   * @param {("positional" | "rotational")=} shakeType
   */
  shakeCamera(intensity, seconds, shakeType = "rotational") {
    this.user.runCommand(
      `camerashake add @s ${intensity.toFixed(2)} ${seconds.toFixed(2)} ${shakeType}`,
    );
  }

  /**
   * @param {string} soundId
   * @param {mc.WorldSoundOptions=} opts
   */
  playSoundAtHeadFront(soundId, opts) {
    this.user.dimension.playSound(soundId, this.getHeadFrontLocation(), opts);
  }

  /**
   * @param {string} soundId
   * @param {number=} maxDist
   * @param {mc.PlayerSoundOptions=} opts
   */
  playSound3DAnd2D(soundId, maxDist = 15, opts) {
    const soundId2D = `${soundId}.2d`;
    this.user.playSound(soundId2D, opts);

    const listeners = this.user.dimension.getPlayers({
      location: this.user.getHeadLocation(),
      maxDistance: maxDist,
    });

    for (const listener of listeners) {
      if (listener === this.user) continue;

      listener.playSound(soundId, {
        location: this.user.getHeadLocation(),
        pitch: opts?.pitch,
        volume: opts?.volume,
      });
    }
  }

  /**
   * @param {string} id
   * @returns {number}
   */
  getCooldown(id) {
    return this.user.getItemCooldown(id);
  }

  /**
   * @param {string} id
   * @param {number=} duration
   */
  setCooldown(id, duration = 2) {
    this.user.startItemCooldown(id, duration);
  }

  /** @returns {number|undefined} */
  getNextDurabilityDamage() {
    const value = this.user.getDynamicProperty("nextSlasherDurabilityDamage");
    if (typeof value !== "number") return;
    return Math.floor(value);
  }

  /** @param {number=} value */
  setNextDurabilityDamage(value) {
    this.user.setDynamicProperty(
      "nextSlasherDurabilityDamage",
      value == undefined || value <= 0 ? undefined : Math.floor(value),
    );
  }

  /** @param {number} value */
  addNextDurabilityDamage(value) {
    let current = this.getNextDurabilityDamage();
    if (typeof current !== "number") current = 0;
    this.setNextDurabilityDamage(current + Math.floor(value));
  }

  /**
   * @param {mc.ItemDurabilityComponent} durabilityComp
   * @returns {number}
   */
  getCurrentDurability(durabilityComp) {
    return durabilityComp.maxDurability - durabilityComp.damage;
  }

  /**
   * @param {mc.ItemDurabilityComponent} durabilityComp
   * @returns {boolean}
   */
  isNeedingRepair(durabilityComp) {
    return durabilityComp.damage >= durabilityComp.maxDurability;
  }

  /**
   * @param {mc.ItemDurabilityComponent} durabilityComp
   * @returns {boolean}
   */
  processNextDurabilityDamage(durabilityComp) {
    const nextDurabilityDamage = this.getNextDurabilityDamage();
    if (nextDurabilityDamage == undefined) return false;

    this.setNextDurabilityDamage(undefined);

    if (this.user.getGameMode() === mc.GameMode.creative) return false;
    if (this.isNeedingRepair(durabilityComp)) return false;

    const newDamage = Math.min(
      this.getCurrentDurability(durabilityComp),
      nextDurabilityDamage,
    );

    durabilityComp.damage += newDamage;

    return true;
  }

  /**
   * @param {mc.ItemStack} slasherItem
   * @returns {mc.ItemDurabilityComponent}
   */
  getDurabilityComp(slasherItem) {
    const comp = slasherItem.getComponent("durability");
    if (!comp) throw new Error("Durability component does not exist");
    return comp;
  }

  /** @returns {boolean} Whether the user is sneaking. */
  isSneaking() {
    const isSneakInputButtonPressed =
      this.user.inputInfo.getButtonState(mc.InputButton.Sneak) ===
      mc.ButtonState.Pressed;

    return this.user.isSneaking || isSneakInputButtonPressed;
  }
}

/**
 * Base class for all Slasher states.
 */
class SlasherState {
  /**
   * @param {Slasher} slasher
   */
  constructor(slasher) {
    /** @readonly */ this.slasher = slasher;
    /** @private */ this._currentTick = 0;
  }

  get currentTick() {
    return this._currentTick;
  }

  onEnter() {}
  onExit() {}

  /**
   * @param {mc.ItemStack} itemStack
   */
  tick(itemStack) {
    try {
      this.onTick(itemStack);
    } finally {
      this._currentTick++;
    }
  }

  /**
   * @protected
   * @param {mc.ItemStack} itemStack
   */
  onTick(itemStack) {}

  /**
   * @param {mc.ItemStartUseAfterEvent} event
   */
  isUsable(event) {
    return true;
  }

  /**
   * @param {mc.ItemStartUseAfterEvent} event
   */
  onStartUsing(event) {}

  /**
   * @param {mc.ItemStopUseAfterEvent} event
   */
  onStopUsing(event) {}

  /**
   * @param {mc.EntityHitEntityAfterEvent} event
   */
  onHitEntity(event) {}

  /**
   * @param {mc.EntityHitBlockAfterEvent} event
   */
  onHitBlock(event) {}
}

/**
 * Slasher state for idle.
 */
class IdleState extends SlasherState {
  /** @param {mc.ItemStack} itemStack */
  onTick(itemStack) {
    const durabilityComp = this.slasher.getDurabilityComp(itemStack);

    if (this.slasher.isNeedingRepair(durabilityComp)) {
      this.slasher.user.onScreenDisplay.setActionBar({
        translate: "slasher.repairNeeded",
      });
      return;
    }

    if (this.slasher.processNextDurabilityDamage(durabilityComp)) {
      this.slasher.userMainhandSlot.setItem(itemStack);
      return;
    }

    if (!this.slasher.isUsing) return;

    this.slasher.changeState(new ChargingState(this.slasher));
  }

  onStartUsing() {
    this.slasher.user.playSound("random.click", { pitch: 1.4, volume: 0.8 });
  }

  onHitEntity() {
    this.slasher.changeState(new FastAtkState(this.slasher));
  }

  onHitBlock() {
    this.slasher.changeState(new FastAtkState(this.slasher));
  }
}

/**
 * Slasher state for fast-attacking.
 */
class FastAtkState extends SlasherState {
  static STATE_LIFESPAN_MAX = 15;
  static PREVENT_CHARGE_TICK = 9;
  static COOLDOWN_MAX = 2;
  static SWING_DAMAGE = 2;

  ticksUntilExitState = FastAtkState.STATE_LIFESPAN_MAX;
  cooldown = 0;
  isNextSwingQueued = true;
  nextAnimIndex = 0;

  onTick() {
    if (this.ticksUntilExitState <= 0) {
      this.slasher.changeState(new IdleState(this.slasher));
      return;
    }

    if (
      this.ticksUntilExitState < FastAtkState.PREVENT_CHARGE_TICK &&
      this.slasher.isUsing
    ) {
      this.resetAnimationCooldowns();
      this.slasher.changeState(new ChargingState(this.slasher));
      return;
    }

    this.ticksUntilExitState--;

    if (this.cooldown > 0) {
      this.cooldown--;
      return;
    }

    if (!this.isNextSwingQueued) return;

    try {
      this.fastAttack();
    } finally {
      this.isNextSwingQueued = false;
    }
  }

  onHitEntity() {
    this.isNextSwingQueued = true;
  }

  onHitBlock() {
    this.isNextSwingQueued = true;
  }

  onStopUsing() {
    this.isNextSwingQueued = true;
  }

  resetAnimationCooldowns() {
    this.slasher.setCooldown("slasher_fast_atk_2", 0);
    this.slasher.setCooldown("slasher_fast_atk_1", 0);
  }

  fastAttack() {
    this.ticksUntilExitState = FastAtkState.STATE_LIFESPAN_MAX;
    this.cooldown += FastAtkState.COOLDOWN_MAX;

    if (this.nextAnimIndex === 0) {
      this.slasher.setCooldown(
        "slasher_fast_atk_1",
        FastAtkState.STATE_LIFESPAN_MAX,
      );
      this.slasher.setCooldown("slasher_fast_atk_2", 0);

      this.slasher.user.playAnimation("animation.slasher.tp.fast_atk_1");

      this.nextAnimIndex = 1;
    } else {
      this.slasher.setCooldown(
        "slasher_fast_atk_2",
        FastAtkState.STATE_LIFESPAN_MAX,
      );
      this.slasher.setCooldown("slasher_fast_atk_1", 0);

      this.slasher.user.playAnimation("animation.slasher.tp.fast_atk_2");

      this.nextAnimIndex = 0;
    }

    this.slasher.shakeCamera(0.05, 0.09);
    this.slasher.playSoundAtHeadFront("slasher.fast_atk");

    mc.system.run(() => {
      shootFastAtkBeam(this.slasher.user);
      this.swingDamageNearbyEntities();
    });
  }

  swingDamageNearbyEntities() {
    const entities = this.slasher.user.dimension.getEntities({
      closest: 10,
      maxDistance: 2.2,
      excludeTypes: ["minecraft:item", "minecraft:xp_orb"],
      location: this.slasher.getHeadFrontLocation(),
    });

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];

      if (entity === this.slasher.user) continue;
      if (entity instanceof mc.Player) {
        if (!mc.world.gameRules.pvp) continue;
        if (isPlayerCreativeOrSpectator(entity)) continue;
      }

      const damage = Math.max(
        1,
        calculateFinalDamage(FastAtkState.SWING_DAMAGE, entity),
      );

      try {
        const damaged = entity.applyDamage(damage, {
          cause: mc.EntityDamageCause.entityAttack,
          damagingEntity: this.slasher.user,
        });

        if (!damaged) continue;
      } catch {}

      this.slasher.addNextDurabilityDamage(1);
    }
  }
}

/**
 * Slasher state for charging.
 */
class ChargingState extends SlasherState {
  static CHARGE_UI_FRAMES = [
    ">    X    <",
    ">   X   <",
    ">  X  <",
    "> X <",
    ">X<",
  ];
  static FULL_CHARGE_DURATION = this.CHARGE_UI_FRAMES.length;

  onTick() {
    if (this.currentTick < ChargingState.FULL_CHARGE_DURATION) {
      const text = ChargingState.CHARGE_UI_FRAMES[this.currentTick];

      this.slasher.user.onScreenDisplay.setActionBar(`§c${text}`);
    } else {
      // Flashy colors for fully charged
      const text =
        ChargingState.CHARGE_UI_FRAMES[ChargingState.FULL_CHARGE_DURATION - 1];

      this.slasher.user.onScreenDisplay.setActionBar(
        (this.currentTick % 2 === 0 ? "§d" : "§b") + text,
      );
    }

    if (this.currentTick === 0) {
      this.slasher.setCooldown("slasher_charging_start");

      this.slasher.user.playAnimation("animation.slasher.tp.charging_start");
    }

    if (this.currentTick > 0 && this.currentTick % 6 === 0) {
      this.slasher.user.playAnimation("animation.slasher.tp.charging_hold");
    }

    if (
      this.currentTick === 1 ||
      (this.currentTick !== 0 && this.currentTick % 8 === 0)
    ) {
      this.slasher.playSoundAtHeadFront("slasher.charge_loop");
    }
  }

  onStopUsing() {
    if (this.currentTick >= ChargingState.FULL_CHARGE_DURATION) {
      this.onReleaseFullCharge();
      return;
    }

    this.onCancelCharge();
  }

  onCancelCharge() {
    // Cancelling a charge should start fast attack
    this.slasher.changeState(new FastAtkState(this.slasher));
    mc.system.run(() => {
      this.slasher.user.onScreenDisplay.setActionBar("§8---");
    });
  }

  onReleaseFullCharge() {
    const shouldDoPlunge =
      !this.slasher.user.isOnGround &&
      this.slasher.user.getRotation().x > 65 &&
      this.slasher.user.inputInfo.getButtonState(mc.InputButton.Jump) ===
        mc.ButtonState.Pressed;

    if (shouldDoPlunge) {
      this.slasher.changeState(new PlungeWindupState(this.slasher));
      return;
    }

    this.slasher.user.onScreenDisplay.setActionBar("§c< X >");
    this.slasher.changeState(new ChargedAtkState(this.slasher));
  }
}

/**
 * Slasher state for charged-attack.
 */
class ChargedAtkState extends SlasherState {
  static GROUND_DASH_DURATION = 2;
  static AIR_DASH_DURATION = 4;
  static CHARGED_ATK_DAMAGING_DURATION = 5;

  static CHARGED_ATK_DAMAGE = 14;

  static ATK_EXCLUDED_FAMILIES = [
    "ignore_slasher_charged_atk",
    "scpdy_ignore_slasher_slash",
  ];
  static LOCKON_EXCLUDED_FAMILIES = [
    "inanimate",
    "projectile",
    "scp096",
    "scp682",
    "ignore_slasher_lockon",
    "scpdy_ignore_slasher_capture",
  ];
  static ATK_EXCLUDED_TYPES = ["minecraft:item", "minecraft:xp_orb"];
  static LOCKON_EXCLUDED_TYPES = [
    "minecraft:arrow",
    "minecraft:snowball",
    "minecraft:fireball",
    "minecraft:wither",
    "minecraft:ender_dragon",
  ];
  static LOCKON_EXCLUDED_TAGS = ["scpdy_ignore_slasher_capture"];

  weaknessEffect = true;
  chargedAtkStartTick = 0;
  alreadyHitEntities = /** @type {mc.Entity[]} */ ([]);

  onTick() {
    if (this.weaknessEffect && this.currentTick % 2 === 0) {
      this.slasher.user.addEffect("weakness", 3, {
        amplifier: 255,
        showParticles: false,
      });
    }

    if (this.currentTick === 0) {
      this.onInitialTick();
    }

    if (this.isDuringChargedAtk) {
      this.onTickChargedAtk(this.currentTick - this.chargedAtkStartTick);
    }

    if (!this.isAfterChargedAtk) return;

    this.weaknessEffect = false;

    if (this.slasher.isUsing) {
      this.slasher.changeState(new ChargingState(this.slasher));
      return;
    }

    if (this.currentTick >= this.chargedAtkStartTick + 30) {
      this.slasher.changeState(new IdleState(this.slasher));
    }
  }

  onHitEntity() {
    if (!this.isAfterChargedAtk) return;
    this.slasher.changeState(new FastAtkState(this.slasher));
  }

  onHitBlock() {
    if (!this.isAfterChargedAtk) return;
    this.slasher.changeState(new FastAtkState(this.slasher));
  }

  get isDuringChargedAtk() {
    return (
      this.currentTick >= this.chargedAtkStartTick &&
      this.currentTick <
        this.chargedAtkStartTick + ChargedAtkState.CHARGED_ATK_DAMAGING_DURATION
    );
  }

  get isAfterChargedAtk() {
    return (
      this.currentTick >=
      this.chargedAtkStartTick + ChargedAtkState.CHARGED_ATK_DAMAGING_DURATION
    );
  }

  onInitialTick() {
    const shouldDash = this.slasher.user.inputInfo.getMovementVector().y > 0.6;

    if (!shouldDash) {
      return;
    }

    const isOnGround = this.slasher.user.isOnGround;
    const impulse = this.getDashImpulse(isOnGround);

    this.slasher.user.applyImpulse(impulse);

    this.chargedAtkStartTick = isOnGround
      ? ChargedAtkState.GROUND_DASH_DURATION
      : ChargedAtkState.AIR_DASH_DURATION;
    this.slasher.setCooldown("slasher_dash");
    this.slasher.playSound3DAnd2D("slasher.dash", 10, { volume: 1.3 });

    this.slasher.shakeCamera(0.05, 0.08);

    this.slasher.user.playAnimation("animation.slasher.tp.charging_hold");
  }

  /**
   * @param {boolean} isOnGrouund
   * @returns {mc.Vector3}
   */
  getDashImpulse(isOnGrouund) {
    const base = vec3.changeDir(
      vec3.scale(vec3.FORWARD, 2.2),
      this.slasher.user.getViewDirection(),
    );

    if (!isOnGrouund) return base;

    const groundImpulse = vec3.normalize({
      x: base.x,
      y: 0,
      z: base.z,
    });

    return vec3.scale(groundImpulse, 3.9);
  }

  /** @param {number} atkTick */
  onTickChargedAtk(atkTick) {
    const lockon = atkTick === 0 && this.slasher.isSneaking();

    const targets = this.getEntitiesInAtkRange(lockon);

    if (atkTick === 0) {
      this.slasher.playSound3DAnd2D("slasher.charged_atk", 10, { volume: 1.3 });

      this.slasher.user.playAnimation("animation.slasher.tp.charged_atk_start");

      if (lockon && targets.length > 0) {
        this.slasher.changeState(new LockonAtkState(this.slasher, targets));
        return;
      }

      this.slasher.setCooldown("slasher_charged_atk_continue", 4);
      this.slasher.setCooldown("slasher_charged_atk_start");
      this.slasher.shakeCamera(0.07, 0.08);
    } else if (atkTick === 1) {
      shootChargedAtkBeam(this.slasher.user);

      this.slasher.user.playAnimation("animation.slasher.tp.charged_atk_end");
    }

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];

      if (this.alreadyHitEntities.includes(target)) continue;

      let damaged = false;
      try {
        const dmg = calculateFinalDamage(
          ChargedAtkState.CHARGED_ATK_DAMAGE,
          target,
        );

        damaged = target.applyDamage(dmg, {
          cause: mc.EntityDamageCause.override,
          damagingEntity: this.slasher.user,
        });
      } catch {}

      if (!damaged) continue;

      try {
        target.triggerEvent("lc:on_getting_chainsawed");
      } catch {}

      this.alreadyHitEntities.push(target);

      this.slasher.addNextDurabilityDamage(2);

      if (i > 2) continue;

      const critParticleLoc = vec3.midpoint(
        this.slasher.user.getHeadLocation(),
        target.getHeadLocation(),
      );

      this.slasher.user.dimension.spawnParticle(
        "lc:slasher_spark_particle",
        critParticleLoc,
      );

      this.slasher.shakeCamera(0.13, 0.26);

      mc.system.runTimeout(() => {
        this.slasher.playSoundAtHeadFront("slasher.critical", {
          volume: 1.1,
          pitch: randf(1, 1.08),
        });
      }, i);
    }
  }

  /**
   * @param {boolean} lockon
   * @returns {mc.Entity[]}
   */
  getEntitiesInAtkRange(lockon) {
    const headLoc = this.slasher.user.getHeadLocation();
    const viewDir = this.slasher.user.getViewDirection();
    const result = [];

    const checkPositions = [
      { z: 1.3, y: 0, maxDistance: 1.8 },
      { z: 2.7, y: 0, maxDistance: 1.8 },
      { z: 2.2, y: -1.4, maxDistance: 1.9 },
    ];

    const candidates = [];

    for (const pos of checkPositions) {
      const location = vec3.getRelativeToHead(headLoc, viewDir, {
        z: pos.z,
        y: pos.y ?? 0,
      });

      const entities = this.slasher.user.dimension.getEntities({
        closest: 5,
        maxDistance: pos.maxDistance,
        location,
        excludeFamilies: lockon
          ? [
              ...ChargedAtkState.ATK_EXCLUDED_FAMILIES,
              ...ChargedAtkState.LOCKON_EXCLUDED_FAMILIES,
            ]
          : ChargedAtkState.ATK_EXCLUDED_FAMILIES,
        excludeTypes: lockon
          ? [
              ...ChargedAtkState.ATK_EXCLUDED_TYPES,
              ...ChargedAtkState.LOCKON_EXCLUDED_TYPES,
            ]
          : ChargedAtkState.ATK_EXCLUDED_TYPES,
        excludeTags: lockon ? ChargedAtkState.LOCKON_EXCLUDED_TAGS : undefined,
      });

      candidates.push(...entities);
    }

    for (const entity of candidates) {
      if (entity === this.slasher.user) continue;
      if (result.includes(entity)) continue;
      if (entity instanceof mc.Player) {
        if (!mc.world.gameRules.pvp) continue;
        if (isPlayerCreativeOrSpectator(entity)) continue;
      }

      // Check if entity is actually visible via raycast
      const raycastHit = [
        ...this.slasher.user.dimension.getEntitiesFromRay(
          this.slasher.user.getHeadLocation(),
          vec3.subtract(entity.location, this.slasher.user.getHeadLocation()),
        ),
        ...this.slasher.user.dimension.getEntitiesFromRay(
          this.slasher.getHeadFrontLocation(),
          vec3.subtract(
            entity.getHeadLocation(),
            this.slasher.user.getHeadLocation(),
          ),
        ),
      ];

      if (raycastHit.some((x) => x.entity === entity)) {
        result.push(entity);
      }
    }

    return result;
  }
}

/**
 * Slasher state for lock-on attack that leaps at the target and deals continuous damage..
 */
class LockonAtkState extends SlasherState {
  attackerLoc = /** @type {mc.Vector3} */ (vec3.ZERO);
  attackerRot = /** @type {mc.Vector2} */ (vec3.ZERO);
  targetLockLoc = /** @type {mc.Vector3} */ (vec3.ZERO);
  nextCritParticleTick = 0;
  tickWhenEndingStarted = -1;
  allowChangingState = false;

  /**
   * @param {Slasher} slasher
   * @param {mc.Entity[]} targets
   */
  constructor(slasher, targets) {
    super(slasher);
    this.targets = targets;
  }

  onEnter() {
    this.slasher.setCooldown("slasher_charged_atk_hold");
    this.slasher.setCooldown("slasher_charged_atk_start");

    if (this.targets.length <= 0) {
      return;
    }

    const firstTarget = this.targets[0];

    const attackerLoc = vec3.add(
      firstTarget.location,
      vec3.normalize(
        vec3.subtract(this.slasher.user.location, firstTarget.location),
      ),
    );

    this.slasher.user.tryTeleport(attackerLoc, {
      facingLocation: firstTarget.location,
    });

    this.attackerLoc = attackerLoc;
    this.attackerRot = this.slasher.user.getRotation();
    this.targetLockLoc = firstTarget.location;
    this.nextCritParticleTick = randi(1, 2);
  }

  onTick() {
    if (this.targets.length <= 0) {
      if (this.tickWhenEndingStarted === -1) {
        this.tickWhenEndingStarted = this.currentTick;
      }

      if (this.tickWhenEndingStarted !== -1) {
        this.onTickEnding();
      }

      return;
    }

    this.onTick_2();
  }

  onTickEnding() {
    const endingTick = this.currentTick - this.tickWhenEndingStarted;

    if (endingTick === 0) {
      this.slasher.setCooldown("slasher_charged_atk_end", 2);
      this.slasher.playSound3DAnd2D("slasher.charged_atk", 10, { volume: 1.3 });

      this.slasher.user.playAnimation("animation.slasher.tp.charged_atk_end");
    } else if (endingTick === 4) {
      this.allowChangingState = true;
    }

    if (this.allowChangingState && this.slasher.isUsing) {
      this.slasher.changeState(new ChargingState(this.slasher));
      return;
    }

    if (endingTick >= 16) {
      this.slasher.setCooldown("slasher_pick");
      this.slasher.changeState(new IdleState(this.slasher));
    }
  }

  onHitEntity() {
    if (!this.allowChangingState) return;
    this.slasher.user.removeEffect("weakness");
    this.slasher.changeState(new FastAtkState(this.slasher));
  }

  onHitBlock() {
    if (!this.allowChangingState) return;
    this.slasher.user.removeEffect("weakness");
    this.slasher.changeState(new FastAtkState(this.slasher));
  }

  onTick_2() {
    const shouldStartEnding =
      this.targets.length <= 0 || !this.slasher.isSneaking();

    if (shouldStartEnding) {
      this.slasher.playSound3DAnd2D("slasher.chainsaw.finish", 10, {
        volume: 1.2,
      });
      this.targets = [];
      return;
    }

    if (this.currentTick % 2 === 0)
      this.slasher.user.addEffect("weakness", 3, {
        amplifier: 255,
        showParticles: false,
      });

    if (this.currentTick % 8 === 0)
      this.slasher.playSound3DAnd2D("slasher.chainsaw.loop");

    try {
      this.onTickChainsawing();
    } catch {}
  }

  onTickChainsawing() {
    this.slasher.user.tryTeleport(this.attackerLoc, {
      rotation: this.attackerRot,
    });

    if (this.nextCritParticleTick === this.currentTick) {
      const critParticleLoc = vec3.add(
        this.slasher.user.getHeadLocation(),
        vec3.changeDir(
          vec3.scale(vec3.FORWARD, 0.45),
          this.slasher.user.getViewDirection(),
        ),
      );

      this.slasher.user.dimension.spawnParticle(
        "lc:slasher_spark_particle",
        critParticleLoc,
      );

      this.slasher.user.playSound("slasher.critical", {
        volume: 0.4,
        pitch: randf(0.98, 1.08),
      });

      this.nextCritParticleTick += randi(2, 4);
    }

    this.slasher.shakeCamera(0.08, 0.1);

    if (this.currentTick % 3 === 0) {
      this.slasher.user.playAnimation("animation.slasher.tp.charged_atk_hold");
    }

    for (let i = 0; i < this.targets.length; i++) {
      const target = this.targets[i];

      if (
        !target.isValid() ||
        target.matches({ tags: ChargedAtkState.LOCKON_EXCLUDED_TAGS })
      ) {
        this.targets.splice(i, 1);
        i--;
        continue;
      }

      const targetHealth = target.getComponent("health");

      if (targetHealth?.currentValue == 0) {
        this.targets.splice(i, 1);
        i--;
        continue;
      }

      target.tryTeleport(this.targetLockLoc, { keepVelocity: false });

      let damaged = false;
      try {
        damaged = target.applyDamage(1, {
          cause: mc.EntityDamageCause.override,
          damagingEntity: this.slasher.user,
        });
      } catch {}

      if (!damaged) continue;

      try {
        target.addEffect("slowness", 40, { amplifier: 0 });
        target.triggerEvent("lc:on_getting_chainsawed");
      } catch {}

      if (i !== 0) continue;

      if (this.currentTick % 2 === 0) {
        this.slasher.addNextDurabilityDamage(1);
      }

      if (targetHealth) {
        this.displayEntityHealthInfo(targetHealth);
      }
    }
  }

  /** @param {mc.EntityHealthComponent} health */
  displayEntityHealthInfo(health) {
    const entity = health.entity;

    const targetName = getEntityName(entity);

    const colorText =
      health.currentValue <= 0
        ? "§c"
        : health.currentValue <= 30
          ? mc.system.currentTick % 2 === 0
            ? "§b"
            : "§d"
          : "§e";

    const currentHealth = Math.floor(health.currentValue);
    const maxHealth = Math.floor(health.effectiveMax);
    const healthText = `${currentHealth} / ${maxHealth}`;

    const actionbarText = /** @type {mc.RawText} */ ({
      rawtext: [
        { text: colorText },
        { rawtext: targetName.rawtext },
        { text: " — ❤ " },
        { text: healthText },
      ],
    });

    this.slasher.user.onScreenDisplay.setActionBar(actionbarText);
  }
}

/**
 * Slasher state for plunging attack windup.
 */
class PlungeWindupState extends SlasherState {
  static RISE_FORCE = { x: 0, y: 1.2, z: 0 };
  static DURATION = 7;

  onEnter() {
    this.slasher.user.addEffect("weakness", PlungeWindupState.DURATION + 2, {
      amplifier: 255,
      showParticles: false,
    });

    this.slasher.user.addEffect("resistance", PlungeWindupState.DURATION + 5, {
      amplifier: 255,
      showParticles: false,
    });

    mc.system.run(() => {
      this.slasher.user.applyImpulse(PlungeWindupState.RISE_FORCE);
    });

    this.slasher.playSound3DAnd2D("slasher.plunge_windup", 15, {
      volume: 1.7,
      pitch: 1.2,
    });

    this.slasher.setCooldown("slasher_plunge_windup");

    this.slasher.user.playAnimation("animation.slasher.tp.plunge_windup");
  }

  onTick() {
    if (this.currentTick < PlungeWindupState.DURATION) return;

    this.slasher.changeState(
      new PlungeFallState(this.slasher, this.slasher.user.location.y),
    );
  }
}

/**
 * Slasher state for plunging attack fall.
 */
class PlungeFallState extends SlasherState {
  static FALL_FORCE = { x: 0, y: -4.4, z: 0 };

  /**
   * @param {Slasher} slasher
   * @param {number} startHeight
   */
  constructor(slasher, startHeight) {
    super(slasher);
    this.startHeight = startHeight;
  }

  onEnter() {
    this.addEffects();

    this.slasher.playSound3DAnd2D("slasher.charged_atk", 12, {
      volume: 1.3,
      pitch: randf(0.8, 0.9),
    });
    this.slasher.user.applyImpulse(PlungeFallState.FALL_FORCE);
    this.slasher.setCooldown("slasher_plunge_fall");
    this.slasher.user.playAnimation("animation.slasher.tp.plunge_fall");
  }

  onTick() {
    if (this.currentTick % 3 === 0) {
      this.addEffects();
    }

    if (this.currentTick === 0) return;

    if (this.currentTick % 5 === 0) {
      this.slasher.user.playAnimation("animation.slasher.tp.plunge_fall_hold");
    }

    const yVelocity = this.slasher.user.getVelocity().y;

    const blockBelow = this.slasher.user.dimension.getBlockFromRay(
      this.slasher.user.location,
      vec3.DOWN,
      {
        maxDistance: Math.abs(yVelocity * 2),
      },
    );

    if (!blockBelow && yVelocity < -0.5) return;

    this.slasher.changeState(
      new PlungeImpactState(this.slasher, this.startHeight),
    );
  }

  addEffects() {
    this.slasher.user.addEffect("resistance", 6, {
      amplifier: 255,
      showParticles: false,
    });

    this.slasher.user.addEffect("weakness", 10, {
      amplifier: 255,
      showParticles: false,
    });
  }
}

/**
 * Slasher state for plunging attack impact.
 */
class PlungeImpactState extends SlasherState {
  static MIN_DEPTH_CONSIDERED_AS_HIGH = 10;
  static CHANGE_STATE_ALLOWED_TICK = 4;

  /**
   * @param {Slasher} slasher
   * @param {number} startHeight
   */
  constructor(slasher, startHeight) {
    super(slasher);

    this.fallenDepth = startHeight - this.slasher.user.location.y;
    this.fellFromHigh =
      this.fallenDepth >= PlungeImpactState.MIN_DEPTH_CONSIDERED_AS_HIGH;

    this.slasher.user.addEffect("weakness", 8, {
      amplifier: 255,
      showParticles: false,
    });
  }

  onEnter() {
    if (
      this.fallenDepth <= 1.2 ||
      (!this.slasher.user.isFalling && !this.slasher.user.isOnGround)
    ) {
      this.slasher.playSoundAtHeadFront("mace.smash_air", { volume: 1.1 });
      return;
    }

    this.slasher.addNextDurabilityDamage(Math.ceil(this.fallenDepth / 2));

    const impactLocation = this.getImpactLocation();

    mc.system.run(() => {
      this.hurtNearbyEntities(impactLocation);
    });

    if (this.fellFromHigh) {
      this.slasher.playSoundAtHeadFront("mace.heavy_smash_ground", {
        volume: 1.1,
      });

      this.slasher.playSound3DAnd2D("slasher.plunge_impact", 20, {
        volume: 1.8,
        pitch:
          this.fallenDepth > 50
            ? 0.7
            : this.fallenDepth > 20
              ? randf(0.85, 0.95)
              : 1,
      });

      if (mc.system.serverSystemInfo.memoryTier > mc.MemoryTier.Low) {
        this.slasher.user.dimension.spawnEntity(
          "lc:ground_impact_particle_spawner",
          impactLocation,
        );
      }
    } else {
      this.slasher.playSoundAtHeadFront("mace.smash_ground", { volume: 1.1 });
      this.slasher.playSoundAtHeadFront("slasher.critical", { volume: 1.4 });
    }

    this.slasher.setCooldown("slasher_plunge_impact");

    this.slasher.user.spawnParticle(
      "lc:slasher_spark_particle",
      vec3.add(impactLocation, { x: 0, y: 0.9, z: 0 }),
    );

    this.shakeNearbyPlayerCameras(impactLocation);

    this.slasher.user.playAnimation("animation.slasher.tp.plunge_impact");
  }

  /**
   * @param {mc.Vector3} param0
   */
  shakeNearbyPlayerCameras({ x, y, z }) {
    const locString = `${x} ${y} ${z}`;
    this.slasher.user.dimension.runCommand(
      `execute positioned ${locString} run camerashake add @a[r=10] 0.3 0.35 rotational`,
    );
  }

  getImpactLocation() {
    const raycastHit = this.slasher.user.dimension.getBlockFromRay(
      vec3.add(this.slasher.user.location, { x: 0, y: -1.0, z: 0 }),
      vec3.DOWN,
      { maxDistance: 15 },
    );

    if (!raycastHit) return this.slasher.user.location;

    const loc = vec3.add(raycastHit.block.location, raycastHit.faceLocation);

    return vec3.add(loc, { x: 0, y: 0.1, z: 0 });
  }

  /** @param {mc.Vector3} impactLocation */
  hurtNearbyEntities(impactLocation) {
    const damage = this.calculateDamage();
    const maxDist = clamp(2 + this.fallenDepth / 3.2, 4.0, 11);

    const entities = this.slasher.user.dimension.getEntities({
      location: impactLocation,
      maxDistance: maxDist,
      excludeFamilies: ["ignore_slasher_plunge"],
      excludeTypes: ["minecraft:item", "minecraft:xp_orb"],
      closest: 20,
    });

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];

      if (entity === this.slasher.user) continue;
      if (entity instanceof mc.Player) {
        if (!mc.world.gameRules.pvp) continue;
        if (isPlayerCreativeOrSpectator(entity)) continue;
      }

      const dist = vec3.distance(entity.location, impactLocation);

      if (dist >= 2 && !entity.isOnGround) continue;

      // Ray must hit for an entity that is not very close
      if (dist >= 3) {
        const raycast1 = entity.dimension.getEntitiesFromRay(
          impactLocation,
          vec3.normalize(vec3.subtract(entity.location, impactLocation)),
        );

        // If first ray didn't hit, try again
        if (!raycast1.some((x) => x.entity === entity)) {
          const newOrigin = vec3.add(impactLocation, { x: 0, y: 2, z: 0 });
          const raycast2 = entity.dimension.getEntitiesFromRay(
            newOrigin,
            vec3.normalize(vec3.subtract(entity.location, newOrigin)),
          );
          const hit = raycast2.some((x) => x.entity === entity);

          if (!hit) continue;
        }
      }

      try {
        entity.applyDamage(damage, {
          cause: mc.EntityDamageCause.maceSmash,
          damagingEntity: this.slasher.user,
        });

        entity.addEffect("slowness", 70, {
          amplifier: 1,
        });
      } catch {}
    }
  }

  calculateDamage() {
    return Math.round(5 * (this.fallenDepth / 4.4));
  }

  onTick() {
    if (
      this.currentTick >= PlungeImpactState.CHANGE_STATE_ALLOWED_TICK &&
      this.slasher.isUsing
    ) {
      this.slasher.changeState(new ChargingState(this.slasher));
      return;
    }

    if (this.currentTick >= 12) {
      this.slasher.changeState(new IdleState(this.slasher));
      this.slasher.setCooldown("slasher_pick");
    }
  }

  onHitEntity() {
    if (this.currentTick < PlungeImpactState.CHANGE_STATE_ALLOWED_TICK) return;
    this.slasher.changeState(new FastAtkState(this.slasher));
  }

  onHitBlock() {
    if (this.currentTick < PlungeImpactState.CHANGE_STATE_ALLOWED_TICK) return;
    this.slasher.changeState(new FastAtkState(this.slasher));
  }
}

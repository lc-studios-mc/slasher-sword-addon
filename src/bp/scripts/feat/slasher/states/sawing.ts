import { getEntityBodyLocation } from "@/lib/entity_utils";
import { randomFloat } from "@mcbe-toolbox-lc/sukuriputils/math";
import { isEntityAlive } from "@mcbe-toolbox-lc/sukuriputils/server";
import * as v from "@mcbe-toolbox-lc/vecarr";
import * as mc from "@minecraft/server";
import { vec3 } from "gl-matrix";
import type { SlasherHandler } from "../handler";
import { testSawingInput } from "../input";
import { SlasherStateBase } from "./base";

type SawingLockonContext = {
	attackerLoc: v.HybridVec3;
	attackerRot: v.HybridVec2;
	targetLoc: v.HybridVec3;
	targetRot: v.HybridVec2;
};

export class SawingState extends SlasherStateBase {
	private lockonCtx: SawingLockonContext;
	private ticksUntilFinishReleasing = -1;
	private alreadyReleasing = false;
	private finishedReleasing = false;
	private readonly releaseDuration = 15;

	constructor(
		s: SlasherHandler,
		private readonly targets: mc.Entity[],
	) {
		super(s);

		this.lockonCtx = this.createLockonContext();
	}

	override onEnter(): void {
		this.s.startItemCooldown("slasher_sawing_start");
	}

	override onTick(_currentItem: mc.ItemStack): void {
		if (this.ticksUntilFinishReleasing > 0) {
			this.ticksUntilFinishReleasing--;
		} else if (this.ticksUntilFinishReleasing === 0) {
			this.finishedReleasing = true;
			this.ticksUntilFinishReleasing = -1;
		}

		const shouldExit =
			this.targets.length <= 0 || this.finishedReleasing || !testSawingInput(this.s.player);

		if (shouldExit) {
			this.exit();
			return;
		}

		// Lock attacker
		this.s.player.tryTeleport(this.lockonCtx.attackerLoc, {
			rotation: this.lockonCtx.attackerRot,
		});

		// Constant camera shaking
		if (this.currentTick % 2 === 0) {
			this.s.shakeCamera(0.11, 0.1, "rotational");
		}

		// Chainsaw sound
		if (this.currentTick % 8 === 0) {
			this.s.playSound({
				soundId_2d: "slasher.chainsaw_loop.2d",
				soundId_3d: "slasher.chainsaw_loop",
				location: this.s.player.location,
				volume: 1.5,
			});
		}

		// Make attacker resistant to damage but unable to attack
		if (this.currentTick % 3 === 0) {
			this.s.player.addEffect("resistance", 5, {
				amplifier: 3,
				showParticles: false,
			});
			this.s.player.addEffect("weakness", 5, {
				amplifier: 255,
				showParticles: false,
			});
		}

		// Lock and hurt targets.
		// Iterate backwards to safely remove elements without messing up the index.
		for (let i = this.targets.length - 1; i >= 0; i--) {
			const removeCurrentTarget = () => {
				this.targets.splice(i, 1);

				this.s.playSound({
					soundId_2d: "slasher.critical.2d",
					soundId_3d: "slasher.critical",
					location: this.s.getFaceFrontLocation(),
					volume: 1.5,
					pitch: randomFloat(0.85, 1.1),
				});
			};

			const target = this.targets[i]!;

			if (!target.isValid || !isEntityAlive(target)) {
				removeCurrentTarget();
				continue; // Skip to the next target
			}

			try {
				target.tryTeleport(this.lockonCtx.targetLoc, {
					rotation: this.lockonCtx.targetRot,
				});

				if (this.currentTick % 5 === 0) {
					target.addEffect("weakness", 15, {
						amplifier: 1,
					});
				}

				target.applyDamage(1, {
					cause: mc.EntityDamageCause.override,
					damagingEntity: this.s.player,
				});

				const bloodParticleLoc = getEntityBodyLocation(target);
				this.s.dimension.spawnParticle("slasher:blood_burst_less_emitter", bloodParticleLoc);
			} catch (error) {
				// If any operation fails, we treat the target as invalid and remove it.
				removeCurrentTarget();
			}
		}

		if (this.targets.length <= 0) return;

		const mainTarget = this.targets[0]!;

		const shouldStartReleasing = !this.alreadyReleasing && this.shouldReleaseEntity(mainTarget);

		if (shouldStartReleasing) {
			this.ticksUntilFinishReleasing = this.releaseDuration;
			this.alreadyReleasing = true;
			this.s.startItemCooldown("slasher_sawing_release");
		}
	}

	private exit(): void {
		this.tryUnstuckPlayer();

		this.s.playSound({
			soundId_2d: "slasher.power_slash.2d",
			soundId_3d: "slasher.power_slash",
			location: this.s.player.location,
			volume: 1.5,
			pitch: randomFloat(0.95, 1.05),
		});

		this.s.playSound({
			soundId_2d: "slasher.chainsaw_finish.2d",
			soundId_3d: "slasher.chainsaw_finish",
			location: this.s.player.location,
			volume: 1.5,
		});

		this.s.startItemCooldown("slasher_sawing_start", 0);
		this.s.startItemCooldown("slasher_sawing_finish", 0);
		this.s.changeState(new this.s.stateClasses.PowerSlashFinish(this.s, this.targets));
	}

	private createLockonContext(): SawingLockonContext {
		const mainTarget = this.targets[0];

		if (!mainTarget) throw new Error("No target to lock on to!");

		const initialAttackerLoc = new v.HybridVec3(this.s.player.location);
		const targetLoc = new v.HybridVec3(mainTarget.location);
		const targetRot = new v.HybridVec2(mainTarget.getRotation());

		const dirTargetToAttacker = new v.HybridVec3();
		vec3.sub(dirTargetToAttacker, initialAttackerLoc, targetLoc);
		vec3.normalize(dirTargetToAttacker, dirTargetToAttacker);

		const attackerLoc = new v.HybridVec3();
		vec3.add(attackerLoc, targetLoc, dirTargetToAttacker);

		this.s.player.tryTeleport(attackerLoc, {
			facingLocation: targetLoc,
		});

		const attackerRot = new v.HybridVec2(this.s.player.getRotation());

		return {
			attackerLoc,
			attackerRot,
			targetLoc,
			targetRot,
		};
	}

	private shouldReleaseEntity(entity: mc.Entity): boolean {
		return !entity.matches({
			excludeTypes: [
				"minecraft:player",
				"minecraft:ender_dragon",
				"minecraft:wither",
				"minecraft:warden",
			],
			excludeFamilies: ["inanimate", "scp096"],
			excludeTags: [
				"ignore_slasher_charged_atk",
				"ignore_slasher_lockon",
				"scpdy_ignore_slasher_capture",
			],
		});
	}

	private tryUnstuckPlayer(): void {
		const clippingBlock = this.s.dimension.getBlock(this.s.player.location);
		if (!clippingBlock) return;
		if (clippingBlock.isAir) return;
		if (clippingBlock.isLiquid) return;

		const aboveClipped = clippingBlock.above();
		if (!aboveClipped) return;
		if (!aboveClipped.isAir && !aboveClipped.isLiquid) return;

		this.s.player.tryTeleport(aboveClipped.bottomCenter(), {
			checkForBlocks: true,
		});
	}
}

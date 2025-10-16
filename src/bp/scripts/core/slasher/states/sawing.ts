import { getEntityBodyLocation, isEntityAlive } from "@/lib/entity_utils";
import { randf } from "@/lib/math_utils";
import { GlVector2, GlVector3 } from "@/lib/vec";
import * as mc from "@minecraft/server";
import { vec3 } from "gl-matrix";
import type { SlasherHandler } from "../handler";
import { testSawingInput } from "../input";
import { SlasherStateBase } from "./base";

type SawingLockonContext = {
	attackerLoc: GlVector3;
	attackerRot: GlVector2;
	targetLoc: GlVector3;
	targetRot: GlVector2;
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
					pitch: randf(0.85, 1.1),
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

	private createLockonContext(): SawingLockonContext {
		const mainTarget = this.targets[0];

		if (!mainTarget) throw new Error("No target to lock on to!");

		const initialAttackerLoc = GlVector3.fromObject(this.s.player.location);
		const targetLoc = GlVector3.fromObject(mainTarget.location);
		const targetRot = GlVector2.fromObject(mainTarget.getRotation());

		const dirTargetToAttacker = new GlVector3();
		vec3.sub(dirTargetToAttacker.v, initialAttackerLoc.v, targetLoc.v);
		vec3.normalize(dirTargetToAttacker.v, dirTargetToAttacker.v);

		const attackerLoc = new GlVector3();
		vec3.add(attackerLoc.v, targetLoc.v, dirTargetToAttacker.v);

		this.s.player.tryTeleport(attackerLoc, {
			facingLocation: targetLoc,
		});

		const attackerRot = GlVector2.fromObject(this.s.player.getRotation());

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

	private exit(): void {
		this.s.playSound({
			soundId_2d: "slasher.power_slash.2d",
			soundId_3d: "slasher.power_slash",
			location: this.s.player.location,
			volume: 1.5,
			pitch: randf(0.95, 1.05),
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
}

import { calculateFinalDamage } from "@/lib/damage";
import { getEntityBodyLocation } from "@/lib/entity_utils";
import { randf } from "@/lib/math_utils";
import { GlVector3 } from "@/lib/vec";
import type { ItemStack } from "@minecraft/server";
import * as mc from "@minecraft/server";
import { vec3 } from "gl-matrix";
import { shootPowerSlashBeam } from "../beam";
import type { SlasherHandler } from "../handler";
import { SlasherStateBase } from "./base";

export class PowerSlashFinishState extends SlasherStateBase {
	private ticksUntilAllowRecharge = 6;
	private ticksUntilExit = 12;

	constructor(
		s: SlasherHandler,
		private readonly targets: mc.Entity[],
	) {
		super(s);
	}

	override onEnter(): void {
		this.s.startItemCooldown("slasher_power_slash_finish");

		this.hurtTargets(this.targets);
		shootPowerSlashBeam(this.s.player);
	}

	override onTick(_currentItem: ItemStack): void {
		if (this.ticksUntilExit > 0) {
			this.ticksUntilExit--;
		} else if (this.ticksUntilExit === 0) {
			this.ticksUntilExit = -1;

			this.s.startItemCooldown("slasher_pick");
			this.s.changeState(new this.s.stateClasses.Idle(this.s));
		}

		if (this.ticksUntilAllowRecharge > 0) {
			this.ticksUntilAllowRecharge--;
		} else if (this.ticksUntilAllowRecharge === 0 && this.s.isUsing) {
			this.s.changeState(new this.s.stateClasses.Charge(this.s));
		}
	}

	private hurtTargets(targets: mc.Entity[]): void {
		for (let i = 0; i < targets.length; i++) {
			const target = targets[i]!;
			const targetEffectLoc = getEntityBodyLocation(target);

			mc.system.run(() => {
				try {
					const damage = calculateFinalDamage(target, 14, mc.EntityDamageCause.entityAttack);
					target.applyDamage(damage, {
						cause: mc.EntityDamageCause.override,
						damagingEntity: this.s.player,
					});

					this.s.dimension.spawnParticle("slasher:blood_burst_emitter", targetEffectLoc);
				} catch {}
			});

			if (i > 4) continue;

			const playerHeadLoc = GlVector3.fromObject(this.s.player.getHeadLocation());

			const dirToTarget = vec3.create();
			vec3.sub(dirToTarget, targetEffectLoc.v, playerHeadLoc.v);
			vec3.normalize(dirToTarget, dirToTarget);

			const midEffectLoc = new GlVector3();
			vec3.add(midEffectLoc.v, playerHeadLoc.v, dirToTarget);

			const tickDelay = i;

			mc.system.runTimeout(() => {
				this.s.shakeCamera(0.08, 0.08, "rotational");

				this.s.playSound({
					soundId_2d: "slasher.critical.2d",
					soundId_3d: "slasher.critical",
					location: midEffectLoc,
					volume: 1.5,
					pitch: randf(0.85, 1.1),
				});

				this.s.dimension.spawnParticle("slasher:sparkle_particle", midEffectLoc);
			}, tickDelay);
		}
	}
}

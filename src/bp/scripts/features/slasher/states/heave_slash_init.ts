import { randomFloat } from "@mcbe-toolbox-lc/sukuriputils/math";
import { addCameraShake, getEntityForwardLocation } from "@mcbe-toolbox-lc/sukuriputils/server";
import * as v from "@mcbe-toolbox-lc/vecarr";
import * as mc from "@minecraft/server";
import { vec3 } from "gl-matrix";
import type { SlasherHandler } from "../handler";
import { SlasherStateBase } from "./base";

const ALLOW_AIR_LUNGE = false;

export class HeaveSlashInitState extends SlasherStateBase {
	private lunging: boolean;
	private shouldTransitionToAttackStateNextTick = false;

	constructor(slasher: SlasherHandler) {
		super(slasher);

		if (!this.shouldLunge()) {
			this.lunging = false;
			return;
		}

		this.slasher.actor.addEffect("weakness", 3, { amplifier: 255, showParticles: false });

		this.lunging = true;
		this.lunge();
	}

	protected override onTick(_currentItemStack: mc.ItemStack): void {
		this.slasher.actor.addEffect("weakness", 3, { amplifier: 255, showParticles: false });

		if (this.shouldTransitionToAttackStateNextTick) {
			this.transitionToAttackState();
			return;
		}

		if (this.lunging) this.onTickLunge();
		else this.startAttacking();
	}

	private shouldLunge(): boolean {
		if (!ALLOW_AIR_LUNGE && !this.slasher.actor.isOnGround) return false;
		const movementVector = this.slasher.actor.inputInfo.getMovementVector();
		return movementVector.y > 0.5 && Math.abs(movementVector.x) < 0.5;
	}

	private lunge(): void {
		this.slasher.startItemCooldown("slasher_lunge");

		this.slasher.actor.playSound("shr.slasher.lunge");

		this.slasher.actor.addEffect("speed", 4, { amplifier: 0, showParticles: false }); // FOV increase

		// Lunge physics

		const impulse = v.toArr3(this.slasher.actor.getViewDirection());
		impulse[1] = 0;
		vec3.normalize(impulse, impulse);
		const force = this.slasher.actor.isOnGround ? 2.6 : 1.6;
		vec3.scale(impulse, impulse, force);

		this.slasher.actor.applyImpulse(v.toObj3(impulse));
	}

	private onTickLunge(): void {
		if (this.currentTick == 2) {
			this.slasher.actor.clearVelocity();
		}

		if (this.currentTick >= 3) {
			this.startAttacking();
		}
	}

	private startAttacking(): void {
		this.slasher.startItemCooldown("slasher_heave_slash_start");

		addCameraShake(this.slasher.actor, 0.04, 0.05, "rotational");

		this.slasher.dimension.playSound(
			"shr.slasher.heave_slash",
			getEntityForwardLocation(this.slasher.actor),
			{
				pitch: randomFloat(0.95, 1.1),
				volume: 1.5,
			},
		);

		this.shouldTransitionToAttackStateNextTick = true;
	}

	private transitionToAttackState(): void {
		const targets: mc.Entity[] = [];

		// TODO: Gather targets

		this.slasher.changeState(
			new this.slasher.stateClasses.HeaveSlashFinishState(this.slasher, targets),
		);
	}
}

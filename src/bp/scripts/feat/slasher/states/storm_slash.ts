import { changeDir } from "@/lib/vector_utils";
import { randomFloat } from "@mcbe-toolbox-lc/sukuriputils/math";
import * as v from "@mcbe-toolbox-lc/vecarr";
import * as mc from "@minecraft/server";
import { vec3 } from "gl-matrix";
import { SlasherStateBase } from "./base";

export class StormSlashWindupState extends SlasherStateBase {
	private ticksUntilStrike = 16;

	override onEnter(): void {
		this.s.shakeCamera(0.04, 0.3, "rotational");

		this.s.startItemCooldown("slasher_storm_slash_windup");
		this.s.playSound({
			soundId_2d: "slasher.storm_slash_windup.2d",
			soundId_3d: "slasher.storm_slash_windup",
			location: this.s.player.getHeadLocation(),
			volume: 1.5,
		});
	}

	override onTick(_currentItem: mc.ItemStack): void {
		if (this.ticksUntilStrike > 0) {
			this.ticksUntilStrike--;
		} else {
			this.strikeOrCancel();
		}
	}

	private strikeOrCancel(): void {
		if (this.s.player.isGliding) {
			this.s.changeState(new StormSlashStrikeState(this.s));
			return;
		}

		this.s.startItemCooldown("slasher_pick");
		this.s.changeState(new this.s.stateClasses.Idle(this.s));
	}
}

export class StormSlashStrikeState extends SlasherStateBase {
	private ticksUntilForcedFinish = 20;

	override onEnter(): void {
		this.applyConstantEffect();

		const force = this.createInitialStrikeForceVector();

		this.s.player.applyImpulse(force);

		this.s.shakeCamera(0.1, 0.04, "rotational");
		this.s.startItemCooldown("slasher_storm_slash_strike");
		this.s.playSound({
			soundId_2d: "slasher.storm_slash_strike.2d",
			soundId_3d: "slasher.storm_slash_strike",
			location: this.s.player.getHeadLocation(),
			volume: 1.5,
			pitch: randomFloat(0.94, 1.03),
		});
	}

	override onTick(_currentItem: mc.ItemStack): void {
		if (this.ticksUntilForcedFinish > 0) {
			this.ticksUntilForcedFinish--;
		} else {
			this.finish();
			return;
		}

		if (this.shouldImpact()) {
			this.impact();
			return;
		}

		this.applyConstantEffect();

		const force = this.createContinuousForwardForceVector();

		this.s.player.applyImpulse(force);

		this.s.shakeCamera(0.08, 0.05, "rotational");
	}

	private createInitialStrikeForceVector(): v.HybridVec3 {
		const vec = vec3.fromValues(0, 0, 3);
		changeDir(vec, vec, v.toArr3(this.s.player.getViewDirection()));
		return new v.HybridVec3(vec);
	}

	private createContinuousForwardForceVector(): v.HybridVec3 {
		const viewDir = v.toArr3(this.s.player.getViewDirection());

		const velocity = v.toArr3(this.s.player.getVelocity());
		const velocityNorm = vec3.normalize(vec3.create(), velocity);

		const angle = vec3.angle(velocityNorm, viewDir);
		const forwardForce = Math.max(0.1, 1 * (angle / 1.3));

		const finalVec = vec3.fromValues(0, 0, forwardForce);
		changeDir(finalVec, finalVec, viewDir);

		return new v.HybridVec3(finalVec);
	}

	private applyConstantEffect(): void {
		this.s.player.addEffect("resistance", 12, { amplifier: 255, showParticles: false });
		this.s.player.addEffect("weakness", 12, { amplifier: 255, showParticles: false });
	}

	private finish(): void {
		this.s.changeState(new StormSlashFinishState(this.s));
	}

	private shouldImpact(): boolean {
		if (!this.s.player.isGliding) return true;

		const velocity = v.toArr3(this.s.player.getVelocity());
		const velocityLen = vec3.len(velocity);

		if (velocityLen < 0.1) return true;

		const blockSearchDist = Math.max(1, velocityLen);

		const isBlockAtFace =
			this.s.player.getBlockFromViewDirection({
				maxDistance: blockSearchDist,
				includeLiquidBlocks: false,
				includePassableBlocks: false,
			}) !== undefined;

		return isBlockAtFace;
	}

	private impact(): void {
		this.s.changeState(new StormSlashImpactState(this.s));
	}
}

export class StormSlashFinishState extends SlasherStateBase {
	private ticksUntilForcedExit = 20;

	override onEnter(): void {
		this.s.playSound({
			soundId_2d: "slasher.power_slash.2d",
			soundId_3d: "slasher.power_slash",
			location: this.s.player.getHeadLocation(),
			volume: 1.3,
			pitch: 1.04,
		});
	}

	override onTick(_currentItem: mc.ItemStack): void {
		if (this.ticksUntilForcedExit > 0) {
			this.ticksUntilForcedExit--;
		} else {
			this.exit();
			return;
		}
	}

	private exit(): void {
		this.s.startItemCooldown("slasher_pick");
		this.s.changeState(new this.s.stateClasses.Idle(this.s));
	}
}

export class StormSlashImpactState extends SlasherStateBase {
	private ticksUntilForcedExit = 20;

	override onEnter(): void {
		this.s.startItemCooldown("slasher_storm_slash_impact");
		this.s.playSound({
			soundId_2d: "slasher.storm_slash_impact.2d",
			soundId_3d: "slasher.storm_slash_impact",
			location: this.s.player.getHeadLocation(),
			volume: 1.6,
		});
	}

	override onTick(_currentItem: mc.ItemStack): void {
		if (this.ticksUntilForcedExit > 0) {
			this.ticksUntilForcedExit--;
		} else {
			this.exit();
			return;
		}

		if (this.currentTick === 1) {
			this.s.player.tryTeleport(this.s.player.location);
		}
	}

	private exit(): void {
		this.s.startItemCooldown("slasher_pick");
		this.s.changeState(new this.s.stateClasses.Idle(this.s));
	}
}

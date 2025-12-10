import * as mc from "@minecraft/server";
import { SlasherStateBase } from "./base";
import { vec3 } from "gl-matrix";
import { changeDir, GlVector3 } from "@/lib/vec";
import { randf } from "@/lib/math_utils";

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
			pitch: randf(0.94, 1.03),
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

	private createInitialStrikeForceVector(): GlVector3 {
		const vec = vec3.fromValues(0, 0, 3);
		changeDir(vec, vec, GlVector3.fromObject(this.s.player.getViewDirection()).v);
		return new GlVector3(vec);
	}

	private createContinuousForwardForceVector(): GlVector3 {
		const viewDir = GlVector3.fromObject(this.s.player.getViewDirection());

		const velocity = GlVector3.fromObject(this.s.player.getVelocity());
		const velocityNorm = vec3.normalize(vec3.create(), velocity.v);

		const angle = vec3.angle(velocityNorm, viewDir.v);
		const forwardForce = Math.max(0.1, 1 * (angle / 1.3));

		const finalVec = vec3.fromValues(0, 0, forwardForce);
		changeDir(finalVec, finalVec, GlVector3.fromObject(viewDir).v);

		return new GlVector3(finalVec);
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

		const velocity = GlVector3.fromObject(this.s.player.getVelocity());
		const velocityLen = vec3.len(GlVector3.fromObject(velocity).v);

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

import { calculateFinalDamage } from "@/lib/damage";
import { isVisibleTo } from "@/lib/entity_utils";
import { randf } from "@/lib/math_utils";
import { calculateRelativeLocation, changeDir, generateLinePoints, GlVector3 } from "@/lib/vec";
import * as mc from "@minecraft/server";
import { vec3 } from "gl-matrix";
import { shootPowerSlashBeam } from "./beam";
import type { SlasherHandler } from "./handler";

export abstract class SlasherState {
	private _currentTick = 0;

	get currentTick(): number {
		return this._currentTick;
	}

	constructor(readonly s: SlasherHandler) {}

	onEnter(): void {}
	onExit(): void {}

	tick(currentItem: mc.ItemStack): void {
		this.onTick(currentItem);
		this._currentTick++;
	}

	onTick(currentItem: mc.ItemStack): void {}
	canUse(event: mc.ItemStartUseAfterEvent): boolean {
		return true;
	}
	onStartUse(event: mc.ItemStartUseAfterEvent): void {}
	onStopUse(event: mc.ItemStopUseAfterEvent): void {}
	onHitBlock(event: mc.EntityHitBlockAfterEvent): void {}
	onHitEntity(event: mc.EntityHitEntityAfterEvent): void {}
}

export class IdleState extends SlasherState {
	override onTick(_currentItem: mc.ItemStack): void {
		if (this.s.isUsing) {
			this.s.changeState(new ChargeState(this.s));
		}
	}

	override onStartUse(_event: mc.ItemStartUseAfterEvent): void {
		this.s.changeState(new ChargeState(this.s));
	}

	override onHitBlock(_event: mc.EntityHitBlockAfterEvent): void {
		this.s.changeState(new SpeedSlashState(this.s, 0));
	}

	override onHitEntity(_event: mc.EntityHitEntityAfterEvent): void {
		this.s.changeState(new SpeedSlashState(this.s, 0));
	}
}

class SpeedSlashState extends SlasherState {
	private ticksUntilExit = 10;

	constructor(
		s: SlasherHandler,
		readonly animIndex: 0 | 1,
	) {
		super(s);
	}

	override onEnter(): void {
		if (this.animIndex === 0) {
			this.s.startItemCooldown("slasher_speed_slash_2", 0);
			this.s.startItemCooldown("slasher_speed_slash_1", this.ticksUntilExit);
		} else if (this.animIndex === 1) {
			this.s.startItemCooldown("slasher_speed_slash_1", 0);
			this.s.startItemCooldown("slasher_speed_slash_2", this.ticksUntilExit);
		}

		this.s.playSound({
			soundId_3d: "slasher.speed_slash",
			pitch: randf(0.96, 1.1),
		});
	}

	override onTick(_currentItem: mc.ItemStack): void {
		if (this.ticksUntilExit > 0) {
			this.ticksUntilExit--;
		} else if (this.s.isUsing) {
			this.s.changeState(new ChargeState(this.s));
		} else {
			this.s.startItemCooldown("slasher_pick");
			this.s.changeState(new IdleState(this.s));
		}
	}

	override onStopUse(_event: mc.ItemStopUseAfterEvent): void {
		this.restart();
	}

	override onHitBlock(_event: mc.EntityHitBlockAfterEvent): void {
		this.restart();
	}

	override onHitEntity(_event: mc.EntityHitEntityAfterEvent): void {
		this.restart();
	}

	private restart(): void {
		this.s.changeState(new SpeedSlashState(this.s, this.animIndex === 0 ? 1 : 0));
	}
}

class ChargeState extends SlasherState {
	private readonly actionbarFrames_progress = [
		"§c>     X     <",
		"§c>    X    <",
		"§c>   X   <",
		"§c>  X  <",
		"§c> X <",
	] as const;

	private readonly actionbarFrames_completed = [
		// Flashy
		"§b>X<",
		"§e>X<",
	] as const;

	private ticksUntilCompleteCharge = 6; // Charge duration
	private ticksUntilNextChargeSoundLoop = 1;

	override onEnter(): void {
		this.s.startItemCooldown("slasher_charge", 4);
	}

	override onTick(_currentItem: mc.ItemStack): void {
		// Main charge logic
		if (this.ticksUntilCompleteCharge > 0) {
			this.ticksUntilCompleteCharge--;
		}
		if (!this.s.isUsing) {
			this.releaseOrCancel();
			return;
		}

		// Sound
		if (this.ticksUntilNextChargeSoundLoop > 0) {
			this.ticksUntilNextChargeSoundLoop--;
		} else {
			this.s.playSound({ soundId_3d: "slasher.charge_loop" });
			this.ticksUntilNextChargeSoundLoop = 7;
		}

		// Actionbar frames
		if (this.ticksUntilCompleteCharge > 0) {
			this.s.player.onScreenDisplay.setActionBar(
				this.actionbarFrames_progress[this.currentTick % this.actionbarFrames_progress.length]!,
			);
		} else {
			this.s.player.onScreenDisplay.setActionBar(
				this.actionbarFrames_completed[this.currentTick % this.actionbarFrames_completed.length]!,
			);
		}
	}

	override onStopUse(_event: mc.ItemStopUseAfterEvent): void {
		if (!this.s.isUsing) {
			this.releaseOrCancel();
		}
	}

	private releaseOrCancel(): void {
		this.s.startItemCooldown("slasher_charge", 0);

		if (this.ticksUntilCompleteCharge <= 0) {
			this.s.player.onScreenDisplay.setActionBar("§c< X >");
			this.s.changeState(new PowerSlashState(this.s));
			return;
		}

		// On cancel
		this.s.player.onScreenDisplay.setActionBar("§8---");
		this.s.changeState(new SpeedSlashState(this.s, 0)); // Player can spam speed slash by rapidly clicking RMB
	}
}

class PowerSlashState extends SlasherState {
	private readonly slashDuration = 6;
	private readonly slashDurationFull = 12;

	private ticksDashFinish = -1;
	private ticksUntilAllowRecharge = -1;
	private ticksUntilExit = -1;

	private headLocationPreDashFinish?: GlVector3;

	override onEnter(): void {
		if (!this.testDashInput()) {
			this.slash();
			return;
		}

		// Dash

		this.s.startItemCooldown("slasher_charge_dash");

		this.s.playSound({
			soundId_2d: "slasher.dash.2d",
			soundId_3d: "slasher.dash",
			location: this.s.player.location,
			volume: 1.5,
			pitch: randf(0.96, 1.04),
		});

		this.s.shakeCamera(0.04, 0.04, "rotational");

		this.ticksDashFinish = this.s.player.isOnGround ? 2 : 3;

		const dashImpulse = this.createDashImpulseVector();
		this.s.player.applyImpulse(dashImpulse);
	}

	override onTick(_currentItem: mc.ItemStack): void {
		if (this.ticksDashFinish > 0) {
			if (this.ticksDashFinish === 1) {
				this.headLocationPreDashFinish = GlVector3.fromObject(this.s.player.getHeadLocation());
			}
			this.ticksDashFinish--;
		} else if (this.ticksDashFinish === 0) {
			this.slash();
		}

		if (this.ticksUntilExit > 0) {
			this.ticksUntilExit--;
		} else if (this.ticksUntilExit === 0) {
			this.ticksUntilExit = -1;

			this.s.startItemCooldown("slasher_pick");
			this.s.changeState(new IdleState(this.s));
		}

		if (this.ticksUntilAllowRecharge > 0) {
			this.ticksUntilAllowRecharge--;
		} else if (this.ticksUntilAllowRecharge === 0 && this.s.isUsing) {
			this.s.changeState(new ChargeState(this.s));
		}
	}

	private testDashInput(): boolean {
		const movementVector = this.s.player.inputInfo.getMovementVector();
		return movementVector.y > 0.3 && Math.abs(movementVector.x) < 0.3;
	}

	private createDashImpulseVector(): GlVector3 {
		const viewDir = GlVector3.fromObject(this.s.player.getViewDirection());
		const impulse = vec3.fromValues(0, 0, 1);

		changeDir(impulse, impulse, viewDir.v);

		if (this.s.player.isOnGround) {
			// Kill vertical force when on ground
			vec3.mul(impulse, impulse, vec3.fromValues(1, 0, 1));
			vec3.normalize(impulse, impulse);
		}

		const impulseScalar = this.s.player.isOnGround ? 7 : 2.5;
		vec3.scale(impulse, impulse, impulseScalar);

		return new GlVector3(impulse);
	}

	private getSlashTargets(): mc.Entity[] {
		const headLoc = GlVector3.fromObject(this.s.player.getHeadLocation());
		const viewDir = GlVector3.fromObject(this.s.player.getViewDirection());

		const locations: vec3[] = [
			calculateRelativeLocation(vec3.create(), headLoc.v, viewDir.v, {
				y: 0.4,
				z: 1.2,
			}),
			calculateRelativeLocation(vec3.create(), headLoc.v, viewDir.v, {
				y: -1,
				z: 1.3,
			}),
			calculateRelativeLocation(vec3.create(), headLoc.v, viewDir.v, {
				y: 0.1,
				z: 1.5,
			}),
			calculateRelativeLocation(vec3.create(), headLoc.v, viewDir.v, {
				y: 0.1,
				z: 3.1,
			}),
		];

		const isFastEnoughForSupport =
			vec3.len(GlVector3.fromObject(this.s.player.getVelocity()).v) > 0.8;

		if (isFastEnoughForSupport && this.headLocationPreDashFinish) {
			const start = this.headLocationPreDashFinish;
			const end = GlVector3.fromObject(this.s.player.getHeadLocation());
			const linePoints = generateLinePoints(start.v, end.v, 3);
			locations.push(...linePoints);
		}

		const targetCandidates: mc.Entity[] = [];

		for (const location of locations) {
			const entities = this.s.dimension.getEntities({
				location: new GlVector3(location),
				closest: 30,
				maxDistance: 2.5,
				excludeTypes: ["minecraft:item", "minecraft:xp_orb"],
			});

			for (const entity of entities) {
				if (entity === this.s.player) continue;
				if (entity instanceof mc.Player && !mc.world.gameRules.pvp) continue;
				if (targetCandidates.includes(entity)) continue;

				// Make sure there are no blocks between the player and this entity.
				if (!isVisibleTo(this.s.player, entity)) continue;

				targetCandidates.push(entity);
			}
		}

		return targetCandidates;
	}

	private slash(): void {
		this.ticksDashFinish = -1;
		this.ticksUntilAllowRecharge = this.slashDuration;
		this.ticksUntilExit = this.slashDurationFull;

		this.s.startItemCooldown("slasher_power_slash");

		this.s.playSound({
			soundId_2d: "slasher.power_slash.2d",
			soundId_3d: "slasher.power_slash",
			location: this.s.player.location,
			volume: 1.4,
			pitch: randf(0.95, 1.05),
		});

		this.s.shakeCamera(0.05, 0.08, "rotational");

		const targets = Array.from(this.getSlashTargets());

		for (let i = 0; i < targets.length; i++) {
			const target = targets[i]!;

			mc.system.run(() => {
				const damage = calculateFinalDamage(target, 14, mc.EntityDamageCause.entityAttack);
				target.applyDamage(damage, {
					cause: mc.EntityDamageCause.override,
					damagingEntity: this.s.player,
				});
			});

			if (i > 4) continue;

			const headLoc = GlVector3.fromObject(this.s.player.getHeadLocation());
			const effectLocVec: vec3 = vec3.create();
			vec3.sub(
				effectLocVec,
				GlVector3.fromObject(target.location).v,
				GlVector3.fromObject(headLoc).v,
			);
			vec3.normalize(effectLocVec, effectLocVec);
			vec3.add(effectLocVec, effectLocVec, headLoc.v);
			const effectLoc = new GlVector3(effectLocVec);

			const tickDelay = 1 + i;

			mc.system.runTimeout(() => {
				this.s.playSound({
					soundId_2d: "slasher.critical.2d",
					soundId_3d: "slasher.critical",
					location: effectLoc,
					volume: 1.5,
					pitch: randf(0.85, 1.1),
				});

				this.s.shakeCamera(0.05, 0.06, "rotational");
			}, tickDelay);
		}

		shootPowerSlashBeam(this.s.player);
	}
}

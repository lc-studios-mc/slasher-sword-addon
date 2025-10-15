import { calculateFinalDamage } from "@/lib/damage";
import { getEntityBodyLocation, isEntityAlive, isVisibleTo } from "@/lib/entity_utils";
import { randf } from "@/lib/math_utils";
import {
	calculateRelativeLocation,
	changeDir,
	generateLinePoints,
	GlVector2,
	GlVector3,
} from "@/lib/vec";
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
	static readonly SLASH_DURATION = 6;
	static readonly SLASH_DURATION_FULL = 12;

	private ticksUntilDashFinish = -1;
	private attackActionBranchingNextTick = false;
	private ticksUntilAllowRecharge = -1;
	private ticksUntilExit = -1;

	private bodyLocationPreDashFinish?: GlVector3;

	override onEnter(): void {
		if (!this.testDashInput()) {
			this.slashStart();
			return;
		}

		this.dash();
	}

	override onTick(_currentItem: mc.ItemStack): void {
		if (this.ticksUntilExit > 0) {
			this.ticksUntilExit--;
		} else if (this.ticksUntilExit === 0) {
			this.ticksUntilExit = -1;

			this.s.startItemCooldown("slasher_pick");
			this.s.changeState(new IdleState(this.s));
		}

		if (this.ticksUntilDashFinish > 0) {
			if (this.ticksUntilDashFinish === 1) {
				this.bodyLocationPreDashFinish = this.s.getBodyLocation();
			}
			this.ticksUntilDashFinish--;
		} else if (this.ticksUntilDashFinish === 0) {
			this.ticksUntilDashFinish = -1;
			this.slashStart();
		}

		if (this.attackActionBranchingNextTick) {
			this.attackActionBranchingNextTick = false;
			this.attackActionBranching();
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

		const impulseScalar = this.s.player.isOnGround ? 5 : this.s.player.isGliding ? 1.7 : 2.33;
		vec3.scale(impulse, impulse, impulseScalar);

		return new GlVector3(impulse);
	}

	private dash(): void {
		this.s.startItemCooldown("slasher_charge_dash");

		this.s.playSound({
			soundId_2d: "slasher.dash.2d",
			soundId_3d: "slasher.dash",
			location: this.s.player.location,
			volume: 1.5,
			pitch: randf(0.96, 1.04),
		});

		this.s.shakeCamera(0.04, 0.04, "rotational");

		this.ticksUntilDashFinish = this.s.player.isOnGround ? 2 : 3;

		const dashImpulse = this.createDashImpulseVector();
		this.s.player.applyImpulse(dashImpulse);
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
			calculateRelativeLocation(vec3.create(), headLoc.v, viewDir.v, {
				y: -1,
				z: 2.9,
			}),
		];

		const isFastEnoughForSupport =
			vec3.len(GlVector3.fromObject(this.s.player.getVelocity()).v) > 0.4;

		if (isFastEnoughForSupport && this.bodyLocationPreDashFinish) {
			const start = this.bodyLocationPreDashFinish;
			const end = GlVector3.fromObject(this.s.getBodyLocation());
			const count = Math.max(4, Math.round(vec3.dist(start.v, end.v) * 1.5));
			const linePoints = generateLinePoints(start.v, end.v, count);
			locations.push(...linePoints);
		}

		const targetCandidates: mc.Entity[] = [];

		for (const location of locations) {
			const entities = this.s.dimension.getEntities({
				location: new GlVector3(location),
				closest: 30,
				maxDistance: 2.5,
				excludeTypes: ["minecraft:item", "minecraft:xp_orb"],
				excludeFamilies: ["ignore_slasher_attack"],
			});

			for (const entity of entities) {
				if (entity === this.s.player) continue;
				if (entity instanceof mc.Player && !mc.world.gameRules.pvp) continue;
				if (entity.getComponent("projectile")) continue;
				if (targetCandidates.includes(entity)) continue;

				// Make sure there are no blocks between the player and this entity.
				if (!isVisibleTo(this.s.player, entity)) continue;

				targetCandidates.push(entity);
			}
		}

		return targetCandidates;
	}

	private canEntityBeSawed(entity: mc.Entity): boolean {
		if (entity.typeId === "minecraft:ender_dragon") return false;
		return true;
	}

	private slashStart(): void {
		this.attackActionBranchingNextTick = true;

		this.s.startItemCooldown("slasher_power_slash_start");

		this.s.playSound({
			soundId_2d: "slasher.power_slash.2d",
			soundId_3d: "slasher.power_slash",
			location: this.s.player.location,
			volume: 1.5,
			pitch: randf(0.95, 1.05),
		});

		this.s.shakeCamera(0.05, 0.08, "rotational");
	}

	private attackActionBranching(): void {
		const targets = Array.from(this.getSlashTargets());

		const shouldStartSawing =
			targets.length > 0 &&
			SawingState.testSawingInput(this.s.player) &&
			this.canEntityBeSawed(targets[0]!);

		if (shouldStartSawing) {
			this.s.changeState(new SawingState(this.s, targets));
			return;
		}

		this.powerSlash(targets);
	}

	private powerSlash(targets: mc.Entity[]): void {
		this.s.startItemCooldown("slasher_power_slash_finish");

		this.ticksUntilAllowRecharge = PowerSlashState.SLASH_DURATION;
		this.ticksUntilExit = PowerSlashState.SLASH_DURATION_FULL;

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
				this.s.shakeCamera(0.05, 0.06, "rotational");

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

		shootPowerSlashBeam(this.s.player);
	}
}

type SawingLockonContext = {
	attackerLoc: GlVector3;
	attackerRot: GlVector2;
	targetLoc: GlVector3;
	targetRot: GlVector2;
};

class SawingState extends SlasherState {
	static testSawingInput(player: mc.Player): boolean {
		if (player.inputInfo.lastInputModeUsed === mc.InputMode.Touch) {
			return player.isSneaking;
		}
		return player.inputInfo.getButtonState(mc.InputButton.Sneak) === mc.ButtonState.Pressed;
	}

	private readonly releasingDuration = 15;
	private readonly releaseEntityTypes: readonly string[] = [
		"minecraft:player",
		"minecraft:ender_dragon",
		"minecraft:wither",
	];

	private lockonCtx: SawingLockonContext;
	private ticksUntilFinishReleasing = -1;
	private alreadyTriedReleasing = false;
	private exiting = false;
	private ticksUntilAllowRecharge = -1;
	private ticksUntilExit = -1;

	constructor(
		s: SlasherHandler,
		readonly targets: mc.Entity[],
	) {
		super(s);

		this.lockonCtx = this.createLockonContext();
	}

	override onEnter(): void {
		this.s.startItemCooldown("slasher_sawing_start");
	}

	override onTick(_currentItem: mc.ItemStack): void {
		if (this.exiting) this.onTickExiting();
		else this.onTickSawing();
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
		if (this.releaseEntityTypes.includes(entity.typeId)) return true;
		if (entity.hasTag("ignore_slasher_charged_atk")) return true;
		if (entity.hasTag("ignore_slasher_lockon")) return true;
		if (entity.hasTag("scpdy_ignore_slasher_capture")) return false;

		const isInanimate = entity.matches({ families: ["inanimate"] });
		if (isInanimate) return true;

		const isScp096 = entity.matches({ families: ["scp096"] });
		if (isScp096) return true;

		return false;
	}

	private startExiting(): void {
		this.s.startItemCooldown("slasher_sawing_start", 0);
		this.s.startItemCooldown("slasher_sawing_finish", 0);
		this.s.startItemCooldown("slasher_power_slash_finish", 3);
		this.exiting = true;
		this.ticksUntilAllowRecharge = PowerSlashState.SLASH_DURATION;
		this.ticksUntilExit = PowerSlashState.SLASH_DURATION_FULL;

		this.s.playSound({
			soundId_2d: "slasher.power_slash.2d",
			soundId_3d: "slasher.power_slash",
			location: this.s.player.location,
			volume: 1.5,
			pitch: randf(0.95, 1.05),
		});

		mc.system.run(() => {
			this.s.playSound({
				soundId_2d: "slasher.chainsaw_finish.2d",
				soundId_3d: "slasher.chainsaw_finish",
				location: this.s.player.location,
				volume: 1.5,
			});
		});
	}

	private onTickSawing(): void {
		let finishedReleasing = false;
		if (this.ticksUntilFinishReleasing > 0) {
			this.ticksUntilFinishReleasing--;
		} else if (this.ticksUntilFinishReleasing === 0) {
			this.ticksUntilFinishReleasing = -1;
			finishedReleasing = true;
		}

		const shouldStartExiting =
			this.targets.length <= 0 ||
			finishedReleasing ||
			(this.ticksUntilFinishReleasing <= 0 && !SawingState.testSawingInput(this.s.player));

		if (shouldStartExiting) {
			this.startExiting();
			return;
		}

		if (this.currentTick % 2 === 0) {
			this.s.shakeCamera(0.11, 0.1, "rotational");
		}

		if (this.currentTick % 8 === 0) {
			this.s.playSound({
				soundId_2d: "slasher.chainsaw_loop.2d",
				soundId_3d: "slasher.chainsaw_loop",
				location: this.s.player.location,
				volume: 1.5,
			});
		}

		this.s.player.tryTeleport(this.lockonCtx.attackerLoc, {
			rotation: this.lockonCtx.attackerRot,
		});

		for (let i = 0; i < this.targets.length; i++) {
			const target = this.targets[i]!;

			let remove = false;

			try {
				if (!isEntityAlive(target)) throw 0;

				target.tryTeleport(this.lockonCtx.targetLoc, {
					rotation: this.lockonCtx.targetRot,
				});

				target.applyDamage(1, {
					cause: mc.EntityDamageCause.override,
					damagingEntity: this.s.player,
				});

				const bloodParticleLoc = getEntityBodyLocation(target);
				this.s.dimension.spawnParticle("slasher:blood_burst_less_emitter", bloodParticleLoc);
			} catch {
				remove = true;
			}

			if (remove) {
				this.targets.splice(i, 1);
				i--;
			}
		}

		const mainTarget = this.targets[0];

		const shouldStartReleasing =
			!this.alreadyTriedReleasing && mainTarget && this.shouldReleaseEntity(mainTarget);

		if (shouldStartReleasing) {
			this.ticksUntilFinishReleasing = this.releasingDuration;
			this.alreadyTriedReleasing = true;
			this.s.startItemCooldown("slasher_sawing_release");
		}
	}

	private onTickExiting(): void {
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
}

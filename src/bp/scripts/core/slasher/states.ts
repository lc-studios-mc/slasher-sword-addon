import * as mc from "@minecraft/server";
import type { SlasherHandler } from "./handler";
import { randf } from "@/lib/math_utils";
import { vec2 } from "gl-matrix";

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
			pitch: randf(0.96, 1.06),
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
	private readonly dashDuration = 3;
	private readonly slashDuration = 6;
	private readonly slashDurationFull = 12;

	private ticksUntilSlash = -1;
	private ticksUntilAllowRecharge = -1;
	private ticksUntilExit = -1;

	override onEnter(): void {
		if (!this.testDashInput()) {
			this.slash();
			return;
		}

		this.s.startItemCooldown("slasher_charge_dash");

		this.s.playSound({ soundId_3d: "slasher.dash", location: this.s.player.location, volume: 1.2 });

		this.ticksUntilSlash = this.dashDuration;
	}

	override onTick(_currentItem: mc.ItemStack): void {
		if (this.ticksUntilSlash > 0) {
			this.ticksUntilSlash--;
		} else if (this.ticksUntilSlash === 0) {
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

	private slash(): void {
		this.ticksUntilSlash = -1;

		this.s.startItemCooldown("slasher_power_slash");

		this.s.playSound({
			soundId_2d: "slasher.power_slash.2d",
			soundId_3d: "slasher.power_slash",
			location: this.s.player.location,
			volume: 1.4,
		});

		this.ticksUntilAllowRecharge = this.slashDuration;
		this.ticksUntilExit = this.slashDurationFull;
	}
}

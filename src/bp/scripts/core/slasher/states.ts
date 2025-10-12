import * as mc from "@minecraft/server";
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
	ticksUntilExit = 10;

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
	ticksUntilCompleteCharge = 5; // Charge duration

	override onTick(_currentItem: mc.ItemStack): void {
		if (this.ticksUntilCompleteCharge > 0) {
			this.ticksUntilCompleteCharge--;
		}

		if (!this.s.isUsing) {
			this.releaseOrCancel();
		}
	}

	override onEnter(): void {
		this.s.startItemCooldown("slasher_charge");
	}

	override onStopUse(_event: mc.ItemStopUseAfterEvent): void {
		if (!this.s.isUsing) {
			this.releaseOrCancel();
		}
	}

	releaseOrCancel(): void {
		if (this.ticksUntilCompleteCharge <= 0) {
			// TODO: Enter Power Slash
		} else {
			this.s.startItemCooldown("slasher_charge", 0);

			// Speed slash on cancel; player can spam speed slash by rapidly clicking RMB
			this.s.changeState(new SpeedSlashState(this.s, 0));
		}
	}
}

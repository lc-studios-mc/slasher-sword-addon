import * as mc from "@minecraft/server";
import type { SlasherHandler } from "../handler";
import { SlasherStateBase } from "./base";

export class IdleState extends SlasherStateBase {
	constructor(slasher: SlasherHandler, playPickAnim = true) {
		super(slasher);

		if (playPickAnim) {
			this.slasher.startItemCooldown("slasher_pick");
		}
	}

	protected override onTick(_currentItemStack: mc.ItemStack): void {
		if (this.slasher.isUsing) {
			this.startCharging();
		}
	}

	override onStartUseItem(e: mc.ItemStartUseAfterEvent): void {
		this.startCharging();
	}

	override onHitBlock(_e: mc.EntityHitBlockAfterEvent): void {
		this.quickSlash();
	}

	override onHitEntity(_e: mc.EntityHitEntityAfterEvent): void {
		this.quickSlash();
	}

	private startCharging(): void {
		this.slasher.clearItemCooldown("slasher_pick");
		this.slasher.changeState(new this.slasher.stateClasses.ChargingState(this.slasher));
	}

	private quickSlash(): void {
		this.slasher.clearItemCooldown("slasher_pick");
		this.slasher.changeState(new this.slasher.stateClasses.QuickSlashState(this.slasher));
	}
}

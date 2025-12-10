import * as mc from "@minecraft/server";
import { SlasherStateBase } from "./base";

export class IdleState extends SlasherStateBase {
	override onTick(_currentItem: mc.ItemStack): void {
		if (this.s.isUsing) {
			this.s.changeState(new this.s.stateClasses.Charge(this.s));
		}
	}

	override onStartUse(_event: mc.ItemStartUseAfterEvent): void {
		this.s.changeState(new this.s.stateClasses.Charge(this.s));
	}

	override onHitBlock(_event: mc.EntityHitBlockAfterEvent): void {
		this.s.changeState(new this.s.stateClasses.SpeedSlash(this.s, 0));
	}

	override onHitEntity(_event: mc.EntityHitEntityAfterEvent): void {
		this.s.changeState(new this.s.stateClasses.SpeedSlash(this.s, 0));
	}
}

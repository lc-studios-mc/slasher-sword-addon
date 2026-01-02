import * as mc from "@minecraft/server";
import type { SlasherHandler } from "../handler";

export abstract class SlasherStateBase {
	private _currentTick = 0;

	constructor(public readonly slasher: SlasherHandler) {}

	get currentTick(): number {
		return this._currentTick;
	}

	onEnter(): void {}
	onExit(): void {}

	tick(currentItemStack: mc.ItemStack): void {
		this.onTick(currentItemStack);
		this._currentTick++;
	}
	protected onTick(currentItemStack: mc.ItemStack): void {}

	canStartUseItem(e: mc.ItemStartUseAfterEvent): boolean {
		return true;
	}
	onStartUseItem(e: mc.ItemStartUseAfterEvent): void {}
	onStopUseItem(e: mc.ItemStopUseAfterEvent): void {}
	onHealthChanged(e: mc.EntityHealthChangedAfterEvent): void {}
	onDie(e: mc.EntityDieAfterEvent): void {}
	onHurt(e: mc.EntityHurtAfterEvent): void {}
	onHitBlock(e: mc.EntityHitBlockAfterEvent): void {}
	onHitEntity(e: mc.EntityHitEntityAfterEvent): void {}
}

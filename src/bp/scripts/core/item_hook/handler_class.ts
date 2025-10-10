import * as mc from "@minecraft/server";
import type { ItemHookContext, ItemHookHandler } from "./processing";

export abstract class ItemHookHandlerBase implements ItemHookHandler {
	constructor(readonly ctx: ItemHookContext) {}

	isValid(currentItem?: mc.ItemStack): boolean {
		return true;
	}

	onRemove(): void {}

	onTick(currentItem: mc.ItemStack): void {}

	// Re-export some ctx properties for ease of use by child classes

	get player(): mc.Player {
		return this.ctx.player;
	}
	get slotIndex(): number {
		return this.ctx.slotIndex;
	}
	get itemStack(): mc.ItemStack {
		return this.ctx.itemStack;
	}
	get currentTick(): number {
		return this.ctx.getCurrentTick();
	}
	get isUsing(): boolean {
		return this.ctx.isUsing();
	}
}

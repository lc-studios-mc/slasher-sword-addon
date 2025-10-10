import type { ItemStack } from "@minecraft/server";
import type { ItemHookContext, ItemHookHandler } from "./processing";

export class ItemHookHandlerBase implements ItemHookHandler {
	constructor(readonly ctx: ItemHookContext) {}

	isValid(currentItem?: ItemStack): boolean {
		return true;
	}

	onRemove(): void {}

	onTick(currentItem: ItemStack): void {}
}

import * as mc from "@minecraft/server";
import type { ItemSessionConfig, ItemSessionContext, ItemSessionHandler } from "./types";

export abstract class ItemSessionHandlerBase implements ItemSessionHandler {
	constructor(public readonly ctx: ItemSessionContext) {}

	// Interface implementation

	isValid(currentItemStack: mc.ItemStack): boolean {
		return true;
	}
	onStartSession(): void {}
	onStopSession(): void {}
	onTick(currentItemStack: mc.ItemStack): void {}
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

	// For convinience

	get config(): ItemSessionConfig {
		return this.ctx.config;
	}

	get actor(): mc.Player {
		return this.ctx.actor;
	}

	get actorEquippable(): mc.EntityEquippableComponent {
		return this.ctx.actorEquippable;
	}

	get actorHealth(): mc.EntityHealthComponent {
		return this.ctx.actorHealth;
	}

	get dimension(): mc.Dimension {
		return this.ctx.actor.dimension;
	}

	get initialSlotIndex(): number {
		return this.ctx.initialSlotIndex;
	}

	get initialItemStack(): mc.ItemStack {
		return this.ctx.initialItemStack;
	}

	get currentTick(): number {
		return this.ctx.currentTick();
	}

	get isUsing(): boolean {
		return this.ctx.isUsing();
	}
}

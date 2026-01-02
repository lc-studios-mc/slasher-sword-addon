import type * as mc from "@minecraft/server";

export type ItemSessionContext = {
	readonly actor: mc.Player;
	currentTick(): number;
	isUsing(): boolean;
};

export type ItemSessionHandler = {
	readonly ctx: ItemSessionContext;
	isValid(mainhandItem: mc.ItemStack): boolean;
	onTick(mainhandItem: mc.ItemStack): void;
	onRemove(): void;
	canStartUse(e: mc.ItemStartUseAfterEvent): boolean;
	onStartUse(e: mc.ItemStartUseAfterEvent): void;
	onStopUse(e: mc.ItemStopUseAfterEvent): void;
	onActorHealthChanged(e: mc.EntityHealthChangedAfterEvent): void;
	onActorDie(e: mc.EntityDieAfterEvent): void;
	onActorHurt(e: mc.EntityHurtAfterEvent): void;
	onActorHitBlock(e: mc.EntityHitBlockAfterEvent): void;
	onActorHitEntity(e: mc.EntityHitEntityAfterEvent): void;
};

export type ItemSessionHandlerFactory = (ctx: ItemSessionContext) => ItemSessionHandler;

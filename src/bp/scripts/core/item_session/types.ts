import type * as mc from "@minecraft/server";

export type ItemSessionConfig = {
	itemType: string;
	createHandler: (ctx: ItemSessionContext) => ItemSessionHandler;
};

export type ItemSessionContext = {
	readonly config: ItemSessionConfig;
	readonly actor: mc.Player;
	readonly actorEquippable: mc.EntityEquippableComponent;
	readonly actorHealth: mc.EntityHealthComponent;
	readonly initialSlotIndex: number;
	readonly initialItemStack: mc.ItemStack;
	currentTick: () => number;
	isUsing: () => boolean;
};

export type ItemSessionHandler = {
	readonly ctx: ItemSessionContext;
	isValid: (currentItemStack: mc.ItemStack) => boolean;
	onStartSession: () => void;
	onStopSession: () => void;
	onTick: (currentItemStack: mc.ItemStack) => void;
	canStartUseItem: (e: mc.ItemStartUseAfterEvent) => boolean;
	onStartUseItem: (e: mc.ItemStartUseAfterEvent) => void;
	onStopUseItem: (e: mc.ItemStopUseAfterEvent) => void;
	onHealthChanged: (e: mc.EntityHealthChangedAfterEvent) => void;
	onDie: (e: mc.EntityDieAfterEvent) => void;
	onHurt: (e: mc.EntityHurtAfterEvent) => void;
	onHitBlock: (e: mc.EntityHitBlockAfterEvent) => void;
	onHitEntity: (e: mc.EntityHitEntityAfterEvent) => void;
};

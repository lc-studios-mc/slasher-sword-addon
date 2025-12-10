import { isEntityAlive } from "@mcbe-toolbox-lc/sukuriputils/server";
import * as mc from "@minecraft/server";

export type ItemHookProfile = {
	readonly itemType: string;
	readonly createHandler: (ctx: ItemHookContext) => ItemHookHandler;
};

export type ItemHookContext = {
	readonly player: mc.Player;
	readonly slotIndex: number;
	readonly itemStack: mc.ItemStack;
	readonly getCurrentTick: () => number;
	readonly isUsing: () => boolean;
};

export type ItemHookHandler = {
	readonly ctx: ItemHookContext;
	readonly isValid: (currentItem?: mc.ItemStack) => boolean;
	readonly onCreate: () => void;
	readonly onRemove: () => void;
	readonly onTick: (currentItem: mc.ItemStack) => void;
	readonly canUse: (event: mc.ItemStartUseAfterEvent) => boolean;
	readonly onStartUse: (event: mc.ItemStartUseAfterEvent) => void;
	readonly onStopUse: (event: mc.ItemStopUseAfterEvent) => void;
	readonly onHitBlock: (event: mc.EntityHitBlockAfterEvent) => void;
	readonly onHitEntity: (event: mc.EntityHitEntityAfterEvent) => void;
};

type ItemHookInternalVariables = {
	currentTick: number;
	isUsing: boolean;
};

type ItemHook = {
	ctx: ItemHookContext;
	handler: ItemHookHandler;
	internalVars: ItemHookInternalVariables;
};

const ITEM_HOOK_PROFILES = new Map<string, ItemHookProfile>();
const ITEM_HOOKS_BY_PLAYER = new Map<mc.Player, ItemHook>();

export const registerItemHookProfile = (profile: ItemHookProfile): void => {
	ITEM_HOOK_PROFILES.set(profile.itemType, profile);
};

const isItemHookValid = (itemHook: ItemHook, currentItem?: mc.ItemStack): boolean => {
	const player = itemHook.ctx.player;
	if (!player.isValid) return false;
	if (itemHook.ctx.slotIndex !== player.selectedSlotIndex) return false;
	if (!currentItem) return false;
	if (itemHook.ctx.itemStack.typeId !== currentItem.typeId) return false;
	if (itemHook.ctx.itemStack.nameTag !== currentItem.nameTag) return false;
	if (!itemHook.handler.isValid(currentItem)) return false;
	return true;
};

const removeItemHook = (player: mc.Player, itemHook?: ItemHook): void => {
	try {
		itemHook = itemHook ?? ITEM_HOOKS_BY_PLAYER.get(player);
		itemHook?.handler.onRemove();
	} finally {
		ITEM_HOOKS_BY_PLAYER.delete(player);
	}
};

const onTickPlayer = (player: mc.Player): void => {
	const isAlive = isEntityAlive(player);
	const equippable = player.getComponent("equippable")!;
	const mainhandSlot = equippable.getEquipmentSlot(mc.EquipmentSlot.Mainhand);
	const mainhandItem = mainhandSlot.getItem();
	const itemHookProfile = mainhandItem ? ITEM_HOOK_PROFILES.get(mainhandItem.typeId) : undefined;

	let itemHook = ITEM_HOOKS_BY_PLAYER.get(player);

	if (itemHook && (!isAlive || !isItemHookValid(itemHook, mainhandItem))) {
		removeItemHook(player, itemHook);
		itemHook = undefined;
	}

	if (!mainhandItem) return;

	if (!itemHook) {
		if (!isAlive || !itemHookProfile) return;

		const internalVars: ItemHookInternalVariables = {
			currentTick: 0,
			isUsing: false,
		};

		const ctx: ItemHookContext = {
			player,
			slotIndex: player.selectedSlotIndex,
			itemStack: mainhandItem,
			getCurrentTick: () => internalVars.currentTick,
			isUsing: () => internalVars.isUsing,
		};

		const handler = itemHookProfile.createHandler(ctx);

		itemHook = {
			ctx,
			handler,
			internalVars,
		};

		ITEM_HOOKS_BY_PLAYER.set(player, itemHook);

		handler.onCreate();
	}

	if (!itemHook) return;

	itemHook.handler.onTick(mainhandItem);
	itemHook.internalVars.currentTick++;
};

mc.world.afterEvents.worldLoad.subscribe(() => {
	mc.system.runInterval(() => {
		const players = mc.world.getPlayers();
		for (const player of players) onTickPlayer(player);
	}, 1);
});

mc.world.afterEvents.entityDie.subscribe((e) => {
	if (!(e.deadEntity instanceof mc.Player)) return;
	removeItemHook(e.deadEntity);
});

mc.world.afterEvents.itemStartUse.subscribe((e) => {
	const itemHook = ITEM_HOOKS_BY_PLAYER.get(e.source);
	if (!itemHook) return;

	const canUse = itemHook.handler.canUse(e);
	if (!canUse) return;

	itemHook.internalVars.isUsing = true;
	itemHook.handler.onStartUse(e);
});

mc.world.afterEvents.itemStopUse.subscribe((e) => {
	const itemHook = ITEM_HOOKS_BY_PLAYER.get(e.source);
	if (!itemHook) return;

	itemHook.internalVars.isUsing = false;
	itemHook.handler.onStopUse(e);
});

mc.world.afterEvents.entityHitBlock.subscribe((e) => {
	if (!(e.damagingEntity instanceof mc.Player)) return;

	const itemHook = ITEM_HOOKS_BY_PLAYER.get(e.damagingEntity);
	if (!itemHook) return;

	itemHook.handler.onHitBlock(e);
});

mc.world.afterEvents.entityHitEntity.subscribe((e) => {
	if (!(e.damagingEntity instanceof mc.Player)) return;

	const itemHook = ITEM_HOOKS_BY_PLAYER.get(e.damagingEntity);
	if (!itemHook) return;

	itemHook.handler.onHitEntity(e);
});

export abstract class ItemHookHandlerBase implements ItemHookHandler {
	constructor(readonly ctx: ItemHookContext) {}

	isValid(currentItem?: mc.ItemStack): boolean {
		return true;
	}
	onCreate(): void {}
	onRemove(): void {}
	onTick(currentItem: mc.ItemStack): void {}
	canUse(event: mc.ItemStartUseAfterEvent): boolean {
		return true;
	}
	onStartUse(event: mc.ItemStartUseAfterEvent): void {}
	onStopUse(event: mc.ItemStopUseAfterEvent): void {}
	onHitBlock(event: mc.EntityHitBlockAfterEvent): void {}
	onHitEntity(event: mc.EntityHitEntityAfterEvent): void {}

	get player(): mc.Player {
		return this.ctx.player;
	}
	get dimension(): mc.Dimension {
		return this.ctx.player.dimension;
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

import * as mc from "@minecraft/server";

export type ItemHookProfile = {
	readonly itemType: string;
	readonly createHandler: (ctx: ItemHookContext) => ItemHookHandler;
};

export type ItemHookContext = {
	readonly player: mc.Player;
	readonly slotIndex: number;
	readonly itemStack: mc.ItemStack;
	readonly currentTick: number;
	readonly isUsing: boolean;
};

export type ItemHookHandler = {
	readonly ctx: ItemHookContext;
	readonly isValid: (currentItem?: mc.ItemStack) => boolean;
	readonly onRemove: () => void;
	readonly onTick: (currentItem: mc.ItemStack) => void;
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
	if (currentItem) {
		if (itemHook.ctx.itemStack.typeId !== currentItem.typeId) return false;
		if (itemHook.ctx.itemStack.nameTag !== currentItem.nameTag) return false;
	}
	if (!itemHook.handler.isValid(currentItem)) return false;
	return true;
};

const removeItemHook = (itemHook: ItemHook): void => {
	itemHook.handler.onRemove();
};

const onTickPlayer = (player: mc.Player): void => {
	const equippable = player.getComponent("equippable")!;
	const mainhandSlot = equippable.getEquipmentSlot(mc.EquipmentSlot.Mainhand);
	const mainhandItem = mainhandSlot.getItem();
	const itemHookProfile = mainhandItem ? ITEM_HOOK_PROFILES.get(mainhandItem.typeId) : undefined;

	let itemHook = ITEM_HOOKS_BY_PLAYER.get(player);

	if (itemHook && !isItemHookValid(itemHook, mainhandItem)) {
		removeItemHook(itemHook);
		itemHook = undefined;
	}

	if (!mainhandItem) return;

	if (!itemHook) {
		if (!itemHookProfile) return;

		const internalVars: ItemHookInternalVariables = {
			currentTick: 0,
			isUsing: false,
		};

		const ctx: ItemHookContext = {
			player,
			slotIndex: player.selectedSlotIndex,
			itemStack: mainhandItem,
			get currentTick() {
				return internalVars.currentTick;
			},
			get isUsing() {
				return internalVars.isUsing;
			},
		};

		const handler = itemHookProfile.createHandler(ctx);

		itemHook = {
			ctx,
			handler,
			internalVars,
		};
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

import * as mc from "@minecraft/server";
import type { ItemSessionContext, ItemSessionHandler, ItemSessionHandlerFactory } from "./types";

type ItemSessionState = {
	currentTick: number;
	isUsing: boolean;
};

type ItemSession = {
	readonly ctx: ItemSessionContext;
	readonly handler: ItemSessionHandler;
	readonly state: ItemSessionState;
};

const sessionsByPlayer = new Map<mc.Player, ItemSession>();
const sessionHandlerFactoriesByItemType = new Map<string, ItemSessionHandlerFactory>();

export const registerItemSession = (itemType: string, factory: ItemSessionHandlerFactory): void => {
	if (sessionHandlerFactoriesByItemType.has(itemType)) {
		throw new Error(`Session already registered for the item type '${itemType}'`);
	}
	sessionHandlerFactoriesByItemType.set(itemType, factory);
};

const removeItemSession = (player: mc.Player, session?: ItemSession): void => {
	if (!session) session = sessionsByPlayer.get(player);
	sessionsByPlayer.delete(player);
	session?.handler.onRemove();
};

const onTickPlayer = (player: mc.Player): void => {
	// TODO
};

mc.system.runInterval(() => {
	const players = mc.world.getPlayers();
	for (let i = 0; i < players.length; i++) {
		onTickPlayer(players[i]!);
	}
}, 1);

mc.world.beforeEvents.playerLeave.subscribe((e) => {
	removeItemSession(e.player);
});

mc.system.beforeEvents.shutdown.subscribe(() => {
	try {
		const players = mc.world.getPlayers();
		for (let i = 0; i < players.length; i++) {
			removeItemSession(players[i]!);
		}
	} catch {}
});

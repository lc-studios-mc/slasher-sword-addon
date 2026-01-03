import * as mc from "@minecraft/server";
import type { ItemSessionConfig, ItemSessionContext, ItemSessionHandler } from "./types";

type ItemSessionState = {
	currentTick: number;
	isUsing: boolean;
};

type ItemSession = {
	readonly config: ItemSessionConfig;
	readonly ctx: ItemSessionContext;
	readonly handler: ItemSessionHandler;
	readonly state: ItemSessionState;
};

const sessionsByPlayer = new Map<mc.Player, ItemSession>();
const sessionConfigsByItemType = new Map<string, ItemSessionConfig>();

export const registerItemSession = (config: ItemSessionConfig): void => {
	if (sessionConfigsByItemType.has(config.itemType)) {
		throw new Error(`Session already registered for the item type '${config.itemType}'`);
	}
	sessionConfigsByItemType.set(config.itemType, config);
};

const stopSession = (player: mc.Player, session?: ItemSession): void => {
	if (!session) session = sessionsByPlayer.get(player);
	try {
		session?.handler.onStopSession();
	} finally {
		sessionsByPlayer.delete(player);
	}
};

const isSessionValid = (session: ItemSession, mainhandItem?: mc.ItemStack): boolean => {
	if (!session.ctx.actor.isValid) return false;
	if (!mainhandItem) return false;
	if (session.ctx.initialSlotIndex !== session.ctx.actor.selectedSlotIndex) return false;
	if (session.ctx.initialItemStack.typeId !== mainhandItem.typeId) return false;
	if (session.ctx.initialItemStack.nameTag !== mainhandItem.nameTag) return false;
	if (!session.handler.isValid(mainhandItem)) return false;
	return true;
};

const onTickPlayer = (player: mc.Player): void => {
	const healthComp = player.getComponent(mc.EntityComponentTypes.Health)!;
	const isAlive = healthComp.currentValue > 0;
	const equippableComp = player.getComponent(mc.EntityComponentTypes.Equippable)!;
	const mainhandItem = equippableComp.getEquipment(mc.EquipmentSlot.Mainhand);

	let session = sessionsByPlayer.get(player);

	const sessionActiveButInvalid = session && (!isAlive || !isSessionValid(session, mainhandItem));

	if (sessionActiveButInvalid) {
		stopSession(player, session);
		session = undefined;
	}

	if (!mainhandItem) return;

	const mainhandItemSessionConfig = sessionConfigsByItemType.get(mainhandItem.typeId);
	const shouldStartNewSession = isAlive && !session && mainhandItemSessionConfig;

	if (shouldStartNewSession) {
		const state: ItemSessionState = {
			currentTick: 0,
			isUsing: false,
		};

		const ctx: ItemSessionContext = {
			config: mainhandItemSessionConfig,
			actor: player,
			actorEquippable: equippableComp,
			actorHealth: healthComp,
			initialItemStack: mainhandItem,
			initialSlotIndex: player.selectedSlotIndex,
			currentTick: () => state.currentTick,
			isUsing: () => state.isUsing,
		};

		const handler = mainhandItemSessionConfig.createHandler(ctx);

		const newSession: ItemSession = {
			config: mainhandItemSessionConfig,
			ctx,
			handler,
			state,
		};
		session = newSession;

		sessionsByPlayer.set(player, newSession);
		handler.onStartSession();
	}

	if (!session) return;

	session.handler.onTick(mainhandItem);
	session.state.currentTick++;
};

mc.system.runInterval(() => {
	const players = mc.world.getPlayers();
	for (let i = 0; i < players.length; i++) {
		onTickPlayer(players[i]!);
	}
}, 1);

mc.system.beforeEvents.shutdown.subscribe(() => {
	try {
		const players = mc.world.getPlayers();
		for (let i = 0; i < players.length; i++) {
			stopSession(players[i]!);
		}
	} catch {}
});

mc.world.beforeEvents.playerLeave.subscribe((e) => {
	stopSession(e.player);
});

mc.world.afterEvents.itemStartUse.subscribe((e) => {
	const session = sessionsByPlayer.get(e.source);
	if (!session) return;
	if (!session.handler.canStartUseItem(e)) return;

	session.state.isUsing = true;
	session.handler.onStartUseItem(e);
});

mc.world.afterEvents.itemStopUse.subscribe((e) => {
	const session = sessionsByPlayer.get(e.source);
	if (!session) return;

	session.state.isUsing = false;
	session.handler.onStopUseItem(e);
});

mc.world.afterEvents.entityHealthChanged.subscribe((e) => {
	if (!(e.entity instanceof mc.Player)) return;

	const session = sessionsByPlayer.get(e.entity);
	if (!session) return;

	session.handler.onHealthChanged(e);
});

mc.world.afterEvents.entityDie.subscribe((e) => {
	if (!(e.deadEntity instanceof mc.Player)) return;

	const session = sessionsByPlayer.get(e.deadEntity);
	if (!session) return;

	session.handler.onDie(e);
});

mc.world.afterEvents.entityHurt.subscribe((e) => {
	if (!(e.hurtEntity instanceof mc.Player)) return;

	const session = sessionsByPlayer.get(e.hurtEntity);
	if (!session) return;

	session.handler.onHurt(e);
});

mc.world.afterEvents.entityHitBlock.subscribe((e) => {
	if (!(e.damagingEntity instanceof mc.Player)) return;

	const session = sessionsByPlayer.get(e.damagingEntity);
	if (!session) return;

	session.handler.onHitBlock(e);
});

mc.world.afterEvents.entityHitEntity.subscribe((e) => {
	if (!(e.damagingEntity instanceof mc.Player)) return;

	const session = sessionsByPlayer.get(e.damagingEntity);
	if (!session) return;

	session.handler.onHitEntity(e);
});

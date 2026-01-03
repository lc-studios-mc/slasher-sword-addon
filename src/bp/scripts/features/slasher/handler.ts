import { ItemSessionHandlerBase } from "@/core/item_session/handler_base";
import { registerItemSession } from "@/core/item_session/manager";
import type { ItemSessionContext } from "@/core/item_session/types";
import { ModifiedDamageCalculator } from "@mcbe-toolbox-lc/sukuriputils/server";
import * as mc from "@minecraft/server";
import type { SlasherStateBase } from "./states/base";
import { IdleState } from "./states/idle";
import { QuickSlashState } from "./states/quick_slash";

registerItemSession({
	itemType: "shr:slasher",
	createHandler: (ctx) => new SlasherHandler(ctx),
});

export class SlasherHandler extends ItemSessionHandlerBase {
	readonly stateClasses = {
		IdleState,
		QuickSlashState,
	} as const;
	readonly damageCalculator: ModifiedDamageCalculator;

	private currentState: SlasherStateBase;

	constructor(ctx: ItemSessionContext) {
		super(ctx);

		this.damageCalculator = new ModifiedDamageCalculator();

		// Initial state
		this.currentState = new this.stateClasses.IdleState(this);
		this.currentState.onEnter();
	}

	changeState(newState: SlasherStateBase): void {
		this.currentState.onExit();
		this.currentState = newState;
		this.currentState.onEnter();
	}

	startItemCooldown(category: string, duration = 2): void {
		this.actor.startItemCooldown(category, duration);
	}

	// Let the current state do work

	override onTick(currentItemStack: mc.ItemStack): void {
		this.currentState.tick(currentItemStack);
	}
	override canStartUseItem(e: mc.ItemStartUseAfterEvent): boolean {
		return this.currentState.canStartUseItem(e);
	}
	override onStartUseItem(e: mc.ItemStartUseAfterEvent): void {
		this.currentState.onStartUseItem(e);
	}
	override onStopUseItem(e: mc.ItemStopUseAfterEvent): void {
		this.currentState.onStopUseItem(e);
	}
	override onHealthChanged(e: mc.EntityHealthChangedAfterEvent): void {
		this.currentState.onHealthChanged(e);
	}
	override onDie(e: mc.EntityDieAfterEvent): void {
		this.currentState.onDie(e);
	}
	override onHurt(e: mc.EntityHurtAfterEvent): void {
		this.currentState.onHurt(e);
	}
	override onHitBlock(e: mc.EntityHitBlockAfterEvent): void {
		this.currentState.onHitBlock(e);
	}
	override onHitEntity(e: mc.EntityHitEntityAfterEvent): void {
		this.currentState.onHitEntity(e);
	}
}

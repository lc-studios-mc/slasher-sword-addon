import * as mc from "@minecraft/server";
import {
	ItemHookHandlerBase,
	registerItemHookProfile,
	type ItemHookContext,
} from "@/core/item_hook";
import { IdleState, type SlasherState } from "./states";

registerItemHookProfile({
	itemType: "slasher:slasher",
	createHandler: (ctx: ItemHookContext) => new SlasherHandler(ctx),
});

export class SlasherHandler extends ItemHookHandlerBase {
	private _state: SlasherState;

	constructor(ctx: ItemHookContext) {
		super(ctx);

		this._state = new IdleState(this);
		this._state.onEnter();
	}

	override onCreate(): void {
		this.startItemCooldown("slasher_pick");
	}

	override onTick(currentItem: mc.ItemStack): void {
		this._state.tick(currentItem);
	}

	override canUse(event: mc.ItemStartUseAfterEvent): boolean {
		return this._state.canUse(event);
	}

	override onStartUse(event: mc.ItemStartUseAfterEvent): void {
		this._state.onStartUse(event);
	}

	override onStopUse(event: mc.ItemStopUseAfterEvent): void {
		this._state.onStopUse(event);
	}

	override onHitBlock(event: mc.EntityHitBlockAfterEvent): void {
		this._state.onHitBlock(event);
	}

	override onHitEntity(event: mc.EntityHitEntityAfterEvent): void {
		this._state.onHitEntity(event);
	}

	changeState(newState: SlasherState): void {
		this._state?.onExit();
		this._state = newState;
		this._state.onEnter();
	}

	startItemCooldown(category: string, duration = 2): void {
		this.player.startItemCooldown(category, duration);
	}
}

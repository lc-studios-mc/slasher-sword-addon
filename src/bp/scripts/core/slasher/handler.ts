import * as mc from "@minecraft/server";
import {
	ItemHookHandlerBase,
	registerItemHookProfile,
	type ItemHookContext,
} from "@/core/item_hook";

registerItemHookProfile({
	itemType: "slasher:slasher",
	createHandler: (ctx: ItemHookContext) => new SlasherHandler(ctx),
});

class SlasherHandler extends ItemHookHandlerBase {
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

abstract class SlasherState {
	private _currentTick = 0;

	get currentTick(): number {
		return this._currentTick;
	}

	constructor(readonly s: SlasherHandler) {}

	onEnter(): void {}
	onExit(): void {}

	tick(currentItem: mc.ItemStack): void {
		this.onTick(currentItem);
		this._currentTick++;
	}

	onTick(currentItem: mc.ItemStack): void {}
	canUse(event: mc.ItemStartUseAfterEvent): boolean {
		return true;
	}
	onStartUse(event: mc.ItemStartUseAfterEvent): void {}
	onStopUse(event: mc.ItemStopUseAfterEvent): void {}
	onHitBlock(event: mc.EntityHitBlockAfterEvent): void {}
	onHitEntity(event: mc.EntityHitEntityAfterEvent): void {}
}

class IdleState extends SlasherState {}

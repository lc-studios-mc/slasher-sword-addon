import * as mc from "@minecraft/server";
import {
	ItemHookHandlerBase,
	registerItemHookProfile,
	type ItemHookContext,
} from "@/core/item_hook";
import { IdleState, type SlasherState } from "./states";
import { vec3 } from "gl-matrix";
import { GlVector3 } from "@/lib/vec";

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

	getFaceFrontLocation(): GlVector3 {
		const headLoc = GlVector3.fromObject(this.player.getHeadLocation());
		const viewDir = GlVector3.fromObject(this.player.getViewDirection());
		const faceFrontLoc = vec3.add(vec3.create(), headLoc.v, viewDir.v);
		return new GlVector3(faceFrontLoc);
	}

	playSound(opts: mc.PlayerSoundOptions & { soundId_2d?: string; soundId_3d?: string }): void {
		if (opts.soundId_2d !== undefined) {
			this.player.playSound(opts.soundId_2d, opts);
		}

		if (opts.soundId_3d === undefined) return;

		if (opts.soundId_2d === undefined) {
			this.dimension.playSound(opts.soundId_3d, opts.location ?? this.getFaceFrontLocation());
			return; // Only 3D sound ID is defined. Exit.
		}

		const playersInDim = this.dimension.getPlayers();

		for (const player of playersInDim) {
			if (player === this.player) continue;
			player.playSound(opts.soundId_3d, opts);
		}
	}
}

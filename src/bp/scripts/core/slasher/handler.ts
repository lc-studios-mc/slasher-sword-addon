import {
	ItemHookHandlerBase,
	registerItemHookProfile,
	type ItemHookContext,
} from "@/core/item_hook";
import { GlVector3 } from "@/lib/vec";
import * as mc from "@minecraft/server";
import { vec3 } from "gl-matrix";
import type { SlasherStateBase } from "./states/base";
import { ChargeState } from "./states/charge";
import { IdleState } from "./states/idle";
import { PowerSlashFinishState } from "./states/power_slash_finish";
import { PowerSlashInitState } from "./states/power_slash_init";
import { SawingState } from "./states/sawing";
import { SpeedSlashState } from "./states/speed_slash";
import {
	StormSlashFinishState,
	StormSlashStrikeState,
	StormSlashWindupState,
} from "./states/storm_slash";

registerItemHookProfile({
	itemType: "slasher:slasher",
	createHandler: (ctx: ItemHookContext) => new SlasherHandler(ctx),
});

export class SlasherHandler extends ItemHookHandlerBase {
	readonly stateClasses = {
		Idle: IdleState,
		SpeedSlash: SpeedSlashState,
		Charge: ChargeState,
		PowerSlashInit: PowerSlashInitState,
		PowerSlashFinish: PowerSlashFinishState,
		Sawing: SawingState,
		StormSlashWindup: StormSlashWindupState,
		StormSlashStrike: StormSlashStrikeState,
		StormSlashFinish: StormSlashFinishState,
	} as const;

	private currentState: SlasherStateBase;

	constructor(ctx: ItemHookContext) {
		super(ctx);

		this.currentState = new this.stateClasses.Idle(this);
		this.currentState.onEnter();
	}

	override onCreate(): void {
		this.startItemCooldown("slasher_pick");
	}

	override onTick(currentItem: mc.ItemStack): void {
		this.currentState.tick(currentItem);
	}

	override canUse(event: mc.ItemStartUseAfterEvent): boolean {
		return this.currentState.canUse(event);
	}

	override onStartUse(event: mc.ItemStartUseAfterEvent): void {
		this.currentState.onStartUse(event);
	}

	override onStopUse(event: mc.ItemStopUseAfterEvent): void {
		this.currentState.onStopUse(event);
	}

	override onHitBlock(event: mc.EntityHitBlockAfterEvent): void {
		this.currentState.onHitBlock(event);
	}

	override onHitEntity(event: mc.EntityHitEntityAfterEvent): void {
		this.currentState.onHitEntity(event);
	}

	changeState(newState: SlasherStateBase): void {
		this.currentState?.onExit();
		this.currentState = newState;
		this.currentState.onEnter();
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

	getBodyLocation(): GlVector3 {
		const location = GlVector3.fromObject(this.player.location);
		vec3.add(location.v, location.v, vec3.fromValues(0, 1, 0));
		return location;
	}

	playSound(opts: mc.PlayerSoundOptions & { soundId_2d?: string; soundId_3d?: string }): void {
		if (opts.soundId_2d !== undefined) {
			this.player.playSound(opts.soundId_2d, opts);
		}

		if (opts.soundId_3d === undefined) return;

		if (opts.soundId_2d === undefined) {
			this.dimension.playSound(opts.soundId_3d, opts.location ?? this.getFaceFrontLocation(), opts);
			return; // Only 3D sound ID is defined. Exit.
		}

		const playersInDim = this.dimension.getPlayers();

		for (const player of playersInDim) {
			if (player === this.player) continue;
			player.playSound(opts.soundId_3d, opts);
		}
	}

	shakeCamera(intensity: number, seconds: number, shakeType: "rotational" | "positional") {
		this.player.runCommand(
			`camerashake add @s ${intensity.toFixed(2)} ${seconds.toFixed(2)} ${shakeType}`,
		);
	}
}

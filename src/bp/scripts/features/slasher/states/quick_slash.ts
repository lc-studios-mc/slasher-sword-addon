import * as mc from "@minecraft/server";
import type { SlasherHandler } from "../handler";
import { SlasherStateBase } from "./base";
import { addCameraShake, getEntityForwardLocation } from "@mcbe-toolbox-lc/sukuriputils/server";
import { randomFloat } from "@mcbe-toolbox-lc/sukuriputils/math";

export class QuickSlashState extends SlasherStateBase {
	private ticksUntilExit = 15;

	constructor(
		slasher: SlasherHandler,
		private animIndex = 0,
	) {
		super(slasher);

		this.slasher.clearItemCooldown("slasher_cd_pick");

		if (animIndex === 0) {
			this.slasher.startItemCooldown("slasher_quick_slash_1", 5);
			this.slasher.clearItemCooldown("slasher_quick_slash_2");
		} else if (animIndex === 1) {
			this.slasher.startItemCooldown("slasher_quick_slash_2", 5);
			this.slasher.clearItemCooldown("slasher_quick_slash_1");
		} else {
			throw new Error(`Invalid quick slash animation index: ${animIndex}`);
		}

		addCameraShake(this.slasher.actor, 0.03, 0.08, "rotational");

		this.slasher.dimension.playSound(
			"shr.slasher.quick_slash",
			getEntityForwardLocation(this.slasher.actor),
			{
				pitch: randomFloat(0.95, 1.1),
				volume: 1.1,
			},
		);

		// TODO: Sweep damage

		// TODO: Shoot arc
	}

	protected override onTick(_currentItemStack: mc.ItemStack): void {
		if (this.ticksUntilExit > 0) {
			this.ticksUntilExit--;
			return;
		}

		this.slasher.changeState(new this.slasher.stateClasses.IdleState(this.slasher));
	}

	override onHitBlock(_e: mc.EntityHitBlockAfterEvent): void {
		this.redo();
	}

	override onHitEntity(_e: mc.EntityHitEntityAfterEvent): void {
		this.redo();
	}

	private redo(): void {
		const newAnimIndex = this.animIndex === 0 ? 1 : 0;
		this.slasher.changeState(
			new this.slasher.stateClasses.QuickSlashState(this.slasher, newAnimIndex),
		);
	}
}

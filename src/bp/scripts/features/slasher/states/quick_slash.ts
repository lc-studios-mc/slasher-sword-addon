import * as mc from "@minecraft/server";
import type { SlasherHandler } from "../handler";
import { SlasherStateBase } from "./base";

export class QuickSlashState extends SlasherStateBase {
	constructor(
		slasher: SlasherHandler,
		private animIndex = 0,
	) {
		super(slasher);

		if (animIndex === 0) {
			this.slasher.startItemCooldown("slasher_quick_slash_1");
		} else if (animIndex === 1) {
			this.slasher.startItemCooldown("slasher_quick_slash_2");
		} else {
			throw new Error(`Invalid quick slash animation index: ${animIndex}`);
		}
	}

	override onHitBlock(e: mc.EntityHitBlockAfterEvent): void {
		this.redo();
	}

	override onHitEntity(e: mc.EntityHitEntityAfterEvent): void {
		this.redo();
	}

	private redo(): void {
		const newAnimIndex = this.animIndex === 0 ? 1 : 0;
		this.slasher.changeState(
			new this.slasher.stateClasses.QuickSlashState(this.slasher, newAnimIndex),
		);
	}
}

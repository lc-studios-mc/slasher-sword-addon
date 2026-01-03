import * as mc from "@minecraft/server";
import type { SlasherHandler } from "../handler";
import { SlasherStateBase } from "./base";

export class IdleState extends SlasherStateBase {
	constructor(slasher: SlasherHandler) {
		super(slasher);

		this.slasher.startItemCooldown("slasher_pick");
	}

	override onHitBlock(e: mc.EntityHitBlockAfterEvent): void {
		this.quickSlash();
	}

	override onHitEntity(e: mc.EntityHitEntityAfterEvent): void {
		this.quickSlash();
	}

	private quickSlash(): void {
		this.slasher.changeState(new this.slasher.stateClasses.QuickSlashState(this.slasher));
	}
}

import * as mc from "@minecraft/server";
import type { SlasherHandler } from "../handler";
import { SlasherStateBase } from "./base";

const ALLOW_NEXT_ACTION_THRESHOLD = 5;

export class HeaveSlashFinishState extends SlasherStateBase {
	private ticksUntilExit = 15;

	constructor(
		slasher: SlasherHandler,
		private targets: mc.Entity[] = [],
	) {
		super(slasher);

		this.slasher.actor.addEffect("weakness", 5, { amplifier: 255, showParticles: false });

		if (targets.length <= 0) {
			this.slasher.startItemCooldown("slasher_heave_slash_miss");
			return;
		}

		this.slasher.startItemCooldown("slasher_heave_slash_hit");
	}

	protected override onTick(_currentItemStack: mc.ItemStack): void {
		if (this.slasher.isUsing && this.currentTick >= ALLOW_NEXT_ACTION_THRESHOLD) {
			this.slasher.changeState(new this.slasher.stateClasses.ChargingState(this.slasher));
			return;
		}

		if (this.ticksUntilExit > 0) {
			this.ticksUntilExit--;
			return;
		}

		this.slasher.changeState(new this.slasher.stateClasses.IdleState(this.slasher));
	}

	override onHitBlock(_e: mc.EntityHitBlockAfterEvent): void {
		if (this.currentTick >= ALLOW_NEXT_ACTION_THRESHOLD) {
			this.quickSlash();
		}
	}

	override onHitEntity(_e: mc.EntityHitEntityAfterEvent): void {
		if (this.currentTick >= ALLOW_NEXT_ACTION_THRESHOLD) {
			this.quickSlash();
		}
	}

	private quickSlash(): void {
		this.slasher.changeState(new this.slasher.stateClasses.QuickSlashState(this.slasher, 1));
	}
}

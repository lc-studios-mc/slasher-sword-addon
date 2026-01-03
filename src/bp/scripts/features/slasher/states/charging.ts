import * as mc from "@minecraft/server";
import type { SlasherHandler } from "../handler";
import { SlasherStateBase } from "./base";
import { getEntityForwardLocation } from "@mcbe-toolbox-lc/sukuriputils/server";

const FULL_CHARGE_THRESHOLD = 10;
const MIN_TICK_TO_START_SOUNDS = 1;

export class ChargingState extends SlasherStateBase {
	constructor(slasher: SlasherHandler) {
		super(slasher);

		this.slasher.startItemCooldown("slasher_charge");
	}

	protected override onTick(_currentItemStack: mc.ItemStack): void {
		if (!this.slasher.isUsing) {
			this.release();
			return;
		}

		this.updateChargingSounds();
	}

	override onStopUseItem(e: mc.ItemStopUseAfterEvent): void {
		this.release();
	}

	private updateChargingSounds(): void {
		if (this.currentTick < MIN_TICK_TO_START_SOUNDS) return;

		if (this.currentTick - MIN_TICK_TO_START_SOUNDS === 0) {
			this.slasher.dimension.playSound(
				"shr.slasher.charging.start",
				getEntityForwardLocation(this.slasher.actor),
				{
					volume: 1.1,
				},
			);
		} else if (this.currentTick % 7 === 0) {
			this.slasher.dimension.playSound(
				"shr.slasher.charging.loop",
				getEntityForwardLocation(this.slasher.actor),
				{
					volume: 1.1,
				},
			);
		}

		if (this.currentTick === FULL_CHARGE_THRESHOLD - 1) {
			this.slasher.actor.playSound("shr.slasher.charging.complete");
		}
	}

	private release(): void {
		if (this.currentTick < FULL_CHARGE_THRESHOLD) {
			this.slasher.clearItemCooldown("slasher_charge");
			this.slasher.changeState(new this.slasher.stateClasses.QuickSlashState(this.slasher));
			return;
		}

		this.slasher.changeState(new this.slasher.stateClasses.HeaveSlashInitState(this.slasher));
	}
}

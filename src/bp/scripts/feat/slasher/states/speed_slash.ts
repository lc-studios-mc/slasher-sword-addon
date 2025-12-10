import { randomFloat } from "@mcbe-toolbox-lc/sukuriputils/math";
import * as mc from "@minecraft/server";
import type { SlasherHandler } from "../handler";
import { SlasherStateBase } from "./base";

export class SpeedSlashState extends SlasherStateBase {
	private ticksUntilExit = 10;

	constructor(
		s: SlasherHandler,
		readonly animIndex: 0 | 1,
	) {
		super(s);
	}

	override onEnter(): void {
		if (this.animIndex === 0) {
			this.s.startItemCooldown("slasher_speed_slash_2", 0);
			this.s.startItemCooldown("slasher_speed_slash_1", this.ticksUntilExit);
		} else if (this.animIndex === 1) {
			this.s.startItemCooldown("slasher_speed_slash_1", 0);
			this.s.startItemCooldown("slasher_speed_slash_2", this.ticksUntilExit);
		}

		this.s.playSound({
			soundId_3d: "slasher.speed_slash",
			pitch: randomFloat(0.96, 1.1),
		});
	}

	override onTick(_currentItem: mc.ItemStack): void {
		if (this.ticksUntilExit > 0) {
			this.ticksUntilExit--;
		} else if (this.s.isUsing) {
			this.s.changeState(new this.s.stateClasses.Charge(this.s));
		} else {
			this.s.startItemCooldown("slasher_pick");
			this.s.changeState(new this.s.stateClasses.Idle(this.s));
		}
	}

	override onStopUse(_event: mc.ItemStopUseAfterEvent): void {
		this.restart();
	}

	override onHitBlock(_event: mc.EntityHitBlockAfterEvent): void {
		this.restart();
	}

	override onHitEntity(_event: mc.EntityHitEntityAfterEvent): void {
		this.restart();
	}

	private restart(): void {
		this.s.changeState(new SpeedSlashState(this.s, this.animIndex === 0 ? 1 : 0));
	}
}

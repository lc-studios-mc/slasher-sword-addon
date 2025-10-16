import * as mc from "@minecraft/server";
import { SlasherStateBase } from "./base";

export class ChargeState extends SlasherStateBase {
	private readonly actionbarFrames_progress = [
		"§c>     X     <",
		"§c>    X    <",
		"§c>   X   <",
		"§c>  X  <",
		"§c> X <",
	] as const;

	private readonly actionbarFrames_completed = [
		// Flashy
		"§b>X<",
		"§e>X<",
	] as const;

	private ticksUntilCompleteCharge = 6; // Charge duration
	private ticksUntilNextChargeSoundLoop = 1;

	override onEnter(): void {
		this.s.startItemCooldown("slasher_charge", 4);
	}

	override onTick(_currentItem: mc.ItemStack): void {
		// Main charge logic
		if (this.ticksUntilCompleteCharge > 0) {
			this.ticksUntilCompleteCharge--;
		}
		if (!this.s.isUsing) {
			this.releaseOrCancel();
			return;
		}

		// Sound
		if (this.ticksUntilNextChargeSoundLoop > 0) {
			this.ticksUntilNextChargeSoundLoop--;
		} else {
			this.s.playSound({ soundId_3d: "slasher.charge_loop" });
			this.ticksUntilNextChargeSoundLoop = 7;
		}

		// Actionbar frames
		if (this.ticksUntilCompleteCharge > 0) {
			this.s.player.onScreenDisplay.setActionBar(
				this.actionbarFrames_progress[this.currentTick % this.actionbarFrames_progress.length]!,
			);
		} else {
			this.s.player.onScreenDisplay.setActionBar(
				this.actionbarFrames_completed[this.currentTick % this.actionbarFrames_completed.length]!,
			);
		}
	}

	override onStopUse(_event: mc.ItemStopUseAfterEvent): void {
		if (!this.s.isUsing) {
			this.releaseOrCancel();
		}
	}

	private releaseOrCancel(): void {
		this.s.startItemCooldown("slasher_charge", 0);

		if (this.ticksUntilCompleteCharge <= 0) {
			this.s.player.onScreenDisplay.setActionBar("§c< X >");
			this.s.changeState(new this.s.stateClasses.PowerSlashInit(this.s));
			return;
		}

		// On cancel
		this.s.player.onScreenDisplay.setActionBar("§8---");
		this.s.changeState(new this.s.stateClasses.SpeedSlash(this.s, 0)); // Player can spam speed slash by rapidly clicking RMB
	}
}

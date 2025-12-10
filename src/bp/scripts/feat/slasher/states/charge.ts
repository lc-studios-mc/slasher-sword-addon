import * as mc from "@minecraft/server";
import { SlasherStateBase } from "./base";

const ACTIONBAR_FRAMES = {
	POWER_SLASH: {
		PROGRESS: [
			//
			"§c>     X     <",
			"§c>    X    <",
			"§c>   X   <",
			"§c>  X  <",
			"§c> X <",
			"§c>X<",
		],
		COMPLETED: [
			//
			"§b>X<",
			"§e>X<",
		],
	},
	STORM_SLASH: {
		PROGRESS: [
			"§c>               >X<               <",
			"§c>              >X<              <",
			"§c>             >X<             <",
			"§c>            >X<            <",
			"§c>           >X<           <",
			"§c>          >X<          <",
			"§c>         >X<         <",
			"§c>        >X<        <",
			"§c>       >X<       <",
			"§c>      >X<      <",
			"§c>     >X<     <",
			"§c>    >X<    <",
			"§c>   >X<   <",
			"§c>  >X<  <",
			"§c> >X< <",
			"§c>>X<<",
		],
		COMPLETED: [
			//
			"§l§b>>X<<",
			"§l§d>>X<<",
			"§l§e>>X<<",
		],
	},
} as const;

export class ChargeState extends SlasherStateBase {
	private readonly powerSlashChargeDuration = 6;
	private readonly stormSlashChargeDuration = 30;

	private chargedTick = 0;
	private chargingStormSlash = false;
	private ticksUntilNextChargeSoundLoop = 1;

	override onEnter(): void {
		if (this.s.player.isGliding) {
			this.chargingStormSlash = true;
		}

		this.s.startItemCooldown("slasher_charge", 4);
	}

	override onTick(_currentItem: mc.ItemStack): void {
		if (this.chargingStormSlash && !this.s.player.isGliding) {
			this.chargingStormSlash = false;
		}

		this.chargedTick++;

		if (!this.s.isUsing) {
			this.releaseOrCancel();
			return;
		}

		if (this.chargingStormSlash && this.chargedTick === this.stormSlashChargeDuration - 1) {
			this.s.playSound({ soundId_2d: "slasher.charged_storm_slash" });
			this.s.startItemCooldown("slasher_charge_dash");
		}

		this.updateChargeLoopSound();
		this.updateActionbar();
	}

	override onStopUse(_event: mc.ItemStopUseAfterEvent): void {
		if (!this.s.isUsing) {
			this.releaseOrCancel();
		}
	}

	private updateChargeLoopSound(): void {
		if (this.ticksUntilNextChargeSoundLoop > 0) {
			this.ticksUntilNextChargeSoundLoop--;
		} else {
			this.s.playSound({ soundId_3d: "slasher.charge_loop" });
			this.ticksUntilNextChargeSoundLoop = 7;
		}
	}

	private updateActionbar(): void {
		const frame = this.getAppropriateActionbarFrame();
		this.s.player.onScreenDisplay.setActionBar(frame);
	}

	private getAppropriateActionbarFrame(): string {
		if (this.chargedTick < this.powerSlashChargeDuration) {
			return ACTIONBAR_FRAMES.POWER_SLASH.PROGRESS[this.chargedTick]!;
		}

		if (this.chargingStormSlash) {
			if (this.chargedTick < this.stormSlashChargeDuration) {
				const index = Math.min(
					ACTIONBAR_FRAMES.STORM_SLASH.PROGRESS.length - 1,
					Math.floor(
						(this.currentTick / this.stormSlashChargeDuration) *
							ACTIONBAR_FRAMES.STORM_SLASH.PROGRESS.length,
					),
				);
				return ACTIONBAR_FRAMES.STORM_SLASH.PROGRESS[index]!;
			} else {
				return ACTIONBAR_FRAMES.STORM_SLASH.COMPLETED[
					this.chargedTick % ACTIONBAR_FRAMES.STORM_SLASH.COMPLETED.length
				]!;
			}
		}

		return ACTIONBAR_FRAMES.POWER_SLASH.COMPLETED[
			this.chargedTick % ACTIONBAR_FRAMES.POWER_SLASH.COMPLETED.length
		]!;
	}

	private releaseOrCancel(): void {
		this.s.startItemCooldown("slasher_charge", 0);

		if (this.chargingStormSlash && this.currentTick >= this.stormSlashChargeDuration) {
			this.s.player.onScreenDisplay.setActionBar("§l§c< < X > >");
			this.s.changeState(new this.s.stateClasses.StormSlashWindup(this.s));
			return;
		}

		if (this.currentTick >= this.powerSlashChargeDuration) {
			this.s.player.onScreenDisplay.setActionBar("§c< X >");
			this.s.changeState(new this.s.stateClasses.PowerSlashInit(this.s));
			return;
		}

		// On cancel
		this.s.player.onScreenDisplay.setActionBar("§8---");
		this.s.changeState(new this.s.stateClasses.SpeedSlash(this.s, 0)); // Player can spam speed slash by rapidly clicking RMB
	}
}

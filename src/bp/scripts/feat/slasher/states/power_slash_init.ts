import { canHurtEntity, isVisibleTo } from "@/lib/entity_utils";
import { calculateRelativeLocation, changeDir, generateLinePoints } from "@/lib/vector_utils";
import { randomFloat } from "@mcbe-toolbox-lc/sukuriputils/math";
import * as v from "@mcbe-toolbox-lc/vecarr";
import * as mc from "@minecraft/server";
import { vec3 } from "gl-matrix";
import { testDashInput, testSawingInput } from "../input";
import { SlasherStateBase } from "./base";

export class PowerSlashInitState extends SlasherStateBase {
	private attackNextTick = false;
	private ticksUntilDashFinish = -1;
	private bodyLocationPreDashFinish?: v.HybridVec3;

	override onEnter(): void {
		if (!testDashInput(this.s.player)) {
			this.preAttack();
		} else {
			this.dash();
		}
	}

	override onTick(_currentItem: mc.ItemStack): void {
		if (this.ticksUntilDashFinish > 0) {
			if (this.ticksUntilDashFinish === 1) {
				this.bodyLocationPreDashFinish = this.s.getBodyLocation();
			}
			this.ticksUntilDashFinish--;
		} else if (this.ticksUntilDashFinish === 0) {
			this.ticksUntilDashFinish = -1;
			this.preAttack();
		}

		if (this.attackNextTick) {
			this.attackNextTick = false;
			this.attack();
		}
	}

	private dash(): void {
		this.s.startItemCooldown("slasher_charge_dash");

		this.s.playSound({
			soundId_2d: "slasher.dash.2d",
			soundId_3d: "slasher.dash",
			location: this.s.player.location,
			volume: 1.5,
			pitch: randomFloat(0.96, 1.04),
		});

		this.s.shakeCamera(0.04, 0.04, "rotational");

		this.ticksUntilDashFinish = this.s.player.isOnGround ? 2 : 3;

		const dashImpulse = this.createDashImpulseVector();
		this.s.player.applyImpulse(dashImpulse);
	}

	private preAttack(): void {
		this.attackNextTick = true;

		this.s.startItemCooldown("slasher_power_slash_start");

		this.s.playSound({
			soundId_2d: "slasher.power_slash.2d",
			soundId_3d: "slasher.power_slash",
			location: this.s.player.location,
			volume: 1.5,
			pitch: randomFloat(0.95, 1.05),
		});

		this.s.shakeCamera(0.05, 0.08, "rotational");
	}

	private attack(): void {
		const targets = this.getTargets();

		const shouldStartSawing = targets.length > 0 && testSawingInput(this.s.player);

		if (shouldStartSawing) {
			this.s.changeState(new this.s.stateClasses.Sawing(this.s, targets));
			return;
		}

		this.s.changeState(new this.s.stateClasses.PowerSlashFinish(this.s, targets));
	}

	// Helper methods

	private createDashImpulseVector(): v.HybridVec3 {
		const viewDir = new v.HybridVec3(this.s.player.getViewDirection());
		const impulse = vec3.fromValues(0, 0, 1);

		changeDir(impulse, impulse, viewDir);

		if (this.s.player.isOnGround) {
			// Kill vertical force when on ground
			vec3.mul(impulse, impulse, vec3.fromValues(1, 0, 1));
			vec3.normalize(impulse, impulse);
		}

		const impulseScalar = this.s.player.isOnGround ? 5 : this.s.player.isGliding ? 1.7 : 2.33;
		vec3.scale(impulse, impulse, impulseScalar);

		return new v.HybridVec3(impulse);
	}

	private getTargets(): mc.Entity[] {
		const headLoc = v.toArr3(this.s.player.getHeadLocation());
		const viewDir = v.toArr3(this.s.player.getViewDirection());

		const searchLocations: vec3[] = [
			calculateRelativeLocation(vec3.create(), headLoc, viewDir, [0, 0.4, 1.2]),
			calculateRelativeLocation(vec3.create(), headLoc, viewDir, [0, -1, 1.3]),
			calculateRelativeLocation(vec3.create(), headLoc, viewDir, [0, 0.1, 1.5]),
			calculateRelativeLocation(vec3.create(), headLoc, viewDir, [0, 0.1, 3.1]),
			calculateRelativeLocation(vec3.create(), headLoc, viewDir, [0, -1, 2.9]),
		];

		const isMoving = vec3.len(v.toArr3(this.s.player.getVelocity())) > 0.1;

		// Additional search locations to make it easier to hit attacks after dashing
		if (isMoving && this.bodyLocationPreDashFinish) {
			const start = this.bodyLocationPreDashFinish;
			const end = v.toArr3(this.s.getBodyLocation());
			const count = Math.max(4, Math.round(vec3.dist(start, end) * 1.5));
			const linePoints = generateLinePoints(start, end, count);

			searchLocations.push(...linePoints);
		}

		const targetCandidates = new Set<mc.Entity>();

		for (const location of searchLocations) {
			const entities = this.s.dimension.getEntities({
				location: v.toObj3(location),
				closest: 10,
				maxDistance: 2.5,
				excludeTypes: ["minecraft:item", "minecraft:xp_orb"],
				excludeFamilies: ["ignore_slasher_attack"],
			});

			for (const entity of entities) {
				targetCandidates.add(entity);
			}
		}

		const targets: mc.Entity[] = [];

		for (const entity of targetCandidates) {
			if (!canHurtEntity(this.s.player, entity)) continue;

			const dist = vec3.dist(v.toArr3(this.s.player.location), v.toArr3(entity.location));

			if (dist > 1.5 && !isVisibleTo(this.s.player, entity)) continue;

			targets.push(entity);
		}

		return targets;
	}
}

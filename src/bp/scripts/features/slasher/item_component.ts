import * as mc from "@minecraft/server";

mc.system.beforeEvents.startup.subscribe((e) => {
	e.itemComponentRegistry.registerCustomComponent("shr:slasher", {
		onBeforeDurabilityDamage(arg) {
			arg.durabilityDamage = 0; // Don't interfere the custom durability handling
		},
	});
});

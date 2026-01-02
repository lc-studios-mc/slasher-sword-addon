import * as mc from "@minecraft/server";

mc.system.beforeEvents.startup.subscribe((e) => {
	e.itemComponentRegistry.registerCustomComponent("shr:slasher", {
		onBeforeDurabilityDamage(arg) {
			arg.durabilityDamage = 0; // Don't interfere the custom durability handling
		},
	});
});

mc.system.beforeEvents.startup.subscribe((e) => {
	e.itemComponentRegistry.registerCustomComponent("shr:slasher_power_cell", {
		onUse({ source, itemStack }) {
			if (!source) return;

			const equippable = source.getComponent("equippable")!;
			const mainhandItem = equippable.getEquipment(mc.EquipmentSlot.Mainhand);
			const offhandItem = equippable.getEquipment(mc.EquipmentSlot.Offhand);

			if (mainhandItem?.type !== itemStack?.type) return;

			equippable.setEquipment(mc.EquipmentSlot.Offhand, itemStack);
			equippable.setEquipment(mc.EquipmentSlot.Mainhand, offhandItem);
		},
	});
});

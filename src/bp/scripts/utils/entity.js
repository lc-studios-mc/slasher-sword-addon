import { Entity, EquipmentSlot, Player } from "@minecraft/server";

/**
 * Checks if the entity is dead.
 * @param {import("@minecraft/server").Entity} entity The entity.
 * @returns {boolean} Whether the current health of the entity is less or equal than 0.
 */
export function isEntityDead(entity) {
  try {
    const healthComponent = entity.getComponent("health");
    if (!healthComponent) return false;
    return healthComponent.currentValue <= 0;
  } catch {
    return false;
  }
}

/**
 * Gets what would be the name of the entity, in this order: `Player name > Name tag > Translated type ID`.
 * @param {import("@minecraft/server").Entity | string} entity Entity object or type ID string.
 * @returns {import("@minecraft/server").RawText} RawText object.
 */
export function getEntityName(entity) {
  if (typeof entity === "string") {
    return getTranslatedEntityTypeId(entity);
  }

  try {
    if (entity instanceof Entity) {
      if (entity.nameTag.trim() !== "") {
        return { rawtext: [{ text: entity.nameTag }] };
      }

      if (entity instanceof Player) {
        return { rawtext: [{ text: entity.name }] };
      }

      return getTranslatedEntityTypeId(entity.typeId);
    }

    return { rawtext: [{ text: "Unknown" }] };
  } catch {
    return { rawtext: [{ text: "Unknown" }] };
  }
}

/**
 * @param {string} typeId
 * @returns {import("@minecraft/server").RawText}
 */
function getTranslatedEntityTypeId(typeId) {
  const namespace = typeId.split(":")[0];
  const entityTypeId =
    namespace === "minecraft" ? typeId.replace("minecraft:", "") : typeId;

  return { rawtext: [{ translate: `entity.${entityTypeId}.name` }] };
}

/**
 * @typedef {Record<string, { armor: number, toughness: number }>} ArmorValues
 */

const VANILLA_ARMOR_VALUES = /** @type {ArmorValues} */ ({
  // Helmets
  "minecraft:leather_helmet": { armor: 1, toughness: 0 },
  "minecraft:golden_helmet": { armor: 2, toughness: 0 },
  "minecraft:chainmail_helmet": { armor: 2, toughness: 0 },
  "minecraft:iron_helmet": { armor: 2, toughness: 0 },
  "minecraft:turtle_helmet": { armor: 2, toughness: 0 },
  "minecraft:diamond_helmet": { armor: 3, toughness: 2 },
  "minecraft:netherite_helmet": { armor: 3, toughness: 3 },

  // Chestplates
  "minecraft:leather_chestplate": { armor: 3, toughness: 0 },
  "minecraft:golden_chestplate": { armor: 5, toughness: 0 },
  "minecraft:chainmail_chestplate": { armor: 5, toughness: 0 },
  "minecraft:iron_chestplate": { armor: 6, toughness: 0 },
  "minecraft:diamond_chestplate": { armor: 8, toughness: 2 },
  "minecraft:netherite_chestplate": { armor: 8, toughness: 3 },

  // Leggings
  "minecraft:leather_leggings": { armor: 2, toughness: 0 },
  "minecraft:golden_leggings": { armor: 3, toughness: 0 },
  "minecraft:chainmail_leggings": { armor: 4, toughness: 0 },
  "minecraft:iron_leggings": { armor: 5, toughness: 0 },
  "minecraft:diamond_leggings": { armor: 6, toughness: 2 },
  "minecraft:netherite_leggings": { armor: 6, toughness: 3 },

  // Boots
  "minecraft:leather_boots": { armor: 1, toughness: 0 },
  "minecraft:golden_boots": { armor: 1, toughness: 0 },
  "minecraft:chainmail_boots": { armor: 1, toughness: 0 },
  "minecraft:iron_boots": { armor: 2, toughness: 0 },
  "minecraft:diamond_boots": { armor: 3, toughness: 2 },
  "minecraft:netherite_boots": { armor: 3, toughness: 3 },
});

/**
 * Calculates the final damage after applying armor reduction and the Protection enchantment bonus,
 * following Minecraft's mechanics as detailed on the Minecraft Wiki: https://minecraft.wiki/w/Armor#Damage_reduction
 *
 * @param {number} damage The initial damage value.
 * @param {import("@minecraft/server").Entity} entity The entity receiving damage.
 * @param {ArmorValues} [customArmorValues] Override or define armor values.
 * @returns {number} The final damage after applying damage reductions.
 */
export function calculateFinalDamage(damage, entity, customArmorValues) {
  if (damage <= 0) return 0;

  let equippable;
  try {
    equippable = entity.getComponent("equippable");
    if (!equippable) return damage;
  } catch {
    return damage;
  }

  const armorValues =
    typeof customArmorValues !== "object"
      ? VANILLA_ARMOR_VALUES
      : Object.assign(VANILLA_ARMOR_VALUES, customArmorValues);

  const slots = [
    EquipmentSlot.Head,
    EquipmentSlot.Chest,
    EquipmentSlot.Legs,
    EquipmentSlot.Feet,
  ];

  let totalArmor = 0;
  let totalToughness = 0;
  let totalProtection = 0;

  for (const slot of slots) {
    const equipment = equippable.getEquipment(slot);
    if (!equipment) continue;

    // Add armor points and toughness if the item is recognized.
    const stats = armorValues[equipment.typeId];
    if (stats) {
      totalArmor += stats.armor;
      totalToughness += stats.toughness;
    }

    try {
      // Retrieve the protection enchantment level from the equipment, if present.
      const enchantable = equipment.getComponent("enchantable");
      if (enchantable) {
        // Only consider the "protection" enchantment.
        const protLevel = enchantable.getEnchantment("protection")?.level || 0;
        totalProtection += protLevel;
      }
    } catch {
      continue;
    }
  }

  // Armor Reduction
  const armorReductionFactor =
    Math.min(
      20,
      Math.max(totalArmor / 5, totalArmor - damage / (2 + totalToughness / 4)),
    ) / 25;
  const damageAfterArmor = damage * (1 - armorReductionFactor);

  // Protection Enchantment Reduction
  const protectionReduction = Math.min(totalProtection * 0.04, 0.8);
  const finalDamage = damageAfterArmor * (1 - protectionReduction);

  return Math.max(0, Math.floor(finalDamage));
}

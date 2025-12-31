/** @typedef {import("./item_extender.js").CreateFn} CreateFn */
/** @typedef {import("./item_extender.js").ItemExtenderProfile} ItemExtenderProfile */

const PROFILE_MAP = /** @type {Map<string, ItemExtenderProfile>} */ (new Map());

export const ITEM_EXTENDER_PROFILE_MAP =
  /** @type {ReadonlyMap<string, ItemExtenderProfile>} */ (PROFILE_MAP);

/**
 * Registers an item extender for an item type.
 * @param {string} itemTypeId - The type ID of the item that will be extended.
 * @param {CreateFn} createFn - The function that will be used to create an {@link ItemExtender} instance.
 */
export function registerItemExtender(itemTypeId, createFn) {
  PROFILE_MAP.set(itemTypeId, {
    typeId: itemTypeId,
    create: createFn,
  });
}

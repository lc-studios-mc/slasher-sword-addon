import * as mc from "@minecraft/server";

/**
 * @typedef {(args: Args) => ItemExtender} CreateFn
 */

/**
 * @typedef {Object} ItemExtenderProfile
 * @property {string} typeId
 * @property {CreateFn} create
 */

/**
 * @typedef {Object} ArgsBase
 * @property {ItemExtenderProfile} profile
 * @property {number} initialHotbarIndex
 * @property {mc.ItemStack} initialItemStack
 * @property {() => number} currentTick
 * @property {() => boolean} isUsing
 */

/**
 * @typedef {Object} ArgsUserRelated
 * @property {mc.Player} user
 * @property {mc.EntityEquippableComponent} userEquippable
 * @property {mc.EntityHealthComponent} userHealth
 * @property {mc.ContainerSlot} userMainhandSlot
 * @property {mc.ContainerSlot} userOffhandSlot
 */

/**
 * @typedef {ArgsUserRelated & ArgsBase} Args
 */

/**
 * Base class for all item extenders.
 */
export class ItemExtender {
  /**
   * @param {Args} args
   */
  constructor(args) {
    /** @readonly */ this.profile = args.profile;
    /** @readonly */ this.user = args.user;
    /** @readonly */ this.userEquippable = args.userEquippable;
    /** @readonly */ this.userHealth = args.userHealth;
    /** @readonly */ this.userMainhandSlot = args.userMainhandSlot;
    /** @readonly */ this.userOffhandSlot = args.userOffhandSlot;
    /** @readonly */ this.initialHotbarIndex = args.initialHotbarIndex;
    /** @readonly */ this.initialItemStack = args.initialItemStack;
    /** @readonly @private */ this._currentTick = args.currentTick;
    /** @readonly @private */ this._isUsing = args.isUsing;
  }

  /**
   * How many ticks have elapsed since this item extender instance is created.
   * @returns {number}
   */
  get currentTick() {
    this.profile;
    return this._currentTick();
  }

  /**
   * Whether the item is being used right now.
   * @returns {boolean}
   */
  get isUsing() {
    return this._isUsing();
  }

  /**
   * Whether this item extender is valid.
   * @param {mc.ItemStack} [currentItemStack] - ItemStack to compare to. Defaults to the latest ItemStack in the user's mainhand slot.
   * @returns {boolean}
   */
  isValid(currentItemStack) {
    if (!this.user.isValid()) return false;
    if (!this.userMainhandSlot.isValid()) return false;

    if (this.user.selectedSlotIndex !== this.initialHotbarIndex) return false;

    let itemStack = currentItemStack;

    if (!itemStack) {
      itemStack = this.userMainhandSlot.getItem();
      if (!itemStack) return false;
    }

    return this.profile.typeId === itemStack.typeId;
  }

  /**
   * Called when this item extender is created.
   * @returns {void}
   */
  onCreate() {}

  /**
   * Called on every tick as long as this item extender is valid.
   * @param {mc.ItemStack} itemStack - Latest ItemStack in the user's mainhand slot.
   * @returns {void}
   */
  onTick(itemStack) {}

  /**
   * Override this method to add conditions to whether this item is usable.
   * @param {mc.ItemStartUseAfterEvent} event
   * @returns {boolean}
   */
  isUsable(event) {
    return true;
  }

  /**
   * Called when the item is first used.
   * To check for ongoing usage, access `isUsing` within `onTick`.
   * @param {mc.ItemStartUseAfterEvent} event
   * @returns {void}
   */
  onStartUsing(event) {}

  /**
   * Called when the user stopped using the item.
   * @param {mc.ItemStopUseAfterEvent} event
   * @returns {void}
   */
  onStopUsing(event) {}

  /**
   * Called when the user hits an entity using the item.
   * @param {mc.EntityHitEntityAfterEvent} event
   * @returns {void}
   */
  onHitEntity(event) {}

  /**
   * Called when the user hits a block using the item.
   * @param {mc.EntityHitBlockAfterEvent} event
   * @returns {void}
   */
  onHitBlock(event) {}

  /**
   * Called **after** this item extender is no longer valid, and removed.
   * @returns {void}
   */
  onRemove() {}
}

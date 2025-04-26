import { Vector3 } from "@minecraft/server";

/**
 * Type guard function to check if a value is a {@link Vector3} object.
 * @param arg - The value to check
 * @returns True if the value is a Vector3 object with numeric x, y, z properties
 * @example
 * if (isVector3(someValue)) {
 *   // someValue is now type-narrowed to Vector3
 *   console.log(someValue.x, someValue.y, someValue.z);
 * }
 */
export declare function isVector3(arg: unknown): arg is Vector3;

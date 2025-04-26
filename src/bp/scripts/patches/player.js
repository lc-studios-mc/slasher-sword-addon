import * as mc from "@minecraft/server";

/**
 * New implementation of applyImpulse. This one tries to replicate the behavior of
 * the normal impulse as much as possible.
 * @param {mc.Entity} entity The entity to apply the impulse to.
 * @param {mc.Vector3} vector The vector of the impulse.
 */
function applyImpulseNew(entity, vector) {
  const { x, y, z } = vector;
  const previousVelocity = entity.getVelocity();

  // Calculate the norm (magnitude) of the horizontal components (x and z)
  const horizontalNorm = Math.sqrt(x * x + z * z);

  // Calculate directionX and directionZ as normalized values
  let directionX = 0;
  let directionZ = 0;
  if (horizontalNorm !== 0) {
    directionX = x / horizontalNorm;
    directionZ = z / horizontalNorm;
  }

  // The horizontalStrength is the horizontal norm of the input vector
  // multiplied by 2.5 based on experimentation
  const horizontalStrength = horizontalNorm * 2.5;

  // The vertical component is directly taken as verticalStrength
  // The previous velocity is also taken into account, because normal impulse retains
  // the previous velocity and knockback does not
  const verticalStrength = y + previousVelocity.y * 0.9;

  // Apply the knockback
  entity.applyKnockback(
    directionX,
    directionZ,
    horizontalStrength,
    verticalStrength,
  );
}

/**
 * Clears the velocity of an entity. This applies a knockback with the opposite
 * direction and the same strength as the current velocity in horizontal direction.
 * @param {mc.Entity} entity The entity to clear the velocity of.
 */
function clearVelocity(entity) {
  const { x, z } = entity.getVelocity();

  // Calculate the norm (magnitude) of the horizontal components (x and z)
  const horizontalNorm = Math.sqrt(x * x + z * z);

  // Calculate directionX and directionZ as normalized values
  let directionX = 0;
  let directionZ = 0;
  if (horizontalNorm !== 0) {
    directionX = -x / horizontalNorm;
    directionZ = -z / horizontalNorm;
  }

  // Apply the knockback
  entity.applyKnockback(directionX, directionZ, horizontalNorm, 0);
}

mc.Player.prototype.applyImpulse = function (vector) {
  applyImpulseNew(this, vector);
};

mc.Player.prototype.clearVelocity = function () {
  clearVelocity(this);
};

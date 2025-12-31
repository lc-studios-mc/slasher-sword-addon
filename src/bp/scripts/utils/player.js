import * as mc from "@minecraft/server";

/**
 * Whether the player's game mode is creative or spectator.
 * @param {mc.Player} player
 * @returns {boolean}
 */
export function isPlayerCreativeOrSpectator(player) {
  const gameMode = player.getGameMode();
  return (
    gameMode === mc.GameMode.creative || gameMode === mc.GameMode.spectator
  );
}

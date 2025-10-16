import * as mc from "@minecraft/server";

export const testDashInput = (player: mc.Player): boolean => {
	const movementVector = player.inputInfo.getMovementVector();
	return movementVector.y > 0.3 && Math.abs(movementVector.x) < 0.3;
};

export const testSawingInput = (player: mc.Player): boolean => {
	if (player.inputInfo.lastInputModeUsed === mc.InputMode.Touch) {
		return player.isSneaking;
	}
	return player.inputInfo.getButtonState(mc.InputButton.Sneak) === mc.ButtonState.Pressed;
};

import * as mc from "@minecraft/server";
import { ItemHookHandlerBase, registerItemHookProfile } from "@/core/item_hook";

registerItemHookProfile({
	itemType: "slasher:slasher",
	createHandler: (ctx) => new SlasherHandler(ctx),
});

class SlasherHandler extends ItemHookHandlerBase {}

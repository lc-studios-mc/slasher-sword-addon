import * as mc from "@minecraft/server";
import { ItemHookHandlerBase } from "@/core/item_hook/handler_class";
import { registerItemHookProfile } from "@/core/item_hook/processing";

registerItemHookProfile({
	itemType: "slasher:slasher",
	createHandler: (ctx) => new SlasherHandler(ctx),
});

class SlasherHandler extends ItemHookHandlerBase {
}

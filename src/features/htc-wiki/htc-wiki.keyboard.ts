/**
 * features/htc-wiki/htc-wiki.keyboard.ts
 * --------------------------
 * Клавиатуры корневого раздела "Полезные материалы"
 */

import { Keyboard } from "grammy";
import { NAVIGATION_LABELS } from "../../constants/navigation";
import { HTC_WIKI_BUTTON_LABELS } from "./htc-wiki.constants";

export const replyHtcWikiMenu = new Keyboard()
	.text(HTC_WIKI_BUTTON_LABELS.CHILDREN_CATECHISM)
	.row()
	.text(NAVIGATION_LABELS.NAV_BACK)
	.resized();


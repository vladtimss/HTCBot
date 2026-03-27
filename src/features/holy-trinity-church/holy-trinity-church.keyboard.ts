/**
 * features/holy-trinity-church/holy-trinity-church.keyboard.ts
 * --------------------------
 * Клавиатура раздела «Церковь Святой Троицы» (подразделы)
 */

import { Keyboard } from "grammy";
import { MENU_LABELS } from "../../constants/button-lables";
import { NAVIGATION_LABELS } from "../../constants/navigation";
import { MyContext } from "../../types/grammy-context";
import { MEMBERS_MEETING_BUTTON_LABELS } from "./members-meeting/members-meeting.constants";

export function replyHolyTrinityChurchKeyboard(ctx: MyContext) {
	const kb = new Keyboard();

	if (ctx.access.isPrivileged && ctx.access.isPresbyterianCouncil) {
		kb.text(MENU_LABELS.MAIN_PRESBYTERIAN_COUNCIL).text(MENU_LABELS.MAIN_CALENDAR).row();
	} else if (ctx.access.isPresbyterianCouncil) {
		kb.text(MENU_LABELS.MAIN_PRESBYTERIAN_COUNCIL).row();
	} else if (ctx.access.isPrivileged) {
		kb.text(MENU_LABELS.MAIN_CALENDAR).row();
	}
	if (ctx.access.isPrivileged) {
		kb.text(MEMBERS_MEETING_BUTTON_LABELS.MM_ROOT).row();
	}

	kb.text(NAVIGATION_LABELS.NAV_MAIN).resized().persistent();
	return kb;
}

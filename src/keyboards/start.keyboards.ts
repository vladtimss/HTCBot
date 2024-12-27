import { Keyboard }                                    from "grammy";
import {
	CHURCH_TG_CHANNEL,
	SUNDAY_WORSHIP_INFO,
	UPCOMING_CHURCH_EVENTS
} from "../strings/keyboards/start.keyboards.strings";

export const startKeyboards = new Keyboard()
	.text(SUNDAY_WORSHIP_INFO).row()
	.text(UPCOMING_CHURCH_EVENTS)
	.text(CHURCH_TG_CHANNEL)
	.resized();
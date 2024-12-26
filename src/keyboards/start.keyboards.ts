import { Keyboard }                                    from "grammy";
import { START_KEYBOARD_TEXT, UPCOMING_CHURCH_EVENTS } from "../strings/keyboards/start.keyboards.strings";

export const startKeyboards = new Keyboard()
	.text(START_KEYBOARD_TEXT)
	.text(UPCOMING_CHURCH_EVENTS)
	.resized();
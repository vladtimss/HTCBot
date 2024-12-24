import { Keyboard }                                from "grammy";
import { START_KEYBOARD_TEXT } from "../strings/keyboards/start.keyboards.strings";

export const startKeyboards = new Keyboard()
	.text(START_KEYBOARD_TEXT)
	.resized();
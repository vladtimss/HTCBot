import { MyContext } from "../types/grammy-context";
import { env } from "../config/env";

export function isPrivileged(ctx: MyContext): boolean {
	const uid = ctx.from?.id;
	return uid ? env.PRIVILEGED_USER_IDS.includes(uid) : false;
}

export function canSeeFourthButton(ctx: MyContext): boolean {
	const uid = ctx.from?.id;
	return uid ? env.FOURTH_BUTTON_USER_IDS.includes(uid) || isPrivileged(ctx) : false;
}

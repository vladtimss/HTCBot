/**
 * features/holy-trinity-church/holy-trinity-church.texts.ts
 * --------------------------
 * Тексты раздела «Церковь Святой Троицы»
 */

import { fmt, bold } from "@grammyjs/parse-mode";
import { COMMON } from "../../services/texts";

export const HOLY_TRINITY_CHURCH_TEXTS = {
	title: fmt`${bold()}Церковь Святой Троицы${bold()}${COMMON.useButtonBelow}`,
};

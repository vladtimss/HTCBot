import { transformTextToBoldHelper, wrapInMarkdownLink } from "../helpers/markdown.helpers";

/**
 * Приветственное сообщение с обращением к пользователю по имени
 * @param username
 */
export const welcomeMessage = (username: string): string => `
${transformTextToBoldHelper(`Добро пожаловать, ${username}\\!`)}

Я помощник Церкви Святой Троицы\\!

Вы можете следить за жизнью общины ${wrapInMarkdownLink("на этом канале", process.env.TG_CHURCH_CHANNGEL)}
`
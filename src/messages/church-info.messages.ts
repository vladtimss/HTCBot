import { YANDEX_MAP_LINK } from "../constants/links.constants";

export const generateSundayWorshipInfoMessage = (): string => {
	return `
	<b>Богослужение проходит каждое воскресенье</b>
	в <b>11:00</b> по адресу:
	<pre>Чароитовая улица, 1к5, район Троицк, Москва</pre>
	<i><u>(Вход справа от первого подъезда и слева от ателье)</u></i>\n
	<a href='${YANDEX_MAP_LINK}'>Посмотреть на карте</a>
	`;
}
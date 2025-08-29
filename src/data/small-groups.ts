/**
 * Локальные данные по малым группам.
 * В реальности их можно хранить в Builtin AI и/или календаре.
 */

export type MgGroup = {
	id: string; // короткий id (для callback)
	title: string; // название группы
	leader: string; // лидер
	district: string; // район
	address: string; // адрес/локация
	weekday: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
	time: string; // "19:00"
};

export const WEEKDAY_TITLE: Record<MgGroup["weekday"], string> = {
	MON: "Понедельник",
	TUE: "Вторник",
	WED: "Среда",
	THU: "Четверг",
	FRI: "Пятница",
	SAT: "Суббота",
	SUN: "Воскресенье",
};

export const DISTRICTS = ["Центр", "Север", "Юг", "Восток", "Запад"] as const;

export const GROUPS: MgGroup[] = [
	{
		id: "g1",
		title: "МГ Центр #1",
		leader: "Алексей",
		district: "Центр",
		address: "ул. Пушкина, 10",
		weekday: "WED",
		time: "19:00",
	},
	{
		id: "g2",
		title: "МГ Север #1",
		leader: "Мария",
		district: "Север",
		address: "пр. Лесной, 24",
		weekday: "THU",
		time: "19:30",
	},
	{
		id: "g3",
		title: "МГ Запад #1",
		leader: "Игорь",
		district: "Запад",
		address: "ул. Светлая, 5",
		weekday: "MON",
		time: "18:30",
	},
];

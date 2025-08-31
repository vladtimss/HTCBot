import { env } from "../config/env";

// День недели
export type Weekday = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

export const WEEKDAY_TITLE: Record<Weekday, string> = {
	MON: "Понедельник",
	TUE: "Вторник",
	WED: "Среда",
	THU: "Четверг",
	FRI: "Пятница",
	SAT: "Суббота",
	SUN: "Воскресенье",
};

// Лидер
export type SmallGroupLeader = {
	id: string;
	firstName: string;
	lastName: string;
	phone: string;
	tgUserName?: string;
	tgId?: number | string;
};

// «Сырая» группа (без адресов, только id лидеров)
export type SmallGroupRaw = {
	id: string;
	title: string;
	region: string;
	weekday: Weekday;
	time: string;
	leaderIds: string[];
};

// Адрес группы
export type GroupAddress = {
	address: string;
	mapUrl: string;
};

// Готовая группа (с лидерами и адресами)
export type SmallGroup = SmallGroupRaw & {
	leaders: SmallGroupLeader[];
	addresses: GroupAddress[];
};

// --- Районы (ключ -> отображаемое название)
export const DISTRICT_MAP: Record<string, string> = {
	"troick-pervomaiskoe": "Троицк-Первомайское",
	rasskazovo: "Рассказово",
	"troick-vatutinki": "Троицк-Ватутинки",
	"kommunarka-filimonkovskoe": "Коммунарка-Первомайское",
};

// Базовый список (без адресов и лидеров) — 4 группы: 3 в пятницу и 1 в среду
const RAW_GROUPS: SmallGroupRaw[] = [
	{
		id: "g1",
		title: "Троицк-Первомайское",
		region: "troick-pervomaiskoe",
		weekday: "WED",
		time: "19:30",
		leaderIds: ["l1", "l2"],
	},
	{
		id: "g2",
		title: "Рассказово",
		region: "rasskazovo",
		weekday: "FRI",
		time: "19:30",
		leaderIds: ["l3", "l4"],
	},
	{
		id: "g3",
		title: "Троицк-Ватутинки",
		region: "troick-vatutinki",
		weekday: "FRI",
		time: "19:00",
		leaderIds: ["l5", "l6"],
	},
	{
		id: "g4",
		title: "Коммунарка-Первомайское",
		region: "kommunarka-filimonkovskoe",
		weekday: "FRI",
		time: "20:00",
		leaderIds: ["l8", "l9", "l7"],
	},
];

// Готовый список с лидерами и адресами
export const GROUPS: SmallGroup[] = RAW_GROUPS.map((g) => {
	const leaders: SmallGroupLeader[] = (g.leaderIds || [])
		.map((id) => {
			const src = env.LEADERS[id];

			if (!src) return null;
			return {
				id,
				firstName: src.firstName,
				lastName: src.lastName,
				phone: src.phone,
				tgUserName: src.tgUserName,
				tgId: src.tgId,
			} as SmallGroupLeader;
		})
		.filter(Boolean) as SmallGroupLeader[];

	const addresses = env.GROUP_ADDRESSES[g.id] ?? [];

	return { ...g, leaders, addresses };
});

// Все районы
export const DISTRICTS = Array.from(new Set(GROUPS.map((g) => g.region)));

// Все дни
export const WEEKDAYS_PRESENT = Array.from(new Set(GROUPS.map((g) => g.weekday))) as Weekday[];

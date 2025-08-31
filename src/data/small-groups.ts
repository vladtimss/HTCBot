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

// Лидер малой группы
export type SmallGroupLeader = {
	id: string;
	name: string;
	phone: string;
};

// «Сырая» малая группа (только id лидеров)
export type SmallGroupRaw = {
	id: string;
	title: string;
	region: string;
	address: string;
	weekday: Weekday;
	time: string;
	leaderIds: string[];
};

// Готовая малая группа (с объектами лидеров)
export type SmallGroup = Omit<SmallGroupRaw, "leaderIds"> & {
	leaders: SmallGroupLeader[];
};

// Базовый список групп (без лидеров)
const RAW_GROUPS: SmallGroupRaw[] = [
	{
		id: "g1",
		title: "МГ Центр #1",
		region: "Центр",
		address: "ул. Ленина, 10",
		weekday: "WED",
		time: "19:00",
		leaderIds: ["l1", "l2"],
	},
	{
		id: "g2",
		title: "МГ Север #1",
		region: "Север",
		address: "ул. Северная, 5",
		weekday: "FRI",
		time: "19:30",
		leaderIds: ["l3", "l4"],
	},
	{
		id: "g3",
		title: "МГ Запад #1",
		region: "Запад",
		address: "ул. Западная, 3",
		weekday: "FRI",
		time: "18:30",
		leaderIds: ["l5", "l6"],
	},
	{
		id: "g4",
		title: "МГ Восток #1",
		region: "Восток",
		address: "ул. Восточная, 8",
		weekday: "FRI",
		time: "20:00",
		leaderIds: ["l7", "l8"],
	},
];

// Готовый список с подставленными лидерами
export const GROUPS: SmallGroup[] = RAW_GROUPS.map((g) => {
	const leaders: SmallGroupLeader[] = (g.leaderIds || [])
		.map((id) => {
			const src = env.LEADERS[id];
			if (!src) return null;
			return { id, name: src.name, phone: src.phone };
		})
		.filter(Boolean) as SmallGroupLeader[];

	return { ...g, leaders };
});

// Все уникальные районы
export const DISTRICTS = Array.from(new Set(GROUPS.map((g) => g.region)));

// Все уникальные дни (с типом)
export const WEEKDAYS_PRESENT = Array.from(new Set(GROUPS.map((g) => g.weekday))) as Weekday[];

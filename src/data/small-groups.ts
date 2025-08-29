import { env } from "../config/env";

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

export type Leader = { name: string; phone: string };
export type MgGroup = {
	id: string;
	title: string;
	region: string;
	address: string;
	weekday: Weekday;
	time: string;
	leaders: Leader[];
};

export function parseGroupsFromEnv(): MgGroup[] {
	try {
		const data = JSON.parse(env.SMALL_GROUPS_RAW);
		return (Array.isArray(data) ? data : []).map((g) => ({
			id: String(g.id),
			title: String(g.title),
			region: String(g.region),
			address: String(g.address),
			weekday: String(g.weekday).toUpperCase(),
			time: String(g.time),
			leaders: Array.isArray(g.leaders)
				? g.leaders.map((l: any) => ({ name: String(l.name), phone: String(l.phone) }))
				: [],
		})) as MgGroup[];
	} catch {
		return [];
	}
}

export const GROUPS: MgGroup[] = parseGroupsFromEnv();
export const DISTRICTS = Array.from(new Set(GROUPS.map((g) => g.region)));
export const WEEKDAYS_PRESENT = Array.from(new Set(GROUPS.map((g) => g.weekday))) as Weekday[];

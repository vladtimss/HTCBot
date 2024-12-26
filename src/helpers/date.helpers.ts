export const formatDate = (date: number | string | Date): string => {
	return new Date(date).toLocaleString("ru-RU", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}
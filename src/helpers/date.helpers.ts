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

export const formatDateRange = (
	startDate: number | string | Date,
	endDate: number | string | Date
): string => {
	const start = new Date(startDate);
	const end = new Date(endDate);

	const isSameDay =
		start.getFullYear() === end.getFullYear() &&
		start.getMonth() === end.getMonth() &&
		start.getDate() === end.getDate();

	if (isSameDay) {
		const fullDate = start.toLocaleString("ru-RU", {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
		});

		const startTime = start.toLocaleString("ru-RU", {
			hour: "2-digit",
			minute: "2-digit",
		});

		const endTime = end.toLocaleString("ru-RU", {
			hour: "2-digit",
			minute: "2-digit",
		});

		return `${fullDate}, ${startTime} — ${endTime}`;
	} else {
		const formattedStart = start.toLocaleString("ru-RU", {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});

		const formattedEnd = end.toLocaleString("ru-RU", {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});

		return `${formattedStart} — ${formattedEnd}`;
	}
};

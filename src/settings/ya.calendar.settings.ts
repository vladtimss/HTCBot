import { DavClientParamSettings }         from "../types/calendar.types";
import env                                from "../env";
import { AuthMethod, DefaultAccountType } from "../enums/caldav.enums";

export const yaCalendarSettings: DavClientParamSettings = {
	serverUrl: env.CALDAV_URL,
	credentials: {
		username: env.CALDAV_USERNAME,
		password: env.CALDAV_PASSWORD
	},
	authMethod: AuthMethod.Basic,
	defaultAccountType: DefaultAccountType.CALDAV,
}